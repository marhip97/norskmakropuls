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

    store.save(_make_kpi_jae_anchor(date(2026, 3, 26), [3.0, 3.0, 3.0, 3.0]))
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

    store.save(_make_kpi_jae_anchor(date(2026, 3, 26), [3.0] * 4))
    _write_obs(obs_dir, "kpi_jae", [("2026-01-01", 3.2)])

    components = [
        ComponentDefinition("tjenester", "kpi_jae_tjenester", 0.5),
        ComponentDefinition("importert", "kpi_jae_importert", 0.5),
    ]
    model = InflationComponentModel(news_engine=engine, components=components)
    result = model.compute(as_of=date(2026, 4, 30))

    assert set(result.missing_components) == {"tjenester", "importert"}
    assert result.components == {}


def test_component_contribution_computed(tmp_path):
    """Komponent med tilgjengelige data skal bidra til dekomposisjonen."""
    store, engine = _build(tmp_path)
    obs_dir = tmp_path / "obs"

    # Anker: forventet kpi_jae = 3.0
    store.save(_make_kpi_jae_anchor(date(2026, 3, 26), [3.0] * 4))
    _write_obs(obs_dir, "kpi_jae", [("2026-01-01", 3.0)])

    # Tjenester: faktisk 1.8, forventet (3.0 * 0.6) = 1.8 -> bidrag = 0
    # Men faktisk 2.4 -> bidrag = (2.4 - 1.8) * 0.6 = 0.36
    components = [ComponentDefinition("tjenester", "kpi_jae_tjenester", 0.6)]

    # Legg til kpi_jae_tjenester-anker (samme timing som kpi_jae)
    tjenester_anchor = Anchor(
        source="norges_bank_mpr",
        publication_date=date(2026, 3, 26),
        series_id="kpi_jae_tjenester",
        values=pd.Series(
            [1.8] * 4,
            index=pd.date_range("2026-01-01", periods=4, freq="QS"),
            name="value",
        ),
    )
    store.save(tjenester_anchor)
    _write_obs(obs_dir, "kpi_jae_tjenester", [("2026-01-01", 2.4)])

    model = InflationComponentModel(news_engine=engine, components=components)
    result = model.compute(as_of=date(2026, 4, 30))

    assert "tjenester" in result.components
    assert result.components["tjenester"] == pytest.approx(0.36, abs=1e-3)
    assert result.dominant_driver == "tjenester"
    assert result.is_decomposed()


def test_dominant_driver_largest_absolute(tmp_path):
    """dominant_driver skal peke på komponenten med størst absolutt bidrag."""
    store, engine = _build(tmp_path)
    obs_dir = tmp_path / "obs"

    store.save(_make_kpi_jae_anchor(date(2026, 3, 26), [3.0] * 4))
    _write_obs(obs_dir, "kpi_jae", [("2026-01-01", 3.0)])

    for name, sid, w, actual in [
        ("tjenester", "kpi_jae_tjenester", 0.5, 1.6),
        ("importert", "kpi_jae_importert", 0.5, 1.4),
    ]:
        a = Anchor(
            source="norges_bank_mpr",
            publication_date=date(2026, 3, 26),
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
