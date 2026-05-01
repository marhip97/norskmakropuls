"""Tester for pipeline-orkestrering og vintage-lagring."""

from __future__ import annotations

from datetime import datetime

import pandas as pd
import pytest

from src.data.base import DataSource
from src.data.pipeline import build_source, load_config


# --- Test fixture: en dummy datakilde -------------------------------------------

class _DummySource(DataSource):
    """Datakilde som returnerer hardkodet DataFrame uten nettverk."""

    def fetch(self) -> pd.DataFrame:
        return pd.DataFrame({
            "date": pd.to_datetime(["2024-01-01", "2024-02-01"]),
            "value": [1.0, 2.0],
        })

    def validate(self, df: pd.DataFrame) -> pd.DataFrame:
        return df


# --- Tester ---------------------------------------------------------------------

def test_dummy_source_run_lagrer_vintage(tmp_data_dir):
    src = _DummySource(variable_id="dummy", source_params={})
    src.run()
    files = list((tmp_data_dir / "dummy").glob("*.parquet"))
    assert len(files) == 1
    today = datetime.utcnow().strftime("%Y-%m-%d")
    assert files[0].name == f"{today}.parquet"


def test_dummy_source_skipper_eksisterende_vintage(tmp_data_dir):
    """Dagens vintage skal ikke overskrives."""
    src = _DummySource(variable_id="dummy", source_params={})
    src.run()
    src.run()  # Andre kjøring samme dag
    files = list((tmp_data_dir / "dummy").glob("*.parquet"))
    assert len(files) == 1


def test_load_config_returnerer_alle_variabler():
    """variables.yaml skal inneholde alle MVP-variabler katalogen lover."""
    cfg = load_config()
    ids = {v["id"] for v in cfg}

    forventet = {
        # SSB
        "bnp_fastland", "kpi", "kpi_jae", "ledighet_aku", "lonnsvekst",
        "boligprisvekst", "k2_kredittvekst",
        # Norges Bank
        "styringsrente", "eurnok", "usd_nok", "nowa", "i44",
        "gov_yield_3y_no", "gov_yield_10y_no",
        # FRED
        "oljepris", "ecb_rente", "handelspartnervekst",
        "us_10y_yield", "us_2y_yield", "fed_funds", "us_cpi",
    }
    mangler = forventet - ids
    assert not mangler, f"variables.yaml mangler: {sorted(mangler)}"
    assert len(cfg) == len(forventet), (
        f"Forventet {len(forventet)} variabler, fant {len(cfg)}: "
        f"{sorted(ids - forventet)} ekstra, {sorted(mangler)} manglende"
    )


def test_build_source_avviser_ukjent_klasse():
    with pytest.raises(ValueError, match="Unknown source class"):
        build_source({
            "id": "x",
            "source": "DoesNotExist",
            "source_params": {},
        })
