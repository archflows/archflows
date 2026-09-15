"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { isAddress } from "viem";
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
import { useContacts } from "@/hooks/useContacts";
import { FALLBACK_CATEGORY_ID, type Contact, type ContactCategory } from "@/lib/contacts";
import { shorten } from "@/lib/form-time";
import { ContactsWalletGate } from "@/components/contacts/wallet-gate";
import { ContactsQuickActionsAside } from "@/components/contacts/quick-actions-aside";
import { useConfirm } from "@/components/confirm-provider";
import { notify } from "@/lib/notify";
import { ContactsShell } from "@/components/contacts/contacts-shell";

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
  const { confirm } = useConfirm();

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

  async function remove(contact: Contact) {
    const ok = await confirm({
      title: "Remove contact?",
      description: `${contact.name} will be removed from your saved contacts.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    deleteContact(contact.id);
    notify.success("Contact removed", contact.name);
  }

  if (!isConnected) {
    return <ContactsWalletGate title="Contact list" nextPath="/dashboard/contacts/list" />;
  }

  return (
    <ContactsShell>
      <div className="create-grid">
        <div className="panel">
          <div className="panel-head">
            <span>Contact list</span>
            <Link href="/dashboard/contacts/add" className="btn shrink-0">
              <PlusIcon className="size-3.5" />
              Add contact
            </Link>
          </div>
          <div className="panel-body">
            <div className="relative mb-4">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, category, or wallet"
                className="h-9 border-white/12 bg-black/30 pl-8 text-white placeholder:text-white/40"
              />
            </div>

            {!ready ? (
              <p className="panel-intro" style={{ margin: 0 }}>Loading contacts…</p>
            ) : contacts.length === 0 ? (
              <div className="mgmt-empty">
                <p className="mgmt-item-title">No contacts yet</p>
                <p>Add a wallet from the sidebar or open the add contact page.</p>
                <Link href="/dashboard/contacts/add" className="btn">
                  Add your first contact
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <p className="panel-intro" style={{ margin: 0 }}>No contacts match that search.</p>
            ) : (
              <div className="mgmt-list">
                {filtered.map((contact) => (
                  <div key={contact.id} className="mgmt-item">
                    <div className="mgmt-item-main">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="mgmt-item-title">{contact.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {resolveCategoryLabel(contact.category)}
                        </Badge>
                      </div>
                      <p className="mgmt-item-meta font-mono">{contact.wallet}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
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
                        onClick={() => void remove(contact)}
                        title="Delete contact"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside>
          <ContactsQuickActionsAside />
        </aside>
      </div>

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
            <button type="button" className="btn" onClick={save}>
              Save changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContactsShell>
  );
}
