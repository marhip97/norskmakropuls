"""Generer situasjonsbilde-JSON for dashbordet.

Les ankerprognoser, kjor news-motor og revisjonsmodeller, og skriv resultatet
til dashboard-aksel/public/data/situasjonsbilde.json.

Bruk: python scripts/generate_cache.py
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import date, datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT))

from src.anchors import AnchorStore
from src.models.inflation_components import InflationComponentModel
from src.models.shadow_rate import ShadowRateModel
from src.news import NewsEngine

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

RAW_DIR = ROOT / "data" / "raw"
ANCHORS_DIR = ROOT / "data" / "anchors"
OUT_FILE = ROOT / "dashboard-aksel" / "public" / "data" / "situasjonsbilde.json"

VARIABLER_META: dict[str, dict] = {
    "kpi":              {"navn": "KPI", "beskrivelse": "Konsumprisindeksen, 12-mnd vekst", "enhet": "% ar/ar", "gruppe": "inflasjon", "frekvens": "monthly"},
    "kpi_jae":          {"navn": "KPI-JAE", "beskrivelse": "KPI justert for avgifter og energi", "enhet": "% ar/ar", "gruppe": "inflasjon", "frekvens": "monthly"},
    "styringsrente":    {"navn": "Styringsrente", "beskrivelse": "Norges Banks foliorente", "enhet": "%", "gruppe": "rente", "frekvens": "monthly"},
    "nowa":             {"navn": "NOWA", "beskrivelse": "Norwegian Overnight Weighted Average", "enhet": "%", "gruppe": "rente", "frekvens": "daily"},
    "eurnok":           {"navn": "EUR/NOK", "beskrivelse": "Valutakurs euro mot krone", "enhet": "NOK", "gruppe": "rente", "frekvens": "daily"},
    "usd_nok":          {"navn": "USD/NOK", "beskrivelse": "Valutakurs dollar mot krone", "enhet": "NOK", "gruppe": "rente", "frekvens": "daily"},
    "gov_yield_3y_no":  {"navn": "3-ar statsrente", "beskrivelse": "Norsk statsobligasjonsrente 3 ar", "enhet": "%", "gruppe": "rente", "frekvens": "daily"},
    "gov_yield_10y_no": {"navn": "10-ar statsrente", "beskrivelse": "Norsk statsobligasjonsrente 10 ar", "enhet": "%", "gruppe": "rente", "frekvens": "daily"},
    "i44":              {"navn": "I-44", "beskrivelse": "Importveid valutakursindeks", "enhet": "indeks", "gruppe": "rente", "frekvens": "daily"},
    "bnp_fastland":     {"navn": "BNP Fastlands-Norge", "beskrivelse": "Volumvekst, sesongjustert", "enhet": "% ar/ar", "gruppe": "aktivitet", "frekvens": "quarterly"},
    "boligprisvekst":   {"navn": "Boligprisvekst", "beskrivelse": "SSB boligprisindeks", "enhet": "indeks", "gruppe": "aktivitet", "frekvens": "quarterly"},
    "k2_kredittvekst":  {"navn": "K2-kredittvekst", "beskrivelse": "Innenlandsk kredittvekst, 12-mnd", "enhet": "% ar/ar", "gruppe": "aktivitet", "frekvens": "monthly"},
    "ledighet_aku":     {"navn": "AKU-ledighet", "beskrivelse": "Arbeidskraftundersokelsen, 15-74 ar", "enhet": "%", "gruppe": "arbeidsmarked", "frekvens": "monthly"},
    "lonnsvekst":       {"navn": "Arslonnsvekst", "beskrivelse": "Alle naringer", "enhet": "% ar/ar", "gruppe": "arbeidsmarked", "frekvens": "annual"},
    "oljepris":         {"navn": "Oljepris Brent", "beskrivelse": "Brent crude, USD per fat", "enhet": "USD", "gruppe": "internasjonal", "frekvens": "daily"},
    "ecb_rente":        {"navn": "ECB-rente", "beskrivelse": "ECB Deposit Facility Rate", "enhet": "%", "gruppe": "internasjonal", "frekvens": "daily"},
    "fed_funds":        {"navn": "Fed Funds Rate", "beskrivelse": "Federal Funds Effective Rate", "enhet": "%", "gruppe": "internasjonal", "frekvens": "monthly"},
    "handelspartnervekst": {"navn": "Handelspartnervekst", "beskrivelse": "Eurosone BNP, volum", "enhet": "indeks", "gruppe": "internasjonal", "frekvens": "quarterly"},
    "us_10y_yield":     {"navn": "US 10-ar rente", "beskrivelse": "Treasury Constant Maturity 10Y", "enhet": "%", "gruppe": "internasjonal", "frekvens": "daily"},
    "us_cpi":           {"navn": "US CPI", "beskrivelse": "Konsumprisindeks USA (CPI-U)", "enhet": "indeks", "gruppe": "internasjonal", "frekvens": "monthly"},
}

# Maks rader i historikk per frekvens. Hensikten er at dashbordet viser
# omtrent samme tidshorisont uavhengig av om serien er daglig, manedlig
# eller kvartalsvis (~10 ars historikk for alle).
HISTORIKK_GRENSE = date(2015, 1, 1)
HISTORIKK_MAKS_RADER_PER_FREKVENS: dict[str, int] = {
    "daily": 2600,        # ~10 aars handledager
    "monthly": 120,       # ~10 aar
    "quarterly": 40,      # ~10 aar
    "annual": 15,
}
HISTORIKK_DEFAULT_MAKS_RADER = 120


def load_serie(series_id: str) -> pd.DataFrame | None:
    series_dir = RAW_DIR / series_id
    if not series_dir.exists():
        return None
    files = sorted(series_dir.glob("*.parquet"))
    if not files:
        return None
    df = pd.read_parquet(files[-1]).dropna(subset=["value"]).copy()
    if df.empty:
        return None
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values("date").reset_index(drop=True)


def build_variabel(
    series_id: str,
    meta: dict,
    news_engine: NewsEngine,
    anchor_store: AnchorStore,
) -> dict:
    df = load_serie(series_id)

    siste_verdi = None
    siste_dato = None
    news_val = None
    std_news = None
    historikk: list[dict] = []

    if df is not None and not df.empty:
        siste_verdi = round(float(df["value"].iloc[-1]), 4)
        siste_dato = df["date"].iloc[-1].isoformat()
        maks_rader = HISTORIKK_MAKS_RADER_PER_FREKVENS.get(
            meta.get("frekvens", ""), HISTORIKK_DEFAULT_MAKS_RADER
        )
        historikk = [
            {"dato": row["date"].isoformat(), "verdi": round(float(row["value"]), 4)}
            for _, row in df[df["date"] >= pd.Timestamp(HISTORIKK_GRENSE)].iterrows()
        ][-maks_rader:]

    try:
        latest = news_engine.latest_news(series_id)
        if latest:
            news_val = round(float(latest.surprise), 4)
            std_news = round(float(latest.standardised_surprise), 4) if not _isnan(latest.standardised_surprise) else None
    except Exception as e:
        logger.debug("Ingen news for %s: %s", series_id, e)

    return {
        "navn": meta["navn"],
        "beskrivelse": meta["beskrivelse"],
        "siste_verdi": siste_verdi,
        "siste_dato": siste_dato,
        "news": news_val,
        "standardisert_news": std_news,
        "enhet": meta["enhet"],
        "gruppe": meta["gruppe"],
        "historikk": historikk,
    }


def build_skyggerentebane(model: ShadowRateModel) -> dict | None:
    path = model.compute()
    if path is None:
        return None
    return {
        "anker_publikasjon": path.anchor_publication.isoformat(),
        "bane": [
            {
                "periode": p.isoformat(),
                "anker": a,
                "skygge": s,
                "over": u,
                "under": l,
            }
            for p, a, s, u, l in zip(
                path.periods,
                path.anchor_values,
                path.shadow_values,
                path.band_upper,
                path.band_lower,
            )
        ],
    }


def build_inflasjon_dekomposisjon(model: InflationComponentModel) -> dict | None:
    result = model.compute()
    if result is None:
        return None
    return {
        "total_surprise": round(float(result.total_surprise), 4) if result.total_surprise is not None and not _isnan(result.total_surprise) else None,
        "komponenter": {k: round(v, 5) for k, v in result.components.items()},
        "dominant_driver": result.dominant_driver,
        "manglende_komponenter": result.missing_components,
    }


def pipeline_status(variabler: dict) -> dict:
    hentet = sum(1 for v in variabler.values() if v["siste_verdi"] is not None)
    feil = sum(1 for v in variabler.values() if v["siste_verdi"] is None)
    return {
        "siste_kjoring": date.today().isoformat(),
        "variabler_hentet": hentet,
        "variabler_feil": feil,
    }


def _isnan(v: float) -> bool:
    import math
    try:
        return math.isnan(v)
    except TypeError:
        return False


def main() -> None:
    logger.info("Genererer situasjonsbilde...")

    anchor_store = AnchorStore(base_dir=ANCHORS_DIR)
    news_engine = NewsEngine(anchor_store=anchor_store, obs_dir=RAW_DIR)
    shadow_model = ShadowRateModel(anchor_store=anchor_store, news_engine=news_engine, raw_data_dir=RAW_DIR)
    inflation_model = InflationComponentModel(news_engine=news_engine)

    variabler = {}
    for series_id, meta in VARIABLER_META.items():
        logger.info("  %s", series_id)
        variabler[series_id] = build_variabel(series_id, meta, news_engine, anchor_store)

    logger.info("Beregner skyggerentebane...")
    skygge = build_skyggerentebane(shadow_model)

    logger.info("Beregner inflasjondekomposisjon...")
    dekomp = build_inflasjon_dekomposisjon(inflation_model)

    anker_vintage = None
    anker = anchor_store.latest("styringsrente")
    if anker:
        anker_vintage = anker.publication_date.isoformat()

    situasjonsbilde = {
        "generert": datetime.utcnow().isoformat() + "Z",
        "anker_vintage": anker_vintage,
        "variabler": variabler,
        "skyggerentebane": skygge,
        "inflasjon_dekomposisjon": dekomp,
        "pipeline_status": pipeline_status(variabler),
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(situasjonsbilde, f, ensure_ascii=False, indent=2, default=str)

    logger.info("Skrevet til %s", OUT_FILE)
    logger.info(
        "  %d variabler, %d hentet, skygge=%s",
        len(variabler),
        situasjonsbilde["pipeline_status"]["variabler_hentet"],
        "ja" if skygge else "nei",
    )


if __name__ == "__main__":
    main()
