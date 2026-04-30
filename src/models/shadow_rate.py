"""Skyggerentebane — lineær revisjonsmodell for norsk styringsrente.

Implementerer SPEC.md seksjon 8.2.

r_shadow_t = r_anchor_t + delta_r_t

der delta_r_t er drevet av news i inflasjon, arbeidsmarked og finansielle
variabler siden siste PPR, dempet eksponentielt ut over prognosehorisonten.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

from src.anchors import AnchorStore
from src.news import NewsEngine

logger = logging.getLogger(__name__)

RAW_DATA_DIR = Path(__file__).parents[2] / "data" / "raw"

DEFAULT_COEFFICIENTS: dict[str, float] = {
    "beta_kpi": 0.15,
    "beta_kpi_jae": 0.20,
    "beta_aku": -0.10,
    "beta_eurnok": -0.05,
    "beta_oil": 0.002,
}

DEFAULT_MAX_REVISION: float = 0.50
DEFAULT_HORIZON_DECAY: float = 0.85
DEFAULT_UNCERTAINTY_Z: float = 1.0
_NEWS_BAND_SCALE: float = 2.0
_FALLBACK_BAND_WIDTH: float = 0.50


@dataclass
class ShadowRatePath:
    """Beregnet skyggerentebane med usikkerhetsbånd.

    Alle lister har samme lengde og tilsvarer kvartalene i ankerbanen.
    """

    anchor_publication: date
    computed_at: date
    periods: list[date]
    anchor_values: list[float]
    revision: list[float]
    shadow_values: list[float]
    band_upper: list[float]
    band_lower: list[float]

    def to_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame({
            "period": self.periods,
            "anchor": self.anchor_values,
            "revision": self.revision,
            "shadow": self.shadow_values,
            "band_upper": self.band_upper,
            "band_lower": self.band_lower,
        })


class ShadowRateModel:
    """Lineær revisjonsmodell for norsk styringsrente (SPEC.md seksjon 8.2).

    Parameters
    ----------
    anchor_store : AnchorStore
    news_engine : NewsEngine
    coefficients : dict, optional
        Koeffisienter for revisjonsmodellen. Standard: DEFAULT_COEFFICIENTS.
    max_revision : float
        Maks absolutt revisjon per kvartal (dampingsfaktor). Standard: 0.50 pp.
    horizon_decay : float
        Eksponentiell demping per kvartal fremover. Standard: 0.85.
    uncertainty_z : float
        Antall standardavvik for usikkerhetsbåndene. Standard: 1.0.
    raw_data_dir : Path, optional
        Rot for observasjonsdata. Standard: data/raw/.
    """

    def __init__(
        self,
        anchor_store: AnchorStore,
        news_engine: NewsEngine,
        coefficients: dict[str, float] | None = None,
        max_revision: float = DEFAULT_MAX_REVISION,
        horizon_decay: float = DEFAULT_HORIZON_DECAY,
        uncertainty_z: float = DEFAULT_UNCERTAINTY_Z,
        raw_data_dir: Path | None = None,
    ) -> None:
        self.anchor_store = anchor_store
        self.news_engine = news_engine
        self.coefficients = coefficients or DEFAULT_COEFFICIENTS.copy()
        self.max_revision = max_revision
        self.horizon_decay = horizon_decay
        self.uncertainty_z = uncertainty_z
        self.raw_data_dir = raw_data_dir or RAW_DATA_DIR

    def _latest_value(self, series_id: str) -> float | None:
        """Hent siste tilgjengelige verdi for en serie fra data/raw/."""
        series_dir = self.raw_data_dir / series_id
        if not series_dir.exists():
            return None
        files = sorted(series_dir.glob("*.parquet"))
        if not files:
            return None
        df = pd.read_parquet(files[-1]).dropna(subset=["value"])
        if df.empty:
            return None
        df["date"] = pd.to_datetime(df["date"])
        return float(df.sort_values("date")["value"].iloc[-1])

    def _level_deviation(
        self, series_id: str, anchor_assumption: float | None
    ) -> float:
        """Beregn avvik mellom siste verdi og ankerets tekniske forutsetning.

        Hvis anchor_assumption ikke er oppgitt, brukes 12-månedersgjennomsnittet
        som referanse (MVP-fallback).
        """
        series_dir = self.raw_data_dir / series_id
        if not series_dir.exists():
            return 0.0
        files = sorted(series_dir.glob("*.parquet"))
        if not files:
            return 0.0
        df = pd.read_parquet(files[-1]).dropna(subset=["value"])
        if df.empty:
            return 0.0
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")
        latest = float(df["value"].iloc[-1])

        if anchor_assumption is not None:
            return latest - anchor_assumption

        cutoff = df["date"].max() - pd.DateOffset(months=12)
        recent = df[df["date"] >= cutoff]["value"]
        if recent.empty:
            return 0.0
        return latest - float(recent.mean())

    def _band_width(self) -> float:
        """Estimer usikkerhetsbåndbredde fra historisk KPI-news-volatilitet."""
        try:
            df = self.news_engine.news_dataframe("kpi", since=date(2010, 1, 1))
            if df.empty or df["surprise"].isna().all():
                return _FALLBACK_BAND_WIDTH
            return float(df["surprise"].std()) * _NEWS_BAND_SCALE
        except Exception:
            return _FALLBACK_BAND_WIDTH

    def compute(
        self,
        anchor_eurnok: float | None = None,
        anchor_oljepris: float | None = None,
        as_of: date | None = None,
    ) -> ShadowRatePath | None:
        """Beregn skyggerentebanen.

        Parameters
        ----------
        anchor_eurnok : float, optional
            PPRs tekniske forutsetning for EUR/NOK. Hvis None: 12-mnd snitt.
        anchor_oljepris : float, optional
            PPRs tekniske forutsetning for Brent (USD/fat). Hvis None: 12-mnd snitt.
        as_of : date, optional
            Punkt-i-tid-dato for ankervalg. Standard: date.today().

        Returns
        -------
        ShadowRatePath, eller None hvis ankerbanen for styringsrente ikke finnes.
        """
        reference_date = as_of or date.today()

        anchor = self.anchor_store.latest("styringsrente", on_date=reference_date)
        if anchor is None:
            logger.warning("Ingen ankerbane for styringsrente ved %s.", reference_date)
            return None

        # News for inflasjon og arbeidsmarked
        news_kpi = self.news_engine.latest_news("kpi")
        news_kpi_jae = self.news_engine.latest_news("kpi_jae")
        news_aku = self.news_engine.latest_news("ledighet_aku")

        surprise_kpi = news_kpi.surprise if news_kpi else 0.0
        surprise_kpi_jae = news_kpi_jae.surprise if news_kpi_jae else 0.0
        surprise_aku = news_aku.surprise if news_aku else 0.0

        # Avvik fra ankerets tekniske forutsetninger for finansielle variabler
        dev_eurnok = self._level_deviation("eurnok", anchor_eurnok)
        dev_oil = self._level_deviation("oljepris", anchor_oljepris)

        c = self.coefficients
        delta_r_0 = (
            c["beta_kpi"] * surprise_kpi
            + c["beta_kpi_jae"] * surprise_kpi_jae
            + c["beta_aku"] * surprise_aku
            + c["beta_eurnok"] * dev_eurnok
            + c["beta_oil"] * dev_oil
        )

        logger.info(
            "delta_r_0=%.4f (kpi=%.3f, kpi_jae=%.3f, aku=%.3f, eurnok=%.3f, oil=%.3f)",
            delta_r_0, surprise_kpi, surprise_kpi_jae, surprise_aku,
            dev_eurnok, dev_oil,
        )

        band = self._band_width()
        periods = [ts.date() for ts in anchor.values.index]
        anchor_vals = [float(v) for v in anchor.values]

        revisions: list[float] = []
        shadows: list[float] = []
        uppers: list[float] = []
        lowers: list[float] = []

        for i, av in enumerate(anchor_vals):
            decay = self.horizon_decay ** i
            delta = float(np.clip(delta_r_0 * decay, -self.max_revision, self.max_revision))
            shadow = av + delta
            revisions.append(round(delta, 4))
            shadows.append(round(shadow, 4))
            uppers.append(round(shadow + self.uncertainty_z * band, 4))
            lowers.append(round(shadow - self.uncertainty_z * band, 4))

        return ShadowRatePath(
            anchor_publication=anchor.publication_date,
            computed_at=reference_date,
            periods=periods,
            anchor_values=[round(v, 4) for v in anchor_vals],
            revision=revisions,
            shadow_values=shadows,
            band_upper=uppers,
            band_lower=lowers,
        )
