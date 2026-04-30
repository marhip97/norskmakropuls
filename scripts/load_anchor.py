"""Manuell innlasting av ankerprognoser fra YAML-seed-filer.

Bruk:
    python scripts/load_anchor.py data/anchors/seeds/mpr_2026_1.yaml
    python scripts/load_anchor.py data/anchors/seeds/mpr_2026_1.yaml --dry-run

YAML-format (se data/anchors/seeds/example_format.yaml for mal):

    source: norges_bank_mpr
    publication_date: "2026-03-20"
    series:
      styringsrente:
        - date: "2026-Q1"
          value: 4.50
        - date: "2026-Q2"
          value: 4.25
      kpi:
        - date: "2026-Q1"
          value: 2.6
        - date: "2026-Q2"
          value: 2.4

Datoformat: YYYY-MM-DD eller YYYY-QN (kvartal konverteres til kvartalets start).
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import yaml

sys.path.insert(0, str(Path(__file__).parents[1]))

from src.anchors import Anchor, AnchorStore

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def _parse_date(raw: str) -> pd.Timestamp:
    """Konverter 'YYYY-QN' til kvartalets første dag, eller parse ISO-dato."""
    raw = str(raw).strip()
    if "Q" in raw.upper():
        parts = raw.upper().split("Q")
        year = int(parts[0].rstrip("-"))
        quarter = int(parts[1])
        month = (quarter - 1) * 3 + 1
        return pd.Timestamp(year=year, month=month, day=1)
    return pd.Timestamp(raw)


def load_yaml(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_anchors(data: dict) -> list[Anchor]:
    source = data["source"]
    pub_date = date.fromisoformat(str(data["publication_date"]))
    anchors: list[Anchor] = []

    for series_id, obs_list in data["series"].items():
        dates = [_parse_date(o["date"]) for o in obs_list]
        values = [float(o["value"]) for o in obs_list]
        series = pd.Series(values, index=pd.DatetimeIndex(dates), name="value")
        series = series.sort_index()
        anchors.append(
            Anchor(
                source=source,
                publication_date=pub_date,
                series_id=series_id,
                values=series,
            )
        )
    return anchors


def main() -> None:
    parser = argparse.ArgumentParser(description="Last inn ankerprognoser fra YAML.")
    parser.add_argument("yaml_file", type=Path, help="Sti til seed-YAML.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Vis hva som ville blitt lagret, uten å skrive noe.",
    )
    args = parser.parse_args()

    if not args.yaml_file.exists():
        logger.error("Filen finnes ikke: %s", args.yaml_file)
        sys.exit(1)

    data = load_yaml(args.yaml_file)
    anchors = build_anchors(data)

    store = AnchorStore()
    for anchor in anchors:
        if args.dry_run:
            logger.info(
                "[dry-run] Ville lagret %s/%s %s (%d prognosepunkter)",
                anchor.source, anchor.series_id, anchor.publication_date,
                len(anchor.values),
            )
        else:
            path = store.save(anchor)
            logger.info("Lagret -> %s", path)

    logger.info(
        "%s %d ankerbaner fra %s.",
        "Simulert" if args.dry_run else "Ferdig.",
        len(anchors),
        args.yaml_file.name,
    )


if __name__ == "__main__":
    main()
