"""Internverktøy: konverter innlest MPR-tabelldata til seed-YAML-filer.

Kjøres én gang, deretter slettes. Genererer:
  data/anchors/seeds/mpr_4_2025.yaml
  data/anchors/seeds/mpr_1_2026.yaml
"""

from __future__ import annotations

from pathlib import Path

import yaml

# ── rådata fra Norges Bank MPR-tabell ──────────────────────────────────────────
# Format: dato (DD/M/YY), ppr1_26_rente, ppr4_25_rente,
#         ppr1_26_gap, ppr4_25_gap, ppr1_26_kpi, ppr4_25_kpi,
#         ppr1_26_kpijae, ppr4_25_kpijae
# Tom streng = ikke tilgjengelig i denne rapporten

RAW = """31/3/15,1.25,1.25,-0.75,-0.75,1.97,2.03,2.36,2.35
30/6/15,1.22,1.22,-0.94,-0.94,2.29,2.26,2.62,2.61
30/9/15,0.98,0.98,-1.16,-1.16,1.87,1.91,2.75,2.77
31/12/15,0.75,0.75,-1.37,-1.37,2.52,2.50,3.05,3.02
31/3/16,0.71,0.71,-1.50,-1.50,3.20,3.21,3.25,3.31
30/6/16,0.50,0.50,-1.55,-1.55,3.49,3.51,3.23,3.21
30/9/16,0.50,0.50,-1.47,-1.47,3.95,3.91,3.30,3.32
31/12/16,0.50,0.50,-1.41,-1.41,3.55,3.56,2.74,2.74
31/3/17,0.50,0.50,-1.09,-1.09,2.64,2.61,1.88,1.86
30/6/17,0.50,0.50,-0.86,-0.86,2.21,2.14,1.61,1.59
30/9/17,0.50,0.50,-0.70,-0.70,1.48,1.45,1.04,1.00
31/12/17,0.50,0.50,-0.52,-0.52,1.33,1.34,1.08,1.12
31/3/18,0.50,0.50,-0.25,-0.25,2.02,2.01,1.12,1.15
30/6/18,0.50,0.50,-0.15,-0.15,2.35,2.45,1.24,1.28
30/9/18,0.53,0.53,-0.01,-0.01,3.19,3.23,1.67,1.69
31/12/18,0.75,0.75,0.22,0.22,3.40,3.37,2.00,2.03
31/3/19,0.78,0.78,0.40,0.40,2.95,2.99,2.51,2.50
30/6/19,1.03,1.03,0.55,0.55,2.55,2.47,2.37,2.39
30/9/19,1.28,1.28,0.62,0.62,1.60,1.62,2.10,2.10
31/12/19,1.50,1.50,0.59,0.59,1.60,1.62,2.04,1.96
31/3/20,1.34,1.34,-1.10,-1.10,1.21,1.15,2.45,2.41
30/6/20,0.10,0.10,-5.20,-5.20,1.10,1.16,3.01,2.95
30/9/20,0.00,0.00,-1.80,-1.80,1.54,1.53,3.50,3.47
31/12/20,0.00,0.00,-1.90,-1.90,1.33,1.30,3.11,3.14
31/3/21,0.00,0.00,-2.10,-2.10,2.91,2.99,2.67,2.69
30/6/21,0.00,0.00,-1.20,-1.20,2.80,2.79,1.56,1.58
30/9/21,0.02,0.02,0.18,0.18,3.50,3.49,1.07,1.13
31/12/21,0.29,0.29,1.40,1.40,4.63,4.64,1.35,1.36
31/3/22,0.52,0.52,1.80,1.80,3.91,3.88,1.85,1.85
30/6/22,0.79,0.79,2.00,2.00,5.78,5.73,3.27,3.27
30/9/22,1.53,1.53,1.89,1.89,6.72,6.78,4.84,4.84
31/12/22,2.45,2.45,1.70,1.70,6.66,6.64,5.79,5.78
31/3/23,2.77,2.77,1.29,1.29,6.64,6.65,6.23,6.23
30/6/23,3.20,3.20,0.80,0.80,6.35,6.38,6.68,6.67
30/9/23,3.89,3.89,0.56,0.56,4.60,4.59,6.11,6.04
31/12/23,4.30,4.30,0.33,0.33,4.52,4.55,5.77,5.76
31/3/24,4.50,4.50,0.25,0.25,4.39,4.35,4.88,4.89
30/6/24,4.50,4.50,0.14,0.14,3.03,3.03,3.90,3.93
30/9/24,4.50,4.50,0.04,0.04,2.87,2.85,3.18,3.22
31/12/24,4.50,4.50,0.05,0.05,2.49,2.41,2.76,2.82
31/3/25,4.50,4.50,0.05,0.05,2.74,2.79,3.20,3.19
30/6/25,4.47,4.47,0.00,-0.02,2.84,2.80,2.96,2.98
30/9/25,4.22,4.22,0.00,-0.09,3.45,3.50,3.08,3.09
31/12/25,4.00,4.00,0.00,-0.12,3.11,3.01,3.16,3.12
31/3/26,4.00,4.00,-0.03,-0.15,3.25,2.38,3.04,2.74
30/6/26,4.07,3.92,-0.09,-0.18,3.54,2.33,3.28,2.84
30/9/26,4.26,3.83,-0.24,-0.26,3.50,2.22,3.36,2.78
31/12/26,4.35,3.71,-0.45,-0.35,3.45,2.49,3.33,2.62
31/3/27,4.30,3.57,-0.62,-0.43,2.67,2.44,3.05,2.56
30/6/27,4.26,3.45,-0.76,-0.46,2.26,2.71,2.87,2.47
30/9/27,4.12,3.37,-0.85,-0.45,2.13,2.76,2.68,2.40
31/12/27,3.98,3.31,-0.90,-0.39,2.25,2.35,2.50,2.35
31/3/28,3.83,3.26,-0.92,-0.34,2.29,2.29,2.36,2.29
30/6/28,3.69,3.24,-0.90,-0.29,2.19,2.23,2.26,2.23
30/9/28,3.60,3.22,-0.87,-0.25,2.12,2.19,2.19,2.19
31/12/28,3.54,3.20,-0.83,-0.21,2.07,2.15,2.14,2.15
31/3/29,3.49,,-0.79,,2.10,,2.10,
30/6/29,3.45,,-0.75,,2.08,,2.07,
30/9/29,3.42,,-0.70,,2.05,,2.05,
31/12/29,3.40,,-0.66,,2.04,,2.03,"""


def date_to_quarter(raw: str) -> str:
    parts = raw.strip().split("/")
    _, month, year_short = int(parts[0]), int(parts[1]), parts[2]
    year = 2000 + int(year_short)
    quarter = (month - 1) // 3 + 1
    return f"{year}-Q{quarter}"


def parse_rows() -> list[dict]:
    rows = []
    for line in RAW.strip().splitlines():
        fields = line.split(",")
        rows.append({
            "date": date_to_quarter(fields[0]),
            "ppr1_rente":  float(fields[1]) if fields[1] else None,
            "ppr4_rente":  float(fields[2]) if fields[2] else None,
            "ppr1_gap":    float(fields[3]) if fields[3] else None,
            "ppr4_gap":    float(fields[4]) if fields[4] else None,
            "ppr1_kpi":    float(fields[5]) if fields[5] else None,
            "ppr4_kpi":    float(fields[6]) if fields[6] else None,
            "ppr1_kpijae": float(fields[7]) if fields[7] else None,
            "ppr4_kpijae": float(fields[8]) if fields[8].strip() else None,
        })
    return rows


def build_series(rows: list[dict], col: str) -> list[dict]:
    return [
        {"date": r["date"], "value": r[col]}
        for r in rows
        if r[col] is not None
    ]


def write_yaml(path: Path, source: str, pub_date: str, series: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "source": source,
        "publication_date": pub_date,
        "series": series,
    }
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False, default_flow_style=False)
    print(f"Skrevet: {path}")


def main() -> None:
    rows = parse_rows()
    seeds = Path(__file__).parents[1] / "data" / "anchors" / "seeds"

    # PPR 4/2025 (desember 2025)
    write_yaml(
        seeds / "mpr_4_2025.yaml",
        source="norges_bank_mpr",
        pub_date="2025-12-19",
        series={
            "styringsrente":   build_series(rows, "ppr4_rente"),
            "produksjonsgap":  build_series(rows, "ppr4_gap"),
            "kpi":             build_series(rows, "ppr4_kpi"),
            "kpi_jae":         build_series(rows, "ppr4_kpijae"),
        },
    )

    # PPR 1/2026 (mars 2026)
    write_yaml(
        seeds / "mpr_1_2026.yaml",
        source="norges_bank_mpr",
        pub_date="2026-03-26",
        series={
            "styringsrente":   build_series(rows, "ppr1_rente"),
            "produksjonsgap":  build_series(rows, "ppr1_gap"),
            "kpi":             build_series(rows, "ppr1_kpi"),
            "kpi_jae":         build_series(rows, "ppr1_kpijae"),
        },
    )


if __name__ == "__main__":
    main()
