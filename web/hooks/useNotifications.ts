"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { fetchArcFlowLogsFromExplorer } from "@/lib/arcflow-logs";
import {
  getReferralOverview,
  listCampaigns,
  listEscrow,
  listPools,
  listStreams,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotifications,
} from "@/lib/backend";
import {
  buildCampaignNotifications,
  buildEscrowNotifications,
  buildLockNotifications,
  buildPoolNotifications,
  buildReferralNotifications,
  buildStreamNotifications,
  loadReadIds,
  mergeNotifications,
  notificationFromStored,
  notificationToStored,
  type AppNotification,
} from "@/lib/notifications";
import { useWalletPositions } from "@/hooks/useWalletPositions";

const POLL_MS = 60_000;

export function useNotifications() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { rows, pending: positionsPending } = useWalletPositions();

  const logsQuery = useQuery({
    queryKey: ["notifications", "logs"],
    queryFn: () => fetchArcFlowLogsFromExplorer(8),
    enabled: Boolean(address),
    staleTime: POLL_MS,
    refetchInterval: POLL_MS,
  });

  const backendQuery = useQuery({
    queryKey: ["notifications", "backend", address],
    queryFn: async () => {
      if (!address) return null;
      const [sent, received, campaigns, escrowBuyer, escrowSeller, pools, referral] =
        await Promise.all([
          listStreams({ sender: address }),
          listStreams({ recipient: address }),
          listCampaigns({ funder: address }),
          listEscrow({ buyer: address }),
          listEscrow({ seller: address }),
          listPools({ owner: address }),
          getReferralOverview(address),
        ]);

      const escrowMap = new Map<string, Record<string, unknown>>();
      for (const row of escrowBuyer?.items ?? []) escrowMap.set(String(row.id), row);
      for (const row of escrowSeller?.items ?? []) escrowMap.set(String(row.id), row);

      return {
        sent: sent?.items ?? [],
        received: received?.items ?? [],
        campaigns: campaigns?.items ?? [],
        escrow: [...escrowMap.values()],
        pools: pools?.items ?? [],
        referral,
      };
    },
    enabled: Boolean(address),
    staleTime: POLL_MS,
    refetchInterval: POLL_MS,
  });

  const computed = useMemo<AppNotification[]>(() => {
    if (!address) return [];
    try {
      const logs = logsQuery.data ?? [];
      const backend = backendQuery.data;
      const referral = backend?.referral;

      return mergeNotifications([
        ...buildLockNotifications(rows, logs, address),
        ...buildStreamNotifications(backend?.sent ?? [], backend?.received ?? [], address),
        ...buildCampaignNotifications(backend?.campaigns ?? [], address),
        ...buildEscrowNotifications(backend?.escrow ?? [], address),
        ...buildPoolNotifications(backend?.pools ?? []),
        ...buildReferralNotifications(
          referral
            ? {
                totals: {
                  availableUsdc: String(referral.totals?.availableUsdc ?? "0"),
                  netUsdc: String(referral.totals?.netUsdc ?? "0"),
                },
                referees: (referral.referees ?? []).map((r) => ({
                  wallet: r.wallet,
                  created_at: r.created_at,
                  activated_at: r.activated_at,
                })),
                earnings: (referral.earnings ?? []).map((e) => ({
                  amount_usdc: e.net_usdc,
                  created_at: e.created_at,
                  referee_wallet: e.referee,
                })),
              }
            : null,
        ),
      ]);
    } catch (error) {
      console.warn("[notifications] build failed", error);
      return [];
    }
  }, [address, rows, logsQuery.data, backendQuery.data]);

  const computedKey = useMemo(
    () => computed.map((item) => item.id).sort().join("|"),
    [computed],
  );

  const sourcesReady =
    Boolean(address) &&
    !positionsPending &&
    !logsQuery.isPending &&
    !backendQuery.isPending;

  const inboxQuery = useQuery({
    queryKey: ["notifications", "inbox", address, computedKey],
    queryFn: async () => {
      if (!address) return { items: [], unread: 0 };
      const readIds = [...loadReadIds(address)];
      const result = await syncNotifications({
        wallet: address,
        items: computed.map(notificationToStored),
        readIds,
      });
      return result ?? { items: [], unread: 0 };
    },
    enabled: sourcesReady,
    staleTime: POLL_MS,
    refetchInterval: POLL_MS,
  });

  const notifications = useMemo<AppNotification[]>(() => {
    if (inboxQuery.data?.items) {
      return inboxQuery.data.items.map(notificationFromStored);
    }
    return computed;
  }, [inboxQuery.data, computed]);

  const readMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const item of inboxQuery.data?.items ?? []) {
      map.set(item.id, item.read);
    }
    return map;
  }, [inboxQuery.data]);

  const unreadCount = useMemo(() => {
    if (inboxQuery.data) return inboxQuery.data.unread;
    const localRead = loadReadIds(address);
    return notifications.filter((n) => !localRead.has(n.id)).length;
  }, [inboxQuery.data, notifications, address]);

  const unreadActionable = useMemo(
    () =>
      notifications.filter((n) => {
        if (n.kind !== "action") return false;
        if (readMap.has(n.id)) return !readMap.get(n.id);
        return !loadReadIds(address).has(n.id);
      }).length,
    [notifications, readMap, address],
  );

  const invalidateInbox = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["notifications", "inbox", address] });
  }, [queryClient, address]);

  const markRead = useCallback(
    (id: string) => {
      if (!address) return;
      queryClient.setQueryData<{ items: { id: string; read: boolean }[]; unread: number }>(
        ["notifications", "inbox", address, computedKey],
        (current) => {
          if (!current) return current;
          const items = current.items.map((item) =>
            item.id === id ? { ...item, read: true } : item,
          );
          const unread = items.filter((item) => !item.read).length;
          return { ...current, items, unread };
        },
      );
      void markNotificationRead(address, id).then(() => invalidateInbox());
    },
    [address, computedKey, invalidateInbox, queryClient],
  );

  const markAllRead = useCallback(() => {
    if (!address) return;
    queryClient.setQueryData<{ items: { id: string; read: boolean }[]; unread: number }>(
      ["notifications", "inbox", address, computedKey],
      (current) => {
        if (!current) return current;
        const items = current.items.map((item) => ({ ...item, read: true }));
        return { ...current, items, unread: 0 };
      },
    );
    void markAllNotificationsRead(address).then(() => invalidateInbox());
  }, [address, computedKey, invalidateInbox, queryClient]);

  const isRead = useCallback(
    (id: string) => {
      if (readMap.has(id)) return Boolean(readMap.get(id));
      return loadReadIds(address).has(id);
    },
    [readMap, address],
  );

  const pending = Boolean(address) && (positionsPending || logsQuery.isPending || backendQuery.isPending || inboxQuery.isPending);

  return {
    address,
    notifications,
    unreadCount,
    unreadActionable,
    pending,
    markRead,
    markAllRead,
    isRead,
    refetch: () => {
      void logsQuery.refetch();
      void backendQuery.refetch();
      void inboxQuery.refetch();
    },
  };
}
