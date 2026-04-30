# Teknisk spesifikasjon: norskmakropuls

Sist revidert: 2026-04-30

Dette dokumentet er den fullstendige tekniske spesifikasjonen for norskmakropuls. Det utfyller `PROJECT_PLAN.md` med konkrete skjemadefinisjoner, API-parametre, modellspesifikasjoner og implementeringsregler. Alle seksjonsreferanser i `CLAUDE.md` peker hit.

---

## 1. Formål og avgrensning

norskmakropuls produserer et automatisert, forklarbart situasjonsbilde av norsk økonomi. Kjernespørsmålet systemet besvarer:

> Hvordan ser det norske makrobildet trolig ut i dag, gitt all ny informasjon publisert siden siste offisielle prognoserunde?

Systemet bruker offisielle prognoser fra Norges Bank (Pengepolitisk rapport, PPR) og SSB (Konjunkturtendensene, KT) som ankere, og oppdaterer disse kontinuerlig med ny statistikk via en news-motor og revisjonsmodeller.

**Utenfor scope for denne spesifikasjonen:**
- Betalte datakilder (Consensus Economics, PMI, Nord Pool)
- PDF-scraping som primærpipeline
- Finansdepartementets prognoser som kritisk feed
- SMART-modellene (ARIMA, VAR, BVAR, DFM, AR-X, ML-baseline) — hentes i Fase 5

---

## 2. Systemarkitektur

```
[Datakilder]
    |
    v
[Pipeline: fetch -> validate -> store_raw -> (transform -> store_processed)]
    |
    v
[data/raw/<series_id>/<YYYY-MM-DD>.parquet]     [data/anchors/<source>/<series_id>/<pub_date>.parquet]
    |                                                           |
    v                                                           v
[News-motor: faktisk - forventet (src/news/)]
    |
    v
[Revisjonsmodeller (src/models/)]
  - Skyggerentebane  (shadow_rate.py)
  - Komponentmodell  (inflation_components.py)
  - NAV-til-AKU bro  (nav_to_aku.py)
    |
    v
[Dashboard-cache: data/cache/<YYYY-MM-DD>.json]
    |
    v
[Aksel/Next.js frontend: dashboard-aksel/]
```

Lagring:
- Parquet for alle tidsserier (observasjoner og ankerprognoser)
- JSON for dashboard-cache
- YAML for datakatalog og ankerseed-filer

---

## 3. Datakilder — API-spørringer og endepunkter

### 3.1 SSB Statistikkbanken (JSON-stat2)

Basisklient: `src/data/ssb.py` (`SSBDataSource`)

Endepunkt-mønster:
```
POST https://data.ssb.no/api/v0/no/table/{table_id}
Content-Type: application/json

{
  "query": [
    {"code": "<dimensjon>", "selection": {"filter": "item", "values": ["<kode>"]}},
    ...
    {"code": "Tid", "selection": {"filter": "all", "values": ["*"]}}
  ],
  "response": {"format": "json-stat2"}
}
```

Aktive tabeller:

| series_id | Tabell | Dimensjonsfiltre |
|---|---|---|
| bnp_fastland | 09190 | Makrost=bnpb.nr23_9fn, ContentsCode=Volum |
| kpi | 03013 | Konsumgrp=TOTAL, ContentsCode=Tolvmanedersendring |
| kpi_jae | 05327 | Konsumgrp=JAE_TOTAL, ContentsCode=Tolvmanedersendring |
| ledighet_aku | 05111 | ArbStyrkStatus=2, Kjonn=0, Alder=15-74, ContentsCode=Prosent |
| lonnsvekst | 11417 | NACE2007=A-S, ContentsCode=ArslonnEndring |
| boligprisvekst | 07230 | Region=TOTAL, Boligtype=00, ContentsCode=BruktBlindex |
| k2_kredittvekst | 11599 | Valuta=00, Lantaker2=Kred01, ContentsCode=AarsTrans2 |

Feilhåndtering: valider dimensjonskoder ved hver kjøring via `src/data/discover_api.py`. Kast `ValueError` ved uventet skjema — aldri still.

### 3.2 Norges Bank Data API (SDMX-JSON)

Basisklient: `src/data/norges_bank.py` (`NorgesBankDataSource`)

Endepunkt-mønster:
```
GET https://data.norges-bank.no/api/data/{dataflow}/{series_key}
    ?format=sdmx-json&locale=no&startPeriod={YYYY-MM-DD}
```

Aktive serier:

| series_id | Dataflow | Series key | Enhet |
|---|---|---|---|
| styringsrente | SHORT_RATES | (tom, alle serier) | pct |
| eurnok | EXR | B.EUR.NOK.SP | nok_per_eur |
| usd_nok | EXR | B.USD.NOK.SP | nok_per_usd |
| i44 | EXR | B.I44.NOK.SP | index |
| nowa | SHORT_RATES | B.NOWA.ON. | pct |
| gov_yield_3y_no | GOVT_GENERIC_RATES | B.3Y.GBON. | pct |
| gov_yield_10y_no | GOVT_GENERIC_RATES | B.10Y.GBON. | pct |

Merknad `styringsrente`: klienten henter alle SHORT_RATES-serier og velger serien med flest gyldige observasjoner. Dette er sårbart ved strukturendring i Norges Banks API.

Merknad `gov_yield_2y_no`: 2-årig tenor finnes ikke i GOVT_GENERIC_RATES. Variabelen er satt til `D_EXCLUDE`. Nærmeste proxy er `gov_yield_3y_no`.

### 3.3 FRED (St. Louis Fed, CSV)

Basisklient: `src/data/fred.py` (`FREDDataSource`)

Endepunkt-mønster:
```
GET https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}
```

Ingen API-nøkkel kreves. Manglende observasjoner er markert med `.` i rådata — parseren konverterer til `NaN`.

Aktive serier:

| series_id | FRED-ID | Frekvens | Enhet |
|---|---|---|---|
| oljepris | DCOILBRENTEU | daily | usd |
| ecb_rente | ECBDFR | daily | pct |
| handelspartnervekst | CLVMNACSCAB1GQEA19 | quarterly | index |
| us_10y_yield | DGS10 | daily | pct |
| us_2y_yield | DGS2 | daily | pct |
| fed_funds | FEDFUNDS | monthly | pct |
| us_cpi | CPIAUCSL | monthly | index |

---

## 4. Datakatalog og klassifisering

Den autoritative kildeoversikten er `data_catalog.yaml`. All kode som henter en serie skal lese tabell-ID-er, series keys og endepunkter fra denne katalogen — ikke hardkode dem i koden.

Statusklassifisering:

| Kode | Betydning |
|---|---|
| A_PROD | Stabilt, dokumentert API, brukes i produksjon |
| B_TEST | Offentlig og maskinlesbart, krever ytterligere testing |
| C_FALLBACK | Kan automatiseres, men med høy bruddrisiko |
| D_EXCLUDE | Ikke egnet uten manuell behandling |

Minimumsfelter per oppføring — se `CLAUDE.md` seksjon 5 for komplett schema.

Kjøreregel: ny variabel går aldri rett til `A_PROD`. Discovery-steget (hent metadata, valider dimensjoner, lagre eksempel-respons under `tests/fixtures/`) er obligatorisk.
