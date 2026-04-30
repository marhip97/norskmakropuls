"""Komponentmodell for inflasjon (KPI-JAE).

Implementerer SPEC.md seksjon 8.3.

Dekomponerer KPI-JAE-avviket fra ankeret i bidrag per underkomponent:
  news_k = faktisk_k - (anker_kpi_jae * w_k)

Hvis en komponents observasjoner ikke finnes i data/raw/, hoppes den over
og rapporteres i missing_components. Total KPI-JAE-overraskelse beregnes
alltid så lenge ankerbanen finnes.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from typing import NamedTuple

from src.news import NewsEngine

logger = logging.getLogger(__name__)


class ComponentDefinition(NamedTuple):
    """Definisjon av én KPI-delkomponent."""

    name: str
    series_id: str
    weight: float


DEFAULT_COMPONENTS: list[ComponentDefinition] = [
    ComponentDefinition("tjenester", "kpi_jae_tjenester", 0.37),
    ComponentDefinition("importert", "kpi_jae_importert", 0.21),
    ComponentDefinition("mat", "kpi_jae_mat", 0.14),
    ComponentDefinition("husleie", "kpi_jae_husleie", 0.14),
    ComponentDefinition("energi", "kpi_energi", 0.14),
]


@dataclass
class InflationDecomposition:
    """Dekomponert KPI-JAE-nyheter per referansedato.

    Attributter
    ----------
    reference_date : date
    total_surprise : float
        Total KPI-JAE-overraskelse (faktisk - forventet fra anker).
        NaN hvis ingen ankerbane finnes.
    components : dict[str, float]
        Bidrag per komponent, bare for de komponentene der observasjoner
        var tilgjengelig. Kan være tomt.
    dominant_driver : str
        Komponentnavn med størst absolutt bidrag. "kpi_jae" hvis ingen
        komponenter var tilgjengelig.
    missing_components : list[str]
        Komponentnavn som mangler observasjonsdata (ikke i pipeline ennå).
    anchor_publication : date | None
        Publikasjonsdato for ankervintagen som ble brukt.
    """

    reference_date: date
    total_surprise: float
    components: dict[str, float]
    dominant_driver: str
    missing_components: list[str] = field(default_factory=list)
    anchor_publication: date | None = None

    def is_decomposed(self) -> bool:
        """Returnerer True om minst én underkomponent er beregnet."""
        return bool(self.components)


class InflationComponentModel:
    """Komponentmodell for KPI-JAE (SPEC.md seksjon 8.3).

    Parameters
    ----------
    news_engine : NewsEngine
        Kilde for news-tidsserier.
    components : list[ComponentDefinition], optional
        Definisjoner av delkomponentene med vekter.
        Standard: DEFAULT_COMPONENTS (SSB 2024-kurv).
    """

    def __init__(
        self,
        news_engine: NewsEngine,
        components: list[ComponentDefinition] | None = None,
    ) -> None:
        self.news_engine = news_engine
        self.components = components or DEFAULT_COMPONENTS

        total_weight = sum(c.weight for c in self.components)
        if abs(total_weight - 1.0) > 0.05:
            logger.warning(
                "Komponentvekter summerer til %.3f (forventet ~1.0).", total_weight
            )

    def compute(self, as_of: date | None = None) -> InflationDecomposition:
        """Beregn KPI-JAE-dekomposisjon.

        Parameters
        ----------
        as_of : date, optional
            Punkt-i-tid-dato for ankervalg. Standard: date.today().

        Returns
        -------
        InflationDecomposition med tilgjengelige komponentbidrag.
        Total KPI-JAE-overraskelse beregnes alltid.
        """
        reference_date = as_of or date.today()

        # Total KPI-JAE-overraskelse — alltid tilgjengelig om ankeret finnes
        total_news = self.news_engine.latest_news("kpi_jae")
        total_surprise = total_news.surprise if total_news else float("nan")
        anchor_publication = total_news.anchor_publication if total_news else None

        if total_news is None:
            logger.warning("Ingen news for kpi_jae ved %s.", reference_date)

        # Hent ankerverdi for forventet kpi_jae på referansedato
        # Brukes til å skalere komponentenes forventede verdi
        anchor_expected = total_news.expected if total_news else None

        component_contributions: dict[str, float] = {}
        missing: list[str] = []

        for comp in self.components:
            comp_news = self.news_engine.latest_news(comp.series_id)

            if comp_news is None:
                missing.append(comp.name)
                logger.debug(
                    "Komponent '%s' (%s) mangler observasjoner — ikke i pipeline ennå.",
                    comp.name, comp.series_id,
                )
                continue

            # Forventet komponentverdi: ankeret for total KPI-JAE skalert med vekt.
            # Fallback: bruk komponentens eget forventede verdi fra news-motoren.
            if anchor_expected is not None:
                expected_k = anchor_expected * comp.weight
                contribution = (comp_news.actual - expected_k) * comp.weight
            else:
                contribution = comp_news.surprise * comp.weight

            component_contributions[comp.name] = round(contribution, 5)

        dominant = _dominant_driver(component_contributions)

        return InflationDecomposition(
            reference_date=reference_date,
            total_surprise=round(total_surprise, 5) if not _isnan(total_surprise) else float("nan"),
            components=component_contributions,
            dominant_driver=dominant,
            missing_components=missing,
            anchor_publication=anchor_publication,
        )


def _dominant_driver(components: dict[str, float]) -> str:
    """Returner komponentnavn med størst absolutt bidrag, eller 'kpi_jae'."""
    if not components:
        return "kpi_jae"
    return max(components, key=lambda k: abs(components[k]))


def _isnan(value: float) -> bool:
    import math
    return math.isnan(value)
