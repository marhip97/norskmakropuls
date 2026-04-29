# src/anchors/

Ankerprognose-håndtering. Implementeres i Fase 2.

## Hva modulen skal gjøre

Lagre og hente offisielle prognoser fra Norges Bank (MPR-baner) og SSB
(Konjunkturtendensene) som ankerbaner. News-motoren i `src/news/`
bruker disse til å beregne avvik mellom siste offisielle prognose og
faktiske observasjoner.

## Forventet grensesnitt

```python
class Anchor:
    """En offisiell prognosebane med eksakt vintage."""
    source: str            # "norges_bank_mpr" | "ssb_kt" | "fin_npb"
    publication_date: date
    horizon: int           # antall kvartaler/måneder fremover
    series_id: str         # f.eks. "kpi", "ledighet_aku"
    values: pd.Series      # indeksert med dato

class AnchorStore:
    def save(self, anchor: Anchor) -> Path: ...
    def latest(self, series_id: str, on_date: date | None = None) -> Anchor: ...
    def all_for_series(self, series_id: str) -> list[Anchor]: ...
```

## Lagringsformat

`data/anchors/<source>/<series_id>/<vintage>.parquet`

Hver ankerbane har samme vintage-felter som observasjoner (se
`src/data/base.py`): `publication_date`, `vintage_id`,
`source_revision_id`, `ingestion_time`.

## Kritisk regel

En MPR-bane fra mars 2026 og en fra juni 2026 er **to forskjellige
objekter**, ikke en oppdatering av samme bane. News-motoren må kunne
referere til den banen som faktisk var siste offisielle ved en gitt
dato — derfor er vintage obligatorisk og kan aldri overskrives.

## Status

Ikke startet. Mappen er reservert. Implementering begynner i Fase 2 etter
at `data_catalog.yaml` er fylt og pipeline er verifisert i nytt repo.
