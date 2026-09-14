"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { decodeEventLog, formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_ADDRESS, MIN_MAX_FEE_PER_GAS } from "@/lib/chain";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { cn } from "@/lib/utils";

const DURATIONS = [
  { label: "7d", seconds: 7 * 86400 },
  { label: "30d", seconds: 30 * 86400 },
  { label: "90d", seconds: 90 * 86400 },
  { label: "180d", seconds: 180 * 86400 },
  { label: "1y", seconds: 365 * 86400 },
];

const ZERO = "0x0000000000000000000000000000000000000000";
const gas = { maxFeePerGas: MIN_MAX_FEE_PER_GAS, maxPriorityFeePerGas: 1n };

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export default function CreateLockPage() {
  const router = useRouter();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"lock" | "vest">("lock");
  const [days, setDays] = useState(DURATIONS[2].seconds);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "locking">("idle");

  const tokenAddress = isAddress(token) ? (token as `0x${string}`) : undefined;
  const notDeployed = ARCFLOW_ADDRESS === ZERO;

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
    args: address ? [address, ARCFLOW_ADDRESS] : undefined,
    query: { enabled: Boolean(tokenAddress && address && !notDeployed) },
  });

  const parsedAmount = useMemo(() => {
    if (!amount || decimals === undefined) return undefined;
    try {
      const value = parseUnits(amount, decimals);
      return value > 0n ? value : undefined;
    } catch {
      return undefined;
    }
  }, [amount, decimals]);

  const needsApprove =
    parsedAmount !== undefined && (allowance === undefined || allowance < parsedAmount);
  const overBalance = parsedAmount !== undefined && balance !== undefined && parsedAmount > balance;
  const unlockDate = useMemo(() => new Date(Date.now() + days * 1000), [days]);
  const busy = step !== "idle";
  const ready = Boolean(isConnected && tokenAddress && parsedAmount !== undefined && !overBalance);

  async function submit() {
    setError("");
    if (!address || !publicClient) {
      setError("Connect a wallet on Arc Testnet first.");
      return;
    }
    if (!tokenAddress || parsedAmount === undefined) {
      setError("Paste the token address and an amount to lock.");
      return;
    }
    if (notDeployed) {
      setError("Set NEXT_PUBLIC_ARCFLOW_ADDRESS after deploying the contract.");
      return;
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const end = now + BigInt(days);
    const cliff = mode === "lock" ? end : now;

    try {
      if (needsApprove) {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_ADDRESS, parsedAmount],
          ...gas,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setStep("locking");
      const lockHash = await writeContractAsync({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "lock",
        args: [tokenAddress, address, parsedAmount, now, cliff, end],
        ...gas,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: lockHash });

      let lockId: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({ abi: arcFlowAbi, data: log.data, topics: log.topics });
          if (parsed.eventName === "Locked") {
            lockId = parsed.args.id;
            break;
          }
        } catch {
          // skip unrelated logs
        }
      }
      if (lockId === undefined) {
        setError("Locked, but the lock id could not be read from the receipt.");
        return;
      }
      router.push(`/lock/${lockId.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "Transaction failed.");
    } finally {
      setStep("idle");
    }
  }

  return (
    <div className="space-y-5">
      {notDeployed ? (
        <div className="alert alert-warn">
          Contract not deployed yet — the console runs in preview mode. Set{" "}
          <code className="mono">NEXT_PUBLIC_ARCFLOW_ADDRESS</code> to arm transactions.
        </div>
      ) : null}

      <div className="create-grid">
        <div className="panel">
          <div className="panel-head">
            <span>Lock parameters</span>
            <span className="live live-accent">Arc Testnet</span>
          </div>

          <div className="panel-body">
            <div className="field">
              <label className="field-label" htmlFor="token">
                Token contract
              </label>
              <input
                id="token"
                className="af-input mono"
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
              />
              {token && !tokenAddress ? (
                <p className="field-error">Invalid address.</p>
              ) : symbol ? (
                <p className="field-hint">
                  <span style={{ color: "var(--beam)" }}>{symbol}</span>
                  {balance !== undefined && decimals !== undefined
                    ? ` · balance ${Number(formatUnits(balance, decimals)).toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })}`
                    : null}
                </p>
              ) : (
                <p className="field-hint">Paste the ERC-20 straight after your pad create.</p>
              )}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="amount">
                Amount
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="amount"
                  className="af-input"
                  placeholder="0.0"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={balance !== undefined ? { paddingRight: "7rem" } : undefined}
                />
                {balance !== undefined && decimals !== undefined ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 0.4rem 0 auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {symbol ? (
                      <span className="mono dim" style={{ fontSize: "0.72rem" }}>
                        {symbol}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setAmount(formatUnits(balance, decimals))}
                    >
                      MAX
                    </button>
                  </div>
                ) : null}
              </div>
              {overBalance ? <p className="field-error">Exceeds wallet balance.</p> : null}
            </div>

            <div className="field">
              <span className="field-label">Orbit duration</span>
              <div className="seg seg-5">
                {DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    className={cn("seg-btn", days === d.seconds && "on")}
                    onClick={() => setDays(d.seconds)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Release curve</span>
              <div className="seg seg-2">
                <button
                  type="button"
                  className={cn("seg-btn", mode === "lock" && "on")}
                  onClick={() => setMode("lock")}
                >
                  Hard lock
                </button>
                <button
                  type="button"
                  className={cn("seg-btn", mode === "vest" && "on")}
                  onClick={() => setMode("vest")}
                >
                  Linear vest
                </button>
              </div>
              <p className="field-hint">
                {mode === "lock"
                  ? "Nothing claimable until the end date — full stop."
                  : "Per-second release from now until the end date. Claim anytime."}
              </p>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <div style={{ marginTop: "1.25rem" }}>
              {!isConnected ? (
                <WalletConnectButton label="Connect to continue" />
              ) : (
                <button
                  type="button"
                  className="btn lg block"
                  disabled={!ready || busy || notDeployed}
                  onClick={submit}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {step === "approving"
                    ? "Approving…"
                    : step === "locking"
                      ? "Locking…"
                      : needsApprove
                        ? "Approve & lock"
                        : "Lock tokens"}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="panel">
            <div className="panel-head">
              <span>Flight plan</span>
              <span className="mono dim" style={{ fontSize: "0.72rem" }}>
                // PREVIEW
              </span>
            </div>
            <dl style={{ margin: 0 }}>
              <div className="kv">
                <dt>Release</dt>
                <dd>{mode === "lock" ? "Hard lock" : "Linear vest"}</dd>
              </div>
              <div className="kv">
                <dt>Unlocks</dt>
                <dd>{dateFmt.format(unlockDate)} UTC</dd>
              </div>
              <div className="kv">
                <dt>Beneficiary</dt>
                <dd className="mono" style={{ fontSize: "0.78rem" }}>
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet"}
                </dd>
              </div>
              <div className="kv">
                <dt>Amount</dt>
                <dd style={{ fontVariantNumeric: "tabular-nums" }}>
                  {amount || "—"}
                  {symbol ? ` ${symbol}` : ""}
                </dd>
              </div>
              <div className="kv">
                <dt>Gas</dt>
                <dd>USDC · 20 gwei floor</dd>
              </div>
            </dl>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="mono" style={{ fontSize: "0.78rem" }}>
                // POINT OF NO RETURN
              </span>
            </div>
            <div className="panel-body dim" style={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
              If the pad already locked LP, lock your{" "}
              <span style={{ color: "var(--ink)" }}>dev buy</span> here — LP lock is not a wallet
              lock. Once the transaction confirms, nobody can cancel or shorten the schedule,
              including you.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
