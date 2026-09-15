import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAdmin } from "../middleware/auth.js";
import { created, ok } from "../lib/respond.js";
import { createDocsUser, listDocsUsers, updateDocsUser } from "../lib/docs-users.js";
import { badRequest, notFound } from "../errors.js";
import { asOptionalEnum, optionalString, requireObject } from "../lib/validate.js";

export const docsUsersRouter = Router();

docsUsersRouter.use(requireAdmin);

docsUsersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    ok(res, { items: await listDocsUsers() });
  }),
);

docsUsersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    const username = optionalString(body.username, "username");
    const password = optionalString(body.password, "password");
    if (!username) throw badRequest("username is required");
    if (!password) throw badRequest("password is required");
    const name = optionalString(body.name, "name");
    const role = body.role ? asOptionalEnum(body.role, "role", ["admin", "partner", "viewer"]) : "viewer";
    try {
      created(res, await createDocsUser({ username, password, name, role }));
    } catch (error) {
      if (error?.code === "23505") throw badRequest("username already exists");
      throw badRequest(error.message);
    }
  }),
);

docsUsersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("id must be a positive integer");
    const body = requireObject(req.body);
    if (body.active != null && typeof body.active !== "boolean") throw badRequest("active must be a boolean");
    const password = optionalString(body.password, "password");
    const name = optionalString(body.name, "name");
    const role = body.role ? asOptionalEnum(body.role, "role", ["admin", "partner", "viewer"]) : undefined;
    try {
      const row = await updateDocsUser(id, { active: body.active, password, name, role });
      if (!row) throw notFound(`docs user ${id} not found`);
      ok(res, row);
    } catch (error) {
      if (error.status) throw error;
      throw badRequest(error.message);
    }
  }),
);
