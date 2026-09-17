#!/usr/bin/env python3
"""Import a Sourcify-verified build into Arc Blockscout."""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

import requests


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("address")
    parser.add_argument("artifact")
    parser.add_argument("--explorer", default="https://explorer.arc.io")
    args = parser.parse_args()

    artifact = json.loads(Path(args.artifact).read_text(encoding="utf-8"))
    metadata = artifact["metadata"]
    if isinstance(metadata, str):
        metadata_obj = json.loads(metadata)
        metadata_text = metadata
    else:
        metadata_obj = metadata
        metadata_text = json.dumps(metadata_obj, separators=(",", ":"))

    main_source = next(
        (path for path in metadata_obj["sources"] if path.startswith("src/")),
        None,
    )
    if not main_source:
        raise SystemExit("No src/* entry in metadata sources")

    source_text = metadata_obj["sources"][main_source]["content"]

    with tempfile.TemporaryDirectory() as tmp:
        source_path = Path(tmp) / "contract.sol"
        meta_path = Path(tmp) / "metadata.json"
        source_path.write_text(source_text, encoding="utf-8")
        meta_path.write_text(metadata_text, encoding="utf-8")

        url = f"{args.explorer}/api?module=contract&action=verify_via_sourcify"
        with source_path.open("rb") as src, meta_path.open("rb") as meta:
            response = requests.post(
                url,
                data={"addressHash": args.address},
                files={
                    "files[0]": ("contract.sol", src, "application/octet-stream"),
                    "files[1]": ("metadata.json", meta, "application/json"),
                },
                timeout=120,
            )
        print(response.status_code)
        print(response.text[:2000])
        return 0 if response.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
