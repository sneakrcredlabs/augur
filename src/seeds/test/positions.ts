import * as Knex from "knex";
import Promise = require("bluebird");

exports.seed = (knex: Knex): Promise<any> => {
  // Deletes ALL existing entries
  return knex("positions").del().then((): void => {
    // Inserts seed entries
    knex.batchInsert("positions", [{
      account: "0x0000000000000000000000000000000000000b0b",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 0,
      numShares: "0.1",
      numSharesAdjustedForUserIntention: "-0.2",
      realizedProfitLoss: "1.2",
      unrealizedProfitLoss: "0.55",
    }, {
      account: "0x0000000000000000000000000000000000000b0b",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 1,
      numShares: "0.3",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0.03",
    }, {
      account: "0x0000000000000000000000000000000000000b0b",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 2,
      numShares: "0.3",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0.03",
    }, {
      account: "0x0000000000000000000000000000000000000b0b",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 3,
      numShares: "0",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0",
    }, {
      account: "0x0000000000000000000000000000000000000b0b",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 4,
      numShares: "0.3",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0.03",
    }, {
      account: "0x0000000000000000000000000000000000000b0b",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 5,
      numShares: "0.3",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0.03",
    }, {
      account: "0x0000000000000000000000000000000000000b0b",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 6,
      numShares: "0.3",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0.03",
    }, {
      account: "0x0000000000000000000000000000000000000b0b",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 7,
      numShares: "0.3",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0.03",
    }, {
      account: "0x000000000000000000000000000000000000d00d",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 0,
      numShares: "0.2",
      numSharesAdjustedForUserIntention: "0.2",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "11",
    }, {
      account: "0x000000000000000000000000000000000000d00d",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 1,
      numShares: "0",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0",
    }, {
      account: "0x000000000000000000000000000000000000d00d",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 2,
      numShares: "0",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0",
    }, {
      account: "0x000000000000000000000000000000000000d00d",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 3,
      numShares: "0",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0",
    }, {
      account: "0x000000000000000000000000000000000000d00d",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 4,
      numShares: "0",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0",
    }, {
      account: "0x000000000000000000000000000000000000d00d",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 5,
      numShares: "0",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0",
    }, {
      account: "0x000000000000000000000000000000000000d00d",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 6,
      numShares: "0",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0",
    }, {
      account: "0x000000000000000000000000000000000000d00d",
      marketID: "0x0000000000000000000000000000000000000001",
      outcome: 7,
      numShares: "0",
      numSharesAdjustedForUserIntention: "0",
      realizedProfitLoss: "0",
      unrealizedProfitLoss: "0",
    }], 1000);
  });
};
