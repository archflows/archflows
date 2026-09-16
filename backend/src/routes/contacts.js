import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { created, ok } from "../lib/respond.js";
import { badRequest } from "../errors.js";
import { asAddress, requireFields, requireObject } from "../lib/validate.js";
import {
  createCategory,
  createContact,
  deleteCategory,
  deleteContact,
  getContactBook,
  resetContactCategories,
  syncContactBook,
  updateCategory,
  updateContact,
} from "../lib/contacts-store.js";

export const contactsRouter = Router();

contactsRouter.get(
  "/book",
  asyncHandler(async (req, res) => {
    const wallet = asAddress(req.query.wallet, "wallet");
    ok(res, await getContactBook(wallet));
  }),
);

contactsRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    const wallet = asAddress(body.wallet, "wallet");
    ok(res, await syncContactBook(wallet, body));
  }),
);

contactsRouter.post(
  "/categories/reset",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    const wallet = asAddress(body.wallet, "wallet");
    ok(res, await resetContactCategories(wallet));
  }),
);

contactsRouter.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["wallet", "label"]);
    const wallet = asAddress(body.wallet, "wallet");
    created(res, await createCategory(wallet, body.label));
  }),
);

contactsRouter.patch(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["wallet", "label"]);
    const wallet = asAddress(body.wallet, "wallet");
    ok(res, await updateCategory(wallet, req.params.id, body.label));
  }),
);

contactsRouter.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const wallet = asAddress(req.query.wallet, "wallet");
    ok(res, await deleteCategory(wallet, req.params.id));
  }),
);

contactsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["wallet", "name", "category"]);
    const owner = asAddress(body.wallet, "wallet");
    const walletAddress = body.walletAddress ?? body.contactWallet ?? body.address;
    if (!walletAddress) throw badRequest("walletAddress is required");
    created(
      res,
      await createContact(owner, {
        id: body.id,
        name: body.name,
        category: body.category,
        wallet: walletAddress,
      }),
    );
  }),
);

contactsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = requireObject(req.body);
    requireFields(body, ["wallet", "name", "category"]);
    const owner = asAddress(body.wallet, "wallet");
    const walletValue = body.walletAddress ?? body.contactWallet ?? body.address;
    if (!walletValue) throw badRequest("walletAddress is required");
    ok(
      res,
      await updateContact(owner, req.params.id, {
        name: body.name,
        category: body.category,
        wallet: walletValue,
      }),
    );
  }),
);

contactsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const wallet = asAddress(req.query.wallet, "wallet");
    ok(res, await deleteContact(wallet, req.params.id));
  }),
);
