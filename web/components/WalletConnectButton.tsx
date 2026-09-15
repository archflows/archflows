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

  const { connectAsync, connectors, isPending } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasInjected, setHasInjected] = useState(false);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!mounted) return;
    setHasInjected(typeof window.ethereum !== "undefined");
  }, [mounted]);

  const connector = useMemo(() => pickConnector(connectors), [connectors]);

  const onConnect = useCallback(async () => {
    if (lockRef.current || busy || isPending) return;
    setError("");

    const ethereum = window.ethereum;
    if (!ethereum) {
      setError("No browser wallet found. Install MetaMask (or Rabby), then refresh.");
      return;
    }
    if (!connector) {
      setError("Wallet connector is not ready. Refresh the page.");
      return;
    }

    lockRef.current = true;
    setBusy(true);

    try {
      // Single permission flow — do NOT also call eth_requestAccounts
      // (that causes MetaMask -32002 "already pending")
      try {
        await connectAsync({ connector, chainId: ARC_TESTNET.id });
      } catch (err) {
        const code = errCode(err);
        const message = errMessage(err);

        if (code === -32002 || /already pending/i.test(message)) {
          setError(
            "MetaMask popup is already open. Open the MetaMask extension, approve (or reject), then try again.",
          );
          return;
        }
        if (code === 4001 || /reject|denied|cancel/i.test(message)) {
          setError("Connection request was rejected in the wallet.");
          return;
        }

        // Retry without chainId, then switch/add Arc
        await connectAsync({ connector });
        try {
          await switchChainAsync({ chainId: ARC_TESTNET.id });
        } catch {
          try {
            await ensureArcNetwork(ethereum);
            await switchChainAsync({ chainId: ARC_TESTNET.id });
          } catch {
            setError("Connected. Switch the wallet network to Arc Testnet (5042002).");
          }
        }
      }
    } catch (err) {
      const code = errCode(err);
      const message = errMessage(err);
      if (code === -32002 || /already pending/i.test(message)) {
        setError(
          "MetaMask popup is already open. Open the MetaMask extension, approve (or reject), then try again.",
        );
      } else if (code === 4001 || /reject|denied|cancel/i.test(message)) {
        setError("Connection request was rejected in the wallet.");
      } else {
        setError(message.split("\n")[0]);
      }
    } finally {
      setBusy(false);
      lockRef.current = false;
    }
  }, [busy, connectAsync, connector, isPending, switchChainAsync]);

  const loading = busy || isPending;

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
