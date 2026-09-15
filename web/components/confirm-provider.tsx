"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
} | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function finish(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && finish(false)}>
        <DialogContent className="gap-0 p-0">
          <DialogHeader>
            <DialogTitle>{pending?.title ?? "Confirm"}</DialogTitle>
            {pending?.description ? (
              <DialogDescription>{pending.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2 sm:flex-row">
            <button type="button" className="btn ghost" onClick={() => finish(false)}>
              {pending?.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              className={cn("btn", pending?.destructive && "bg-destructive hover:bg-destructive/90")}
              onClick={() => finish(true)}
            >
              {pending?.confirmLabel ?? "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
