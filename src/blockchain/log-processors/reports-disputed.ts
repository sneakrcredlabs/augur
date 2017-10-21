import Augur from "augur.js";
import * as Knex from "knex";
import { FormattedLog, ErrorCallback } from "../../types";
import { augurEmitter } from "../../events";

export function processReportsDisputedLog(db: Knex, augur: Augur, trx: Knex.Transaction, log: FormattedLog, callback: ErrorCallback): void {
    console.log("TODO: ReportsDisputed");
    console.log(log);

    augurEmitter.emit("ReportsDisputed", log);

    callback(null);
}
