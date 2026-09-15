"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookUserIcon, CheckIcon, SearchIcon } from "lucide-react";
import { isAddress } from "viem";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useContacts } from "@/hooks/useContacts";
import { shorten } from "@/lib/form-time";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  style?: React.CSSProperties;
  compact?: boolean;
};

function shortAddr(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ContactAddressInput({
  id,
  value,
  onChange,
  label,
  hint,
  error,
  placeholder = "0x… wallet address",
  className,
  inputClassName,
  style,
  compact = false,
}: Props) {
  const { contacts, isConnected, resolveCategoryLabel } = useContacts();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matched = useMemo(
    () =>
      contacts.find((c) => c.wallet.toLowerCase() === value.trim().toLowerCase()) ?? null,
    [contacts, value],
  );

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

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function pick(wallet: string) {
    onChange(wallet);
    setOpen(false);
  }

  const invalid = Boolean(value && !isAddress(value));
  const fieldError = error || (invalid ? "Invalid address." : null);

  const inputRow = (
    <div className={cn("flex items-stretch gap-2", compact ? className : undefined)} style={style}>
      <input
        id={id}
        className={cn("af-input mono min-w-0 flex-1", inputClassName)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
      />
      <button
        type="button"
        className="btn ghost shrink-0 self-stretch"
        style={{
          width: "var(--af-control-h)",
          minWidth: "var(--af-control-h)",
          minHeight: "var(--af-control-h)",
          height: "auto",
          padding: 0,
        }}
        onClick={() => setOpen(true)}
        title="Pick from contacts"
        aria-label="Pick from contacts"
        disabled={!isConnected}
      >
        <BookUserIcon className="size-4" />
      </button>
    </div>
  );

  const picker = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pick contact</DialogTitle>
          <DialogDescription>Search by name, category, or wallet address.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-4 py-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/40" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts"
              className="h-9 border-white/12 bg-black/30 pl-8 text-white placeholder:text-white/40"
            />
          </div>

          <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-white/8 bg-black/25">
            {contacts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/60">
                <p>No contacts saved yet.</p>
                <Link href="/dashboard/contacts/add" className="mt-2 inline-block text-primary hover:underline">
                  Add contacts →
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-white/60">No contacts match that search.</p>
            ) : (
              <ul className="p-1.5">
                {filtered.map((contact) => {
                  const active = value.toLowerCase() === contact.wallet.toLowerCase();
                  return (
                    <li key={contact.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          active ? "bg-primary/20" : "hover:bg-white/8",
                        )}
                        onClick={() => pick(contact.wallet)}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {contact.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium text-white">{contact.name}</span>
                            {active ? <CheckIcon className="size-3.5 text-primary" /> : null}
                          </span>
                          <span className="block truncate font-mono text-xs text-white/55">
                            {shortAddr(contact.wallet)}
                          </span>
                        </span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {resolveCategoryLabel(contact.category)}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (compact) {
    return (
      <>
        {inputRow}
        {picker}
      </>
    );
  }

  return (
    <div className={cn("field", className)}>
      {label ? (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      {inputRow}
      {fieldError ? (
        <p className="field-error">{fieldError}</p>
      ) : hint ? (
        <p className="field-hint">
          {matched ? `${matched.name} · ${shorten(matched.wallet)}` : hint}
        </p>
      ) : matched ? (
        <p className="field-hint">{matched.name} · {shorten(matched.wallet)}</p>
      ) : null}
      {picker}
    </div>
  );
}
