"""Tester for AnchorStore og Anchor."""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from src.anchors import Anchor, AnchorStore


def _make_anchor(
    source: str = "norges_bank_mpr",
    pub_date: date = date(2026, 3, 20),
    series_id: str = "styringsrente",
    values: list[float] | None = None,
) -> Anchor:
    dates = pd.date_range("2026-01-01", periods=4, freq="QS")
    vals = pd.Series(values or [4.50, 4.25, 4.00, 3.75], index=dates, name="value")
    return Anchor(
        source=source,
        publication_date=pub_date,
        series_id=series_id,
        values=vals,
    )


def test_anchor_vintage_id_auto_generated():
    anchor = _make_anchor()
    assert anchor.vintage_id == "norges_bank_mpr_2026-03-20"


def test_anchor_vintage_id_custom():
    anchor = _make_anchor()
    anchor.vintage_id = "custom_id"
    assert anchor.vintage_id == "custom_id"


def test_anchor_invalid_source_raises():
    with pytest.raises(ValueError, match="Ukjent ankerkilde"):
        _make_anchor(source="ukjent_kilde")


def test_anchor_roundtrip():
    original = _make_anchor()
    df = original.to_dataframe()
    assert list(df.columns) == [
        "forecast_date", "value", "publication_date",
        "vintage_id", "source", "series_id", "ingestion_time",
    ]
    restored = Anchor.from_dataframe(df)
    assert restored.source == original.source
    assert restored.series_id == original.series_id
    assert restored.publication_date == original.publication_date
    assert list(restored.values) == list(original.values)


def test_anchor_store_save_and_latest(tmp_path):
    store = AnchorStore(base_dir=tmp_path)
    anchor = _make_anchor()
    path = store.save(anchor)
    assert path.exists()

    loaded = store.latest("styringsrente")
    assert loaded is not None
    assert loaded.source == "norges_bank_mpr"
    assert loaded.publication_date == date(2026, 3, 20)
    assert len(loaded.values) == 4


def test_anchor_store_no_overwrite(tmp_path):
    store = AnchorStore(base_dir=tmp_path)
    anchor = _make_anchor()
    path1 = store.save(anchor)
    path2 = store.save(anchor)
    assert path1 == path2
    assert len(list(tmp_path.rglob("*.parquet"))) == 1


def test_anchor_store_latest_on_date(tmp_path):
    store = AnchorStore(base_dir=tmp_path)
    store.save(_make_anchor(pub_date=date(2026, 3, 20)))
    store.save(_make_anchor(pub_date=date(2026, 6, 19), values=[4.0, 3.75, 3.50, 3.25]))

    # Siste tilgjengelige per 2026-04-01 er mars-banen
    latest = store.latest("styringsrente", on_date=date(2026, 4, 1))
    assert latest is not None
    assert latest.publication_date == date(2026, 3, 20)

    # Siste tilgjengelige per 2026-07-01 er juni-banen
    latest = store.latest("styringsrente", on_date=date(2026, 7, 1))
    assert latest is not None
    assert latest.publication_date == date(2026, 6, 19)


def test_anchor_store_all_for_series(tmp_path):
    store = AnchorStore(base_dir=tmp_path)
    store.save(_make_anchor(pub_date=date(2026, 3, 20)))
    store.save(_make_anchor(pub_date=date(2026, 6, 19)))

    all_anchors = store.all_for_series("styringsrente")
    assert len(all_anchors) == 2
    assert all_anchors[0].publication_date == date(2026, 3, 20)
    assert all_anchors[1].publication_date == date(2026, 6, 19)


def test_anchor_store_latest_none_when_empty(tmp_path):
    store = AnchorStore(base_dir=tmp_path)
    assert store.latest("styringsrente") is None


def test_anchor_store_all_for_series_empty(tmp_path):
    store = AnchorStore(base_dir=tmp_path)
    assert store.all_for_series("finnes_ikke") == []
