"""Tester for NewsEngine."""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from src.anchors import Anchor, AnchorStore
from src.news import NewsEngine


def _make_anchor(pub_date: date, values: list[float]) -> Anchor:
    dates = pd.date_range("2026-01-01", periods=len(values), freq="QS")
    return Anchor(
        source="norges_bank_mpr",
        publication_date=pub_date,
        series_id="kpi",
        values=pd.Series(values, index=dates, name="value"),
    )


def _make_obs_parquet(tmp_path, dates: list[str], values: list[float]) -> None:
    obs_dir = tmp_path / "kpi"
    obs_dir.mkdir(parents=True)
    df = pd.DataFrame({"date": pd.to_datetime(dates), "value": values})
    df.to_parquet(obs_dir / "2026-04-30.parquet", index=False)


def test_news_compute_basic(tmp_path):
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"

    store = AnchorStore(base_dir=anchor_dir)
    # Anker publisert 2025-12-15 (PPR 4/2025): forventet KPI Q1 2026 = 2.5
    store.save(_make_anchor(date(2025, 12, 15), [2.5, 2.3, 2.1, 2.0]))

    # Faktisk KPI Q1 2026 = 2.8 (overraskelse = +0.3)
    _make_obs_parquet(obs_dir, ["2026-01-01"], [2.8])

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    items = engine.compute_news("kpi", since=date(2026, 1, 1))

    assert len(items) == 1
    item = items[0]
    assert item.series_id == "kpi"
    assert item.actual == pytest.approx(2.8)
    assert item.expected == pytest.approx(2.5)
    assert item.surprise == pytest.approx(0.3)
    assert item.anchor_publication == date(2025, 12, 15)


def test_news_uses_anchor_at_observation_time(tmp_path):
    """Hver observasjon skal matches mot ankeret som var siste offisielle paa
    observasjonens dato — ikke mot dagens nyeste anker."""
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"

    store = AnchorStore(base_dir=anchor_dir)
    store.save(_make_anchor(date(2025, 12, 15), [2.5, 2.3, 2.1, 2.0]))  # PPR 4/2025
    store.save(_make_anchor(date(2026, 3, 20), [2.8, 2.5, 2.2, 2.0]))   # PPR 1/2026

    # Q1-obs (jan 2026): kun PPR 4/2025 er publisert.
    # Q2-obs (apr 2026): PPR 1/2026 er publisert -> skal bruke nyeste.
    # Q3-obs (jul 2026): PPR 1/2026 er fortsatt nyeste.
    _make_obs_parquet(
        obs_dir,
        ["2026-01-01", "2026-04-01", "2026-07-01"],
        [2.6, 2.4, 2.3],
    )

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    items = engine.compute_news("kpi", since=date(2026, 1, 1), as_of=date(2026, 12, 31))

    by_obs = {i.observation_date: i for i in items}

    assert by_obs[date(2026, 1, 1)].anchor_publication == date(2025, 12, 15)
    assert by_obs[date(2026, 1, 1)].expected == pytest.approx(2.5)

    assert by_obs[date(2026, 4, 1)].anchor_publication == date(2026, 3, 20)
    assert by_obs[date(2026, 4, 1)].expected == pytest.approx(2.5)  # Q2 i PPR 1/2026

    assert by_obs[date(2026, 7, 1)].anchor_publication == date(2026, 3, 20)
    assert by_obs[date(2026, 7, 1)].expected == pytest.approx(2.2)  # Q3 i PPR 1/2026


def test_news_as_of_clamps_anchor_lookup(tmp_path):
    """as_of skal hindre at observasjoner ser ankere publisert etter as_of —
    avgjorende for historisk replay/backtesting."""
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"

    store = AnchorStore(base_dir=anchor_dir)
    store.save(_make_anchor(date(2025, 12, 15), [2.5, 2.3, 2.1, 2.0]))
    store.save(_make_anchor(date(2026, 3, 20), [2.8, 2.5, 2.2, 2.0]))

    _make_obs_parquet(obs_dir, ["2026-04-01"], [2.4])

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)

    # Med as_of=2026-02-01: PPR 1/2026 var ikke publisert enna -> skal bruke PPR 4/2025
    items = engine.compute_news("kpi", since=date(2026, 1, 1), as_of=date(2026, 2, 1))
    assert len(items) == 1
    assert items[0].anchor_publication == date(2025, 12, 15)

    # Med as_of=2026-12-31: PPR 1/2026 er publisert
    items = engine.compute_news("kpi", since=date(2026, 1, 1), as_of=date(2026, 12, 31))
    assert len(items) == 1
    assert items[0].anchor_publication == date(2026, 3, 20)


def test_news_period_match_rejects_observation_outside_anchor_horizon(tmp_path):
    """Observasjon som ligger etter siste ankerperiode skal ikke matches
    feilaktig (gammel 95-dagers logikk gjorde dette)."""
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"

    store = AnchorStore(base_dir=anchor_dir)
    # Anker dekker kun Q1+Q2 2026
    store.save(_make_anchor(date(2025, 12, 15), [2.5, 2.3]))

    # Obs i Q3 2026 ligger utenfor ankerhorisonten
    _make_obs_parquet(obs_dir, ["2026-04-01", "2026-10-01"], [2.4, 2.2])

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    items = engine.compute_news("kpi", since=date(2026, 1, 1))

    obs_dates = {i.observation_date for i in items}
    assert date(2026, 4, 1) in obs_dates       # Q2 dekkes
    assert date(2026, 10, 1) not in obs_dates  # Q4 ligger utenfor


def test_news_no_anchor_returns_empty(tmp_path):
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"

    store = AnchorStore(base_dir=anchor_dir)
    _make_obs_parquet(obs_dir, ["2026-01-01"], [2.5])

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    items = engine.compute_news("kpi", since=date(2026, 1, 1))
    assert items == []


def test_news_missing_obs_raises(tmp_path):
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"

    store = AnchorStore(base_dir=anchor_dir)
    store.save(_make_anchor(date(2025, 12, 15), [2.5]))

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    with pytest.raises(FileNotFoundError):
        engine.compute_news("kpi", since=date(2026, 1, 1))


def test_news_dataframe_schema(tmp_path):
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"

    store = AnchorStore(base_dir=anchor_dir)
    store.save(_make_anchor(date(2025, 12, 15), [2.5, 2.3]))
    _make_obs_parquet(obs_dir, ["2026-01-01", "2026-04-01"], [2.8, 2.4])

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    df = engine.news_dataframe("kpi", since=date(2026, 1, 1))

    expected_cols = {
        "series_id", "observation_date", "actual", "expected",
        "surprise", "standardised_surprise", "anchor_publication",
    }
    assert expected_cols.issubset(set(df.columns))
    assert len(df) == 2


def test_news_dataframe_empty_when_no_anchor(tmp_path):
    store = AnchorStore(base_dir=tmp_path / "anchors")
    obs_dir = tmp_path / "obs"
    _make_obs_parquet(obs_dir, ["2026-01-01"], [2.5])

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    df = engine.news_dataframe("kpi", since=date(2026, 1, 1))
    assert df.empty
