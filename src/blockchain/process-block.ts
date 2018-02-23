import Augur from "augur.js";
import { parallel } from "async";
import * as Knex from "knex";
import { each } from "async";
import { augurEmitter } from "../events";
import { logError } from "../utils/log-error";
import { BlockDetail, BlocksRow, AsyncCallback, ErrorCallback, MarketsContractAddressRow } from "../types";
import { updateMarketState } from "./log-processors/database";
import { processQueue, logQueueProcess } from "./process-queue";
import { QueryBuilder } from "knex";
import { getMarketsWithReportingState } from "../server/getters/database";

interface FeeWindowIdRow {
  feeWindowId: number;
}

const overrideTimestamps = Array<number>();
let blockHeadTimestamp = 0;

export function getCurrentTime(): number {
  return getOverrideTimestamp() || blockHeadTimestamp;
}

export function setOverrideTimestamp(db: Knex, overrideTimestamp: number, callback: ErrorCallback): void {
  overrideTimestamps.push(overrideTimestamp);
  db("network_id").update("overrideTimestamp", overrideTimestamp).asCallback(callback);
}

export function removeOverrideTimestamp(db: Knex, overrideTimestamp: number, callback: ErrorCallback): void {
  const removedTimestamp = overrideTimestamps.pop();
  const priorTimestamp = getOverrideTimestamp();
  if (removedTimestamp !== overrideTimestamp || priorTimestamp == null) {
    return callback(new Error(`Timestamp removal failed ${removedTimestamp} ${overrideTimestamp}`));
  }
  db("network_id").update("overrideTimestamp", priorTimestamp).asCallback(callback);
}

export function getOverrideTimestamp(): number|null {
  if (overrideTimestamps.length === 0) return null;
  return overrideTimestamps[overrideTimestamps.length - 1];
}

export function processBlock(db: Knex, augur: Augur, block: BlockDetail): void {
  processQueue.push((callback) => _processBlock(db, augur, block, callback));
}

export function processBlockRemoval(db: Knex, block: BlockDetail): void {
  processQueue.push((callback) => _processBlockRemoval(db, block, callback));
}

export function processBlockByNumber(db: Knex, augur: Augur, blockNumber: number, callback: ErrorCallback): void {
  augur.rpc.eth.getBlockByNumber([blockNumber, false], (block: BlockDetail): void => {
    _processBlock(db, augur, block, callback);
  });
}

function insertBlockRow(trx: Knex.Transaction, blockNumber: number, blockHash: string, timestamp: number, callback: ErrorCallback) {
  trx("blocks").where({ blockNumber }).asCallback((err: Error|null, blocksRows?: Array<BlocksRow>): void => {
    if (err) {
      trx.rollback();
      return callback(err);
    }
    let query: Knex.QueryBuilder;
    if (!blocksRows || !blocksRows.length) {
      query = trx.transacting(trx).insert({ blockNumber, blockHash, timestamp }).into("blocks");
    } else {
      query = trx("blocks").transacting(trx).where({ blockNumber }).update({ blockHash, timestamp });
    }
    query.asCallback(callback);
  });
}

function _processBlock(db: Knex, augur: Augur, block: BlockDetail, callback: ErrorCallback): void {
  if (!block || !block.timestamp) return logError(new Error(JSON.stringify(block)));
  const blockNumber = parseInt(block.number, 16);
  const blockHash = block.hash;
  blockHeadTimestamp = parseInt(block.timestamp, 16);
  const timestamp = getOverrideTimestamp() || blockHeadTimestamp;
  console.log("new block:", blockNumber, timestamp);
  db.transaction((trx: Knex.Transaction): void => {
    insertBlockRow(trx, blockNumber, blockHash, timestamp, (err: Error|null) => {
      if (err) {
        trx.rollback(err);
        logError(err);
      } else {
        advanceTime(trx, augur, blockNumber, timestamp, (err: Error|null) => {
          if (err != null) {
            trx.rollback(err);
            callback(err);
          } else {
            logQueueProcess(trx, blockHash, (err: Error|null) => {
              if (err != null) {
                trx.rollback(err);
                logError(err);
              } else {
                trx.commit();
              }
              callback(err);
            });
          }
        });
      }
    });
  });
}

function _processBlockRemoval(db: Knex, block: BlockDetail, callback: ErrorCallback): void {
  const blockNumber = parseInt(block.number, 16);
  console.log("block removed:", blockNumber);
  db.transaction((trx: Knex.Transaction): void => {
    db("blocks").transacting(trx).where({ blockNumber }).del().asCallback((err: Error|null): void => {
      if (err) {
        trx.rollback(err);
        logError(err);
        callback(err);
      } else {
        trx.commit();
        callback(null);
      }
    });
  });
}

function advanceTime(db: Knex, augur: Augur, blockNumber: number, timestamp: number, callback: AsyncCallback) {
  parallel([
    (next: AsyncCallback) => advanceMarketReachingEndTime(db, augur, blockNumber, timestamp, next),
    (next: AsyncCallback) => advanceMarketMissingDesignatedReport(db, augur, blockNumber, timestamp, next),
    (next: AsyncCallback) => advanceFeeWindowActive(db, blockNumber, timestamp, next),
  ], callback);
}

function advanceMarketReachingEndTime(db: Knex, augur: Augur, blockNumber: number, timestamp: number, callback: AsyncCallback) {
  const designatedDisputeQuery = db("markets").select("markets.marketId").join("market_state", "market_state.marketStateId", "markets.marketStateId");
  designatedDisputeQuery.where("reportingState", augur.constants.REPORTING_STATE.PRE_REPORTING).where("endTime", "<", timestamp);
  designatedDisputeQuery.asCallback((err: Error|null, designatedDisputeMarketIds: Array<MarketsContractAddressRow>) => {
    if (err) return callback(err);
    each(designatedDisputeMarketIds, (marketIdRow, nextMarketId: ErrorCallback) => {
      updateMarketState(db, marketIdRow.marketId, blockNumber, augur.constants.REPORTING_STATE.DESIGNATED_REPORTING, (err: Error|null) => {
        if (err) return nextMarketId(err);
        augurEmitter.emit("MarketState", {
          marketId: marketIdRow.marketId,
          reportingState: augur.constants.REPORTING_STATE.DESIGNATED_REPORTING,
        });
        nextMarketId();
      });
    }, callback);
  });
}

function advanceMarketMissingDesignatedReport(db: Knex, augur: Augur, blockNumber: number, timestamp: number, callback: AsyncCallback) {
  const marketsMissingDesignatedReport = getMarketsWithReportingState(db, ["markets.marketId"])
    .where("endTime", "<", timestamp + augur.constants.CONTRACT_INTERVAL.DESIGNATED_REPORTING_DURATION_SECONDS)
    .where("reportingState", augur.constants.REPORTING_STATE.DESIGNATED_REPORTING);
  marketsMissingDesignatedReport.asCallback((err, marketAddressRows: Array<MarketsContractAddressRow>) => {
    if (err) return callback(err);
    each(marketAddressRows, (marketIdRow, nextMarketIdRow: ErrorCallback) => {
      updateMarketState(db, marketIdRow.marketId, blockNumber, augur.constants.REPORTING_STATE.OPEN_REPORTING, (err: Error|null) => {
        if (err) return callback(err);
        augurEmitter.emit("MarketState", {
          marketId: marketIdRow.marketId,
          reportingState: augur.constants.REPORTING_STATE.OPEN_REPORTING,
        });
        nextMarketIdRow();
      });
    }, callback);
  });
}

function advanceFeeWindowActive(db: Knex, blockNumber: number, timestamp: number, callback: AsyncCallback) {
  db("fee_windows").first().select("feeWindowId").where("endTime", "<", timestamp).whereNull("endBlockNumber").asCallback((err: Error|null, feeWindowRow?: FeeWindowIdRow) => {
    if (err || feeWindowRow == null) return callback(err);
    db("fee_windows").update("endBlockNumber", blockNumber).where("feeWindowId", feeWindowRow.feeWindowId).asCallback((err: Error|null) => {
      if (err) return callback(err);
      advanceIncompleteCrowdsourcers(db, blockNumber, timestamp, (err: Error|null) => {
        if (err) return callback(err);
        augurEmitter.emit("FeeWindowClosed", { feeWindowId: feeWindowRow.feeWindowId, blockNumber, timestamp });
        callback(null);
      });
    });
  });
}

function advanceIncompleteCrowdsourcers(db: Knex, blockNumber: number, timestamp: number, callback: AsyncCallback) {
  // Finds crowdsourcers rows that we don't know the completion of, but are attached to feeWindows that have ended
  // They did not reach their goal, so set completed to 0.
  db("crowdsourcers").update("completed", 0)
    .whereNull("completed")
    .whereIn("feeWindow", (subQuery: QueryBuilder) => {
      subQuery.select("feeWindow").from("fee_windows").whereNotNull("endBlockNumber");
    })
    .asCallback(callback);
}
