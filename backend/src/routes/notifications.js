import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { ok } from "../lib/respond.js";
import { badRequest } from "../errors.js";
import { asAddress, requireObject } from "../lib/validate.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotifications,
} from "../lib/notifications-store.js";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const wallet = asAddress(req.query.wallet, "wallet");
    ok(res, await listNotifications(wallet, req.query));
  }),
);

notificationsRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    const wallet = asAddress(body.wallet, "wallet");
    if (!Array.isArray(body.items)) throw badRequest("items must be an array");
    const readIds = Array.isArray(body.readIds) ? body.readIds.map(String) : [];
    ok(res, await syncNotifications(wallet, body.items, readIds));
  }),
);

notificationsRouter.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    const wallet = asAddress(body.wallet ?? req.query.wallet, "wallet");
    ok(res, await markNotificationRead(wallet, req.params.id));
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    const wallet = asAddress(body.wallet, "wallet");
    ok(res, await markAllNotificationsRead(wallet));
  }),
);
