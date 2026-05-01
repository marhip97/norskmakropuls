"""Tester for ShadowRateModel."""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from src.anchors import Anchor, AnchorStore
from src.models.shadow_rate import (
    DEFAULT_MAX_REVISION,
    ShadowRateModel,
    ShadowRatePath,
)
from src.news import NewsEngine


def _make_rate_anchor(
    pub_date: date,
    values: list[float],
    series_id: str = "styringsrente",
) -> Anchor:
    dates = pd.date_range("2026-01-01", periods=len(values), freq="QS")
    return Anchor(
        source="norges_bank_mpr",
        publication_date=pub_date,
        series_id=series_id,
        values=pd.Series(values, index=dates, name="value"),
    )


def _write_obs(tmp_path, series_id: str, obs: list[tuple[str, float]]) -> None:
    d = tmp_path / series_id
    d.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame({"date": pd.to_datetime([o[0] for o in obs]),
                       "value": [o[1] for o in obs]})
    df.to_parquet(d / "2026-04-30.parquet", index=False)


def _build_engine(tmp_path) -> tuple[AnchorStore, NewsEngine]:
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"
    store = AnchorStore(base_dir=anchor_dir)
    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    return store, engine


def test_shadow_rate_no_news_equals_anchor(tmp_path):
    """Uten news skal skyggebanen være identisk med ankerbanen."""
    store, engine = _build_engine(tmp_path)
    anchor_vals = [4.50, 4.25, 4.00, 3.75]
    store.save(_make_rate_anchor(date(2026, 3, 26), anchor_vals))

    model = ShadowRateModel(
        anchor_store=store,
        news_engine=engine,
        raw_data_dir=tmp_path / "obs",
    )
    result = model.compute(as_of=date(2026, 4, 30))

    assert isinstance(result, ShadowRatePath)
    assert result.anchor_values == [round(v, 4) for v in anchor_vals]
    assert result.revision == [0.0, 0.0, 0.0, 0.0]
    assert result.shadow_values == result.anchor_values


def test_shadow_rate_positive_kpi_news_raises_rate(tmp_path):
    """Positiv KPI-overraskelse skal gi positiv revisjon av renten."""
    store, engine = _build_engine(tmp_path)
    obs_dir = tmp_path / "obs"

    anchor_vals = [4.50, 4.25, 4.00, 3.75]
    store.save(_make_rate_anchor(date(2026, 3, 26), anchor_vals))

    # KPI-anker: forventet 3.0; KPI-obs: faktisk 3.5 -> surprise = +0.5
    kpi_anchor = _make_rate_anchor(date(2026, 3, 26), [3.0, 3.0, 3.0, 3.0], series_id="kpi")
    store.save(kpi_anchor)
    _write_obs(obs_dir, "kpi", [("2026-01-01", 3.5)])

    model = ShadowRateModel(
        anchor_store=store,
        news_engine=engine,
        raw_data_dir=obs_dir,
    )
    result = model.compute(as_of=date(2026, 4, 30))

    assert result is not None
    # beta_kpi = 0.15 -> delta_r_0 = 0.15 * 0.5 = 0.075
    assert result.revision[0] == pytest.approx(0.075, abs=1e-3)
    assert result.shadow_values[0] > result.anchor_values[0]


def test_shadow_rate_horizon_decay(tmp_path):
    """Revisjonen skal dempes eksponentielt med horisonten."""
    store, engine = _build_engine(tmp_path)
    obs_dir = tmp_path / "obs"

    store.save(_make_rate_anchor(date(2026, 3, 26), [4.50, 4.25, 4.00, 3.75]))

    kpi_anchor = _make_rate_anchor(date(2026, 3, 26), [3.0] * 4, series_id="kpi")
    store.save(kpi_anchor)
    _write_obs(obs_dir, "kpi", [("2026-01-01", 4.0)])

    model = ShadowRateModel(
        anchor_store=store,
        news_engine=engine,
        raw_data_dir=obs_dir,
        horizon_decay=0.85,
    )
    result = model.compute(as_of=date(2026, 4, 30))

    # Revisjonen skal avta: |rev[0]| > |rev[1]| > |rev[2]|
    assert abs(result.revision[0]) > abs(result.revision[1])
    assert abs(result.revision[1]) > abs(result.revision[2])


def test_shadow_rate_revision_capped(tmp_path):
    """Stor KPI-overraskelse skal kappes av max_revision."""
    store, engine = _build_engine(tmp_path)
    obs_dir = tmp_path / "obs"

    store.save(_make_rate_anchor(date(2026, 3, 26), [4.50, 4.25, 4.00, 3.75]))

    kpi_anchor = _make_rate_anchor(date(2026, 3, 26), [2.0] * 4, series_id="kpi")
    store.save(kpi_anchor)
    # Massiv overraskelse: +20 pp -> ville gitt delta >> max_revision
    _write_obs(obs_dir, "kpi", [("2026-01-01", 22.0)])

    model = ShadowRateModel(
        anchor_store=store,
        news_engine=engine,
        raw_data_dir=obs_dir,
        max_revision=DEFAULT_MAX_REVISION,
    )
    result = model.compute(as_of=date(2026, 4, 30))

    assert result.revision[0] == pytest.approx(DEFAULT_MAX_REVISION, abs=1e-6)


def test_shadow_rate_returns_none_without_anchor(tmp_path):
    """Returnerer None om ingen ankerbane for styringsrente finnes."""
    store, engine = _build_engine(tmp_path)
    model = ShadowRateModel(
        anchor_store=store,
        news_engine=engine,
        raw_data_dir=tmp_path / "obs",
    )
    assert model.compute(as_of=date(2026, 4, 30)) is None


def test_shadow_rate_to_dataframe(tmp_path):
    """to_dataframe() skal returnere DataFrame med riktige kolonner."""
    store, engine = _build_engine(tmp_path)
    store.save(_make_rate_anchor(date(2026, 3, 26), [4.50, 4.25, 4.00, 3.75]))

    model = ShadowRateModel(
        anchor_store=store,
        news_engine=engine,
        raw_data_dir=tmp_path / "obs",
    )
    result = model.compute(as_of=date(2026, 4, 30))
    df = result.to_dataframe()

    expected_cols = {"period", "anchor", "revision", "shadow", "band_upper", "band_lower"}
    assert set(df.columns) == expected_cols
    assert len(df) == 4


def test_shadow_rate_band_upper_above_shadow(tmp_path):
    """Øvre band skal alltid ligge over skyggeverdien."""
    store, engine = _build_engine(tmp_path)
    store.save(_make_rate_anchor(date(2026, 3, 26), [4.50, 4.25, 4.00, 3.75]))

    model = ShadowRateModel(
        anchor_store=store,
        news_engine=engine,
        raw_data_dir=tmp_path / "obs",
    )
    result = model.compute(as_of=date(2026, 4, 30))

    for upper, shadow, lower in zip(
        result.band_upper, result.shadow_values, result.band_lower
    ):
        assert upper > shadow
        assert lower < shadow
