"use client";

import { useMemo, useState } from "react";
import { formatUnits, isAddress, isHex, size, type Hex } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { distributorAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_DISTRIBUTOR_ADDRESS } from "@/lib/chain";
import { ZERO, dateFmt, shorten } from "@/lib/form-time";
import { arcGas, txMessage } from "@/lib/tx";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { FormShell, PreviewPanel } from "@/components/forms/form-shell";

type ProofFile = {
  campaignId?: string | null;
  leaves: {
    index: number;
    account: string;
    amount: string;
    proof: Hex[];
  }[];
};

export function ClaimAirdropForm() {
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [campaignId, setCampaignId] = useState("");
  const [proofJson, setProofJson] = useState("");
  const [receiver, setReceiver] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const id = campaignId.trim() && /^\d+$/.test(campaignId.trim()) ? BigInt(campaignId.trim()) : undefined;
  const notDeployed = ARCFLOW_DISTRIBUTOR_ADDRESS === ZERO;

  const parsed = useMemo(() => {
    if (!proofJson.trim()) return null;
    try {
      return JSON.parse(proofJson) as ProofFile;
    } catch {
      return null;
    }
  }, [proofJson]);

  const leaf = useMemo(() => {
    if (!parsed?.leaves || !address) return null;
    const match = parsed.leaves.find((l) => l.account.toLowerCase() === address.toLowerCase());
    if (!match) return null;
    if (!Array.isArray(match.proof) || match.proof.some((p) => !isHex(p) || size(p) !== 32)) return null;
    try {
      const amount = BigInt(match.amount);
      return { index: BigInt(match.index), amount, proof: match.proof as Hex[] };
    } catch {
      return null;
    }
  }, [parsed, address]);

  const { data: campaign } = useReadContract({
    address: ARCFLOW_DISTRIBUTOR_ADDRESS,
    abi: distributorAbi,
    functionName: "campaigns",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined && !notDeployed },
  });
  const { data: claimed } = useReadContract({
    address: ARCFLOW_DISTRIBUTOR_ADDRESS,
    abi: distributorAbi,
    functionName: "isClaimed",
    args: id !== undefined && leaf ? [id, leaf.index] : undefined,
    query: { enabled: id !== undefined && Boolean(leaf) && !notDeployed },
  });

  const token = campaign?.[0];
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

  const redirect = isAddress(receiver) ? (receiver as `0x${string}`) : undefined;
  const now = Math.floor(Date.now() / 1000);
  const windowOpen =
    campaign &&
    !campaign[9] &&
    now >= Number(campaign[5]) &&
    now < Number(campaign[6]);

  async function submit() {
    setError("");
    setOk("");
    if (!address || !publicClient || id === undefined || !leaf) {
      setError("Need campaign id, connected wallet, and a matching proof JSON leaf.");
      return;
    }
    try {
      setBusy(true);
      const hash = redirect
        ? await writeContractAsync({
            address: ARCFLOW_DISTRIBUTOR_ADDRESS,
            abi: distributorAbi,
            functionName: "claimTo",
            args: [id, leaf.index, address, leaf.amount, leaf.proof, redirect],
            ...arcGas,
          })
        : await writeContractAsync({
            address: ARCFLOW_DISTRIBUTOR_ADDRESS,
            abi: distributorAbi,
            functionName: "claim",
            args: [id, leaf.index, address, leaf.amount, leaf.proof],
            ...arcGas,
          });
      await publicClient.waitForTransactionReceipt({ hash });
      setOk(
        redirect
          ? `Claimed to ${shorten(redirect)}`
          : `Claimed ${
              decimals !== undefined
                ? Number(formatUnits(leaf.amount, decimals)).toLocaleString("en-US")
                : leaf.amount.toString()
            }${symbol ? ` ${symbol}` : ""}`,
      );
    } catch (e) {
      setError(txMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell
      title="Claim airdrop"
      badge="Merkle"
      aside={
        <PreviewPanel
          title="Eligibility"
          rows={[
            { label: "Campaign", value: id !== undefined ? `#${id}` : "—" },
            {
              label: "Your leaf",
              value: leaf
                ? decimals !== undefined
                  ? `${Number(formatUnits(leaf.amount, decimals)).toLocaleString("en-US")}${
                      symbol ? ` ${symbol}` : ""
                    }`
                  : leaf.amount.toString()
                : "Not in proof file",
            },
            {
              label: "Status",
              value: claimed ? "Already claimed" : windowOpen ? "Open" : campaign ? "Closed / not open" : "—",
            },
            {
              label: "Window",
              value:
                campaign && campaign[5] && campaign[6]
                  ? `${dateFmt.format(new Date(Number(campaign[5]) * 1000))} → ${dateFmt.format(
                      new Date(Number(campaign[6]) * 1000),
                    )}`
                  : "—",
            },
          ]}
          note="Paste the JSON exported when the campaign was created. Anyone can pay gas for claim; claimTo redirects only if you own the leaf."
        />
      }
    >
      <div className="field">
        <label className="field-label" htmlFor="claim-id">
          Campaign id
        </label>
        <input
          id="claim-id"
          className="af-input"
          inputMode="numeric"
          placeholder="0"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value.trim())}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="claim-proof">
          Proof JSON
        </label>
        <textarea
          id="claim-proof"
          className="af-input mono"
          rows={7}
          placeholder='{"leaves":[{"index":0,"account":"0x…","amount":"…","proof":["0x…"]}]}'
          value={proofJson}
          onChange={(e) => setProofJson(e.target.value)}
          style={{ resize: "vertical", fontSize: "0.75rem" }}
        />
        {proofJson && !parsed ? <p className="field-error">Invalid JSON.</p> : null}
        {parsed && address && !leaf ? (
          <p className="field-error">Connected wallet is not in this proof file.</p>
        ) : null}
      </div>
      <div className="field">
        <label className="field-label" htmlFor="claim-receiver">
          Redirect to (optional claimTo)
        </label>
        <input
          id="claim-receiver"
          className="af-input mono"
          placeholder="Leave empty to receive in this wallet"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value.trim())}
        />
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {ok ? <div className="alert alert-warn">{ok}</div> : null}
      {!isConnected ? (
        <WalletConnectButton label="Connect to claim" />
      ) : (
        <button
          type="button"
          className="btn lg block"
          disabled={busy || notDeployed || !leaf || id === undefined || Boolean(claimed)}
          onClick={submit}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {claimed ? "Already claimed" : redirect ? "Claim to other wallet" : "Claim"}
        </button>
      )}
    </FormShell>
  );
}
