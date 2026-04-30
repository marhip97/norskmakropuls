"""SSB Statistikkbanken metadata inspector.

Hentet uendret fra SMART-repoet. Gir oversikt over dimensjoner og verdier
i en SSB-tabell før man bygger en spørring.

Kjøring:
    python -m src.data.discover_api --table 09190
"""

from __future__ import annotations

import argparse
import json
import sys

import requests

SSB_API_BASE = "https://data.ssb.no/api/v0/no/table"


def inspect_table(table_id: str, max_values: int = 30) -> None:
    """Print the dimensions and (truncated) values of an SSB table."""
    url = f"{SSB_API_BASE}/{table_id}"
    print(f"Fetching metadata: {url}")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    meta = resp.json()

    print(f"\nTable: {meta.get('title', '(no title)')}")
    print("=" * 70)

    for var in meta.get("variables", []):
        code = var["code"]
        text = var.get("text", "")
        values = var.get("values", [])
        labels = var.get("valueTexts", [])

        print(f"\nDimension: {code}  ({text})")
        print(f"  Total values: {len(values)}")

        n = min(len(values), max_values)
        for i in range(n):
            value = values[i]
            label = labels[i] if i < len(labels) else ""
            print(f"    {value:<10} {label}")

        if len(values) > max_values:
            print(f"    ... ({len(values) - max_values} more)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inspect dimensions and values of an SSB Statistikkbanken table.",
    )
    parser.add_argument("--table", required=True, help="SSB table number (e.g. 09190)")
    parser.add_argument(
        "--max-values",
        type=int,
        default=30,
        help="Maximum number of values shown per dimension (default 30)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw metadata JSON instead of formatted summary",
    )
    args = parser.parse_args()

    if args.json:
        url = f"{SSB_API_BASE}/{args.table}"
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        json.dump(resp.json(), sys.stdout, indent=2, ensure_ascii=False)
        return

    inspect_table(args.table, args.max_values)


if __name__ == "__main__":
    main()
