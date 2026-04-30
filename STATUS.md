# Status

Sist oppdatert: 2026-04-30 (Fase 0 ferdig)

Dette dokumentet beskriver hvor prosjektet er **akkurat nå**. Det skal kunne leses på under ett minutt før hver arbeidsøkt og oppdateres etter hver økt der noe vesentlig endres.

---

## Nåværende fase

**Fase 1 — Datakatalog og kildeutvidelse.**

Fase 0 er fullført 2026-04-30. Pipeline kjørte 12/12 variabler uten feil på GitHub Actions. Tester kjører grønt på CI (33/33). To kalibreringsnoteringer er dokumentert nedenfor, men blokkerer ikke Fase 1.

Fase 1 mål: legge til de 9 manglende MVP-variablene (`usd_nok`, `i44`, `nowa`, statsrenter, US-renter, `us_cpi`) via discovery og implementering.

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

Ingenting aktivt. Klar for Fase 1.

## Hva står for tur — Fase 1

1. **Discovery for Norges Bank-variabler** (`usd_nok`, `i44`, `nowa`, `gov_yield_2y_no`, `gov_yield_10y_no`):
   ```
   python -m src.data.discover_api --source norges_bank
   ```
   Finn riktige series keys via Norges Bank Data API-dokumentasjon.

2. **Legg til FRED-variabler** — kan implementeres direkte med eksisterende klient:
   - `us_10y_yield` (DGS10)
   - `us_2y_yield` (DGS2)
   - `fed_funds` (FEDFUNDS)
   - `us_cpi` (CPIAUCSL)

3. **Oppdater `data_catalog.yaml`** og `config/variables.yaml` med nye variabler.

4. **Verifiser alle nye variabler** via pipeline-kjøring og sett `A_PROD`.

5. **Oppdater `docs/data_source_validation_report.md`** med kildestatus for alle variabler.

## Datakildestatus

Første pipeline-kjøring gjennomført 2026-04-30 via GitHub Actions. Alle 12 variabler hentet uten feil.

| Variabel | Kilde | Status | Sist verifisert | Notat |
|---|---|---|---|---|
| bnp_fastland | SSB 09190 | A_PROD | 2026-04-30 | 188 rader, 1979–2025 |
| kpi | SSB 03013 | A_PROD | 2026-04-30 | 564 rader, 1979–2025 |
| kpi_jae | SSB 05327 | A_PROD | 2026-04-30 | 265 rader, 2003–2025 |
| ledighet_aku | SSB 05111 | A_PROD | 2026-04-30 | 54 rader årsdata 1972–2025. Månedlig/kvartal krever discovery |
| lonnsvekst | SSB 11417 | A_PROD | 2026-04-30 | 9 rader 2017–2025. Historikk fra 1997 krever nytt filter |
| boligprisvekst | SSB 07230 | A_PROD | 2026-04-30 | 34 rader, 1992–2025 |
| k2_kredittvekst | SSB 11599 | A_PROD | 2026-04-30 | 472 rader, 1986–2026 |
| styringsrente | Norges Bank SIREN | A_PROD | 2026-04-30 | 176 rader, 2011–2026 |
| eurnok | Norges Bank EXR | A_PROD | 2026-04-30 | 6881 rader, 1999–2026 |
| oljepris | FRED DCOILBRENTEU | A_PROD | 2026-04-30 | 10159 rader, 1987–2026, 280 nulls (normalt) |
| ecb_rente | FRED ECBDFR | A_PROD | 2026-04-30 | 9982 rader, 1999–2026 |
| handelspartnervekst | FRED CLVMNACSCAB1GQEA19 | A_PROD | 2026-04-30 | 125 rader, 1995–2026 |

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
