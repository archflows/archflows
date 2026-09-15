"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookUserIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  TagsIcon,
  Trash2Icon,
} from "lucide-react";
import { isAddress } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { useContacts } from "@/hooks/useContacts";
import { FALLBACK_CATEGORY_ID, type Contact, type ContactCategory } from "@/lib/contacts";
import { shorten } from "@/lib/form-time";
import { cn } from "@/lib/utils";

type ContactFormState = {
  name: string;
  category: ContactCategory;
  wallet: string;
};

export function ContactsPanel() {
  const {
    contacts,
    categories,
    ready,
    isConnected,
    addContact,
    updateContact,
    deleteContact,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategories,
    resolveCategoryLabel,
  } = useContacts();

  const [query, setQuery] = useState("");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>({
    name: "",
    category: categories[0]?.id ?? FALLBACK_CATEGORY_ID,
    wallet: "",
  });
  const [categoryLabel, setCategoryLabel] = useState("");
  const [contactFormError, setContactFormError] = useState<string | null>(null);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const contact of contacts) {
      counts.set(contact.category, (counts.get(contact.category) ?? 0) + 1);
    }
    return counts;
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.wallet.toLowerCase().includes(q) ||
        resolveCategoryLabel(c.category).toLowerCase().includes(q)
      );
    });
  }, [contacts, query, resolveCategoryLabel]);

  function openCreateContact() {
    setEditingContact(null);
    setContactForm({
      name: "",
      category: categories[0]?.id ?? FALLBACK_CATEGORY_ID,
      wallet: "",
    });
    setContactFormError(null);
    setContactDialogOpen(true);
  }

  function openEditContact(contact: Contact) {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      category: contact.category,
      wallet: contact.wallet,
    });
    setContactFormError(null);
    setContactDialogOpen(true);
  }

  function closeContactDialog() {
    setContactDialogOpen(false);
    setEditingContact(null);
    setContactFormError(null);
  }

  function saveContact() {
    const error = editingContact
      ? updateContact({ id: editingContact.id, ...contactForm })
      : addContact(contactForm);
    if (error) {
      setContactFormError(error);
      return;
    }
    closeContactDialog();
  }

  function removeContactRow(contact: Contact) {
    if (!window.confirm(`Remove ${contact.name} from contacts?`)) return;
    deleteContact(contact.id);
  }

  function openCreateCategory() {
    setEditingCategoryId(null);
    setCategoryLabel("");
    setCategoryFormError(null);
    setCategoryDialogOpen(true);
  }

  function openEditCategory(id: string, label: string) {
    setEditingCategoryId(id);
    setCategoryLabel(label);
    setCategoryFormError(null);
    setCategoryDialogOpen(true);
  }

  function closeCategoryDialog() {
    setCategoryDialogOpen(false);
    setEditingCategoryId(null);
    setCategoryLabel("");
    setCategoryFormError(null);
  }

  function saveCategory() {
    const error = editingCategoryId
      ? updateCategory({ id: editingCategoryId, label: categoryLabel })
      : addCategory(categoryLabel);
    if (error) {
      setCategoryFormError(error);
      return;
    }
    closeCategoryDialog();
  }

  function removeCategoryRow(id: string, label: string) {
    const count = categoryCounts.get(id) ?? 0;
    const message =
      count > 0
        ? `Delete "${label}"? ${count} contact${count === 1 ? "" : "s"} will move to Other.`
        : `Delete category "${label}"?`;
    if (!window.confirm(message)) return;
    const error = deleteCategory(id);
    if (error) window.alert(error);
  }

  if (!isConnected) {
    return (
      <Card className="shadow-none ring-0">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <BookUserIcon className="size-4 text-primary" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Connect your wallet to save and manage recipient contacts.
          </p>
          <Link href="/auth?next=/dashboard/contacts" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
            Connect wallet
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-none ring-0">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <TagsIcon className="size-4 text-primary" />
              Master categories
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => {
                  if (window.confirm("Reset categories to defaults? Custom labels will be lost.")) {
                    resetCategories();
                  }
                }}
              >
                <RotateCcwIcon className="size-3.5" />
                Reset defaults
              </button>
              <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={openCreateCategory}>
                <PlusIcon className="size-3.5" />
                Add category
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Manage category labels used when saving contacts. Contacts keep their category when you rename one.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((category) => {
              const count = categoryCounts.get(category.id) ?? 0;
              const protectedCategory = category.id === FALLBACK_CATEGORY_ID;
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{category.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {count} contact{count === 1 ? "" : "s"}
                      {protectedCategory ? " · default fallback" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => openEditCategory(category.id, category.label)}
                      title="Edit category"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={protectedCategory}
                      onClick={() => removeCategoryRow(category.id, category.label)}
                      title={protectedCategory ? "Other cannot be deleted" : "Delete category"}
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none ring-0">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BookUserIcon className="size-4 text-primary" />
              Contacts
            </CardTitle>
            <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={openCreateContact}>
              <PlusIcon className="size-3.5" />
              Add contact
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="relative max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, category, or wallet"
              className="h-9 border-white/12 bg-black/30 pl-8 text-white placeholder:text-white/40"
            />
          </div>

          {!ready ? (
            <p className="text-sm text-muted-foreground">Loading contacts…</p>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl bg-black/20 px-4 py-6">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookUserIcon className="size-4" />
              </span>
              <div>
                <p className="font-medium text-foreground">No contacts yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Save wallets with a name and category, then pick them when creating locks, vests, or streams.
                </p>
              </div>
              <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={openCreateContact}>
                Add your first contact
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl bg-black/20 px-4 py-6 text-sm text-muted-foreground">
              No contacts match that search.
            </div>
          ) : (
            <div className="grid gap-2">
              {filtered.map((contact) => (
                <div
                  key={contact.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{contact.name}</p>
                      <Badge variant="outline">{resolveCategoryLabel(contact.category)}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{contact.wallet}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => openEditContact(contact)}
                      title="Edit contact"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => removeContactRow(contact)}
                      title="Delete contact"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={categoryDialogOpen} onOpenChange={(open) => (open ? setCategoryDialogOpen(true) : closeCategoryDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? "Edit category" : "Add category"}</DialogTitle>
            <DialogDescription>
              Category names appear in contact forms and the contact picker.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 py-2">
            <div className="field">
              <label className="field-label" htmlFor="category-label">Category name</label>
              <input
                id="category-label"
                className="af-input"
                placeholder="Advisor, Treasury, KOL…"
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
              />
            </div>
            {categoryFormError ? <p className="field-error">{categoryFormError}</p> : null}
          </div>

          <DialogFooter>
            <button type="button" className="btn ghost" onClick={closeCategoryDialog}>
              Cancel
            </button>
            <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={saveCategory}>
              {editingCategoryId ? "Save changes" : "Add category"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contactDialogOpen} onOpenChange={(open) => (open ? setContactDialogOpen(true) : closeContactDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit contact" : "Add contact"}</DialogTitle>
            <DialogDescription>
              Saved per connected wallet. Use these when picking recipients in lock, vest, and stream forms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 py-2">
            <div className="field">
              <label className="field-label" htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                className="af-input"
                placeholder="Alice, Treasury, Investor fund…"
                value={contactForm.name}
                onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="contact-category">Category</label>
              <select
                id="contact-category"
                className="af-input"
                value={contactForm.category}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, category: e.target.value }))
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="contact-wallet">Wallet</label>
              <input
                id="contact-wallet"
                className="af-input mono"
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                value={contactForm.wallet}
                onChange={(e) => setContactForm((prev) => ({ ...prev, wallet: e.target.value.trim() }))}
              />
              {contactForm.wallet && !isAddress(contactForm.wallet) ? (
                <p className="field-error">Invalid wallet address.</p>
              ) : editingContact ? (
                <p className="field-hint">Current: {shorten(editingContact.wallet)}</p>
              ) : null}
            </div>

            {contactFormError ? <p className="field-error">{contactFormError}</p> : null}
          </div>

          <DialogFooter>
            <button type="button" className="btn ghost" onClick={closeContactDialog}>
              Cancel
            </button>
            <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={saveContact}>
              {editingContact ? "Save changes" : "Add contact"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
