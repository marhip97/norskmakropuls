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

---

## 5. Datamodell

### 5.1 Rådata (data/raw/)

Rådata lagres uendret slik de kom fra kilden. Én Parquet-fil per serie per innhentingsdato:

```
data/raw/<series_id>/<YYYY-MM-DD>.parquet
```

Eksempel: `data/raw/kpi/2026-04-30.parquet`

Rådata skal aldri modifiseres etter lagring. Pipeline kan hente samme serie flere ganger — eksisterende filer overskrives aldri (se `DataSource.store()` i `src/data/base.py`).

### 5.2 Prosesserte data (data/processed/)

Kuraterte tidsserier etter transformasjon (f.eks. YoY-vekst fra nivåindeks) lagres som Parquet under `data/processed/`. Dette laget er ikke fullt implementert i MVP — pipeline arbeider primært mot rådata.

### 5.3 Normalisert observasjonsskjema

Alle tidsserier normaliseres til dette skjemaet. Dette er minimumsstandarden for alle DataSource-implementasjoner:

| Kolonne | Type | Obligatorisk | Beskrivelse |
|---|---|---|---|
| `date` | `pd.Timestamp` | ja | Observasjonsdatoen (periodens startdato for månedlig/kvartal) |
| `value` | `float` | ja | Observert verdi i seriens native enhet |
| `vintage_date` | `str` (YYYY-MM-DD) | ja | Datoen denne innhentingen ble gjort (filnavnet) |
| `ingestion_time` | `pd.Timestamp` | anbefalt | UTC-tidsstempel for når vi hentet fra kilden |
| `source` | `str` | anbefalt | Kildenavn (`SSB`, `norges_bank`, `FRED`) |
| `series_id` | `str` | anbefalt | Serie-ID fra `data_catalog.yaml` |
| `status` | `str` | anbefalt | `ok`, `missing`, `revised` |

Minimumskolonner som `DataSource.fetch()` alltid må returnere: `date` og `value`.

`date`-kolonnen skal alltid være `pd.Timestamp`. For månedlige serier brukes periodens første dag (f.eks. `2025-12-01` for desember 2025). For kvartalsvise serier brukes kvartalets første dag (`2025-10-01` for Q4 2025).

### 5.4 Ankerdataskjema

Ankerprognoser (offisielle baner fra Norges Bank eller SSB) lagres med dette skjemaet:

```
data/anchors/<source>/<series_id>/<publication_date>.parquet
```

Kolonner per Parquet-fil:

| Kolonne | Type | Beskrivelse |
|---|---|---|
| `forecast_date` | `pd.Timestamp` | Datoen prognosen gjelder for |
| `value` | `float` | Prognostisert verdi |
| `publication_date` | `pd.Timestamp` | Når ankeret ble publisert |
| `vintage_id` | `str` | Entydig ID: `<source>_<publication_date>` |
| `source` | `str` | `norges_bank_mpr`, `ssb_kt`, eller `fin_npb` |
| `series_id` | `str` | Serie-ID som matcher `data_catalog.yaml` |
| `ingestion_time` | `pd.Timestamp` | Når vi lastet inn ankeret |

Gyldige kildekoder for ankere: `norges_bank_mpr`, `ssb_kt`, `fin_npb`.

---

## 6. Vintage-håndtering

Vintage-håndtering er obligatorisk for alle data i dette systemet — både observasjoner og ankerprognoser.

### 6.1 Definisjon av vintage

For observasjoner:
- `observation_date`: datoen verdien gjelder for (når ble den målt / hvilken periode)
- `publication_date`: når kilden publiserte den
- `ingestion_time`: når vi hentet den (UTC)
- `vintage_id`: entydig ID for innhentingsversjonen (`<series_id>_<YYYY-MM-DD>`)

For ankerprognoser — de samme feltene, men semantikken er:
- `forecast_date`: datoen prognosen gjelder for (fremtidig periode)
- `publication_date`: når ankeret (MPR/KT) ble publisert — dette er vintagenøkkelen
- `ingestion_time`: når vi lastet det inn i systemet
- `vintage_id`: `<source>_<publication_date>`

### 6.2 Invariant for ankervintager

En MPR-bane fra mars og en fra juni er to forskjellige objekter — ikke en oppdatering av det samme. `AnchorStore.save()` skriver aldri over eksisterende filer. Eksisterende filer er immutable.

News-motoren bruker alltid det ankeret som var siste offisielle ved observasjonstidspunktet. `AnchorStore.latest(series_id, on_date=obs_date)` realiserer dette.

### 6.3 Filnavn som nøkkel

Filnavnet er vintage-nøkkelen. Dette er enkelt og revisjonssikkert:
```
data/raw/kpi/2026-04-30.parquet          # observasjoner hentet 2026-04-30
data/anchors/norges_bank_mpr/kpi/2026-03-26.parquet  # PPR 1/2026, publisert 26. mars
```

Filnavn skal alltid være ISO 8601-dato (`YYYY-MM-DD`). `AnchorStore` avviser filer som ikke kan parses som dato.

---

## 7. Ankerbane-infrastruktur

Implementert i `src/anchors/__init__.py`.

### 7.1 Dataklasse: Anchor

```python
@dataclass
class Anchor:
    source: str           # "norges_bank_mpr" | "ssb_kt" | "fin_npb"
    publication_date: date
    series_id: str
    values: pd.Series     # indeks: pd.Timestamp (prognosedato), verdier: float
    vintage_id: str       # auto: "<source>_<publication_date>"
    ingestion_time: datetime
```

`Anchor.to_dataframe()` konverterer til flat DataFrame for Parquet-lagring. `Anchor.from_dataframe()` rekonstruerer fra lagret fil.

### 7.2 Klasse: AnchorStore

```python
class AnchorStore:
    def save(anchor: Anchor) -> Path          # lagrer; hopper over hvis filen finnes
    def latest(series_id, on_date=None) -> Anchor | None  # siste bane per dato
    def all_for_series(series_id) -> list[Anchor]         # alle vintager, sortert
```

`latest()` med `on_date` er det kritiske metodekallet for news-motoren: det gir det ankeret som faktisk var gjeldende da observasjonen ble publisert, ikke dagens siste.

### 7.3 Ankerseed-format (manuell innlastning)

Offisielle prognoser lastes manuelt inn via YAML-seed-filer under `data/anchors/seeds/`. Script: `scripts/load_anchor.py`.

Seed-format:
```yaml
source: norges_bank_mpr
publication_date: "2026-03-26"
series:
  styringsrente:
    - {date: "2026-Q1", value: 4.50}
    - {date: "2026-Q2", value: 4.25}
    ...
  kpi:
    - {date: "2026-Q1", value: 3.1}
    ...
```

Dato-format i seed: kvartalsnøkkel (`YYYY-QN`) konverteres til kvartalets første dag. Månedlig: `YYYY-MM`. Daglig: `YYYY-MM-DD`.

### 7.4 Tilgjengelige ankervintager (per 2026-04-30)

| Kilde | Publikasjonsdato | Serier | Periodedekning |
|---|---|---|---|
| norges_bank_mpr | 2025-12-19 | styringsrente, kpi, kpi_jae, produksjonsgap | til 2028-Q4 |
| norges_bank_mpr | 2026-03-26 | styringsrente, kpi, kpi_jae, produksjonsgap | til 2029-Q4 |

---

## 8. Revisjonsmodeller

### 8.1 News-motor

Implementert i `src/news/__init__.py`.

#### Definisjon

```
news_t = faktisk_t - forventet_t
```

`forventet_t` er ankerprognosens verdi for periode `t`, der ankeret er det siste offisielle publisert senest ved `t` (punkt-i-tid-korrekt).

#### Dataklasse: News

```python
@dataclass
class News:
    series_id: str
    observation_date: date
    actual: float
    expected: float
    surprise: float                # actual - expected
    standardised_surprise: float   # surprise / rolling_std(surprise, 36 perioder)
    anchor_publication: date       # hvilken ankervintagedato ble brukt
```

#### Klasse: NewsEngine

```python
class NewsEngine:
    def compute_news(series_id, since, as_of=None) -> list[News]
    def latest_news(series_id) -> News | None
    def news_dataframe(series_id, since) -> pd.DataFrame
```

`as_of`-parameteren er nøkkelen til punkt-i-tid-korrekthet. For historisk analyse: sett `as_of` til datoen du vil analysere fra. Standard er `date.today()`.

#### Standardisering

`standardised_surprise = surprise / rolling_std(diff(value), window=36, min_periods=6)`

Standardiseringen bruker rullende standardavvik på 36 perioder av første-differansen til serien (ikke av selve serien). Dette gir dimensjonsløs størrelse der ±1 tilsvarer ett historisk standardavvik i månedlig variasjon.

Produserer `NaN` der det er færre enn 6 perioder tilgjengelig for estimatet.

#### Datomatching mellom observasjon og anker

Ankerprognoser er kvartalsvise. Observasjoner er oftest månedlige. Matching-regel:
1. Eksakt match på dato (etter normalisering til midnatt UTC).
2. Nærmeste ankerpunkt innenfor 95 dager aksepteres.
3. Observasjoner uten ankertreff hoppes over med advarsel i logg.

#### Observert funn (2026-04-30)

Første situasjonsbilde mot PPR 1/2026 (publisert 2026-03-26):
- KPI: nær anker for siste tilgjengelige observasjon (des. 2025)
- KPI-JAE: nær anker
- USD/NOK: -0.36 NOK fra ankerbanen (NOK styrket seg)
- EUR/NOK: -0.26 NOK fra ankerbanen
