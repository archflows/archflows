"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  CONTACTS_CHANGED_EVENT,
  DEFAULT_CONTACT_CATEGORIES,
  loadCategories,
  loadContacts,
  removeCategory as removeStoredCategory,
  removeContact as removeStoredContact,
  resetCategories as resetStoredCategories,
  upsertCategory as upsertStoredCategory,
  type Contact,
  type ContactCategory,
  type ContactCategoryDef,
  upsertContact,
} from "@/lib/contacts";

export function useContacts() {
  const { address, isConnected } = useAccount();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<ContactCategoryDef[]>(DEFAULT_CONTACT_CATEGORIES);
  const [ready, setReady] = useState(false);

  const reload = useCallback(() => {
    if (!address) {
      setContacts([]);
      setCategories([...DEFAULT_CONTACT_CATEGORIES]);
      setReady(true);
      return;
    }
    setContacts(loadContacts(address));
    setCategories(loadCategories(address));
    setReady(true);
  }, [address]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const owner = (event as CustomEvent<{ owner?: string }>).detail?.owner;
      if (!address || owner === address.toLowerCase()) reload();
    };
    const onStorage = (event: StorageEvent) => {
      if (!address) return;
      if (event.key?.includes(address.toLowerCase())) reload();
    };
    window.addEventListener(CONTACTS_CHANGED_EVENT, onChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONTACTS_CHANGED_EVENT, onChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [address, reload]);

  const addContact = useCallback(
    (input: { name: string; category: ContactCategory; wallet: string }) => {
      if (!address) return "Connect a wallet first.";
      const result = upsertContact(address, contacts, categories, input);
      setContacts(result.contacts);
      return result.error;
    },
    [address, contacts, categories],
  );

  const updateContact = useCallback(
    (input: { id: string; name: string; category: ContactCategory; wallet: string }) => {
      if (!address) return "Connect a wallet first.";
      const result = upsertContact(address, contacts, categories, input);
      setContacts(result.contacts);
      return result.error;
    },
    [address, contacts, categories],
  );

  const deleteContact = useCallback(
    (id: string) => {
      if (!address) return;
      setContacts(removeStoredContact(address, contacts, id));
    },
    [address, contacts],
  );

  const addCategory = useCallback(
    (label: string) => {
      if (!address) return "Connect a wallet first.";
      const result = upsertStoredCategory(address, categories, { label });
      setCategories(result.categories);
      return result.error;
    },
    [address, categories],
  );

  const updateCategory = useCallback(
    (input: { id: string; label: string }) => {
      if (!address) return "Connect a wallet first.";
      const result = upsertStoredCategory(address, categories, input);
      setCategories(result.categories);
      return result.error;
    },
    [address, categories],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      if (!address) return "Connect a wallet first.";
      const result = removeStoredCategory(address, categories, contacts, id);
      if (result.error) return result.error;
      setCategories(result.categories);
      setContacts(result.contacts);
      return null;
    },
    [address, categories, contacts],
  );

  const resetCategories = useCallback(() => {
    if (!address) return;
    setCategories(resetStoredCategories(address));
  }, [address]);

  const resolveCategoryLabel = useCallback(
    (categoryId: string) => {
      return categories.find((c) => c.id === categoryId)?.label ?? categoryId;
    },
    [categories],
  );

  return {
    contacts,
    categories,
    ready,
    isConnected,
    owner: address,
    addContact,
    updateContact,
    deleteContact,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategories,
    resolveCategoryLabel,
    reload,
  };
}
