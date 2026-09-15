"use client";

import { useAppKit } from "@reown/appkit/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/useMounted";

type Props = {
  className?: string;
  size?: "default" | "sm" | "lg";
  label?: string;
  /** Button only — no helper text. For tight spots like the nav bar. */
  compact?: boolean;
};

export function WalletConnectButton({
  className,
  size = "lg",
  label = "Connect wallet",
  compact = false,
}: Props) {
  const mounted = useMounted();
  const { open } = useAppKit();

  const trigger = (
    <button
      type="button"
      disabled={!mounted}
      onClick={() => {
        void (async () => {
          try {
            await open({ view: "Connect" });
          } catch (error) {
            console.warn("[wallet]", error);
            toast.error("Could not open the wallet modal.");
          }
        })();
      }}
      className={cn(
        "btn",
        size === "sm" && "sm",
        size === "lg" && "lg block",
        size === "default" && "block",
        className,
      )}
    >
      {label}
    </button>
  );

  if (compact) return trigger;

  return <div className="space-y-2">{trigger}</div>;
}
