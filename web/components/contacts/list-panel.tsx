"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookUserIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
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
import { ContactsWalletGate } from "@/components/contacts/wallet-gate";

type FormState = {
  name: string;
  category: ContactCategory;
  wallet: string;
};

export function ContactsListPanel() {
  const {
    contacts,
    categories,
    ready,
    isConnected,
    updateContact,
    deleteContact,
    resolveCategoryLabel,
  } = useContacts();

  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    category: categories[0]?.id ?? FALLBACK_CATEGORY_ID,
    wallet: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

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

  function openEdit(contact: Contact) {
    setEditing(contact);
    setForm({
      name: contact.name,
      category: contact.category,
      wallet: contact.wallet,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setFormError(null);
  }

  function save() {
    if (!editing) return;
    const error = updateContact({ id: editing.id, ...form });
    if (error) {
      setFormError(error);
      return;
    }
    closeDialog();
  }

  function remove(contact: Contact) {
    if (!window.confirm(`Remove ${contact.name} from contacts?`)) return;
    deleteContact(contact.id);
  }

  if (!isConnected) {
    return <ContactsWalletGate title="Contact list" nextPath="/dashboard/contacts/list" />;
  }

  return (
    <>
      <Card className="shadow-none ring-0">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BookUserIcon className="size-4 text-primary" />
              Contact list
            </CardTitle>
            <Link href="/dashboard/contacts/add" className={cn(buttonVariants({ size: "sm" }))}>
              <PlusIcon className="size-3.5" />
              Add contact
            </Link>
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
              <Link href="/dashboard/contacts/add" className={cn(buttonVariants({ size: "sm" }))}>
                Add your first contact
              </Link>
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
                      onClick={() => openEdit(contact)}
                      title="Edit contact"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => remove(contact)}
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

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
            <DialogDescription>Update name, category, or wallet for this saved contact.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-4 py-2">
            <div className="field">
              <label className="field-label" htmlFor="edit-contact-name">Name</label>
              <input
                id="edit-contact-name"
                className="af-input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="edit-contact-category">Category</label>
              <select
                id="edit-contact-category"
                className="af-input"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="edit-contact-wallet">Wallet</label>
              <input
                id="edit-contact-wallet"
                className="af-input mono"
                value={form.wallet}
                onChange={(e) => setForm((prev) => ({ ...prev, wallet: e.target.value.trim() }))}
              />
              {form.wallet && !isAddress(form.wallet) ? (
                <p className="field-error">Invalid wallet address.</p>
              ) : editing ? (
                <p className="field-hint">Current: {shorten(editing.wallet)}</p>
              ) : null}
            </div>
            {formError ? <p className="field-error">{formError}</p> : null}
          </div>
          <DialogFooter>
            <button type="button" className="btn ghost" onClick={closeDialog}>Cancel</button>
            <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={save}>
              Save changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
