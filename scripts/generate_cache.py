"""Generer situasjonsbilde-JSON for dashbordet.

Les ankerprognoser, kjor news-motor og revisjonsmodeller, og skriv resultatet
til dashboard-aksel/public/data/situasjonsbilde.json.

Bruk: python scripts/generate_cache.py
"""

from __future__ import annotations

import json
import logging
import re
import sys
from datetime import date, datetime
from pathlib import Path

import pandas as pd
import yaml

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT))

from src.anchors import AnchorStore  # noqa: E402
from src.models.inflation_components import InflationComponentModel  # noqa: E402
from src.models.shadow_rate import ShadowRateModel  # noqa: E402
from src.news import NewsEngine  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

RAW_DIR = ROOT / "data" / "raw"
ANCHORS_DIR = ROOT / "data" / "anchors"
DATA_CATALOG = ROOT / "data_catalog.yaml"
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

# Map fra catalog-source-koder til vist kildenavn
KILDE_VISNING = {
    "SSB": "SSB",
    "norges_bank": "Norges Bank",
    "FRED": "FRED",
    "NAV": "NAV",
}

# Series med ankerbaner som skal eksponeres i situasjonsbildet (per
# observasjonsdato hentes ankeret som var siste offisielle, og banen
# vises ved siden av den faktiske observerte serien).
ANKER_SERIER = {"kpi", "kpi_jae", "styringsrente"}

_VERIFISERT_RE = re.compile(r"Verifisert hentet:\s*(\d{4}-\d{2}-\d{2})")


def load_data_catalog() -> dict[str, dict]:
    """Last data_catalog.yaml og returner dict indeksert paa series_id."""
    if not DATA_CATALOG.exists():
        logger.warning("Fant ikke %s — status og kilde vil mangle.", DATA_CATALOG)
        return {}
    with open(DATA_CATALOG, encoding="utf-8") as f:
        catalog = yaml.safe_load(f)
    by_id: dict[str, dict] = {}
    for entry in catalog.get("sources", []):
        sid = entry.get("series_id")
        if sid:
            by_id[sid] = entry
    return by_id


def extract_sist_verifisert(catalog_entry: dict | None, fallback: str | None) -> str | None:
    """Trekk ut 'Verifisert hentet: YYYY-MM-DD' fra notes, ellers bruk fallback."""
    if not catalog_entry:
        return fallback
    notes = catalog_entry.get("notes") or ""
    match = _VERIFISERT_RE.search(notes)
    if match:
        return match.group(1)
    return fallback


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


def build_anker_bane(
    series_id: str,
    anchor_store: AnchorStore,
    on_date: date | None = None,
) -> dict | None:
    """Hent ankerbanen som var siste offisielle ved on_date for series_id.

    Returnerer {'publikasjon': '...', 'bane': [{'periode': ..., 'verdi': ...}]}
    eller None hvis ingen ankerbane finnes.
    """
    anchor = anchor_store.latest(series_id, on_date=on_date)
    if anchor is None:
        return None
    bane = [
        {
            "periode": ts.date().isoformat() if hasattr(ts, "date") else str(ts),
            "verdi": round(float(v), 4),
        }
        for ts, v in anchor.values.items()
        if pd.notna(v)
    ]
    return {
        "publikasjon": anchor.publication_date.isoformat(),
        "bane": bane,
    }


def build_variabel(
    series_id: str,
    meta: dict,
    news_engine: NewsEngine,
    anchor_store: AnchorStore,
    catalog_entry: dict | None,
    catalog_last_updated: str | None,
) -> dict:
    df = load_serie(series_id)

    siste_verdi = None
    siste_dato = None
    news_val = None
    std_news = None
    forventet = None
    anker_publikasjon = None
    historikk: list[dict] = []
    antall_rader = 0

    if df is not None and not df.empty:
        antall_rader = len(df)
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
            forventet = round(float(latest.expected), 4)
            anker_publikasjon = latest.anchor_publication.isoformat()
    except Exception as e:
        logger.debug("Ingen news for %s: %s", series_id, e)

    # Ankerbane for relevante serier (KPI, KPI-JAE, styringsrente).
    anker_bane = None
    if series_id in ANKER_SERIER:
        anker_bane = build_anker_bane(series_id, anchor_store)

    # Status, kilde, frekvens fra datakatalogen
    status = catalog_entry.get("status") if catalog_entry else None
    kilde_raw = catalog_entry.get("source") if catalog_entry else None
    kilde = KILDE_VISNING.get(kilde_raw, kilde_raw) if kilde_raw else None
    frekvens = catalog_entry.get("frequency") if catalog_entry else meta.get("frekvens")
    sist_verifisert = extract_sist_verifisert(catalog_entry, catalog_last_updated)

    return {
        "navn": meta["navn"],
        "beskrivelse": meta["beskrivelse"],
        "siste_verdi": siste_verdi,
        "siste_dato": siste_dato,
        "news": news_val,
        "standardisert_news": std_news,
        "forventet": forventet,
        "anker_publikasjon": anker_publikasjon,
        "anker_bane": anker_bane,
        "enhet": meta["enhet"],
        "gruppe": meta["gruppe"],
        "frekvens": frekvens,
        "kilde": kilde,
        "status": status,
        "sist_verifisert": sist_verifisert,
        "antall_rader": antall_rader,
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
                "under": low,
            }
            for p, a, s, u, low in zip(
                path.periods,
                path.anchor_values,
                path.shadow_values,
                path.band_upper,
                path.band_lower,
            )
        ],
    }


def build_inflasjon_dekomposisjon(
    model: InflationComponentModel,
) -> dict | None:
    result = model.compute()
    if result is None:
        return None
    # Eksponer komponentbidragene som en sortert liste for diagrammet.
    bidrag_liste = [
        {"navn": navn, "bidrag": round(float(verdi), 5)}
        for navn, verdi in result.components.items()
    ]
    bidrag_liste.sort(key=lambda r: abs(r["bidrag"]), reverse=True)
    return {
        "total_surprise": (
            round(float(result.total_surprise), 4)
            if result.total_surprise is not None and not _isnan(result.total_surprise)
            else None
        ),
        "komponenter": {k: round(v, 5) for k, v in result.components.items()},
        "bidrag_liste": bidrag_liste,
        "dominant_driver": result.dominant_driver,
        "manglende_komponenter": result.missing_components,
        "anker_publikasjon": (
            result.anchor_publication.isoformat() if result.anchor_publication else None
        ),
    }


def pipeline_status(variabler: dict, catalog_last_updated: str | None) -> dict:
    hentet = sum(1 for v in variabler.values() if v["siste_verdi"] is not None)
    feil = sum(1 for v in variabler.values() if v["siste_verdi"] is None)
    return {
        "siste_kjoring": date.today().isoformat(),
        "variabler_hentet": hentet,
        "variabler_feil": feil,
        "katalog_oppdatert": catalog_last_updated,
    }


def _isnan(v: float) -> bool:
    import math
    try:
        return math.isnan(v)
    except TypeError:
        return False


def main() -> None:
    logger.info("Genererer situasjonsbilde...")

    catalog = load_data_catalog()
    catalog_last_updated = None
    if DATA_CATALOG.exists():
        with open(DATA_CATALOG, encoding="utf-8") as f:
            top = yaml.safe_load(f) or {}
        last = top.get("last_updated")
        if last is not None:
            catalog_last_updated = (
                last.isoformat() if isinstance(last, date) else str(last)
            )

    anchor_store = AnchorStore(base_dir=ANCHORS_DIR)
    news_engine = NewsEngine(anchor_store=anchor_store, obs_dir=RAW_DIR)
    shadow_model = ShadowRateModel(anchor_store=anchor_store, news_engine=news_engine, raw_data_dir=RAW_DIR)
    inflation_model = InflationComponentModel(news_engine=news_engine)

    variabler = {}
    for series_id, meta in VARIABLER_META.items():
        logger.info("  %s", series_id)
        variabler[series_id] = build_variabel(
            series_id, meta, news_engine, anchor_store,
            catalog.get(series_id), catalog_last_updated,
        )

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
        "pipeline_status": pipeline_status(variabler, catalog_last_updated),
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
