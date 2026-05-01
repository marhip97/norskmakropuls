"""Tester for InflationComponentModel."""

from __future__ import annotations

import math
from datetime import date

import pandas as pd
import pytest

from src.anchors import Anchor, AnchorStore
from src.models.inflation_components import (
    ComponentDefinition,
    InflationComponentModel,
    InflationDecomposition,
)
from src.news import NewsEngine

# Anker publisert foer Q1 2026, slik at obs paa 2026-01-01 har anker tilgjengelig
# under per-observasjon-oppslag (jf. SPEC.md 7.2).
_PUB = date(2025, 12, 15)


def _make_kpi_jae_anchor(pub_date: date, values: list[float]) -> Anchor:
    dates = pd.date_range("2026-01-01", periods=len(values), freq="QS")
    return Anchor(
        source="norges_bank_mpr",
        publication_date=pub_date,
        series_id="kpi_jae",
        values=pd.Series(values, index=dates, name="value"),
    )


def _write_obs(tmp_path, series_id: str, obs: list[tuple[str, float]]) -> None:
    d = tmp_path / series_id
    d.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(
        {"date": pd.to_datetime([o[0] for o in obs]), "value": [o[1] for o in obs]}
    )
    df.to_parquet(d / "2026-04-30.parquet", index=False)


def _build(tmp_path) -> tuple[AnchorStore, NewsEngine]:
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"
    store = AnchorStore(base_dir=anchor_dir)
    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    return store, engine


def test_total_surprise_without_components(tmp_path):
    """Uten komponent-serier skal total KPI-JAE-overraskelse likevel beregnes."""
    store, engine = _build(tmp_path)
    obs_dir = tmp_path / "obs"

    store.save(_make_kpi_jae_anchor(_PUB, [3.0, 3.0, 3.0, 3.0]))
    _write_obs(obs_dir, "kpi_jae", [("2026-01-01", 3.5)])

    # Ingen komponentserier definert
    model = InflationComponentModel(news_engine=engine, components=[])
    result = model.compute(as_of=date(2026, 4, 30))

    assert isinstance(result, InflationDecomposition)
    assert result.total_surprise == pytest.approx(0.5, abs=1e-4)
    assert result.components == {}
    assert result.dominant_driver == "kpi_jae"
    assert not result.is_decomposed()


def test_missing_components_reported(tmp_path):
    """Komponenter uten data/raw/-observasjoner skal havne i missing_components."""
    store, engine = _build(tmp_path)
    obs_dir = tmp_path / "obs"

    store.save(_make_kpi_jae_anchor(_PUB, [3.0] * 4))
    _write_obs(obs_dir, "kpi_jae", [("2026-01-01", 3.2)])

    components = [
        ComponentDefinition("tjenester", "kpi_jae_tjenester", 0.5),
        ComponentDefinition("importert", "kpi_jae_importert", 0.5),
    ]
    model = InflationComponentModel(news_engine=engine, components=components)
    result = model.compute(as_of=date(2026, 4, 30))

    assert set(result.missing_components) == {"tjenester", "importert"}
    assert result.components == {}


def test_component_contribution_uses_component_specific_anchor(tmp_path):
    """Komponentbidraget skal bruke komponentens eget anker, ikke total-KPI-JAE
    skalert med kurvvekten — det forutsetter samme prognoserate paa tvers av
    komponenter, noe som er feil og fordreier dominant_driver-attribusjonen."""
    store, engine = _build(tmp_path)
    obs_dir = tmp_path / "obs"

    # Total kpi_jae-anker = 3.0; tjenester-anker = 4.0 (hoyere enn snitt)
    store.save(_make_kpi_jae_anchor(_PUB, [3.0] * 4))
    _write_obs(obs_dir, "kpi_jae", [("2026-01-01", 3.0)])

    tjenester_anchor = Anchor(
        source="norges_bank_mpr",
        publication_date=_PUB,
        series_id="kpi_jae_tjenester",
        values=pd.Series(
            [4.0] * 4,
            index=pd.date_range("2026-01-01", periods=4, freq="QS"),
            name="value",
        ),
    )
    store.save(tjenester_anchor)
    # Faktisk tjenester = 4.5 -> komponent-news = 0.5
    _write_obs(obs_dir, "kpi_jae_tjenester", [("2026-01-01", 4.5)])

    components = [ComponentDefinition("tjenester", "kpi_jae_tjenester", 0.6)]
    model = InflationComponentModel(news_engine=engine, components=components)
    result = model.compute(as_of=date(2026, 4, 30))

    # Riktig: surprise (0.5) * vekt (0.6) = 0.30 — komponentens egen prognose brukes
    # Feil (gammel logikk): (faktisk - total*vekt) * vekt = (4.5 - 1.8) * 0.6 = 1.62
    assert "tjenester" in result.components
    assert result.components["tjenester"] == pytest.approx(0.30, abs=1e-3)
    assert result.dominant_driver == "tjenester"
    assert result.is_decomposed()


def test_dominant_driver_largest_absolute(tmp_path):
    """dominant_driver skal peke på komponenten med størst absolutt bidrag."""
    store, engine = _build(tmp_path)
    obs_dir = tmp_path / "obs"

    store.save(_make_kpi_jae_anchor(_PUB, [3.0] * 4))
    _write_obs(obs_dir, "kpi_jae", [("2026-01-01", 3.0)])

    for name, sid, w, actual in [
        ("tjenester", "kpi_jae_tjenester", 0.5, 1.6),
        ("importert", "kpi_jae_importert", 0.5, 1.4),
    ]:
        a = Anchor(
            source="norges_bank_mpr",
            publication_date=_PUB,
            series_id=sid,
            values=pd.Series(
                [1.5] * 4,
                index=pd.date_range("2026-01-01", periods=4, freq="QS"),
                name="value",
            ),
        )
        store.save(a)
        _write_obs(obs_dir, sid, [("2026-01-01", actual)])

    components = [
        ComponentDefinition("tjenester", "kpi_jae_tjenester", 0.5),
        ComponentDefinition("importert", "kpi_jae_importert", 0.5),
    ]
    model = InflationComponentModel(news_engine=engine, components=components)
    result = model.compute(as_of=date(2026, 4, 30))

    # tjenester: (1.6 - 1.5) * 0.5 = 0.05
    # importert: (1.4 - 1.5) * 0.5 = -0.05 (likt absolutt)
    # begge er like i absoluttverdi — begge er gyldige svar
    assert result.dominant_driver in ("tjenester", "importert")


def test_no_anchor_gives_nan_total(tmp_path):
    """Uten ankerbane for kpi_jae skal total_surprise være NaN."""
    store, engine = _build(tmp_path)
    obs_dir = tmp_path / "obs"
    _write_obs(obs_dir, "kpi_jae", [("2026-01-01", 3.5)])

    model = InflationComponentModel(news_engine=engine, components=[])
    result = model.compute(as_of=date(2026, 4, 30))

    assert math.isnan(result.total_surprise)
    assert result.dominant_driver == "kpi_jae"
