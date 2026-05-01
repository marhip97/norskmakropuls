"""Norges Bank data source - styringsrente og EUR/NOK m.fl.

Hentet uendret fra SMART-repoet. Bruker SDMX-JSON-endepunktet på
data.norges-bank.no.
"""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd
import requests

from .base import DataSource, _assert_columns, _assert_no_nulls

logger = logging.getLogger(__name__)

# Norges Bank Data REST API (SDMX-JSON)
# Base: https://data.norges-bank.no/api/data/{flow}/{key}?format=sdmx-json
# Confirmed working dataflows: SHORT_RATES, EXR, GOVT_GENERIC_RATES
NBD_BASE = "https://data.norges-bank.no/api/data"

# (dataflow, series_key)
# series_key = "" -> fetch entire dataflow and pick first series in response.
# This is used for SHORT_RATES where the sight-deposit series is returned first.
_SERIES_MAP: dict[str, tuple[str, str]] = {
    "SIREN":   ("SHORT_RATES",        ""),               # Foliorente - all series, parser picks most obs
    "EURNOK":  ("EXR",                "B.EUR.NOK.SP"),   # EUR/NOK spot
    "USDNOK":  ("EXR",                "B.USD.NOK.SP"),   # USD/NOK spot
    "NOWA":    ("SHORT_RATES",        "B.NOWA.ON."),     # NOWA overnight weighted average
    "I44":     ("EXR",                "B.I44.NOK.SP"),   # Importveid valutakursindeks (44 land)
    "GOV10Y":  ("GOVT_GENERIC_RATES", "B.10Y.GBON."),   # Norsk statsobl. 10 ar
    "GOV3Y":   ("GOVT_GENERIC_RATES", "B.3Y.GBON."),    # Norsk statsobl. 3 ar (naermeste til 2Y)
}


class NorgesBankDataSource(DataSource):
    """Fetch data from Norges Bank Data (data.norges-bank.no).

    source_params:
        series:  one of the keys defined in _SERIES_MAP above
    """

    def __init__(self, variable_id: str, source_params: dict[str, Any]) -> None:
        super().__init__(variable_id, source_params)
        self.series_key: str = source_params["series"]
        if self.series_key not in _SERIES_MAP:
            raise ValueError(
                f"Unknown Norges Bank series '{self.series_key}'. "
                f"Valid options: {list(_SERIES_MAP)}"
            )
        self.dataflow, self.series_id = _SERIES_MAP[self.series_key]

    def fetch(self) -> pd.DataFrame:
        logger.info(
            "Fetching Norges Bank series '%s' (flow=%s) for variable '%s'.",
            self.series_key, self.dataflow, self.variable_id,
        )
        # Build URL: include series key only when specified
        if self.series_id:
            url = f"{NBD_BASE}/{self.dataflow}/{self.series_id}"
        else:
            url = f"{NBD_BASE}/{self.dataflow}"

        params = {
            "format": "sdmx-json",
            "startPeriod": "1990-01-01",
            "locale": "no",
        }
        response = requests.get(url, params=params, timeout=60)
        response.raise_for_status()

        df = _parse_sdmx_json(response.json())

        # Styringsrente comes as daily/business-day observations; resample to monthly
        if self.series_key == "SIREN":
            df = df.set_index("date").resample("MS").mean().reset_index()

        return df

    def validate(self, df: pd.DataFrame) -> pd.DataFrame:
        _assert_columns(df, ["date", "value"])
        if len(df) == 0:
            raise ValueError(f"Empty DataFrame for variable '{self.variable_id}'.")
        _assert_no_nulls(df, ["date"])
        null_pct = df["value"].isna().mean()
        if null_pct > 0.1:
            raise ValueError(
                f"Variable '{self.variable_id}': {null_pct:.0%} null values in 'value'."
            )
        return df


def _parse_sdmx_json(data: dict) -> pd.DataFrame:
    """Extract a date/value DataFrame from a Norges Bank SDMX-JSON response.

    When the response contains multiple series (e.g. a full dataflow query),
    the series with the most non-null numeric observations is used.
    """
    try:
        series_dict = data["data"]["dataSets"][0]["series"]

        # Pick the series with the most finite (non-null) observations
        def _count_finite(obs: dict) -> int:
            count = 0
            for v_list in obs.values():
                try:
                    if v_list and v_list[0] is not None and float(v_list[0]) == float(v_list[0]):
                        count += 1
                except (TypeError, ValueError):
                    pass
            return count

        series_key = max(series_dict, key=lambda k: _count_finite(series_dict[k]["observations"]))
        if len(series_dict) > 1:
            # Logg paa WARNING saa skjult endring i Norges Banks rekkefoelge er synlig.
            # data_catalog.yaml dokumenterer at SIREN bruker tom series_key og at
            # parseren plukker serien med flest observasjoner.
            logger.warning(
                "SDMX-respons inneholder %d serier; valgte '%s' (%d obs). "
                "Hvis kilden endrer rekkefoelge eller legger til lengre serier, "
                "kan denne valget endres uten varsel — vurder aa angi series_key eksplisitt.",
                len(series_dict), series_key,
                _count_finite(series_dict[series_key]["observations"]),
            )
        observations = series_dict[series_key]["observations"]

        time_periods = data["data"]["structure"]["dimensions"]["observation"]
        time_values = next(d for d in time_periods if d["id"] == "TIME_PERIOD")["values"]

        rows = []
        for idx_str, obs_list in observations.items():
            idx = int(idx_str)
            period_str = time_values[idx]["id"]
            value = obs_list[0]
            rows.append({"date_raw": period_str, "value": value})

        df = pd.DataFrame(rows)
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df["date"] = pd.to_datetime(df["date_raw"], errors="coerce")
        return df[["date", "value"]].sort_values("date").reset_index(drop=True)
    except (KeyError, StopIteration, TypeError) as exc:
        raise ValueError(f"Could not parse Norges Bank SDMX-JSON response: {exc}") from exc
