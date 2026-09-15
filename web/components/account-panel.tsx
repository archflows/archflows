"use client";

import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { CopyIcon, LogOutIcon, UserCircleIcon } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { explorerAddressUrl } from "@/lib/chain";

export function AccountPanel() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) {
    return (
      <div className="contacts-mgmt min-w-0 w-full">
        <div className="panel max-w-lg">
          <div className="panel-head">
            <span>Account</span>
          </div>
          <div className="panel-body">
            <p className="panel-intro" style={{ margin: 0 }}>
              Connect a wallet to view your dashboard account.
            </p>
            <Link href="/auth?next=/dashboard/account" className="btn mt-4">
              Connect wallet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <div className="contacts-mgmt min-w-0 w-full max-w-lg">
      <div className="panel">
        <div className="panel-head">
          <span className="flex items-center gap-2">
            <UserCircleIcon className="size-4 text-primary" />
            Account
          </span>
        </div>
        <div className="panel-body">
          <p className="panel-intro">
            Wallet connected to this dashboard session. Contacts and settings are saved per address.
          </p>
          <div className="mgmt-list">
            <div className="mgmt-item">
              <div className="mgmt-item-main">
                <p className="mgmt-item-title">Connected wallet</p>
                <p className="mgmt-item-meta font-mono">{address}</p>
              </div>
              <button
                type="button"
                className="btn ghost sm shrink-0"
                title="Copy address"
                onClick={() => void copyToClipboard(address, "Address copied")}
              >
                <CopyIcon className="size-3.5" />
              </button>
            </div>
            <div className="mgmt-item">
              <div className="mgmt-item-main">
                <p className="mgmt-item-title">Network</p>
                <p className="mgmt-item-meta">Arc Testnet</p>
              </div>
            </div>
            <div className="mgmt-item">
              <div className="mgmt-item-main">
                <p className="mgmt-item-title">Explorer</p>
                <p className="mgmt-item-meta">{short} on Arcscan</p>
              </div>
              <a
                href={explorerAddressUrl(address)}
                target="_blank"
                rel="noreferrer"
                className="btn ghost sm shrink-0"
              >
                Open
              </a>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn ghost"
              onClick={() => disconnect()}
            >
              <LogOutIcon className="size-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
