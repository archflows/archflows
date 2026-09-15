import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAdmin } from "../middleware/auth.js";
import { created, ok } from "../lib/respond.js";
import { createKey, listKeys, setKeyActive } from "../lib/api-keys.js";
import { badRequest, notFound } from "../errors.js";
import { asOptionalEnum, optionalString, requireObject } from "../lib/validate.js";

export const keysRouter = Router();

keysRouter.use(requireAdmin);

keysRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    ok(res, { items: await listKeys() });
  }),
);

keysRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    const name = optionalString(body.name, "name") || "public";
    const role = body.role ? asOptionalEnum(body.role, "role", ["client", "admin"]) : "client";
    const secret = optionalString(body.secret, "secret");
    created(res, await createKey({ name, role, secret }));
  }),
);

keysRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("id must be a positive integer");
    const body = requireObject(req.body);
    if (typeof body.active !== "boolean") throw badRequest("active must be a boolean");
    const row = await setKeyActive(id, body.active);
    if (!row) throw notFound(`api key ${id} not found`);
    ok(res, row);
  }),
);
