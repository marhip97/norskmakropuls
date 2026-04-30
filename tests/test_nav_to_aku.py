"""Tester for NAVToAKUBridge."""

from __future__ import annotations

from datetime import date

import pandas as pd

from src.models.nav_to_aku import AKUNowcast, NAVToAKUBridge


def _write_parquet(tmp_path, series_id: str, data: list[tuple[str, float]]) -> None:
    d = tmp_path / series_id
    d.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(
        {"date": pd.to_datetime([r[0] for r in data]), "value": [r[1] for r in data]}
    )
    df.to_parquet(d / "2026-04-30.parquet", index=False)


def _monthly_dates(start: str, n: int) -> list[str]:
    return [str(d.date()) for d in pd.date_range(start, periods=n, freq="MS")]


def _bridge(tmp_path, min_periods: int = 5) -> NAVToAKUBridge:
    return NAVToAKUBridge(
        raw_data_dir=tmp_path,
        aku_series_id="aku",
        nav_series_id="nav",
        min_periods=min_periods,
    )


def test_returns_none_without_nav_data(tmp_path):
    """Returnerer None om NAV-serien mangler."""
    dates = _monthly_dates("2024-01-01", 30)
    _write_parquet(tmp_path, "aku", [(d, 4.0 + i * 0.01) for i, d in enumerate(dates)])

    bridge = _bridge(tmp_path)
    assert bridge.compute(as_of=date(2026, 4, 30)) is None


def test_returns_none_without_aku_data(tmp_path):
    """Returnerer None om AKU-serien mangler."""
    dates = _monthly_dates("2024-01-01", 30)
    _write_parquet(tmp_path, "nav", [(d, 3.0 + i * 0.02) for i, d in enumerate(dates)])

    bridge = _bridge(tmp_path)
    assert bridge.compute(as_of=date(2026, 4, 30)) is None


def test_returns_none_with_too_few_periods(tmp_path):
    """Returnerer None om for få overlappende perioder for kalibrering."""
    dates = _monthly_dates("2024-01-01", 10)
    _write_parquet(tmp_path, "aku", [(d, 4.0) for d in dates])
    _write_parquet(tmp_path, "nav", [(d, 3.0) for d in dates])

    bridge = _bridge(tmp_path, min_periods=20)
    assert bridge.compute(as_of=date(2026, 4, 30)) is None


def test_beta_positive_when_series_move_together(tmp_path):
    """Beta skal være positiv når AKU og NAV beveger seg i takt."""
    dates = _monthly_dates("2020-01-01", 36)
    aku_vals = [4.0 + i * 0.05 for i in range(36)]
    nav_vals = [3.0 + i * 0.10 for i in range(36)]

    _write_parquet(tmp_path, "aku", list(zip(dates, aku_vals)))
    _write_parquet(tmp_path, "nav", list(zip(dates, nav_vals)))

    bridge = _bridge(tmp_path)
    result = bridge.compute(as_of=date(2026, 4, 30))

    assert result is not None
    assert result.beta > 0


def test_nowcast_direction(tmp_path):
    """Nowcast skal bevege seg i riktig retning fra siste kjente AKU."""
    dates = _monthly_dates("2020-01-01", 36)
    aku_vals = [4.0 + i * 0.05 for i in range(36)]
    # NAV stiger — AKU-nowcast skal overstige siste kjente AKU
    nav_vals = [3.0 + i * 0.10 for i in range(36)]

    _write_parquet(tmp_path, "aku", list(zip(dates, aku_vals)))
    _write_parquet(tmp_path, "nav", list(zip(dates, nav_vals)))

    bridge = _bridge(tmp_path)
    result = bridge.compute(as_of=date(2026, 4, 30))

    assert result is not None
    assert result.aku_nowcast > result.aku_last_known


def test_output_fields(tmp_path):
    """AKUNowcast skal ha alle obligatoriske felt."""
    dates = _monthly_dates("2020-01-01", 36)
    _write_parquet(tmp_path, "aku", [(d, 4.0 + i * 0.02) for i, d in enumerate(dates)])
    _write_parquet(tmp_path, "nav", [(d, 3.0 + i * 0.04) for i, d in enumerate(dates)])

    bridge = _bridge(tmp_path)
    result = bridge.compute(as_of=date(2026, 4, 30))

    assert isinstance(result, AKUNowcast)
    assert result.n_obs >= 5
    assert result.model_uncertainty >= 0
    assert result.reference_date == date(2026, 4, 30)
