"use client";

import { useMemo, useState } from "react";
import { PencilIcon, PlusIcon, RotateCcwIcon, TagsIcon, Trash2Icon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button-variants";
import { useContacts } from "@/hooks/useContacts";
import { FALLBACK_CATEGORY_ID } from "@/lib/contacts";
import { cn } from "@/lib/utils";
import { ContactsWalletGate } from "@/components/contacts/wallet-gate";

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

  function remove(id: string, name: string) {
    const count = categoryCounts.get(id) ?? 0;
    const message =
      count > 0
        ? `Delete "${name}"? ${count} contact${count === 1 ? "" : "s"} will move to Other.`
        : `Delete category "${name}"?`;
    if (!window.confirm(message)) return;
    const error = deleteCategory(id);
    if (error) window.alert(error);
  }

  if (!isConnected) {
    return <ContactsWalletGate title="Category settings" nextPath="/dashboard/contacts/categories" />;
  }

  return (
    <>
      <Card className="shadow-none ring-0">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <TagsIcon className="size-4 text-primary" />
              Category settings
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
              <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={openCreate}>
                <PlusIcon className="size-3.5" />
                Add category
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Master categories for contacts. Renaming keeps existing assignments; deleting moves contacts to Other.
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
                      onClick={() => openEdit(category.id, category.label)}
                      title="Edit category"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={protectedCategory}
                      onClick={() => remove(category.id, category.label)}
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
            <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={save}>
              {editingId ? "Save changes" : "Add category"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
