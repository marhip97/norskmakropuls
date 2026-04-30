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
    # Anker publisert 2026-03-20: forventet KPI Q1 2026 = 2.5
    store.save(_make_anchor(date(2026, 3, 20), [2.5, 2.3, 2.1, 2.0]))

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
    assert item.anchor_publication == date(2026, 3, 20)


def test_news_uses_latest_anchor_on_date(tmp_path):
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"

    store = AnchorStore(base_dir=anchor_dir)
    store.save(_make_anchor(date(2026, 3, 20), [2.5, 2.3, 2.1, 2.0]))
    store.save(_make_anchor(date(2026, 6, 19), [2.8, 2.5, 2.2, 2.0]))

    _make_obs_parquet(obs_dir, ["2026-01-01", "2026-07-01"], [2.6, 2.4])

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)

    # as_of = 2026-04-01: kun mars-ankeret er publisert, brukes for begge obs
    items_april = engine.compute_news("kpi", since=date(2026, 1, 1), as_of=date(2026, 4, 1))
    assert all(i.anchor_publication == date(2026, 3, 20) for i in items_april)

    # as_of = 2026-07-01: juni-ankeret er publisert, brukes for begge obs
    items_july = engine.compute_news("kpi", since=date(2026, 1, 1), as_of=date(2026, 7, 1))
    assert all(i.anchor_publication == date(2026, 6, 19) for i in items_july)


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
    store.save(_make_anchor(date(2026, 3, 20), [2.5]))

    engine = NewsEngine(anchor_store=store, obs_dir=obs_dir)
    with pytest.raises(FileNotFoundError):
        engine.compute_news("kpi", since=date(2026, 1, 1))


def test_news_dataframe_schema(tmp_path):
    anchor_dir = tmp_path / "anchors"
    obs_dir = tmp_path / "obs"

    store = AnchorStore(base_dir=anchor_dir)
    store.save(_make_anchor(date(2026, 3, 20), [2.5, 2.3]))
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
