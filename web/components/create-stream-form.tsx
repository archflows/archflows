"use client";

import { useMemo, useState } from "react";
import { decodeEventLog, formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { erc20Abi, streamAbi } from "@/lib/abi";
import { ARCFLOW_STREAM_ADDRESS, USDC_ADDRESS } from "@/lib/chain";
import { parseAddressAmountCsv } from "@/lib/csv";
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
  toLocalInput,
} from "@/lib/form-time";
import { arcGas, MAX_U128, txMessage } from "@/lib/tx";
import { useMounted } from "@/hooks/useMounted";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { TokenSelect } from "@/components/TokenSelect";
import { AmountPercentField } from "@/components/AmountPercentField";
import { DurationTriple, FormShell, PreviewPanel } from "@/components/forms/form-shell";

const MAX_BATCH = 200;

type Mode = "single" | "payroll";

/** Cancelable / top-upable streams for payroll & team vesting (ArcFlowStream). */
export function CreateStreamForm() {
  const publicClient = usePublicClient();
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [mode, setMode] = useState<Mode>("single");
  const [token, setToken] = useState(USDC_ADDRESS as string);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [csv, setCsv] = useState("");
  const [vestDays, setVestDays] = useState("30");
  const [vestHours, setVestHours] = useState("0");
  const [vestMinutes, setVestMinutes] = useState("0");
  const [cliffDays, setCliffDays] = useState("0");
  const [cliffHours, setCliffHours] = useState("0");
  const [startAt, setStartAt] = useState(() => nowSec());
  const [cancelable, setCancelable] = useState(true);
  const [transferable, setTransferable] = useState(true);
  const [canTopup, setCanTopup] = useState(true);
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "creating">("idle");

  const tokenAddress = isAddress(token) ? (token as `0x${string}`) : undefined;
  const recipientAddress = isAddress(recipient) ? (recipient as `0x${string}`) : undefined;
  const notDeployed = ARCFLOW_STREAM_ADDRESS === ZERO;

  const vestSec =
    parseCount(vestDays) * DAY + parseCount(vestHours) * HOUR + parseCount(vestMinutes) * MINUTE;
  const cliffSec = parseCount(cliffDays) * DAY + parseCount(cliffHours) * HOUR;
  const endAt = startAt + vestSec;
  const cliffAt = startAt + cliffSec;
  const tooShort = vestSec < MINUTE;
  const cliffPastEnd = cliffSec > vestSec;

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
    args: address ? [address, ARCFLOW_STREAM_ADDRESS] : undefined,
    query: { enabled: Boolean(tokenAddress && address && !notDeployed) },
  });

  const payrollRows = useMemo(() => {
    if (mode !== "payroll" || !csv.trim() || decimals === undefined) return null;
    try {
      const rows = parseAddressAmountCsv(csv).map((r) => ({
        account: r.account,
        amount: parseUnits(r.amount, decimals),
      }));
      if (rows.length > MAX_BATCH) throw new Error(`Max ${MAX_BATCH} recipients per batch.`);
      const total = rows.reduce((s, r) => s + r.amount, 0n);
      return { rows, total };
    } catch {
      return null;
    }
  }, [mode, csv, decimals]);

  const csvError = useMemo(() => {
    if (mode !== "payroll" || !csv.trim() || decimals === undefined) return "";
    try {
      parseAddressAmountCsv(csv);
      if (payrollRows && payrollRows.rows.length > MAX_BATCH) {
        return `Max ${MAX_BATCH} recipients.`;
      }
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid CSV";
    }
  }, [mode, csv, decimals, payrollRows]);

  const singleAmount = useMemo(() => {
    if (mode !== "single" || !amount || decimals === undefined) return undefined;
    try {
      const v = parseUnits(amount, decimals);
      return v > 0n && v <= MAX_U128 ? v : undefined;
    } catch {
      return undefined;
    }
  }, [mode, amount, decimals]);

  const totalNeeded = mode === "single" ? singleAmount : payrollRows?.total;
  const overBalance = totalNeeded !== undefined && balance !== undefined && totalNeeded > balance;
  const needsApprove =
    totalNeeded !== undefined && (allowance === undefined || allowance < totalNeeded);
  const busy = step !== "idle";
  const ready =
    isConnected &&
    tokenAddress &&
    !tooShort &&
    !cliffPastEnd &&
    !overBalance &&
    !csvError &&
    (mode === "single" ? Boolean(recipientAddress && singleAmount) : Boolean(payrollRows?.rows.length));

  async function submit() {
    setError("");
    setCreatedIds([]);
    if (!address || !publicClient || !tokenAddress || totalNeeded === undefined) return;
    if (notDeployed) {
      setError("Set NEXT_PUBLIC_ARCFLOW_STREAM_ADDRESS.");
      return;
    }

    const startArg = startAt <= nowSec() + 5 ? 0n : BigInt(startAt);
    const cliffArg = cliffSec === 0 ? 0n : BigInt(cliffAt);

    try {
      setStep("approving");
      if (needsApprove) {
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_STREAM_ADDRESS, totalNeeded],
          ...arcGas,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setStep("creating");
      if (mode === "single" && recipientAddress && singleAmount) {
        const tx = await writeContractAsync({
          address: ARCFLOW_STREAM_ADDRESS,
          abi: streamAbi,
          functionName: "create",
          args: [
            {
              token: tokenAddress,
              recipient: recipientAddress,
              amount: singleAmount,
              start: startArg,
              cliff: cliffArg,
              end: BigInt(endAt),
              period: 1,
              cancelable,
              transferable,
              canTopup,
            },
          ],
          ...arcGas,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        for (const log of receipt.logs) {
          try {
            const parsed = decodeEventLog({ abi: streamAbi, data: log.data, topics: log.topics });
            if (parsed.eventName === "Created") {
              setCreatedIds([parsed.args.id.toString()]);
              break;
            }
          } catch {
            // skip
          }
        }
      } else if (payrollRows) {
        const params = payrollRows.rows.map((r) => ({
          token: tokenAddress,
          recipient: r.account,
          amount: r.amount,
          start: startArg,
          cliff: cliffArg,
          end: BigInt(endAt),
          period: 1,
          cancelable,
          transferable,
          canTopup,
        }));
        const tx = await writeContractAsync({
          address: ARCFLOW_STREAM_ADDRESS,
          abi: streamAbi,
          functionName: "createBatch",
          args: [params],
          ...arcGas,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        const ids: string[] = [];
        for (const log of receipt.logs) {
          try {
            const parsed = decodeEventLog({ abi: streamAbi, data: log.data, topics: log.topics });
            if (parsed.eventName === "Created") ids.push(parsed.args.id.toString());
          } catch {
            // skip
          }
        }
        setCreatedIds(ids);
      }
    } catch (err) {
      setError(txMessage(err));
    } finally {
      setStep("idle");
    }
  }

  return (
    <div className="space-y-5">
      {notDeployed ? (
        <div className="alert alert-warn">
          Stream not configured. Set <code className="mono">NEXT_PUBLIC_ARCFLOW_STREAM_ADDRESS</code>.
        </div>
      ) : null}

      <div className="seg seg-2" style={{ maxWidth: "22rem" }}>
        <button
          type="button"
          className={`seg-btn${mode === "single" ? " on" : ""}`}
          onClick={() => setMode("single")}
        >
          Single stream
        </button>
        <button
          type="button"
          className={`seg-btn${mode === "payroll" ? " on" : ""}`}
          onClick={() => setMode("payroll")}
        >
          Payroll CSV
        </button>
      </div>

      <FormShell
        title={mode === "payroll" ? "Batch payroll" : "Create stream"}
        badge={mode === "payroll" ? "createBatch" : "ArcFlowStream"}
        aside={
          <PreviewPanel
            title="Stream preview"
            rows={[
              {
                label: "Deposit",
                value:
                  totalNeeded !== undefined && decimals !== undefined
                    ? `${Number(formatUnits(totalNeeded, decimals)).toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })}${symbol ? ` ${symbol}` : ""}`
                    : "—",
              },
              {
                label: "Recipients",
                value: mode === "payroll" ? String(payrollRows?.rows.length ?? "—") : "1",
              },
              {
                label: "Start",
                value: mounted ? `${dateFmt.format(new Date(startAt * 1000))} UTC` : "—",
              },
              {
                label: "Cliff",
                value: cliffSec === 0 ? "None" : formatDuration(cliffSec),
              },
              {
                label: "Ends",
                value:
                  tooShort || cliffPastEnd
                    ? "—"
                    : mounted
                      ? `${dateFmt.format(new Date(endAt * 1000))} UTC`
                      : "—",
              },
              { label: "Duration", value: tooShort ? "—" : formatDuration(vestSec) },
              {
                label: "Flags",
                value: [
                  cancelable ? "cancelable" : null,
                  transferable ? "transferable" : null,
                  canTopup ? "top-up" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "immutable",
              },
            ]}
            note="This uses ArcFlowStream, cancelable payroll / vesting. Anti-dump locks stay on the Locks page ($10 fee, immutable)."
          />
        }
      >
        <TokenSelect
          id="stream-token"
          label="Token"
          value={token}
          onChange={setToken}
          preferUsdc
          hint={
            symbol && balance !== undefined && decimals !== undefined
              ? `${symbol}, balance ${Number(formatUnits(balance, decimals)).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}`
              : "USDC payroll or any ERC-20 allocation."
          }
        />

        {mode === "single" ? (
          <>
            <AmountPercentField
              id="stream-amount"
              label="Amount"
              amount={amount}
              onChange={setAmount}
              max={balance}
              decimals={decimals}
              symbol={symbol}
              error={overBalance ? "Exceeds wallet balance." : undefined}
            />
            <div className="field">
              <label className="field-label" htmlFor="stream-recipient">
                Recipient
              </label>
              <input
                id="stream-recipient"
                className="af-input mono"
                placeholder="0x… employee / teammate"
                autoComplete="off"
                spellCheck={false}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
              />
            </div>
          </>
        ) : (
          <div className="field">
            <label className="field-label" htmlFor="stream-csv">
              Recipients CSV
            </label>
            <textarea
              id="stream-csv"
              className="af-input mono"
              rows={6}
              placeholder={"address,amount\n0xabc…,1000\n0xdef…,500"}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              style={{ resize: "vertical", fontSize: "0.8rem" }}
            />
            {csvError ? <p className="field-error">{csvError}</p> : null}
            <p className="field-hint">
              One row per person. Max {MAX_BATCH}. Amounts use token decimals.
              {payrollRows
                ? `, ${payrollRows.rows.length} rows, total ${
                    decimals !== undefined
                      ? Number(formatUnits(payrollRows.total, decimals)).toLocaleString("en-US")
                      : ""
                  }`
                : ""}
            </p>
            {overBalance ? <p className="field-error">Exceeds wallet balance.</p> : null}
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="stream-start">
            Start
          </label>
          <input
            id="stream-start"
            className="af-input"
            type="datetime-local"
            value={mounted ? toLocalInput(startAt) : ""}
            onChange={(e) => {
              const ms = new Date(e.target.value).getTime();
              if (!Number.isNaN(ms)) setStartAt(Math.floor(ms / 1000));
            }}
          />
        </div>

        <div className="field">
          <span className="field-label">Cliff delay</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-hint" style={{ display: "block", marginBottom: "0.25rem" }}>
                Days
              </span>
              <input
                className="af-input"
                inputMode="numeric"
                value={cliffDays}
                onChange={(e) => setCliffDays(e.target.value)}
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-hint" style={{ display: "block", marginBottom: "0.25rem" }}>
                Hours
              </span>
              <input
                className="af-input"
                inputMode="numeric"
                value={cliffHours}
                onChange={(e) => setCliffHours(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Stream length</span>
          <DurationTriple
            days={vestDays}
            hours={vestHours}
            minutes={vestMinutes}
            onDays={setVestDays}
            onHours={setVestHours}
            onMinutes={setVestMinutes}
          />
          {tooShort ? <p className="field-error">Need at least 1 minute.</p> : null}
          {cliffPastEnd ? <p className="field-error">Cliff cannot exceed stream length.</p> : null}
        </div>

        <div className="field" style={{ display: "grid", gap: "0.45rem" }}>
          <span className="field-label">Stream options</span>
          {(
            [
              ["cancelable", cancelable, setCancelable, "Sender can cancel and reclaim unvested"],
              ["transferable", transferable, setTransferable, "Recipient can reassign after settle"],
              ["canTopup", canTopup, setCanTopup, "Sender can add more funds later"],
            ] as const
          ).map(([key, on, set, hint]) => (
            <label key={key} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
              <span>
                <span style={{ fontWeight: 550 }}>{key}</span>
                <span className="field-hint" style={{ display: "block" }}>
                  {hint}
                </span>
              </span>
            </label>
          ))}
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {createdIds.length > 0 ? (
          <div className="alert alert-warn">
            Created stream{createdIds.length > 1 ? "s" : ""},{" "}
            {createdIds.slice(0, 8).map((id) => `#${id}`).join(", ")}
            {createdIds.length > 8 ? ` +${createdIds.length - 8} more` : ""}
          </div>
        ) : null}

        <div style={{ marginTop: "0.5rem" }}>
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
                : step === "creating"
                  ? mode === "payroll"
                    ? "Creating batch…"
                    : "Creating stream…"
                  : needsApprove
                    ? mode === "payroll"
                      ? "Approve & create payroll"
                      : "Approve & create stream"
                    : mode === "payroll"
                      ? `Create ${payrollRows?.rows.length ?? 0} streams`
                      : `Create stream to ${shorten(recipientAddress)}`}
            </button>
          )}
        </div>
      </FormShell>
    </div>
  );
}
