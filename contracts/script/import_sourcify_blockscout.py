#!/usr/bin/env python3
"""Import a Sourcify-verified contract into Arc Blockscout (no browser)."""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

import requests

CHAIN_ID = "5042"
EXPLORER = "https://explorer.arc.io"
SOURCIFY = "https://sourcify.dev/server"


def fetch_sourcify(address: str) -> dict:
    response = requests.get(
        f"{SOURCIFY}/v2/contract/{CHAIN_ID}/{address}",
        params={"fields": "sources,metadata,compilation"},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def import_to_blockscout(address: str, contract: dict) -> dict:
    sources = contract.get("sources") or {}
    metadata = contract.get("metadata")
    if not sources or metadata is None:
        raise RuntimeError("Sourcify response missing sources or metadata")

    if isinstance(metadata, dict):
        metadata_text = json.dumps(metadata, separators=(",", ":"))
    else:
        metadata_text = metadata

    files: list[tuple[str, tuple[str, bytes, str]]] = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        index = 0
        for path, source in sources.items():
            content = source.get("content")
            if not content:
                raise RuntimeError(f"Missing inline content for {path}")
            file_path = tmp_path / f"file{index}.sol"
            file_path.write_text(content, encoding="utf-8")
            files.append(
                (
                    f"files[{index}]",
                    (Path(path).name, file_path.read_bytes(), "application/octet-stream"),
                )
            )
            index += 1

        meta_path = tmp_path / "metadata.json"
        meta_path.write_text(metadata_text, encoding="utf-8")
        files.append(
            (
                f"files[{index}]",
                ("metadata.json", meta_path.read_bytes(), "application/json"),
            )
        )

        response = requests.post(
            f"{EXPLORER}/api",
            params={"module": "contract", "action": "verify_via_sourcify"},
            data={"addressHash": address},
            files=files,
            timeout=180,
        )

    try:
        return response.json()
    except Exception:
        return {"status": "error", "raw": response.text[:500], "http": response.status_code}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("address")
    args = parser.parse_args()

    print(f"Fetching Sourcify data for {args.address} ...")
    contract = fetch_sourcify(args.address)
    print(f"  match={contract.get('match')}")

    print("Importing into Blockscout ...")
    result = import_to_blockscout(args.address, contract)
    print(json.dumps(result, indent=2)[:3000])

    if str(result.get("status")) == "1" or result.get("message") == "OK":
        return 0
    if "already verified" in str(result.get("message", "")).lower():
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
