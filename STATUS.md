# Status

Sist oppdatert: 2026-04-30 (Fase 2 påbegynt)

Dette dokumentet beskriver hvor prosjektet er **akkurat nå**. Det skal kunne leses på under ett minutt før hver arbeidsøkt og oppdateres etter hver økt der noe vesentlig endres.

---

## Nåværende fase

**Fase 2 — Ankerbane-infrastruktur påbegynt.**

Fase 0 og 1 fullført 2026-04-30. Alle 21 variabler er A_PROD.

Fase 2 påbegynt 2026-04-30: `src/anchors/` og `src/news/` er implementert og testet.
Gjenstår: manuell innlasting av første MPR-seed og kjøring av news-motor mot ekte data.

## Hva er på plass i repoet (verifisert)

**Datalag — verifisert og fungerende:**
- [x] `src/data/base.py`: DataSource-grensesnitt med fetch/validate/store/run
- [x] `src/data/ssb.py`: SSB Statbank-klient med metadata-validering
- [x] `src/data/norges_bank.py`: SDMX-JSON-klient
- [x] `src/data/fred.py`: FRED CSV-klient (uten API-nøkkel)
- [x] `src/data/nav.py`: NAV-data via SSB tabell 05111
- [x] `src/data/pipeline.py`: orkestrering med YAML-konfig
- [x] `src/data/discover_api.py`: SSB metadata-inspektør
- [x] `scripts/discover_api.py`: bredt discovery-skript

**Konfigurasjon:**
- [x] `config/variables.yaml` med 12 variabler
- [x] `data_catalog.yaml` med 12 variabler, alle satt til `A_PROD` etter verifisering

**Tester:**
- [x] 33/33 tester grønne på CI (`tests.yml`)
- [x] Ruff linting passerer

**CI/CD:**
- [x] `tests.yml`: kjører ved push til `main` og `claude/**`
- [x] `data_pipeline.yml`: kjører ukentlig og ved push til `main` (kun `fetch-data`-jobben)
- [x] `deploy_dashboard.yml`: manuell trigger (reaktiveres i Fase 4)

**Første pipeline-kjøring:**
- [x] 12/12 variabler hentet 2026-04-30 via GitHub Actions
- [x] `data/raw/<serie_id>/2026-04-30.parquet` finnes for alle 12 variabler

## Kalibreringsnoteringer (ikke blokkere)

**`ledighet_aku` (SSB 05111):** Returnerer årsgjennomsnitt (54 rader, 1972–2025), ikke månedlig/kvartalsvis data. Tabellen leverer årsaggregater for lang historikk. For kortsiktig oppfølging (kvartalsvis AKU) må riktig tabell og filtre identifiseres via discovery i Fase 1. Nåværende data er nyttig for historisk kontekst.

**`lonnsvekst` (SSB 11417):** Returnerer 9 rader (2017–2025), ikke fra 1997 som katalogen angir. `ContentsCode: "ArslonnEndring"` er kun tilgjengelig fra 2017 i denne konfigurasjonen. For lengre historikk trengs alternativt filter eller tabell.

## Hva er IKKE gjort ennå

- `src/anchors/`, `src/news/`, `src/models/`, `src/dashboard/`, `dashboard-aksel/` er tomme mapper med kun README som beskriver plan.
- `README.md` på topp-nivå er tom.
- `docs/data-sources.md` er tom.
- `docs/SPEC.md` finnes ikke i repoet.
- 9 manglende MVP-variabler er ikke implementert (se Fase 1 nedenfor).
- Modeller (ARIMA, VAR, BVAR, DFM, AR-X, ML-baseline) hentes i Fase 5.

## Hva er under arbeid

Fase 2 — ankerbane-infrastruktur. Kodebase er på plass. Venter på første MPR-seed.

## Hva er på plass — Fase 2 (delvis)

- [x] `src/anchors/__init__.py`: `Anchor` + `AnchorStore` med vintage-lagring
- [x] `src/news/__init__.py`: `NewsEngine` med `compute_news()`, `latest_news()`, `news_dataframe()`
- [x] `scripts/load_anchor.py`: manuell innlasting av ankerprognoser fra YAML-seed
- [x] `data/anchors/seeds/example_format.yaml`: mal for MPR-data
- [x] 16/16 tester grønne (test_anchors.py + test_news.py)

## Hva gjenstår — Fase 2

1. **Last inn første MPR-seed**: fyll ut `data/anchors/seeds/mpr_<dato>.yaml` med
   faktiske tall fra siste Norges Bank MPR, og kjør:
   ```
   python scripts/load_anchor.py data/anchors/seeds/mpr_<dato>.yaml
   ```
2. **Verifiser news-motoren mot ekte data**: kjør `NewsEngine.compute_news()`
   for kpi, styringsrente, bnp_fastland og se at tall gir mening.
3. Vurder om SSB Konjunkturtendensene skal legges inn som anker (ssb_kt) før Fase 3.

## Datakildestatus

Pipeline kjørt to ganger: 2026-04-30 (Fase 0) og 2026-04-30 (Fase 1).

| Variabel | Kilde | Status | Sist verifisert | Notat |
|---|---|---|---|---|
| bnp_fastland | SSB 09190 | A_PROD | 2026-04-30 | 188 rader, 1979–2025 |
| kpi | SSB 03013 | A_PROD | 2026-04-30 | 564 rader, 1979–2025 |
| kpi_jae | SSB 05327 | A_PROD | 2026-04-30 | 265 rader, 2003–2025 |
| ledighet_aku | SSB 05111 | A_PROD | 2026-04-30 | 54 rader årsdata 1972–2025. Månedlig/kvartal krever discovery |
| lonnsvekst | SSB 11417 | A_PROD | 2026-04-30 | 9 rader 2017–2025. Historikk fra 1997 krever nytt filter |
| boligprisvekst | SSB 07230 | A_PROD | 2026-04-30 | 34 rader, 1992–2025 |
| k2_kredittvekst | SSB 11599 | A_PROD | 2026-04-30 | 472 rader, 1986–2026 |
| styringsrente | Norges Bank SHORT_RATES | A_PROD | 2026-04-30 | 176 rader, 2011–2026 |
| eurnok | Norges Bank EXR | A_PROD | 2026-04-30 | 6881 rader, 1999–2026 |
| oljepris | FRED DCOILBRENTEU | A_PROD | 2026-04-30 | 10159 rader, 1987–2026, 280 nulls (normalt) |
| ecb_rente | FRED ECBDFR | A_PROD | 2026-04-30 | 9982 rader, 1999–2026 |
| handelspartnervekst | FRED CLVMNACSCAB1GQEA19 | A_PROD | 2026-04-30 | 125 rader, 1995–2026 |
| **usd_nok** | Norges Bank EXR | **A_PROD** | 2026-04-30 | 9151 rader, 1990–2026 |
| **us_10y_yield** | FRED DGS10 | **A_PROD** | 2026-04-30 | 16781 rader, 1962–2026, 716 nulls (normalt) |
| **us_2y_yield** | FRED DGS2 | **A_PROD** | 2026-04-30 | 13021 rader, 1976–2026, 548 nulls (normalt) |
| **fed_funds** | FRED FEDFUNDS | **A_PROD** | 2026-04-30 | 861 rader, 1954–2026 |
| **us_cpi** | FRED CPIAUCSL | **A_PROD** | 2026-04-30 | 951 rader, 1947–2026 |
| i44 | Norges Bank EXR | A_PROD | 2026-04-30 | Verifisert pipeline |
| nowa | Norges Bank SHORT_RATES | A_PROD | 2026-04-30 | Verifisert pipeline |
| gov_yield_2y_no | — | D_EXCLUDE | — | 2Y finnes ikke i GOVT_GENERIC_RATES |
| gov_yield_3y_no | Norges Bank GOVT_GENERIC_RATES | A_PROD | 2026-04-30 | 3Y proxy, verifisert pipeline |
| gov_yield_10y_no | Norges Bank GOVT_GENERIC_RATES | A_PROD | 2026-04-30 | Verifisert pipeline |

## Blokkeringer og åpne spørsmål

| Spørsmål | Status |
|---|---|
| MPR-XLSX-parser i Fase 2 eller Fase 4? | Åpent. Anbefalt: Fase 4 med manuelle innlastninger som fallback i Fase 2. |
| SSB Konjunkturtendensene: HTML-parser eller manuell? | Åpent. Anbefalt: manuell først. |
| Skal SMART-repoet markeres som arkivert (read-only) når norskmakropuls er etablert? | Åpent. |
| Skal en `docs/SPEC.md` legges inn i repoet før Claude Code kan bygge ankermodulen? | Trolig ja, ellers vil seksjonsreferanser i CLAUDE.md ikke kunne følges opp. |

## Hva som IKKE er der ennå (med vilje)

Følgende er ekskludert fra dagens repo og hentes senere:

- **SMART-modellene** (`arima.py`, `var.py`, `bvar.py`, `dfm.py`, `arx.py`, `ml_baseline.py`): hentes i Fase 5 som kryssjekk mot ankerbanen.
- **`src/runner.py`**: hentes i Fase 5, vil måtte tilpasses ankerbanen.
- **`src/ensemble/`**: hentes i Fase 5.
- **Plotly-dashboard**: erstattes av Aksel-frontend i Fase 4. Ingen Plotly-kode i dette repoet.
- **Variabler ut over de 12 SMART-arvede** (usd_nok, i44, nowa, statsrenter, US-renter, US-CPI, fed_funds): legges til i Fase 1 etter at Fase 0 er bekreftet.

## Tekniske beslutninger så langt

| Beslutning | Begrunnelse | Dato |
|---|---|---|
| norskmakropuls som nytt repo, ikke pivotert SMART | Klart skille mellom gammelt og nytt produkt; lettere kommunikasjon | 2026-04-29 |
| Datalaget hentet uendret fra SMART | Modent og dekket av tester; ingen grunn til å skrive om | 2026-04-29 |
| SMART-modellene hentes ikke før Fase 5 | Holder repoet rent og fokusert mens ankerbanen bygges | 2026-04-29 |
| `data_catalog.yaml` som førsterangs kildekatalog | Ny artefakt som SMART manglet; sentralt sted for tabell-ID-er | 2026-04-29 |
| Aksel/NAV som designsystem | Nøkternt, tilgjengelig, offentlig egnet preg | 2026-04-29 |
| SSB Statbank som ryggrad | Mest stabil og dokumentert kilde for norsk makro | 2026-04-29 |
| Norsk bokmål i dokumentasjon og dashboard | Målgruppen er norsk | 2026-04-29 |

## Endringslogg

| Dato | Endring | Av |
|---|---|---|
| 2026-04-30 | Fase 2 (delvis): src/anchors/ og src/news/ implementert. 16 nye tester grønne. | Claude Code |
| 2026-04-30 | Fase 1 fullstendig: NOWA, I44, GOV10Y, GOV3Y verifisert grønn pipeline, satt A_PROD. 21 variabler totalt i A_PROD. | Claude Code |
| 2026-04-30 | Fase 1 (NB-variabler): NOWA, I44, GOV10Y, GOV3Y implementert med verifiserte series keys. gov_yield_2y_no ekskludert. | Claude Code |
| 2026-04-30 | Fase 1 (delvis): 5 nye variabler verifisert og A_PROD. 4 NB-variabler venter på discovery. | Claude Code |
| 2026-04-30 | Fase 0 ferdig: 12/12 variabler verifisert, CI grønn, alle A_PROD i data_catalog.yaml. | Claude Code |
| 2026-04-30 | STATUS.md korrigert: fjernet falske SMART-status-rester, lagt inn ærlig Fase 0-plan. | Plan-fase |
| 2026-04-29 | Initial opprettelse av norskmakropuls-repo. Datalag og dokumenter fra zip lagt inn. | Plan-fase |

---

## Hvordan oppdatere dette dokumentet

Etter hver arbeidsøkt der noe vesentlig endres:

1. Oppdater "Sist oppdatert"-dato øverst.
2. Flytt avhukede oppgaver fra "Hva står for tur" til "Hva er på plass".
3. Legg nye oppgaver i "Hva står for tur".
4. Oppdater datakildestatus-tabellen ved verifisering, og sett tilsvarende `status` i `data_catalog.yaml`.
5. Logg viktige beslutninger i "Tekniske beslutninger så langt".
6. Skriv én linje i endringsloggen.

Hold dokumentet kort. Detaljer hører hjemme i `docs/SPEC.md` eller commit-meldinger.
