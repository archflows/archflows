import { getAddress, isAddress } from "viem";
import { query, withClient } from "../db.js";
import { badRequest, conflict, notFound } from "../errors.js";

export const DEFAULT_CONTACT_CATEGORIES = [
  { id: "team", label: "Team" },
  { id: "investor", label: "Investor" },
  { id: "vendor", label: "Vendor" },
  { id: "partner", label: "Partner" },
  { id: "other", label: "Other" },
];

export const FALLBACK_CATEGORY_ID = "other";

function normalizeWallet(wallet) {
  if (typeof wallet !== "string" || !isAddress(wallet)) return null;
  return getAddress(wallet).toLowerCase();
}

function slugifyCategoryLabel(label) {
  const slug = String(label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "category";
}

function uniqueCategoryId(label, categories) {
  const base = slugifyCategoryLabel(label);
  let id = base;
  let n = 2;
  while (categories.some((c) => c.id === id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

function categoryRowToApi(row) {
  return { id: row.id, label: row.label };
}

function contactRowToApi(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category_id,
    wallet: getAddress(row.wallet),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function validateCategoryLabel(label, categories, editingId) {
  const trimmed = String(label ?? "").trim();
  if (!trimmed) return "Category name is required.";
  if (trimmed.length > 32) return "Category name must be 32 characters or fewer.";
  const duplicate = categories.find(
    (c) => c.label.toLowerCase() === trimmed.toLowerCase() && c.id !== editingId,
  );
  if (duplicate) return "That category name already exists.";
  return null;
}

function validateContactInput(input, categories) {
  const name = String(input.name ?? "").trim();
  if (!name) return "Name is required.";
  if (name.length > 64) return "Name must be 64 characters or fewer.";
  if (!normalizeWallet(input.wallet)) return "Enter a valid wallet address.";
  if (!categories.some((c) => c.id === input.category)) return "Pick a category.";
  return null;
}

export async function ensureDefaultCategories(owner) {
  const { rows } = await query(
    "SELECT COUNT(*)::int AS total FROM contact_categories WHERE owner = $1",
    [owner],
  );
  if (rows[0].total > 0) return;

  for (const [index, category] of DEFAULT_CONTACT_CATEGORIES.entries()) {
    await query(
      `INSERT INTO contact_categories (owner, id, label, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (owner, id) DO NOTHING`,
      [owner, category.id, category.label, index],
    );
  }
}

async function listCategoryRows(owner) {
  await ensureDefaultCategories(owner);
  const { rows } = await query(
    `SELECT * FROM contact_categories
     WHERE owner = $1
     ORDER BY sort_order ASC, label ASC`,
    [owner],
  );
  return rows;
}

async function listContactRows(owner) {
  const { rows } = await query(
    `SELECT * FROM contacts
     WHERE owner = $1
     ORDER BY name ASC`,
    [owner],
  );
  return rows;
}

export async function getContactBook(owner) {
  const [categoryRows, contactRows] = await Promise.all([
    listCategoryRows(owner),
    listContactRows(owner),
  ]);
  return {
    categories: categoryRows.map(categoryRowToApi),
    contacts: contactRows.map(contactRowToApi),
  };
}

export async function syncContactBook(owner, payload) {
  const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  if (contacts.length > 500) throw badRequest("Cannot sync more than 500 contacts at once");
  if (categories.length > 50) throw badRequest("Cannot sync more than 50 categories at once");

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      if (categories.length > 0) {
        await client.query("DELETE FROM contact_categories WHERE owner = $1", [owner]);
        for (const [index, category] of categories.entries()) {
          const id = String(category.id ?? "").trim();
          const label = String(category.label ?? "").trim();
          if (!id || !label) throw badRequest("Each category needs id and label");
          await client.query(
            `INSERT INTO contact_categories (owner, id, label, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [owner, id, label, index],
          );
        }
      } else {
        await ensureDefaultCategories(owner);
      }

      const categoryRows = await client.query(
        "SELECT id FROM contact_categories WHERE owner = $1",
        [owner],
      );
      const categoryIds = new Set(categoryRows.rows.map((row) => row.id));
      if (categoryIds.size === 0) throw badRequest("No categories available for this wallet");

      await client.query("DELETE FROM contacts WHERE owner = $1", [owner]);
      for (const contact of contacts) {
        const id = String(contact.id ?? "").trim();
        const name = String(contact.name ?? "").trim();
        const categoryId = String(contact.category ?? contact.category_id ?? "").trim();
        const wallet = normalizeWallet(contact.wallet);
        if (!id || !name || !wallet) throw badRequest("Each contact needs id, name, and wallet");
        if (!categoryIds.has(categoryId)) throw badRequest(`Unknown category: ${categoryId}`);

        const createdAt = contact.createdAt ?? contact.created_at;
        const updatedAt = contact.updatedAt ?? contact.updated_at;
        await client.query(
          `INSERT INTO contacts (owner, id, name, category_id, wallet, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()), COALESCE($7::timestamptz, NOW()))`,
          [
            owner,
            id,
            name,
            categoryId,
            wallet,
            createdAt ? new Date(createdAt) : null,
            updatedAt ? new Date(updatedAt) : null,
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

  return getContactBook(owner);
}

export async function createContact(owner, input) {
  const categories = (await listCategoryRows(owner)).map(categoryRowToApi);
  const error = validateContactInput(input, categories);
  if (error) throw badRequest(error);

  const wallet = normalizeWallet(input.wallet);
  const name = String(input.name).trim();
  const categoryId = String(input.category);
  const id =
    String(input.id ?? "").trim() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const { rows } = await query(
      `INSERT INTO contacts (owner, id, name, category_id, wallet)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [owner, id, name, categoryId, wallet],
    );
    return contactRowToApi(rows[0]);
  } catch (error) {
    if (error?.code === "23505") throw conflict("That wallet is already saved.");
    throw error;
  }
}

export async function updateContact(owner, id, input) {
  const categories = (await listCategoryRows(owner)).map(categoryRowToApi);
  const error = validateContactInput(input, categories);
  if (error) throw badRequest(error);

  const wallet = normalizeWallet(input.wallet);
  const name = String(input.name).trim();
  const categoryId = String(input.category);

  try {
    const { rows } = await query(
      `UPDATE contacts
       SET name = $3, category_id = $4, wallet = $5, updated_at = NOW()
       WHERE owner = $1 AND id = $2
       RETURNING *`,
      [owner, id, name, categoryId, wallet],
    );
    if (!rows[0]) throw notFound(`Contact ${id} not found`);
    return contactRowToApi(rows[0]);
  } catch (error) {
    if (error?.code === "23505") throw conflict("That wallet is already saved.");
    throw error;
  }
}

export async function deleteContact(owner, id) {
  const { rowCount } = await query("DELETE FROM contacts WHERE owner = $1 AND id = $2", [owner, id]);
  if (!rowCount) throw notFound(`Contact ${id} not found`);
  return { deleted: true };
}

export async function createCategory(owner, label) {
  const categories = (await listCategoryRows(owner)).map(categoryRowToApi);
  const error = validateCategoryLabel(label, categories);
  if (error) throw badRequest(error);

  const trimmed = String(label).trim();
  const id = uniqueCategoryId(trimmed, categories);
  const sortOrder = categories.length;
  const { rows } = await query(
    `INSERT INTO contact_categories (owner, id, label, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [owner, id, trimmed, sortOrder],
  );
  return categoryRowToApi(rows[0]);
}

export async function updateCategory(owner, id, label) {
  const categories = (await listCategoryRows(owner)).map(categoryRowToApi);
  const error = validateCategoryLabel(label, categories, id);
  if (error) throw badRequest(error);

  const { rows } = await query(
    `UPDATE contact_categories
     SET label = $3, updated_at = NOW()
     WHERE owner = $1 AND id = $2
     RETURNING *`,
    [owner, id, String(label).trim()],
  );
  if (!rows[0]) throw notFound(`Category ${id} not found`);
  return categoryRowToApi(rows[0]);
}

export async function deleteCategory(owner, id) {
  const categories = (await listCategoryRows(owner)).map(categoryRowToApi);
  if (categories.length <= 1) throw badRequest("Keep at least one category.");
  if (id === FALLBACK_CATEGORY_ID && categories.some((c) => c.id === FALLBACK_CATEGORY_ID)) {
    throw badRequest("The Other category cannot be deleted.");
  }

  const fallback =
    categories.find((c) => c.id === FALLBACK_CATEGORY_ID)?.id ?? categories[0]?.id;
  if (!fallback) throw badRequest("No fallback category.");

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        `UPDATE contacts
         SET category_id = $3, updated_at = NOW()
         WHERE owner = $1 AND category_id = $2`,
        [owner, id, fallback],
      );
      const { rowCount } = await client.query(
        "DELETE FROM contact_categories WHERE owner = $1 AND id = $2",
        [owner, id],
      );
      if (!rowCount) throw notFound(`Category ${id} not found`);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

  return getContactBook(owner);
}

export async function resetContactCategories(owner) {
  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query("DELETE FROM contact_categories WHERE owner = $1", [owner]);
      for (const [index, category] of DEFAULT_CONTACT_CATEGORIES.entries()) {
        await client.query(
          `INSERT INTO contact_categories (owner, id, label, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [owner, category.id, category.label, index],
        );
      }
      await client.query(
        `UPDATE contacts c
         SET category_id = $2, updated_at = NOW()
         WHERE c.owner = $1
           AND NOT EXISTS (
             SELECT 1 FROM contact_categories cc
             WHERE cc.owner = c.owner AND cc.id = c.category_id
           )`,
        [owner, FALLBACK_CATEGORY_ID],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

  return getContactBook(owner);
}
