"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { distributorAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_DISTRIBUTOR_ADDRESS } from "@/lib/chain";
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
import { downloadProofJson, treeFromCsv, type MerkleTree } from "@/lib/merkle";
import { arcGas, confirmTx, eventArgs, MAX_U128, txMessage } from "@/lib/tx";
import { clickOrExplain } from "@/lib/guard-click";
import { useMounted } from "@/hooks/useMounted";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { TokenSelect } from "@/components/TokenSelect";
import { DurationTriple, FormShell, PreviewPanel } from "@/components/forms/form-shell";
import { resolveTs, upsertCampaign } from "@/lib/backend";
import { goToExplorerTx } from "@/lib/explorer-nav";
import { proofPath } from "@/lib/proof";

const MIN_WINDOW = HOUR;

export function CreateAirdropForm() {
  const router = useRouter();
  const publicClient = usePublicClient();
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [token, setToken] = useState("");
  const [csv, setCsv] = useState("");
  const [claimDays, setClaimDays] = useState("14");
  const [claimHours, setClaimHours] = useState("0");
  const [claimMinutes, setClaimMinutes] = useState("0");
  const [claimStart, setClaimStart] = useState(() => nowSec());
  const [vestDays, setVestDays] = useState("0");
  const [vestHours, setVestHours] = useState("0");
  const [cliffDays, setCliffDays] = useState("0");
  const [cliffHours, setCliffHours] = useState("0");
  const [tree, setTree] = useState<MerkleTree | null>(null);
  const [createdId, setCreatedId] = useState("");
  const [createdTx, setCreatedTx] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "creating">("idle");

  const tokenAddress = isAddress(token) ? (token as `0x${string}`) : undefined;
  const notDeployed = ARCFLOW_DISTRIBUTOR_ADDRESS === ZERO;

  const claimWindow =
    parseCount(claimDays) * DAY + parseCount(claimHours) * HOUR + parseCount(claimMinutes) * MINUTE;
  const claimEnd = claimStart + claimWindow;
  const vestDuration = parseCount(vestDays) * DAY + parseCount(vestHours) * HOUR;
  const vestCliff = parseCount(cliffDays) * DAY + parseCount(cliffHours) * HOUR;
  const badWindow = claimWindow < MIN_WINDOW;
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

  const csvError = useMemo(() => {
    if (!csv.trim() || decimals === undefined) return "";
    try {
      const t = treeFromCsv(csv, decimals);
      if (t.total > MAX_U128) return "Total exceeds uint128.";
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid CSV";
    }
  }, [csv, decimals]);

  const liveTree = useMemo(() => {
    if (!csv.trim() || decimals === undefined || csvError) return null;
    try {
      return treeFromCsv(csv, decimals);
    } catch {
      return null;
    }
  }, [csv, decimals, csvError]);

  const deposit = liveTree?.total;
  const needsApprove =
    deposit !== undefined && (allowance === undefined || allowance < deposit);
  const overBalance = deposit !== undefined && balance !== undefined && deposit > balance;
  const busy = step !== "idle";
  const ready = Boolean(
    isConnected && tokenAddress && liveTree && deposit && !overBalance && !badWindow && !badVest,
  );

  async function submit() {
    setError("");
    setCreatedId("");
    setTree(null);
    if (!address || !publicClient || !tokenAddress || !liveTree || deposit === undefined) {
      setError("Fill token and a valid recipients CSV.");
      return;
    }
    if (badWindow || badVest) {
      setError("Fix the claim window (min 1 hour) or vest cliff.");
      return;
    }
    if (notDeployed) {
      setError("Distributor contract is not configured.");
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
          args: [ARCFLOW_DISTRIBUTOR_ADDRESS, deposit],
          ...arcGas,
        });
        await confirmTx(publicClient, hash);
      }

      setStep("creating");
      const tx = await writeContractAsync({
        address: ARCFLOW_DISTRIBUTOR_ADDRESS,
        abi: distributorAbi,
        functionName: "createCampaign",
        args: [
          tokenAddress,
          liveTree.root,
          deposit,
          startArg,
          BigInt(claimEnd),
          BigInt(vestDuration),
          BigInt(vestCliff),
        ],
        ...arcGas,
      });
      const receipt = await confirmTx(publicClient, tx);
      const created = eventArgs<{ id: bigint }>(receipt, distributorAbi, "CampaignCreated");
      const idStr = created[0]?.id.toString() ?? "";
      if (idStr) setCreatedId(idStr);
      if (idStr) setCreatedTx(tx);
      if (idStr) {
        await upsertCampaign({
          id: idStr,
          token: tokenAddress,
          funder: address,
          merkleRoot: liveTree.root,
          deposited: deposit.toString(),
          claimStart: resolveTs(startArg, nowSec()),
          claimEnd,
          vestDuration,
          vestCliffDelay: vestCliff,
          txHash: tx,
        });
      }
      setTree(liveTree);
      downloadProofJson(liveTree, idStr || undefined);
      goToExplorerTx(router, tx);
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
          Distributor contract is not configured.
        </div>
      ) : null}

      <FormShell
        title="Create airdrop campaign"
        badge="CSV to merkle"
        aside={
          <PreviewPanel
            title="Campaign preview"
            rows={[
              {
                label: "Deposit",
                value:
                  deposit !== undefined && decimals !== undefined
                    ? `${Number(formatUnits(deposit, decimals)).toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })}${symbol ? ` ${symbol}` : ""}`
                    : "—",
              },
              { label: "Recipients", value: liveTree ? String(liveTree.leaves.length) : "—" },
              {
                label: "Merkle root",
                value: (
                  <span className="mono" style={{ fontSize: "0.7rem", wordBreak: "break-all" }}>
                    {liveTree?.root ?? "—"}
                  </span>
                ),
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
                value: vestDuration === 0 ? "Instant" : formatDuration(vestDuration),
              },
            ]}
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
              ? `${symbol}, balance ${Number(formatUnits(balance, decimals)).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}`
              : "Token you will deposit for the drop."
          }
        />

        <div className="field">
          <label className="field-label" htmlFor="air-csv">
            Recipients CSV
          </label>
          <textarea
            id="air-csv"
            className="af-input mono"
            rows={6}
            placeholder={"address,amount\n0xabc…,100\n0xdef…,50"}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            style={{ resize: "vertical", fontSize: "0.8rem" }}
          />
          {csvError ? <p className="field-error">{csvError}</p> : null}
          {overBalance ? <p className="field-error">Exceeds wallet balance.</p> : null}
          <p className="field-hint">Deposit equals the sum of all amounts. Leaf = keccak(keccak(abi.encode(index, account, amount))).</p>
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
          <p className="field-hint">Set in the future if you need a cancel window before claims open.</p>
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
          {badWindow ? <p className="field-error">Window must be at least 1 hour (on-chain MIN_WINDOW).</p> : null}
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
            {(
              [
                ["Vest days", vestDays, setVestDays],
                ["Vest hours", vestHours, setVestHours],
                ["Cliff days", cliffDays, setCliffDays],
                ["Cliff hours", cliffHours, setCliffHours],
              ] as const
            ).map(([label, value, set]) => (
              <label className="field" style={{ margin: 0 }} key={label}>
                <span className="field-hint" style={{ marginBottom: "0.25rem", display: "block" }}>
                  {label}
                </span>
                <input
                  className="af-input"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="field-hint">Leave vest at 0 for instant claim into the wallet.</p>
          {badVest ? <p className="field-error">Cliff cannot exceed vest duration.</p> : null}
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {createdId ? (
          <div className="alert alert-warn">
            Campaign #{createdId} created. Proof JSON downloaded.{" "}
            <Link href={proofPath("airdrop", createdTx, createdId)}>Open proof</Link>
            {tree ? (
              <button
                type="button"
                className="btn sm"
                style={{ marginLeft: "0.5rem" }}
                onClick={() => downloadProofJson(tree, createdId)}
              >
                Re-download proofs
              </button>
            ) : null}
          </div>
        ) : null}

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
                    ? "Distributor contract is not configured."
                    : !tokenAddress
                      ? "Select a token"
                      : !liveTree || !deposit
                        ? "Paste a valid recipients CSV."
                        : overBalance
                          ? "Deposit exceeds your balance."
                          : badWindow
                            ? "Claim window must be at least 1 hour."
                            : badVest
                              ? "Cliff cannot exceed vest duration."
                              : null,
                  () => void submit(),
                )
              }
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
