"use client";

import Link from "next/link";
import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { distributorAbi, erc20Abi } from "@/lib/abi";
import { ARCFLOW_DISTRIBUTOR_ADDRESS } from "@/lib/chain";
import { ZERO, dateFmt } from "@/lib/form-time";
import { arcGas, confirmTx, txMessage } from "@/lib/tx";
import { patchCampaign } from "@/lib/backend";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { TxExplorerLink } from "@/components/TxExplorerLink";
import { useTxHashMap } from "@/hooks/useTxHashMap";
import { proofPath } from "@/lib/proof";

const MAX_ROWS = 30;

function CampaignRow({ id, indexedHash }: { id: bigint; indexedHash?: string }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [topUp, setTopUp] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const { data: c, refetch } = useReadContract({
    address: ARCFLOW_DISTRIBUTOR_ADDRESS,
    abi: distributorAbi,
    functionName: "campaigns",
    args: [id],
  });
  const { data: unclaimed, refetch: refetchU } = useReadContract({
    address: ARCFLOW_DISTRIBUTOR_ADDRESS,
    abi: distributorAbi,
    functionName: "unclaimed",
    args: [id],
  });

  const token = c?.[0];
  const deposited = c?.[3];
  const claimed = c?.[4];
  const claimStart = c?.[5];
  const claimEnd = c?.[6];
  const canceled = c?.[9];

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
  const { data: allowance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && token ? [address, ARCFLOW_DISTRIBUTOR_ADDRESS] : undefined,
    query: { enabled: Boolean(address && token) },
  });

  if (!c) return null;
  const dec = decimals ?? 18;
  const now = Math.floor(Date.now() / 1000);
  const beforeStart = claimStart !== undefined && now < Number(claimStart);
  const afterEnd = claimEnd !== undefined && now >= Number(claimEnd);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refetch();
      await refetchU();
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
        <span className="live live-accent">{canceled ? "Canceled" : afterEnd ? "Ended" : beforeStart ? "Scheduled" : "Live"}</span>
        <span className="mono dim" style={{ fontSize: "0.72rem" }}>
          {symbol ?? "Token"} · deposited{" "}
          {deposited !== undefined
            ? Number(formatUnits(deposited, dec)).toLocaleString("en-US", { maximumFractionDigits: 4 })
            : "—"}
          {claimed !== undefined
            ? ` · claimed ${Number(formatUnits(claimed, dec)).toLocaleString("en-US", {
                maximumFractionDigits: 4,
              })}`
            : ""}
        </span>
      </div>
      <p className="mono dim" style={{ margin: "0.3rem 0 0", fontSize: "0.72rem" }}>
        {claimStart && claimEnd
          ? `${dateFmt.format(new Date(Number(claimStart) * 1000))} → ${dateFmt.format(
              new Date(Number(claimEnd) * 1000),
            )}`
          : ""}
        {unclaimed !== undefined
          ? ` · unclaimed ${Number(formatUnits(unclaimed, dec)).toLocaleString("en-US", {
              maximumFractionDigits: 4,
            })}`
          : ""}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }}>
        <TxExplorerLink hash={txHash ?? indexedHash} />
        <Link className="btn sm ghost" href={proofPath("airdrop", txHash ?? indexedHash, id)}>
          Proof
        </Link>
      </div>
      {!canceled ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
          {beforeStart ? (
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  if (!publicClient) return;
                  const hash = await writeContractAsync({
                    address: ARCFLOW_DISTRIBUTOR_ADDRESS,
                    abi: distributorAbi,
                    functionName: "cancel",
                    args: [id],
                    ...arcGas,
                  });
                  await confirmTx(publicClient, hash);
                  setTxHash(hash);
                  await patchCampaign(id.toString(), { canceled: true, txHash: hash });
                })
              }
            >
              Cancel & refund
            </button>
          ) : null}
          {afterEnd && unclaimed && unclaimed > 0n ? (
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  if (!publicClient) return;
                  const hash = await writeContractAsync({
                    address: ARCFLOW_DISTRIBUTOR_ADDRESS,
                    abi: distributorAbi,
                    functionName: "clawback",
                    args: [id],
                    ...arcGas,
                  });
                  await confirmTx(publicClient, hash);
                  setTxHash(hash);
                  await patchCampaign(id.toString(), {
                    deposited: (claimed ?? 0n).toString(),
                    txHash: hash,
                  });
                })
              }
            >
              Clawback
            </button>
          ) : null}
          {!afterEnd && token ? (
            <div style={{ display: "inline-flex", gap: "0.35rem" }}>
              <input
                className="af-input"
                style={{ width: "6rem", height: "2rem", fontSize: "0.8rem" }}
                placeholder="Top-up"
                value={topUp}
                onChange={(e) => setTopUp(e.target.value)}
              />
              <button
                type="button"
                className="btn sm"
                disabled={busy || !topUp}
                onClick={() =>
                  act(async () => {
                    if (!publicClient || !token || decimals === undefined) return;
                    const value = parseUnits(topUp, decimals);
                    if (allowance === undefined || allowance < value) {
                      const a = await writeContractAsync({
                        address: token,
                        abi: erc20Abi,
                        functionName: "approve",
                        args: [ARCFLOW_DISTRIBUTOR_ADDRESS, value],
                        ...arcGas,
                      });
                      await confirmTx(publicClient, a);
                    }
                    const hash = await writeContractAsync({
                      address: ARCFLOW_DISTRIBUTOR_ADDRESS,
                      abi: distributorAbi,
                      functionName: "topUp",
                      args: [id, value],
                      ...arcGas,
                    });
                    await confirmTx(publicClient, hash);
                  setTxHash(hash);
                    await patchCampaign(id.toString(), {
                      deposited: ((deposited ?? 0n) + value).toString(),
                      txHash: hash,
                    });
                    setTopUp("");
                  })
                }
              >
                Top up
              </button>
            </div>
          ) : null}
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        </div>
      ) : null}
      {error ? <p className="field-error" style={{ marginTop: "0.35rem" }}>{error}</p> : null}
    </div>
  );
}

function IndexedCampaign({
  owner,
  index,
  txMap,
}: {
  owner: `0x${string}`;
  index: number;
  txMap?: Map<string, string>;
}) {
  const { data: id } = useReadContract({
    address: ARCFLOW_DISTRIBUTOR_ADDRESS,
    abi: distributorAbi,
    functionName: "campaignsByFunder",
    args: [owner, BigInt(index)],
  });
  if (id === undefined) return null;
  return <CampaignRow id={id} indexedHash={txMap?.get(id.toString())} />;
}

export function MyCampaignsPanel() {
  const { address, isConnected } = useAccount();
  const { data: txMap } = useTxHashMap("campaigns", address);
  const { data: count } = useReadContract({
    address: ARCFLOW_DISTRIBUTOR_ADDRESS,
    abi: distributorAbi,
    functionName: "funderCampaignCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  if (!isConnected || !address) {
    return (
      <div className="panel">
        <div className="panel-body">
          <WalletConnectButton label="Connect to manage campaigns" />
        </div>
      </div>
    );
  }

  const n = Number(count ?? 0n);
  return (
    <div className="panel">
      <div className="panel-head">
        <span>Your campaigns</span>
        <span className="live live-accent">{n}</span>
      </div>
      {n === 0 ? (
        <div className="panel-body">
          <p className="dim" style={{ margin: 0 }}>
            No campaigns funded from this wallet yet.
          </p>
        </div>
      ) : (
        <div>
          {Array.from({ length: Math.min(n, MAX_ROWS) }, (_, i) => (
            <IndexedCampaign key={i} owner={address} index={i} txMap={txMap} />
          ))}
        </div>
      )}
    </div>
  );
}
