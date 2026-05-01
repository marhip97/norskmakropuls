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

    @staticmethod
    def _match_forecast_period(
        forecast_dates: pd.DatetimeIndex, obs_ts: pd.Timestamp
    ) -> int | None:
        """Finn indeksen i forecast_dates som dekker obs_ts.

        Antar at forecast_dates er sortert stigende og har konstant frekvens.
        Returnerer indeksen til siste forecast_date <= obs_ts hvis observasjonen
        ligger innenfor én periodelengde fra denne datoen, ellers None.

        Hindrer feilmatching som "oktober-observasjon mot juli-prognose"
        som den gamle 95-dagers-vindu-logikken ga.
        """
        if len(forecast_dates) == 0:
            return None

        prior = forecast_dates[forecast_dates <= obs_ts]
        if len(prior) == 0:
            return None
        idx = len(prior) - 1
        period_start = forecast_dates[idx]

        if idx + 1 < len(forecast_dates):
            period_end = forecast_dates[idx + 1]
        elif idx > 0:
            period_length = forecast_dates[idx] - forecast_dates[idx - 1]
            period_end = period_start + period_length
        else:
            period_end = period_start + pd.DateOffset(months=3)

        if obs_ts >= period_end:
            return None
        return idx

    def compute_news(
        self,
        series_id: str,
        since: date,
        as_of: date | None = None,
    ) -> list[News]:
        """Beregn news for series_id for alle observasjoner etter since.

        For hver observasjon brukes det ankeret som var siste offisielle
        publisert senest min(obs_date, as_of). Dette sikrer at en
        observasjon fra februar 2026 sammenlignes mot ankeret som var
        offisielt da, ikke mot et nyere anker som ennå ikke fantes.

        Parameters
        ----------
        as_of : date, optional
            Punkt-i-tid-grense for ankervalg. Standard: dagens dato.
            Brukes til historisk replay/backtesting.
        """
        reference_date = as_of or date.today()

        obs = self._load_observations(series_id)
        obs = obs[obs["date"].dt.date >= since].copy()

        if obs.empty:
            logger.info("Ingen observasjoner for '%s' etter %s.", series_id, since)
            return []

        intermediate: list[dict] = []

        for _, row in obs.iterrows():
            obs_date = row["date"].date()
            actual = float(row["value"])

            anchor_lookup_date = min(obs_date, reference_date)
            anchor: Anchor | None = self.anchor_store.latest(
                series_id, on_date=anchor_lookup_date
            )
            if anchor is None:
                logger.debug(
                    "Ingen anker for '%s' ved %s — hopper over.", series_id, obs_date
                )
                continue

            forecast_dates = anchor.values.index.normalize()
            obs_ts = pd.Timestamp(obs_date)

            idx = self._match_forecast_period(forecast_dates, obs_ts)
            if idx is None:
                logger.debug(
                    "Ingen ankerperiode dekker '%s' %s — hopper over.",
                    series_id, obs_date,
                )
                continue

            expected = float(anchor.values.iloc[idx])
            surprise = actual - expected

            intermediate.append({
                "obs_date": obs_date,
                "actual": actual,
                "expected": expected,
                "surprise": surprise,
                "anchor_publication": anchor.publication_date,
            })

        if not intermediate:
            return []

        # Standardiser surprise mot rullende standardavvik av surprise-serien
        # (ikke diff(value)) — surprise-volatilitet er det relevante målet for
        # om en gitt overraskelse er stor eller liten i historisk kontekst.
        surprise_series = pd.Series([r["surprise"] for r in intermediate])
        rolling_sd = self._rolling_std(surprise_series)

        results: list[News] = []
        for i, rec in enumerate(intermediate):
            sd = rolling_sd.iloc[i]
            if sd is not None and not np.isnan(sd) and sd > 0:
                standardised = rec["surprise"] / sd
                std_value = round(float(standardised), 4)
            else:
                std_value = float("nan")

            results.append(
                News(
                    series_id=series_id,
                    observation_date=rec["obs_date"],
                    actual=rec["actual"],
                    expected=rec["expected"],
                    surprise=round(rec["surprise"], 6),
                    standardised_surprise=std_value,
                    anchor_publication=rec["anchor_publication"],
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
