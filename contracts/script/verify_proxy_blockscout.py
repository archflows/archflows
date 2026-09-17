#!/usr/bin/env python3
"""Verify ERC1967 proxy on Arc Blockscout using Sourcify stdJsonInput."""

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
CONTRACT_NAME = (
    "lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy"
)


def fetch_std_json(address: str) -> str:
    response = requests.get(
        f"{SOURCIFY}/v2/contract/{CHAIN_ID}/{address}",
        params={"fields": "stdJsonInput,compilation"},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    std_json = payload.get("stdJsonInput")
    if not std_json:
        raise RuntimeError("Sourcify did not return stdJsonInput")
    if isinstance(std_json, dict):
        return json.dumps(std_json, separators=(",", ":"))
    return std_json


def verify_standard_input(address: str, std_json_text: str) -> tuple[int, str]:
    url = f"{EXPLORER}/api/v2/smart-contracts/{address}/verification/via/standard-input"
    data = {
        "compiler_version": "v0.8.24+commit.e11b9ed9",
        "contract_name": CONTRACT_NAME,
        "autodetect_constructor_args": "true",
        "license_type": "mit",
        "is_optimization_enabled": "true",
        "optimization_runs": "200",
        "evm_version": "cancun",
    }
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False) as handle:
        handle.write(std_json_text)
        path = handle.name

    try:
        with open(path, "rb") as handle:
            response = requests.post(
                url,
                data=data,
                files={"files[0]": ("standard-input.json", handle, "application/json")},
                timeout=180,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json,text/plain,*/*",
                },
            )
    finally:
        Path(path).unlink(missing_ok=True)

    return response.status_code, response.text[:2000]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("address")
    args = parser.parse_args()

    print(f"Fetching stdJsonInput for {args.address} ...")
    std_json = fetch_std_json(args.address)
    print(f"  bytes={len(std_json)}")

    print("Submitting to Blockscout v2 ...")
    status, body = verify_standard_input(args.address, std_json)
    print(f"  http={status}")
    print(body)
    return 0 if status in (200, 201, 204) else 1


if __name__ == "__main__":
    raise SystemExit(main())
