#!/usr/bin/env python3
"""Submit standard-json verification to Arc Blockscout v2 API."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import requests


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("address")
    parser.add_argument("standard_json")
    parser.add_argument("contract_name")
    parser.add_argument("--explorer", default="https://explorer.arc.io")
    args = parser.parse_args()

    url = (
        f"{args.explorer}/api/v2/smart-contracts/"
        f"{args.address}/verification/via/standard-input"
    )
    payload = {
        "compiler_version": "v0.8.24+commit.e11b9ed9",
        "contract_name": args.contract_name,
        "autodetect_constructor_args": "true",
        "license_type": "mit",
        "is_optimization_enabled": "true",
        "optimization_runs": "200",
        "evm_version": "cancun",
    }
    json_path = Path(args.standard_json)
    with json_path.open("rb") as handle:
        response = requests.post(
            url,
            data=payload,
            files={"files[0]": ("standard-input.json", handle, "application/json")},
            timeout=180,
        )
    print(response.status_code)
    text = response.text
    print(text[:3000])
    if response.ok:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
