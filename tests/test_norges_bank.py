"""Tester for NorgesBankDataSource."""

from __future__ import annotations

import pytest
import responses

from src.data.norges_bank import NorgesBankDataSource, _parse_sdmx_json


def _example_sdmx_json():
    """Minimalt eksempelsvar fra Norges Bank Data."""
    return {
        "data": {
            "structure": {
                "dimensions": {
                    "observation": [
                        {
                            "id": "TIME_PERIOD",
                            "values": [
                                {"id": "2024-01-01"},
                                {"id": "2024-01-02"},
                                {"id": "2024-01-03"},
                            ],
                        }
                    ]
                }
            },
            "dataSets": [
                {
                    "series": {
                        "0:0:0:0": {
                            "observations": {
                                "0": [4.5],
                                "1": [4.5],
                                "2": [4.75],
                            }
                        }
                    }
                }
            ],
        }
    }


def test_parse_sdmx_json_basic():
    df = _parse_sdmx_json(_example_sdmx_json())
    assert list(df.columns) == ["date", "value"]
    assert len(df) == 3
    assert df["value"].iloc[-1] == 4.75


def test_norges_bank_unknown_series_raises():
    with pytest.raises(ValueError, match="Unknown Norges Bank series"):
        NorgesBankDataSource(
            variable_id="x",
            source_params={"series": "DOES_NOT_EXIST"},
        )


@responses.activate
def test_norges_bank_eurnok_fetch():
    responses.add(
        responses.GET,
        "https://data.norges-bank.no/api/data/EXR/B.EUR.NOK.SP",
        json=_example_sdmx_json(),
    )
    src = NorgesBankDataSource(
        variable_id="eurnok",
        source_params={"series": "EURNOK"},
    )
    df = src.fetch()
    assert len(df) == 3
    df = src.validate(df)
    assert df["value"].iloc[0] == 4.5
