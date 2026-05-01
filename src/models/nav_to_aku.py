"""NAV-til-AKU bro — nowcast av AKU-ledighet fra NAV-tall.

Implementerer SPEC.md seksjon 8.4.

NAV publiserer registrert ledighet med ~2 dagers forsinkelse;
AKU-ledigheten (SSBs arbeidskraftundersøkelse) med ~30 dagers forsinkelse.

Differansemetoden (MVP):
  delta_AKU_t_nowcast = beta * delta_NAV_t

beta estimeres på historiske data der begge serier overlapper.
Nowcast: AKU_nowcast = siste_kjente_AKU + beta * delta_NAV_siste

Returnerer None hvis data er utilstrekkelig for kalibrering.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

RAW_DATA_DIR = Path(__file__).parents[2] / "data" / "raw"

_MIN_PERIODS = 24
_AKU_SERIES_ID = "ledighet_aku"
_NAV_SERIES_ID = "registrert_ledige"


@dataclass
class AKUNowcast:
    """Resultat fra NAV-til-AKU nowcast.

    Attributter
    ----------
    reference_date : date
    nav_value : float
        Siste NAV-verdi brukt i beregningen.
    aku_last_known : float
        Siste kjente AKU-verdi (utgangspunkt for nowcastet).
    aku_nowcast : float
        Estimert AKU-nivå basert på siste delta_NAV.
    model_uncertainty : float
        RMSE fra historisk kalibrering (prosentpoeng).
    beta : float
        Estimert koeffisient (delta_AKU per enhet delta_NAV).
    n_obs : int
        Antall overlappende perioder brukt i kalibreringen.
    """

    reference_date: date
    nav_value: float
    aku_last_known: float
    aku_nowcast: float
    model_uncertainty: float
    beta: float
    n_obs: int


class NAVToAKUBridge:
    """NAV-til-AKU bro med differansemetode (SPEC.md seksjon 8.4).

    Parameters
    ----------
    raw_data_dir : Path, optional
        Rot for observasjonsdata. Standard: data/raw/.
    aku_series_id : str
        Series-ID for AKU-ledighet. Standard: "ledighet_aku".
    nav_series_id : str
        Series-ID for NAV-registrert ledighet. Standard: "registrert_ledige".
    min_periods : int
        Minimum antall overlappende perioder for kalibrering. Standard: 24.
    """

    def __init__(
        self,
        raw_data_dir: Path | None = None,
        aku_series_id: str = _AKU_SERIES_ID,
        nav_series_id: str = _NAV_SERIES_ID,
        min_periods: int = _MIN_PERIODS,
    ) -> None:
        self.raw_data_dir = raw_data_dir or RAW_DATA_DIR
        self.aku_series_id = aku_series_id
        self.nav_series_id = nav_series_id
        self.min_periods = min_periods

    def _load_series(self, series_id: str) -> pd.Series | None:
        """Les nyeste vintage for series_id. Returnerer None om ikke funnet."""
        series_dir = self.raw_data_dir / series_id
        if not series_dir.exists():
            return None
        files = sorted(series_dir.glob("*.parquet"))
        if not files:
            return None
        df = pd.read_parquet(files[-1])
        df = df.dropna(subset=["value"]).copy()
        if df.empty:
            return None
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").set_index("date")["value"]
        return df.astype(float)

    def _align_and_diff(
        self, aku: pd.Series, nav: pd.Series
    ) -> tuple[pd.Series, pd.Series]:
        """Juster serienes frekvens og beregn første-differanser på felles datoer."""
        combined = pd.concat([aku.rename("aku"), nav.rename("nav")], axis=1).dropna()
        delta_aku = combined["aku"].diff().dropna()
        delta_nav = combined["nav"].diff().dropna()
        common = delta_aku.index.intersection(delta_nav.index)
        return delta_aku.loc[common], delta_nav.loc[common]

    def calibrate(self) -> tuple[float, float, int] | None:
        """Estimer beta og RMSE fra historiske data.

        Returns
        -------
        (beta, rmse, n_obs) eller None hvis data er utilstrekkelig.
        """
        aku = self._load_series(self.aku_series_id)
        nav = self._load_series(self.nav_series_id)

        if aku is None:
            logger.warning("Ingen data for '%s'.", self.aku_series_id)
            return None
        if nav is None:
            logger.warning(
                "Ingen data for '%s' — ikke i pipeline ennå.", self.nav_series_id
            )
            return None

        delta_aku, delta_nav = self._align_and_diff(aku, nav)

        if len(delta_aku) < self.min_periods:
            logger.warning(
                "For få overlappende perioder for kalibrering: %d < %d.",
                len(delta_aku), self.min_periods,
            )
            return None

        x = delta_nav.values
        y = delta_aku.values

        # OLS uten konstantledd (differansemetoden forutsetter zero intercept).
        # Forutsetningen krever at delta_AKU og delta_NAV begge har gjennomsnitt
        # naer null over kalibreringsperioden. Avvik fra null tyder paa
        # nivaa-drift som modellen uten konstantledd ikke kan fange opp.
        beta = float(np.dot(x, y) / np.dot(x, x)) if np.dot(x, x) != 0 else 0.0

        residuals = y - beta * x
        rmse = float(np.sqrt(np.mean(residuals ** 2)))

        mean_delta_aku = float(np.mean(y))
        mean_delta_nav = float(np.mean(x))
        if rmse > 0 and (
            abs(mean_delta_aku) > rmse or abs(mean_delta_nav) > rmse
        ):
            logger.warning(
                "NAV-til-AKU: drift over RMSE-terskel "
                "(mean(delta_AKU)=%.4f, mean(delta_NAV)=%.4f, RMSE=%.4f). "
                "Vurder aa legge til konstantledd eller detrend.",
                mean_delta_aku, mean_delta_nav, rmse,
            )

        logger.info("Kalibrert beta=%.4f, RMSE=%.4f, n=%d", beta, rmse, len(x))
        return beta, rmse, len(x)

    def compute(self, as_of: date | None = None) -> AKUNowcast | None:
        """Beregn AKU-nowcast.

        Parameters
        ----------
        as_of : date, optional
            Referansedato. Standard: date.today().

        Returns
        -------
        AKUNowcast, eller None hvis data er utilstrekkelig.
        """
        reference_date = as_of or date.today()

        calibration = self.calibrate()
        if calibration is None:
            return None
        beta, rmse, n_obs = calibration

        aku = self._load_series(self.aku_series_id)
        nav = self._load_series(self.nav_series_id)

        if aku is None or nav is None:
            return None

        aku_last = float(aku.iloc[-1])
        nav_last = float(nav.iloc[-1])
        nav_prev = float(nav.iloc[-2]) if len(nav) >= 2 else nav_last
        delta_nav_latest = nav_last - nav_prev

        aku_nowcast = aku_last + beta * delta_nav_latest

        return AKUNowcast(
            reference_date=reference_date,
            nav_value=nav_last,
            aku_last_known=aku_last,
            aku_nowcast=round(aku_nowcast, 4),
            model_uncertainty=round(rmse, 4),
            beta=round(beta, 6),
            n_obs=n_obs,
        )
