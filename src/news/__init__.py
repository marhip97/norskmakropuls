"""News-motor for norskmakropuls.

Beregner avvik mellom siste offisielle prognose (et anker) og faktiske
observasjoner: news_t = faktisk_t - forventet_t.

Viktig: news beregnes alltid mot det ankeret som var siste offisielle
ved publiseringstidspunktet for observasjonen — ikke mot dagens nyeste
anker. Dette krever korrekt vintage-håndtering i src/anchors/.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

from src.anchors import Anchor, AnchorStore

logger = logging.getLogger(__name__)

RAW_DATA_DIR = Path(__file__).parents[2] / "data" / "raw"

# Rullende vindu for standardisering av surprise (antall perioder)
_ROLLING_WINDOW = 36


@dataclass
class News:
    """Ett news-datapunkt: observert minus forventet for en gitt dato."""

    series_id: str
    observation_date: date
    actual: float
    expected: float
    surprise: float
    standardised_surprise: float
    anchor_publication: date


class NewsEngine:
    """Beregner news-tidsserier mot ankerbaner.

    Parameters
    ----------
    anchor_store : AnchorStore
        Kilde for ankerprognoser.
    obs_dir : Path, optional
        Rot for observasjonsdata (data/raw/ som standard).
    """

    def __init__(
        self,
        anchor_store: AnchorStore,
        obs_dir: Path | None = None,
    ) -> None:
        self.anchor_store = anchor_store
        self.obs_dir = obs_dir or RAW_DATA_DIR

    def _load_observations(self, series_id: str) -> pd.DataFrame:
        """Les nyeste vintage for series_id fra data/raw/.

        Returnerer DataFrame med kolonner ['date', 'value'].
        Kaster FileNotFoundError om ingen data finnes.
        """
        series_dir = self.obs_dir / series_id
        if not series_dir.exists():
            raise FileNotFoundError(
                f"Ingen observasjonsdata for '{series_id}' under {self.obs_dir}"
            )
        files = sorted(series_dir.glob("*.parquet"))
        if not files:
            raise FileNotFoundError(
                f"Ingen Parquet-filer for '{series_id}' under {series_dir}"
            )
        df = pd.read_parquet(files[-1])
        df["date"] = pd.to_datetime(df["date"])
        return df[["date", "value"]].dropna().sort_values("date").reset_index(drop=True)

    def _rolling_std(self, series: pd.Series) -> pd.Series:
        """Rullende standardavvik med vindu _ROLLING_WINDOW.

        Returnerer NaN der det er for få observasjoner for et meningsfullt
        estimat. Brukes til standardisering av surprise.
        """
        return series.rolling(window=_ROLLING_WINDOW, min_periods=6).std()

    def compute_news(
        self,
        series_id: str,
        since: date,
        as_of: date | None = None,
    ) -> list[News]:
        """Beregn news for series_id for alle observasjoner etter since.

        For hver observasjon: finn det ankeret som var siste offisielle
        publisert senest as_of (standardverdi: dagens dato). Bruk as_of
        for punkt-i-tid-korrekthet ved historisk analyse.

        Observasjoner uten tilhørende anker hoppes over med en advarsel.
        """
        reference_date = as_of or date.today()

        obs = self._load_observations(series_id)
        obs = obs[obs["date"].dt.date >= since].copy()

        if obs.empty:
            logger.info("Ingen observasjoner for '%s' etter %s.", series_id, since)
            return []

        rolling_sd = self._rolling_std(obs["value"].diff())

        results: list[News] = []

        for _, row in obs.iterrows():
            obs_date = row["date"].date()
            actual = float(row["value"])

            anchor: Anchor | None = self.anchor_store.latest(
                series_id, on_date=reference_date
            )
            if anchor is None:
                logger.debug(
                    "Ingen anker for '%s' ved %s — hopper over.", series_id, obs_date
                )
                continue

            forecast_dates = anchor.values.index.normalize()
            obs_ts = pd.Timestamp(obs_date)

            if obs_ts not in forecast_dates:
                closest_idx = (forecast_dates - obs_ts).abs().argmin()
                if abs((forecast_dates[closest_idx] - obs_ts).days) > 95:
                    logger.debug(
                        "Ingen nær ankerprognose for '%s' %s — hopper over.",
                        series_id, obs_date,
                    )
                    continue
                expected = float(anchor.values.iloc[closest_idx])
            else:
                expected = float(anchor.values[obs_ts])

            surprise = actual - expected

            idx = obs.index[obs["date"] == row["date"]][0]
            sd = rolling_sd.get(idx, np.nan)
            standardised = surprise / sd if (sd and not np.isnan(sd) and sd > 0) else np.nan

            results.append(
                News(
                    series_id=series_id,
                    observation_date=obs_date,
                    actual=actual,
                    expected=expected,
                    surprise=round(surprise, 6),
                    standardised_surprise=round(float(standardised), 4)
                    if not np.isnan(standardised)
                    else float("nan"),
                    anchor_publication=anchor.publication_date,
                )
            )

        return results

    def latest_news(self, series_id: str) -> News | None:
        """Returner siste news-datapunkt for series_id, eller None."""
        try:
            obs = self._load_observations(series_id)
        except FileNotFoundError:
            return None
        if obs.empty:
            return None
        latest_date = obs["date"].max().date()
        items = self.compute_news(series_id, since=latest_date)
        return items[-1] if items else None

    def news_dataframe(self, series_id: str, since: date) -> pd.DataFrame:
        """Returner news-tidsserien som DataFrame.

        Kolonner: series_id, observation_date, actual, expected,
                  surprise, standardised_surprise, anchor_publication.
        """
        items = self.compute_news(series_id, since=since)
        if not items:
            return pd.DataFrame(
                columns=[
                    "series_id", "observation_date", "actual", "expected",
                    "surprise", "standardised_surprise", "anchor_publication",
                ]
            )
        return pd.DataFrame([vars(n) for n in items])
