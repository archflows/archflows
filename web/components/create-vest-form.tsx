"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { ContactAddressInput } from "@/components/ContactAddressInput";
import { arcFlowAbi, erc20Abi } from "@/lib/abi";
import {
  ARCFLOW_ADDRESS,
  LOCK_FEE_UNITS,
  MIN_MAX_FEE_PER_GAS,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from "@/lib/chain";
import {
  DAY,
  HOUR,
  MINUTE,
  MIN_DURATION_SEC,
  ZERO,
  dateFmt,
  formatDuration,
  nowSec,
  parseCount,
  sameAddress,
  shorten,
  toLocalInput,
} from "@/lib/form-time";
import { useMounted } from "@/hooks/useMounted";
import { ownsWalletToken, useWalletTokens } from "@/hooks/useWalletTokens";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { TokenSelect } from "@/components/TokenSelect";
import { AmountPercentField } from "@/components/AmountPercentField";
import { DurationTriple, FormShell, PreviewPanel } from "@/components/forms/form-shell";
import { ActionConfirmDialog } from "@/components/ActionConfirmDialog";
import { resolveTs, upsertLock } from "@/lib/backend";
import { proofPath } from "@/lib/proof";
import { confirmTx, eventArgs } from "@/lib/tx";
import { clickOrExplain } from "@/lib/guard-click";

const gas = { maxFeePerGas: MIN_MAX_FEE_PER_GAS, maxPriorityFeePerGas: 1n };

/** Linear vesting — cliff then per-second release until end. */
export function CreateVestForm() {
  const router = useRouter();
  const publicClient = usePublicClient();
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [cliffDays, setCliffDays] = useState("0");
  const [cliffHours, setCliffHours] = useState("0");
  const [vestDays, setVestDays] = useState("90");
  const [vestHours, setVestHours] = useState("0");
  const [vestMinutes, setVestMinutes] = useState("0");
  const [startAt, setStartAt] = useState(() => nowSec());
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "locking">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const tokenAddress = isAddress(token) ? (token as `0x${string}`) : undefined;
  const { data: walletTokens } = useWalletTokens();
  const tokenInWallet = ownsWalletToken(walletTokens, tokenAddress);
  const beneficiaryAddress = isAddress(beneficiary)
    ? (beneficiary as `0x${string}`)
    : address;
  const notDeployed = ARCFLOW_ADDRESS === ZERO;
  const lockingUsdc = sameAddress(tokenAddress, USDC_ADDRESS);

  const cliffSec = parseCount(cliffDays) * DAY + parseCount(cliffHours) * HOUR;
  const vestSec =
    parseCount(vestDays) * DAY + parseCount(vestHours) * HOUR + parseCount(vestMinutes) * MINUTE;
  const cliffAt = startAt + cliffSec;
  const endAt = startAt + vestSec;
  const tooShort = vestSec < MIN_DURATION_SEC;
  const cliffPastEnd = cliffSec > vestSec;
  const cliffIsHardLock = !cliffPastEnd && vestSec > 0 && cliffSec === vestSec;

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
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: usdcAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ARCFLOW_ADDRESS] : undefined,
    query: { enabled: Boolean(address && !notDeployed && !lockingUsdc) },
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

  const tokenSpend =
    parsedAmount === undefined ? undefined : lockingUsdc ? parsedAmount + LOCK_FEE_UNITS : parsedAmount;
  const needsTokenApprove =
    tokenSpend !== undefined && (allowance === undefined || allowance < tokenSpend);
  const needsFeeApprove =
    !lockingUsdc && (usdcAllowance === undefined || usdcAllowance < LOCK_FEE_UNITS);
  const needsApprove = needsTokenApprove || needsFeeApprove;
  const overBalance = tokenSpend !== undefined && balance !== undefined && tokenSpend > balance;
  const shortFee = !lockingUsdc && usdcBalance !== undefined && usdcBalance < LOCK_FEE_UNITS;
  const busy = step !== "idle";
  const ready = Boolean(
    isConnected &&
      tokenAddress &&
      tokenInWallet &&
      beneficiaryAddress &&
      parsedAmount !== undefined &&
      !overBalance &&
      !tooShort &&
      !cliffPastEnd &&
      !cliffIsHardLock &&
      !shortFee,
  );

  const maxLockable = useMemo(() => {
    if (balance === undefined || decimals === undefined) return undefined;
    if (lockingUsdc) {
      if (balance <= LOCK_FEE_UNITS) return 0n;
      return balance - LOCK_FEE_UNITS;
    }
    return balance;
  }, [balance, decimals, lockingUsdc]);

  async function submit() {
    setError("");
    if (!address || !publicClient || !tokenAddress || !beneficiaryAddress || parsedAmount === undefined) {
      setError("Fill token, amount, and connect a wallet.");
      return;
    }
    if (!tokenInWallet) {
      setError("Pick a token from the connected wallet.");
      return;
    }
    if (tooShort || cliffPastEnd || cliffIsHardLock) {
      setError(
        cliffIsHardLock
          ? "Cliff equal to vest length is a hard lock. Use Locks instead."
          : "Vest duration must be ≥ 1 minute, and cliff cannot exceed the vest length.",
      );
      return;
    }
    if (shortFee) {
      setError("Not enough USDC. Fund the wallet from faucet.circle.com.");
      return;
    }
    if (notDeployed) {
      setError("Lock contract is not configured.");
      return;
    }

    // Prefer absolute timestamps when cliff > 0 so start ≤ cliff ≤ end stays valid on-chain.
    const now = nowSec();
    const startTs = startAt <= now + 5 ? now : startAt;
    const cliffTs = startTs + cliffSec;
    const endTs = startTs + vestSec;
    const startArg = cliffSec === 0 && startAt <= now + 5 ? 0n : BigInt(startTs);
    const cliffArg = cliffSec === 0 ? 0n : BigInt(cliffTs);
    const endArg = BigInt(endTs);

    try {
      setStep("approving");
      if (needsTokenApprove && tokenSpend !== undefined) {
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_ADDRESS, tokenSpend],
          ...gas,
        });
        await confirmTx(publicClient, approveHash);
      }
      if (needsFeeApprove) {
        const feeHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_ADDRESS, LOCK_FEE_UNITS],
          ...gas,
        });
        await confirmTx(publicClient, feeHash, { fee: true });
      }

      setStep("locking");
      const lockHash = await writeContractAsync({
        address: ARCFLOW_ADDRESS,
        abi: arcFlowAbi,
        functionName: "lock",
        args: [tokenAddress, beneficiaryAddress, parsedAmount, startArg, cliffArg, endArg],
        ...gas,
      });
      const receipt = await confirmTx(publicClient, lockHash);
      const locked = eventArgs<{ id: bigint; beneficiary: `0x${string}`; amount: bigint }>(
        receipt,
        arcFlowAbi,
        "Locked",
      );
      const lockId = locked[0]?.id;
      if (lockId === undefined) {
        setError("Created, but the vest id could not be read from the receipt.");
        return;
      }
      const createdAt = nowSec();
      await upsertLock({
        id: lockId.toString(),
        kind: "vest",
        token: tokenAddress,
        beneficiary: beneficiaryAddress,
        creator: address,
        amount: parsedAmount.toString(),
        start: resolveTs(startArg, createdAt),
        cliff: resolveTs(cliffArg, resolveTs(startArg, createdAt)),
        end: Number(endArg),
        feeUsdc: "10000000",
        txHash: lockHash,
      });
      router.push(proofPath("lock", lockHash, lockId));
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
          Lock contract address is not configured.
        </div>
      ) : null}

      <FormShell
        title="Linear vesting"
        badge="Per-second release"
        aside={
          <PreviewPanel
              title="Vest schedule"
              rows={[
                { label: "Type", value: "Linear vest" },
                {
                  label: "Start",
                  value: mounted ? `${dateFmt.format(new Date(startAt * 1000))} UTC` : "—",
                },
                {
                  label: "Cliff",
                  value: cliffSec === 0 ? "None (starts releasing immediately)" : formatDuration(cliffSec),
                },
                {
                  label: "Cliff ends",
                  value: mounted ? `${dateFmt.format(new Date(cliffAt * 1000))} UTC` : "—",
                },
                { label: "Fully vested", value: mounted ? `${dateFmt.format(new Date(endAt * 1000))} UTC` : "—" },
                { label: "Total duration", value: tooShort || cliffPastEnd || cliffIsHardLock ? "—" : formatDuration(vestSec) },
                { label: "Beneficiary", value: <span className="mono">{shorten(beneficiaryAddress)}</span> },
                {
                  label: "Amount",
                  value: `${amount || "—"}${symbol ? ` ${symbol}` : ""}`,
                },
              ]}
            />
        }
      >
        <TokenSelect
          id="vest-token"
          label="Token"
          value={token}
          onChange={setToken}
          hint={
            symbol
              ? balance !== undefined && decimals !== undefined
                ? `${symbol}, balance ${Number(formatUnits(balance, decimals)).toLocaleString("en-US", {
                    maximumFractionDigits: 4,
                  })}`
                : symbol
              : "Pick a token held by the connected wallet."
          }
        />

        <AmountPercentField
          id="vest-amount"
          label="Amount to vest"
          amount={amount}
          onChange={setAmount}
          max={maxLockable}
          decimals={decimals}
          symbol={symbol}
          error={overBalance ? "Exceeds wallet balance." : undefined}
        />

        <ContactAddressInput
          id="vest-beneficiary"
          label="Beneficiary"
          value={beneficiary}
          onChange={setBeneficiary}
          placeholder={address ? `${address} (you)` : "0x… teammate / investor wallet"}
          hint="Leave empty to vest to your connected wallet."
        />

        <div className="field">
          <label className="field-label" htmlFor="vest-start">
            Vest start
          </label>
          <input
            id="vest-start"
            className="af-input"
            type="datetime-local"
            min={mounted ? toLocalInput(nowSec()) : undefined}
            value={mounted ? toLocalInput(startAt) : ""}
            onChange={(e) => {
              const ms = new Date(e.target.value).getTime();
              if (!Number.isNaN(ms)) setStartAt(Math.floor(ms / 1000));
            }}
          />
          <p className="field-hint">Defaults to now. Future start delays the whole schedule.</p>
        </div>

        <div className="field">
          <span className="field-label">Cliff (no claims until this delay)</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "0.4rem",
            }}
          >
            <label className="field" style={{ margin: 0 }}>
              <span className="field-hint" style={{ marginBottom: "0.25rem", display: "block" }}>
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
              <span className="field-hint" style={{ marginBottom: "0.25rem", display: "block" }}>
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
          <p className="field-hint">0 = start releasing from the first second.</p>
        </div>

        <div className="field">
          <span className="field-label">Total vest length (start to fully unlocked)</span>
          <DurationTriple
            days={vestDays}
            hours={vestHours}
            minutes={vestMinutes}
            onDays={setVestDays}
            onHours={setVestHours}
            onMinutes={setVestMinutes}
          />
          {tooShort ? <p className="field-error">Need at least 1 minute.</p> : null}
          {cliffPastEnd ? <p className="field-error">Cliff cannot be longer than the vest.</p> : null}
          {cliffIsHardLock ? (
            <p className="field-error">Cliff equal to vest length is a hard lock — use Locks instead.</p>
          ) : null}
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div style={{ marginTop: "0.5rem" }}>
          {!isConnected ? (
            <WalletConnectButton label="Connect to continue" />
          ) : (
            <button
              type="button"
              className="btn lg block"
              disabled={busy}
              onClick={() =>
                clickOrExplain(
                  ready
                    ? null
                    : notDeployed
                    ? "Lock contract is not configured."
                    : !tokenAddress
                      ? "Select a token from the connected wallet."
                      : !beneficiaryAddress
                        ? "Enter the beneficiary wallet."
                        : parsedAmount === undefined
                          ? "Enter how much to vest."
                          : overBalance
                            ? "Amount exceeds your balance."
                            : tooShort
                              ? "Need at least 1 minute."
                              : cliffPastEnd
                                ? "Cliff cannot be longer than the vest."
                                : cliffIsHardLock
                                  ? "Cliff equal to vest length is a hard lock. Use Locks instead."
                                  : shortFee
                                  ? "Need more USDC for gas."
                                  : null,
                  () => setConfirmOpen(true),
                )
              }
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {step === "approving"
                ? "Approving…"
                : step === "locking"
                  ? "Creating vest…"
                  : needsApprove
                    ? "Approve & create vest"
                    : "Create vesting"}
            </button>
          )}
        </div>
      </FormShell>

      <ActionConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm linear vest"
        confirmLabel={needsApprove ? "Agree & approve" : "Agree & create vest"}
        feeUsd={10}
        summary={[
          { label: "Type", value: "Linear vest" },
          {
            label: "Amount",
            value: `${amount || "—"}${symbol ? ` ${symbol}` : ""}`,
          },
          {
            label: "Beneficiary",
            value: <span className="mono">{shorten(beneficiaryAddress)}</span>,
          },
          {
            label: "Fully vested",
            value: mounted ? `${dateFmt.format(new Date(endAt * 1000))} UTC` : "—",
          },
        ]}
        onConfirm={() => void submit()}
      />
    </div>
  );
}
