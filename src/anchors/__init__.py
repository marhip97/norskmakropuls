"""Ankerbane-infrastruktur for norskmakropuls.

Lagrer og henter offisielle prognosebaner (Norges Bank MPR, SSB
Konjunkturtendensene) med full vintage-håndtering. En bane fra mars
og en fra juni er to forskjellige objekter — ikke en oppdatering av
det samme. News-motoren i src/news/ er avhengig av dette invariansen.

Lagringsformat: data/anchors/<source>/<series_id>/<publication_date>.parquet
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

ANCHORS_DIR = Path(__file__).parents[2] / "data" / "anchors"

# Gyldige kildekoder
VALID_SOURCES = {"norges_bank_mpr", "ssb_kt", "fin_npb"}


@dataclass
class Anchor:
    """En offisiell prognosebane med eksakt vintage.

    values er en pd.Series der indeksen er prognosedatoer (pd.Timestamp)
    og verdiene er prognostiserte tall i seriens native enhet.
    """

    source: str
    publication_date: date
    series_id: str
    values: pd.Series
    vintage_id: str = ""
    ingestion_time: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self) -> None:
        if self.source not in VALID_SOURCES:
            raise ValueError(
                f"Ukjent ankerkilde '{self.source}'. Gyldige: {sorted(VALID_SOURCES)}"
            )
        if not self.vintage_id:
            self.vintage_id = f"{self.source}_{self.publication_date.isoformat()}"

    def to_dataframe(self) -> pd.DataFrame:
        """Konverter til flat DataFrame klar for Parquet-lagring."""
        df = self.values.reset_index()
        df.columns = ["forecast_date", "value"]
        df["publication_date"] = pd.Timestamp(self.publication_date)
        df["vintage_id"] = self.vintage_id
        df["source"] = self.source
        df["series_id"] = self.series_id
        df["ingestion_time"] = pd.Timestamp(self.ingestion_time)
        return df[
            ["forecast_date", "value", "publication_date",
             "vintage_id", "source", "series_id", "ingestion_time"]
        ]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "Anchor":
        """Rekonstruer Anchor fra lagret flat DataFrame."""
        meta = df.iloc[0]
        values = pd.Series(
            df["value"].values,
            index=pd.to_datetime(df["forecast_date"]),
            name="value",
        )
        return cls(
            source=meta["source"],
            publication_date=pd.Timestamp(meta["publication_date"]).date(),
            series_id=meta["series_id"],
            values=values,
            vintage_id=meta["vintage_id"],
            ingestion_time=pd.Timestamp(meta["ingestion_time"]).to_pydatetime(),
        )


class AnchorStore:
    """Lagrer og henter ankerprognoser med vintage-håndtering.

    Fil per vintage: data/anchors/<source>/<series_id>/<publication_date>.parquet
    Eksisterende filer overskrives aldri.
    """

    def __init__(self, base_dir: Path | None = None) -> None:
        self.base_dir = base_dir or ANCHORS_DIR

    def _path(self, source: str, series_id: str, publication_date: date) -> Path:
        return (
            self.base_dir
            / source
            / series_id
            / f"{publication_date.isoformat()}.parquet"
        )

    def save(self, anchor: Anchor) -> Path:
        """Lagre ankerbane. Returnerer filstien. Skriver aldri over eksisterende."""
        path = self._path(anchor.source, anchor.series_id, anchor.publication_date)
        if path.exists():
            logger.info(
                "Ankerbane %s/%s %s finnes allerede; hopper over.",
                anchor.source, anchor.series_id, anchor.publication_date,
            )
            return path
        path.parent.mkdir(parents=True, exist_ok=True)
        anchor.to_dataframe().to_parquet(path, index=False)
        logger.info(
            "Lagret ankerbane %s/%s %s -> %s",
            anchor.source, anchor.series_id, anchor.publication_date, path,
        )
        return path

    def latest(self, series_id: str, on_date: date | None = None) -> Anchor | None:
        """Hent den siste ankerbanen for series_id.

        on_date: hvis satt, returneres kun baner publisert <= on_date.
        Returnerer None om ingen baner finnes.
        """
        candidates = self._list_files_for_series(series_id)
        if not candidates:
            return None
        if on_date is not None:
            candidates = [
                (pub, path) for pub, path in candidates if pub <= on_date
            ]
        if not candidates:
            return None
        _, latest_path = max(candidates, key=lambda x: x[0])
        return Anchor.from_dataframe(pd.read_parquet(latest_path))

    def all_for_series(self, series_id: str) -> list[Anchor]:
        """Hent alle ankerbaner for series_id, sortert etter publikasjonsdato."""
        candidates = self._list_files_for_series(series_id)
        result = []
        for _, path in sorted(candidates, key=lambda x: x[0]):
            result.append(Anchor.from_dataframe(pd.read_parquet(path)))
        return result

    def _list_files_for_series(self, series_id: str) -> list[tuple[date, Path]]:
        """Finn alle Parquet-filer for series_id på tvers av alle kilder."""
        found: list[tuple[date, Path]] = []
        if not self.base_dir.exists():
            return found
        for source_dir in self.base_dir.iterdir():
            if not source_dir.is_dir():
                continue
            series_dir = source_dir / series_id
            if not series_dir.exists():
                continue
            for parquet_file in series_dir.glob("*.parquet"):
                try:
                    pub_date = date.fromisoformat(parquet_file.stem)
                    found.append((pub_date, parquet_file))
                except ValueError:
                    logger.warning("Kan ikke parse dato fra filnavn: %s", parquet_file)
        return found
