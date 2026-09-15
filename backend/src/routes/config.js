import { Router } from "express";
import { config } from "../config.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { ok } from "../lib/respond.js";

export const configRouter = Router();

const publicConfig = {
  mode: config.mode,
  chainId: config.chainId,
  rpc: config.rpc,
  lockFeeUsdc: config.lockFeeUsdc,
  lockFeeUnits: "10000000",
  contracts: {
    lock: config.contracts.lock,
    stream: config.contracts.stream,
    distributor: config.contracts.distributor,
    escrow: config.contracts.escrow,
    staking: config.contracts.staking,
    treasury: config.contracts.treasury,
  },
};

configRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    ok(res, publicConfig);
  }),
);
