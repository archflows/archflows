import { getAddress, isAddress } from "viem";

export type ContactCategoryDef = {
  id: string;
  label: string;
};

export const DEFAULT_CONTACT_CATEGORIES: ContactCategoryDef[] = [
  { id: "team", label: "Team" },
  { id: "investor", label: "Investor" },
  { id: "vendor", label: "Vendor" },
  { id: "partner", label: "Partner" },
  { id: "other", label: "Other" },
];

/** Category id stored on each contact. */
export type ContactCategory = string;

export type Contact = {
  id: string;
  name: string;
  category: ContactCategory;
  wallet: `0x${string}`;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_VERSION = "v1";
const CONTACTS_PREFIX = `arcflows:contacts:${STORAGE_VERSION}:`;
const CATEGORIES_PREFIX = `arcflows:contact-categories:${STORAGE_VERSION}:`;
export const CONTACTS_CHANGED_EVENT = "arcflows:contacts-changed";
export const FALLBACK_CATEGORY_ID = "other";

function contactsKey(owner: string) {
  return `${CONTACTS_PREFIX}${owner.toLowerCase()}`;
}

function categoriesKey(owner: string) {
  return `${CATEGORIES_PREFIX}${owner.toLowerCase()}`;
}

function emitChanged(owner: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CONTACTS_CHANGED_EVENT, { detail: { owner: owner.toLowerCase() } }),
  );
}

export function categoryLabel(categoryId: string, categories: ContactCategoryDef[]) {
  return categories.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function slugifyCategoryLabel(label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "category";
}

export function uniqueCategoryId(label: string, categories: ContactCategoryDef[]) {
  const base = slugifyCategoryLabel(label);
  let id = base;
  let n = 2;
  while (categories.some((c) => c.id === id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

export function loadCategories(owner?: string): ContactCategoryDef[] {
  if (!owner || typeof window === "undefined") return [...DEFAULT_CONTACT_CATEGORIES];
  try {
    const raw = window.localStorage.getItem(categoriesKey(owner));
    if (!raw) return [...DEFAULT_CONTACT_CATEGORIES];
    const parsed = JSON.parse(raw) as ContactCategoryDef[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_CONTACT_CATEGORIES];
    const cleaned = parsed.filter(
      (c) => c && typeof c.id === "string" && typeof c.label === "string" && c.label.trim(),
    );
    return cleaned.length > 0 ? cleaned : [...DEFAULT_CONTACT_CATEGORIES];
  } catch {
    return [...DEFAULT_CONTACT_CATEGORIES];
  }
}

export function saveCategories(owner: string, categories: ContactCategoryDef[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(categoriesKey(owner), JSON.stringify(categories));
  emitChanged(owner);
}

export function loadContacts(owner?: string): Contact[] {
  if (!owner || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(contactsKey(owner));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Contact[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c) =>
          c &&
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          typeof c.category === "string" &&
          typeof c.wallet === "string" &&
          isAddress(c.wallet),
      )
      .map((c) => ({
        ...c,
        wallet: getAddress(c.wallet) as `0x${string}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function saveContacts(owner: string, contacts: Contact[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(contactsKey(owner), JSON.stringify(contacts));
  emitChanged(owner);
}

export function newContactId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeWallet(wallet: string): `0x${string}` | null {
  const trimmed = wallet.trim();
  if (!isAddress(trimmed)) return null;
  return getAddress(trimmed) as `0x${string}`;
}

export function validateCategoryLabel(label: string, categories: ContactCategoryDef[], editingId?: string) {
  const trimmed = label.trim();
  if (!trimmed) return "Category name is required.";
  if (trimmed.length > 32) return "Category name must be 32 characters or fewer.";
  const duplicate = categories.find(
    (c) => c.label.toLowerCase() === trimmed.toLowerCase() && c.id !== editingId,
  );
  if (duplicate) return "That category name already exists.";
  return null;
}

export function validateContactInput(
  input: { name: string; category: ContactCategory; wallet: string },
  categories: ContactCategoryDef[],
) {
  const name = input.name.trim();
  if (!name) return "Name is required.";
  if (name.length > 64) return "Name must be 64 characters or fewer.";
  if (!normalizeWallet(input.wallet)) return "Enter a valid wallet address.";
  if (!categories.some((c) => c.id === input.category)) return "Pick a category.";
  return null;
}

export function upsertCategory(
  owner: string,
  categories: ContactCategoryDef[],
  input: { id?: string; label: string },
) {
  const labelError = validateCategoryLabel(input.label, categories, input.id);
  if (labelError) return { error: labelError, categories };

  const label = input.label.trim();
  if (input.id) {
    const next = categories.map((c) => (c.id === input.id ? { ...c, label } : c));
    saveCategories(owner, next);
    return { error: null, categories: next };
  }

  const next = [...categories, { id: uniqueCategoryId(label, categories), label }];
  saveCategories(owner, next);
  return { error: null, categories: next };
}

export function removeCategory(
  owner: string,
  categories: ContactCategoryDef[],
  contacts: Contact[],
  id: string,
) {
  if (categories.length <= 1) {
    return { error: "Keep at least one category.", categories, contacts };
  }
  if (id === FALLBACK_CATEGORY_ID && categories.some((c) => c.id === FALLBACK_CATEGORY_ID)) {
    return { error: "The Other category cannot be deleted.", categories, contacts };
  }

  const fallback =
    categories.find((c) => c.id === FALLBACK_CATEGORY_ID)?.id ?? categories[0]?.id;
  if (!fallback) return { error: "No fallback category.", categories, contacts };

  const nextCategories = categories.filter((c) => c.id !== id);
  const nextContacts = contacts.map((c) =>
    c.category === id ? { ...c, category: fallback, updatedAt: Date.now() } : c,
  );

  saveCategories(owner, nextCategories);
  saveContacts(owner, nextContacts);
  return { error: null, categories: nextCategories, contacts: nextContacts };
}

export function resetCategories(owner: string) {
  const defaults = [...DEFAULT_CONTACT_CATEGORIES];
  saveCategories(owner, defaults);
  return defaults;
}

export function upsertContact(
  owner: string,
  contacts: Contact[],
  categories: ContactCategoryDef[],
  input: { id?: string; name: string; category: ContactCategory; wallet: string },
) {
  const error = validateContactInput(input, categories);
  if (error) return { error, contacts };

  const wallet = normalizeWallet(input.wallet)!;
  const name = input.name.trim();
  const now = Date.now();
  const duplicate = contacts.find(
    (c) => c.wallet.toLowerCase() === wallet.toLowerCase() && c.id !== input.id,
  );
  if (duplicate) return { error: "That wallet is already saved.", contacts };

  if (input.id) {
    const next = contacts.map((c) =>
      c.id === input.id ? { ...c, name, category: input.category, wallet, updatedAt: now } : c,
    );
    saveContacts(owner, next);
    return { error: null, contacts: next };
  }

  const next = [
    ...contacts,
    {
      id: newContactId(),
      name,
      category: input.category,
      wallet,
      createdAt: now,
      updatedAt: now,
    },
  ].sort((a, b) => a.name.localeCompare(b.name));
  saveContacts(owner, next);
  return { error: null, contacts: next };
}

export function removeContact(owner: string, contacts: Contact[], id: string) {
  const next = contacts.filter((c) => c.id !== id);
  saveContacts(owner, next);
  return next;
}
