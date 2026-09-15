"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookUserIcon } from "lucide-react";
import { isAddress } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { useContacts } from "@/hooks/useContacts";
import { FALLBACK_CATEGORY_ID, type ContactCategory } from "@/lib/contacts";
import { cn } from "@/lib/utils";
import { ContactsWalletGate } from "@/components/contacts/wallet-gate";

export function AddContactForm() {
  const router = useRouter();
  const { categories, isConnected, addContact } = useContacts();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ContactCategory>(categories[0]?.id ?? FALLBACK_CATEGORY_ID);
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === category)) {
      setCategory(categories[0]!.id);
    }
  }, [categories, category]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = addContact({ name, category, wallet });
    setSaving(false);
    if (result) {
      setError(result);
      return;
    }
    router.push("/dashboard/contacts/list");
  }

  if (!isConnected) {
    return <ContactsWalletGate title="Add contact" nextPath="/dashboard/contacts/add" />;
  }

  return (
    <Card className="shadow-none ring-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <BookUserIcon className="size-4 text-primary" />
          Add contact
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="mx-auto max-w-lg space-y-4" onSubmit={submit}>
          <div className="field">
            <label className="field-label" htmlFor="add-contact-name">Name</label>
            <input
              id="add-contact-name"
              className="af-input"
              placeholder="Alice, Treasury, Investor fund…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="add-contact-category">Category</label>
            <select
              id="add-contact-category"
              className="af-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <p className="field-hint">
              <Link href="/dashboard/contacts/categories" className="text-primary hover:underline">
                Manage categories
              </Link>
            </p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="add-contact-wallet">Wallet</label>
            <input
              id="add-contact-wallet"
              className="af-input mono"
              placeholder="0x…"
              autoComplete="off"
              spellCheck={false}
              value={wallet}
              onChange={(e) => setWallet(e.target.value.trim())}
              required
            />
            {wallet && !isAddress(wallet) ? (
              <p className="field-error">Invalid wallet address.</p>
            ) : (
              <p className="field-hint">Saved per connected wallet. Pick this contact in lock, vest, and stream forms.</p>
            )}
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              className={cn(buttonVariants({ size: "sm" }))}
              disabled={saving || !name.trim() || !wallet || !isAddress(wallet)}
            >
              {saving ? "Saving…" : "Save contact"}
            </button>
            <Link href="/dashboard/contacts/list" className="btn ghost sm">
              Cancel
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
