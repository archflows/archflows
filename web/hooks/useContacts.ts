"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import {
  createContact as createContactApi,
  createContactCategory,
  deleteContact as deleteContactApi,
  deleteContactCategory,
  getContactBook,
  resetContactCategories,
  syncContactBook,
  updateContact as updateContactApi,
  updateContactCategory,
} from "@/lib/backend";
import {
  CONTACTS_CHANGED_EVENT,
  DEFAULT_CONTACT_CATEGORIES,
  exportLocalContactBook,
  normalizeWallet,
  shouldMigrateLocalContacts,
  validateCategoryLabel,
  validateContactInput,
  type Contact,
  type ContactCategory,
  type ContactCategoryDef,
} from "@/lib/contacts";

function bookQueryKey(address?: string) {
  return ["contacts", "book", address?.toLowerCase()];
}

export function useContacts() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<ContactCategoryDef[]>(DEFAULT_CONTACT_CATEGORIES);
  const [ready, setReady] = useState(false);

  const bookQuery = useQuery({
    queryKey: bookQueryKey(address),
    queryFn: async () => {
      if (!address) {
        return { contacts: [], categories: [...DEFAULT_CONTACT_CATEGORIES] };
      }

      const local = exportLocalContactBook(address);

      let book = await getContactBook(address);
      if (!book) {
        if (local.contacts.length > 0 || shouldMigrateLocalContacts(address)) {
          return local;
        }
        return { contacts: [], categories: [...DEFAULT_CONTACT_CATEGORIES] };
      }

      if (book.contacts.length === 0 && shouldMigrateLocalContacts(address)) {
        const migrated = await syncContactBook({
          wallet: address,
          contacts: local.contacts,
          categories: local.categories,
        });
        if (migrated) {
          book = migrated;
        } else if (local.contacts.length > 0) {
          return local;
        }
      }

      return book;
    },
    enabled: Boolean(address),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!address) {
      setContacts([]);
      setCategories([...DEFAULT_CONTACT_CATEGORIES]);
      setReady(true);
      return;
    }

    if (bookQuery.isPending) {
      setReady(false);
      return;
    }

    const book = bookQuery.data;
    setContacts(
      (book?.contacts ?? []).map((contact) => ({
        ...contact,
        wallet: contact.wallet as `0x${string}`,
      })),
    );
    setCategories(book?.categories?.length ? book.categories : [...DEFAULT_CONTACT_CATEGORIES]);
    setReady(true);
  }, [address, bookQuery.data, bookQuery.isPending]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: bookQueryKey(address) });
  }, [address, queryClient]);

  const reload = useCallback(() => {
    invalidate();
  }, [invalidate]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const owner = (event as CustomEvent<{ owner?: string }>).detail?.owner;
      if (!address || owner === address.toLowerCase()) invalidate();
    };
    window.addEventListener(CONTACTS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CONTACTS_CHANGED_EVENT, onChanged);
  }, [address, invalidate]);

  const addContact = useCallback(
    async (input: { name: string; category: ContactCategory; wallet: string }) => {
      if (!address) return "Connect a wallet first.";
      const validationError = validateContactInput(input, categories);
      if (validationError) return validationError;
      const wallet = normalizeWallet(input.wallet);
      if (wallet && contacts.some((c) => c.wallet.toLowerCase() === wallet.toLowerCase())) {
        return "That wallet is already saved.";
      }
      const created = await createContactApi({
        wallet: address,
        name: input.name,
        category: input.category,
        walletAddress: input.wallet,
      });
      if (!created) return "Could not save contact.";
      invalidate();
      return null;
    },
    [address, categories, contacts, invalidate],
  );

  const updateContact = useCallback(
    async (input: { id: string; name: string; category: ContactCategory; wallet: string }) => {
      if (!address) return "Connect a wallet first.";
      const validationError = validateContactInput(input, categories);
      if (validationError) return validationError;
      const wallet = normalizeWallet(input.wallet);
      if (
        wallet &&
        contacts.some(
          (c) => c.wallet.toLowerCase() === wallet.toLowerCase() && c.id !== input.id,
        )
      ) {
        return "That wallet is already saved.";
      }
      const updated = await updateContactApi({
        wallet: address,
        id: input.id,
        name: input.name,
        category: input.category,
        walletAddress: input.wallet,
      });
      if (!updated) return "Could not update contact.";
      invalidate();
      return null;
    },
    [address, categories, contacts, invalidate],
  );

  const deleteContact = useCallback(
    async (id: string) => {
      if (!address) return;
      await deleteContactApi(address, id);
      invalidate();
    },
    [address, invalidate],
  );

  const addCategory = useCallback(
    async (label: string) => {
      if (!address) return "Connect a wallet first.";
      const validationError = validateCategoryLabel(label, categories);
      if (validationError) return validationError;
      const created = await createContactCategory(address, label);
      if (!created) return "Could not create category.";
      invalidate();
      return null;
    },
    [address, invalidate],
  );

  const updateCategory = useCallback(
    async (input: { id: string; label: string }) => {
      if (!address) return "Connect a wallet first.";
      const validationError = validateCategoryLabel(input.label, categories, input.id);
      if (validationError) return validationError;
      const updated = await updateContactCategory(address, input.id, input.label);
      if (!updated) return "Could not update category.";
      invalidate();
      return null;
    },
    [address, invalidate],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!address) return "Connect a wallet first.";
      const book = await deleteContactCategory(address, id);
      if (!book) return "Could not delete category.";
      invalidate();
      return null;
    },
    [address, invalidate],
  );

  const resetCategories = useCallback(async () => {
    if (!address) return;
    await resetContactCategories(address);
    invalidate();
  }, [address, invalidate]);

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
