"""Felles pytest-fixtures for norskmakropuls."""

from __future__ import annotations


import pytest


@pytest.fixture
def tmp_data_dir(tmp_path, monkeypatch):
    """Gi hver test sin egen data/raw-katalog som ikke berører ekte data."""
    raw_dir = tmp_path / "raw"
    raw_dir.mkdir()
    monkeypatch.setattr("src.data.base.RAW_DATA_DIR", raw_dir)
    return raw_dir


@pytest.fixture
def reset_ssb_metadata_cache():
    """Tøm SSB-metadata-cachen mellom tester for å unngå krysstesting."""
    from src.data import ssb
    ssb._METADATA_CACHE.clear()
    yield
    ssb._METADATA_CACHE.clear()
