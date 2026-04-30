# src/news/

News-motor. Implementeres i Fase 2 etter ankermodulen.

## Hva modulen skal gjøre

Beregne avvik mellom siste offisielle prognose (et anker) og faktiske
observasjoner. Utgangspunktet er den enkle regelen:

```
news_t = faktisk_t - forventet_t
```

der `forventet_t` leses fra siste relevante anker, og `faktisk_t` er
nyeste observasjon fra `data/processed/`.

News-tidsserier brukes deretter av revisjonsmodellene i `src/models/`
til å justere ankerbanen.

## Forventet grensesnitt

```python
@dataclass
class News:
    series_id: str
    observation_date: date
    actual: float
    expected: float
    surprise: float                       # actual - expected
    standardised_surprise: float          # surprise / sigma
    anchor_publication: date

class NewsEngine:
    def __init__(self, anchor_store: AnchorStore, observation_store): ...
    def compute_news(self, series_id: str, since: date) -> list[News]: ...
    def latest_news(self, series_id: str) -> News: ...
```

## Standardisering

Surprise standardiseres mot en rullerende standardavvik for serien
(f.eks. siste 36 måneder), slik at news fra ulike serier kan
sammenliknes uten enheter.

## Kritisk regel

News beregnes alltid mot det ankeret som var **siste offisielle ved
publiseringstidspunktet** — ikke mot dagens nyeste anker. Dette krever
korrekt vintage-håndtering i `src/anchors/`.

## Status

Ikke startet.
