"use client";

import { useMemo, useState } from "react";
import { decodeEventLog, formatUnits, isAddress, isHex, parseUnits, size } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { distributorAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_DISTRIBUTOR_ADDRESS, MIN_MAX_FEE_PER_GAS } from "@/lib/chain";
import {
  DAY,
  HOUR,
  MINUTE,
  ZERO,
  dateFmt,
  formatDuration,
  nowSec,
  parseCount,
  toLocalInput,
} from "@/lib/form-time";
import { useMounted } from "@/hooks/useMounted";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { TokenSelect } from "@/components/TokenSelect";
import { DurationTriple, FormShell, PreviewPanel } from "@/components/forms/form-shell";

const gas = { maxFeePerGas: MIN_MAX_FEE_PER_GAS, maxPriorityFeePerGas: 1n };

export function CreateAirdropForm() {
  const publicClient = usePublicClient();
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [merkleRoot, setMerkleRoot] = useState("");
  const [claimDays, setClaimDays] = useState("14");
  const [claimHours, setClaimHours] = useState("0");
  const [claimMinutes, setClaimMinutes] = useState("0");
  const [claimStart, setClaimStart] = useState(() => nowSec());
  const [vestDays, setVestDays] = useState("0");
  const [vestHours, setVestHours] = useState("0");
  const [cliffDays, setCliffDays] = useState("0");
  const [cliffHours, setCliffHours] = useState("0");
  const [createdId, setCreatedId] = useState<string>("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "creating">("idle");

  const tokenAddress = isAddress(token) ? (token as `0x${string}`) : undefined;
  const rootOk = isHex(merkleRoot) && size(merkleRoot) === 32;
  const notDeployed = ARCFLOW_DISTRIBUTOR_ADDRESS === ZERO;

  const claimWindow =
    parseCount(claimDays) * DAY + parseCount(claimHours) * HOUR + parseCount(claimMinutes) * MINUTE;
  const claimEnd = claimStart + claimWindow;
  const vestDuration = parseCount(vestDays) * DAY + parseCount(vestHours) * HOUR;
  const vestCliff = parseCount(cliffDays) * DAY + parseCount(cliffHours) * HOUR;
  const badWindow = claimWindow < MINUTE;
  const badVest = vestDuration > 0 && vestCliff > vestDuration;

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
    args: address ? [address, ARCFLOW_DISTRIBUTOR_ADDRESS] : undefined,
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
  const busy = step !== "idle";
  const ready = Boolean(
    isConnected && tokenAddress && rootOk && parsedAmount !== undefined && !overBalance && !badWindow && !badVest,
  );

  async function submit() {
    setError("");
    setCreatedId("");
    if (!address || !publicClient || !tokenAddress || !rootOk || parsedAmount === undefined) {
      setError("Fill token, deposit amount, and a 32-byte merkle root.");
      return;
    }
    if (badWindow || badVest) {
      setError("Fix the claim window or vest cliff settings.");
      return;
    }
    if (notDeployed) {
      setError("Set NEXT_PUBLIC_ARCFLOW_DISTRIBUTOR_ADDRESS.");
      return;
    }

    const startArg = claimStart <= nowSec() + 5 ? 0n : BigInt(claimStart);

    try {
      setStep("approving");
      if (needsApprove) {
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCFLOW_DISTRIBUTOR_ADDRESS, parsedAmount],
          ...gas,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setStep("creating");
      const tx = await writeContractAsync({
        address: ARCFLOW_DISTRIBUTOR_ADDRESS,
        abi: distributorAbi,
        functionName: "createCampaign",
        args: [
          tokenAddress,
          merkleRoot as `0x${string}`,
          parsedAmount,
          startArg,
          BigInt(claimEnd),
          BigInt(vestDuration),
          BigInt(vestCliff),
        ],
        ...gas,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({ abi: distributorAbi, data: log.data, topics: log.topics });
          if (parsed.eventName === "CampaignCreated") {
            setCreatedId(parsed.args.id.toString());
            break;
          }
        } catch {
          // skip
        }
      }
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
          Distributor not configured. Set{" "}
          <code className="mono">NEXT_PUBLIC_ARCFLOW_DISTRIBUTOR_ADDRESS</code>.
        </div>
      ) : null}

      <FormShell
        title="Create airdrop campaign"
        badge="Merkle drop"
        aside={
          <PreviewPanel
            title="Campaign preview"
            rows={[
              {
                label: "Deposit",
                value: `${amount || "—"}${symbol ? ` ${symbol}` : ""}`,
              },
              {
                label: "Claim opens",
                value: mounted ? `${dateFmt.format(new Date(claimStart * 1000))} UTC` : "—",
              },
              {
                label: "Claim closes",
                value: badWindow ? "—" : mounted ? `${dateFmt.format(new Date(claimEnd * 1000))} UTC` : "—",
              },
              {
                label: "Claim window",
                value: badWindow ? "—" : formatDuration(claimWindow),
              },
              {
                label: "Post-claim vest",
                value: vestDuration === 0 ? "Instant (no stream)" : formatDuration(vestDuration),
              },
              {
                label: "Vest cliff",
                value: vestDuration === 0 ? "—" : formatDuration(vestCliff),
              },
              {
                label: "Merkle root",
                value: (
                  <span className="mono" style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>
                    {rootOk ? merkleRoot : "—"}
                  </span>
                ),
              },
            ]}
            note="Build a merkle tree of (index, address, amount) leaves off-chain, deposit the bag here, then share proofs so recipients can claim. Optional vest streams the claim into ArcFlowStream."
          />
        }
      >
        <TokenSelect
          id="air-token"
          label="Reward token"
          value={token}
          onChange={setToken}
          hint={
            symbol && balance !== undefined && decimals !== undefined
              ? `${symbol} · balance ${Number(formatUnits(balance, decimals)).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}`
              : "Token you will deposit for the drop."
          }
        />

        <div className="field">
          <label className="field-label" htmlFor="air-amount">
            Total deposit
          </label>
          <input
            id="air-amount"
            className="af-input"
            placeholder="0.0"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {overBalance ? <p className="field-error">Exceeds wallet balance.</p> : null}
          <p className="field-hint">Should cover the sum of all leaf amounts.</p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="air-root">
            Merkle root
          </label>
          <input
            id="air-root"
            className="af-input mono"
            placeholder="0x… 32 bytes"
            autoComplete="off"
            spellCheck={false}
            value={merkleRoot}
            onChange={(e) => setMerkleRoot(e.target.value.trim())}
          />
          {merkleRoot && !rootOk ? (
            <p className="field-error">Need a 0x-prefixed 32-byte hex root.</p>
          ) : (
            <p className="field-hint">Leaf encoding: keccak(keccak(abi.encode(index, account, amount))).</p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="air-start">
            Claim start
          </label>
          <input
            id="air-start"
            className="af-input"
            type="datetime-local"
            value={mounted ? toLocalInput(claimStart) : ""}
            onChange={(e) => {
              const ms = new Date(e.target.value).getTime();
              if (!Number.isNaN(ms)) setClaimStart(Math.floor(ms / 1000));
            }}
          />
        </div>

        <div className="field">
          <span className="field-label">Claim window length</span>
          <DurationTriple
            days={claimDays}
            hours={claimHours}
            minutes={claimMinutes}
            onDays={setClaimDays}
            onHours={setClaimHours}
            onMinutes={setClaimMinutes}
          />
          {badWindow ? <p className="field-error">Window must be at least 1 minute.</p> : null}
        </div>

        <div className="field">
          <span className="field-label">Optional vest after claim</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "0.4rem",
            }}
          >
            <label className="field" style={{ margin: 0 }}>
              <span className="field-hint" style={{ marginBottom: "0.25rem", display: "block" }}>
                Vest days
              </span>
              <input
                className="af-input"
                inputMode="numeric"
                value={vestDays}
                onChange={(e) => setVestDays(e.target.value)}
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-hint" style={{ marginBottom: "0.25rem", display: "block" }}>
                Vest hours
              </span>
              <input
                className="af-input"
                inputMode="numeric"
                value={vestHours}
                onChange={(e) => setVestHours(e.target.value)}
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-hint" style={{ marginBottom: "0.25rem", display: "block" }}>
                Cliff days
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
                Cliff hours
              </span>
              <input
                className="af-input"
                inputMode="numeric"
                value={cliffHours}
                onChange={(e) => setCliffHours(e.target.value)}
              />
            </label>
          </div>
          <p className="field-hint">Leave vest at 0 for instant claim. Cliff must be ≤ vest length.</p>
          {badVest ? <p className="field-error">Cliff cannot exceed vest duration.</p> : null}
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {createdId ? (
          <div className="alert alert-warn">Campaign created · id {createdId}</div>
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
                  ? "Creating campaign…"
                  : needsApprove
                    ? "Approve & create campaign"
                    : "Create airdrop campaign"}
            </button>
          )}
        </div>
      </FormShell>
    </div>
  );
}
