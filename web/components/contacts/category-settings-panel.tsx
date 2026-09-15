"use client";

import { useMemo, useState } from "react";
import { PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContacts } from "@/hooks/useContacts";
import { FALLBACK_CATEGORY_ID } from "@/lib/contacts";
import { ContactsWalletGate } from "@/components/contacts/wallet-gate";
import { RecentContactsAside } from "@/components/contacts/recent-contacts-aside";
import { ContactsQuickActionsAside } from "@/components/contacts/quick-actions-aside";
import { ContactsShell } from "@/components/contacts/contacts-shell";
import { useConfirm } from "@/components/confirm-provider";
import { notify } from "@/lib/notify";

export function CategorySettingsPanel() {
  const {
    contacts,
    categories,
    isConnected,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategories,
  } = useContacts();
  const { confirm } = useConfirm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const contact of contacts) {
      counts.set(contact.category, (counts.get(contact.category) ?? 0) + 1);
    }
    return counts;
  }, [contacts]);

  function openCreate() {
    setEditingId(null);
    setLabel("");
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(id: string, currentLabel: string) {
    setEditingId(id);
    setLabel(currentLabel);
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setLabel("");
    setFormError(null);
  }

  function save() {
    const error = editingId ? updateCategory({ id: editingId, label }) : addCategory(label);
    if (error) {
      setFormError(error);
      return;
    }
    closeDialog();
  }

  async function remove(id: string, name: string) {
    const count = categoryCounts.get(id) ?? 0;
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description:
        count > 0
          ? `${count} contact${count === 1 ? "" : "s"} will move to Other.`
          : "This category will be removed from your master list.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const error = deleteCategory(id);
    if (error) {
      notify.error(error);
      return;
    }
    notify.success("Category deleted", name);
  }

  async function resetDefaults() {
    const ok = await confirm({
      title: "Reset categories?",
      description: "Custom category labels will be lost and defaults will be restored.",
      confirmLabel: "Reset defaults",
      destructive: true,
    });
    if (!ok) return;
    resetCategories();
    notify.success("Categories reset to defaults");
  }

  if (!isConnected) {
    return <ContactsWalletGate title="Category settings" nextPath="/dashboard/contacts/categories" />;
  }

  return (
    <ContactsShell>
      <div className="create-grid">
        <div className="panel">
          <div className="panel-head">
            <span>Category settings</span>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn ghost"
                onClick={() => void resetDefaults()}
              >
                <RotateCcwIcon className="size-3.5" />
                Reset
              </button>
              <button type="button" className="btn" onClick={openCreate}>
                <PlusIcon className="size-3.5" />
                Add
              </button>
            </div>
          </div>
          <div className="panel-body">
            <p className="panel-intro">
              Master labels for contacts. Rename keeps assignments; delete moves contacts to Other.
            </p>
            <div className="mgmt-list">
              {categories.map((category) => {
                const count = categoryCounts.get(category.id) ?? 0;
                const protectedCategory = category.id === FALLBACK_CATEGORY_ID;
                return (
                  <div key={category.id} className="mgmt-item">
                    <div className="mgmt-item-main">
                      <p className="mgmt-item-title">{category.label}</p>
                      <p className="mgmt-item-meta">
                        {count} contact{count === 1 ? "" : "s"}
                        {protectedCategory ? " · default fallback" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => openEdit(category.id, category.label)}
                        title="Edit category"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        disabled={protectedCategory}
                        onClick={() => void remove(category.id, category.label)}
                        title={protectedCategory ? "Other cannot be deleted" : "Delete category"}
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside>
          <ContactsQuickActionsAside />
          <RecentContactsAside />
        </aside>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit category" : "Add category"}</DialogTitle>
            <DialogDescription>Category names appear in contact forms and the contact picker.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-4 py-2">
            <div className="field">
              <label className="field-label" htmlFor="category-label">Category name</label>
              <input
                id="category-label"
                className="af-input"
                placeholder="Advisor, Treasury, KOL…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            {formError ? <p className="field-error">{formError}</p> : null}
          </div>
          <DialogFooter>
            <button type="button" className="btn ghost" onClick={closeDialog}>Cancel</button>
            <button type="button" className="btn" onClick={save}>
              {editingId ? "Save changes" : "Add category"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContactsShell>
  );
}
