"use client";

import { useMemo, useState } from "react";
import { decodeEventLog, formatUnits, isAddress, keccak256, parseUnits, toBytes } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { erc20Abi, escrowAbi } from "@/lib/abi";
import { ARCFLOW_ESCROW_ADDRESS } from "@/lib/chain";
import {
  DAY,
  HOUR,
  MINUTE,
  ZERO,
  dateFmt,
  formatDuration,
  nowSec,
  parseCount,
  shorten,
} from "@/lib/form-time";
import { arcGas, MAX_U128, txMessage } from "@/lib/tx";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { TokenSelect } from "@/components/TokenSelect";
import { AmountPercentField } from "@/components/AmountPercentField";
import { DurationTriple, FormShell, PreviewPanel } from "@/components/forms/form-shell";
import { cn } from "@/lib/utils";

const MAX_ROWS = 30;
type Tab = "buying" | "selling";

export function CreateEscrowForm() {
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [seller, setSeller] = useState("");
  const [days, setDays] = useState("7");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [terms, setTerms] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "creating">("idle");

  const tokenAddress = isAddress(token) ? (token as `0x${string}`) : undefined;
  const sellerAddress = isAddress(seller) ? (seller as `0x${string}`) : undefined;
  const notDeployed = ARCFLOW_ESCROW_ADDRESS === ZERO;
  const timeout =
    parseCount(days) * DAY + parseCount(hours) * HOUR + parseCount(minutes) * MINUTE;
  const badTimeout = timeout === 0;

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(tokenAddress) },
  });
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(tokenAddress) },
  });
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(tokenAddress && address) },
  });
  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ARCFLOW_ESCROW_ADDRESS] : undefined,
    query: { enabled: Boolean(tokenAddress && address && !notDeployed) },
  });

  const parsedAmount = useMemo(() => {
    if (!amount || decimals === undefined) return undefined;
    try {
      const v = parseUnits(amount, decimals);
      return v > 0n && v <= MAX_U128 ? v : undefined;
    } catch {
      return undefined;
    }
  }, [amount, decimals]);

  const needsApprove =
    parsedAmount !== undefined && (allowance === undefined || allowance < parsedAmount);
  const overBalance = parsedAmount !== undefined && balance !== undefined && parsedAmount > balance;
  const busy = step !== "idle";
  const ready = Boolean(
    isConnected && tokenAddress && sellerAddress && parsedAmount && !badTimeout && !overBalance,
  );

  async function submit() {
    setError("");
    setCreatedId("");
    if (!address || !publicClient || !tokenAddress || !sellerAddress || parsedAmount === undefined) {
      return;
    }
    const termsHash = terms.trim()
      ? keccak256(toBytes(terms.trim()))
      : ("0x0000000000000000000000000000000000000000000000000000000000000000" as const);

    try {
      setStep("approving");
      if (needsApprove) {
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_ESCROW_ADDRESS, parsedAmount],
          ...arcGas,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setStep("creating");
      const tx = await writeContractAsync({
        address: ARCFLOW_ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "create",
        args: [tokenAddress, sellerAddress, parsedAmount, BigInt(timeout), termsHash],
        ...arcGas,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics });
          if (parsed.eventName === "Created") {
            setCreatedId(parsed.args.id.toString());
            break;
          }
        } catch {
          // skip
        }
      }
    } catch (e) {
      setError(txMessage(e));
    } finally {
      setStep("idle");
    }
  }

  return (
    <FormShell
      title="Fund escrow deal"
      badge="Milestone"
      aside={
        <PreviewPanel
          title="Deal preview"
          rows={[
            {
              label: "Amount",
              value: `${amount || "—"}${symbol ? ` ${symbol}` : ""}`,
            },
            { label: "Seller", value: <span className="mono">{shorten(sellerAddress)}</span> },
            { label: "Buyer refund after", value: badTimeout ? "—" : formatDuration(timeout) },
            {
              label: "Unlock ≈",
              value: badTimeout
                ? "—"
                : `${dateFmt.format(new Date((nowSec() + timeout) * 1000))} UTC`,
            },
          ]}
          note="Buyer funds now. Buyer releases to seller when work is done. Seller can refund anytime; buyer can refund after the timeout."
        />
      }
    >
      {notDeployed ? (
        <div className="alert alert-warn">Set NEXT_PUBLIC_ARCFLOW_ESCROW_ADDRESS.</div>
      ) : null}
      <TokenSelect id="esc-token" label="Token" value={token} onChange={setToken} />
      <AmountPercentField
        id="esc-amount"
        label="Amount"
        amount={amount}
        onChange={setAmount}
        max={balance}
        decimals={decimals}
        symbol={symbol}
        error={overBalance ? "Exceeds balance." : undefined}
      />
      <div className="field">
        <label className="field-label" htmlFor="esc-seller">
          Seller
        </label>
        <input
          id="esc-seller"
          className="af-input mono"
          placeholder="0x… counterparty"
          value={seller}
          onChange={(e) => setSeller(e.target.value.trim())}
        />
      </div>
      <div className="field">
        <span className="field-label">Buyer refund timeout</span>
        <DurationTriple
          days={days}
          hours={hours}
          minutes={minutes}
          onDays={setDays}
          onHours={setHours}
          onMinutes={setMinutes}
        />
        {badTimeout ? <p className="field-error">Timeout must be &gt; 0.</p> : null}
      </div>
      <div className="field">
        <label className="field-label" htmlFor="esc-terms">
          Terms note (optional, hashed on-chain)
        </label>
        <input
          id="esc-terms"
          className="af-input"
          placeholder="PO-42 / milestone description"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
        />
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {createdId ? <div className="alert alert-warn">Deal created · #{createdId}</div> : null}
      {!isConnected ? (
        <WalletConnectButton />
      ) : (
        <button type="button" className="btn lg block" disabled={!ready || busy || notDeployed} onClick={submit}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {step === "approving" ? "Approving…" : step === "creating" ? "Creating…" : needsApprove ? "Approve & fund" : "Fund escrow"}
        </button>
      )}
    </FormShell>
  );
}

function DealRow({ id, tab }: { id: bigint; tab: Tab }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { data: d, refetch } = useReadContract({
    address: ARCFLOW_ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "deals",
    args: [id],
  });

  const token = d?.[0];
  const buyer = d?.[1];
  const seller = d?.[2];
  const amount = d?.[3];
  const unlockAt = d?.[4];
  const status = d?.[6];

  const { data: symbol } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(token && token !== ZERO) },
  });
  const { data: decimals } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(token && token !== ZERO) },
  });

  if (!d) return null;
  const dec = decimals ?? 18;
  const statusLabel = ["Empty", "Funded", "Released", "Refunded"][status ?? 0] ?? "?";
  const now = Math.floor(Date.now() / 1000);
  const isBuyer = address && buyer && address.toLowerCase() === buyer.toLowerCase();
  const isSeller = address && seller && address.toLowerCase() === seller.toLowerCase();
  const funded = status === 1;

  async function act(fn: "release" | "refund") {
    if (!publicClient) return;
    setBusy(true);
    setError("");
    try {
      const hash = await writeContractAsync({
        address: ARCFLOW_ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: fn,
        args: [id],
        ...arcGas,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
    } catch (e) {
      setError(txMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border px-4 py-3 last:border-0">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <strong>#{id.toString()}</strong>
        <span className={cn("live", funded && "live-accent")}>{statusLabel}</span>
        <span style={{ fontWeight: 600 }}>
          {amount !== undefined
            ? Number(formatUnits(amount, dec)).toLocaleString("en-US", { maximumFractionDigits: 4 })
            : "—"}{" "}
          {symbol ?? ""}
        </span>
      </div>
      <p className="mono dim" style={{ margin: "0.3rem 0 0", fontSize: "0.72rem" }}>
        {tab === "buying" ? `seller ${shorten(seller)}` : `buyer ${shorten(buyer)}`}
        {unlockAt ? ` · buyer refund after ${dateFmt.format(new Date(Number(unlockAt) * 1000))}` : ""}
      </p>
      {funded ? (
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.55rem" }}>
          {isBuyer ? (
            <button type="button" className="btn sm" disabled={busy} onClick={() => act("release")}>
              Release to seller
            </button>
          ) : null}
          {(isSeller || (isBuyer && unlockAt !== undefined && now >= Number(unlockAt))) ? (
            <button type="button" className="btn sm" disabled={busy} onClick={() => act("refund")}>
              Refund buyer
            </button>
          ) : null}
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        </div>
      ) : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

function IndexedDeal({ owner, index, tab }: { owner: `0x${string}`; index: number; tab: Tab }) {
  const { data: id } = useReadContract({
    address: ARCFLOW_ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: tab === "buying" ? "dealsByBuyer" : "dealsBySeller",
    args: [owner, BigInt(index)],
  });
  if (id === undefined) return null;
  return <DealRow id={id} tab={tab} />;
}

export function MyEscrowsPanel() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("buying");

  const { data: buyCount } = useReadContract({
    address: ARCFLOW_ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "buyerDealCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: sellCount } = useReadContract({
    address: ARCFLOW_ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "sellerDealCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  if (!isConnected || !address) {
    return (
      <div className="panel">
        <div className="panel-body">
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  const buy = Number(buyCount ?? 0n);
  const sell = Number(sellCount ?? 0n);
  const count = tab === "buying" ? buy : sell;

  return (
    <div className="space-y-4">
      <div className="seg seg-2" style={{ maxWidth: "22rem" }}>
        <button type="button" className={cn("seg-btn", tab === "buying" && "on")} onClick={() => setTab("buying")}>
          As buyer ({buy})
        </button>
        <button type="button" className={cn("seg-btn", tab === "selling" && "on")} onClick={() => setTab("selling")}>
          As seller ({sell})
        </button>
      </div>
      <div className="panel">
        {count === 0 ? (
          <div className="panel-body">
            <p className="dim" style={{ margin: 0 }}>
              No deals in this tab.
            </p>
          </div>
        ) : (
          <div>
            {Array.from({ length: Math.min(count, MAX_ROWS) }, (_, i) => (
              <IndexedDeal key={`${tab}-${i}`} owner={address} index={i} tab={tab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
