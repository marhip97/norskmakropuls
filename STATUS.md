# Status

Sist oppdatert: 2026-04-29

Dette dokumentet beskriver hvor prosjektet er **akkurat nå**. Det skal kunne leses på under ett minutt før hver arbeidsøkt og oppdateres etter hver økt der noe vesentlig endres.

---

## Nåværende fase

**Fase 1 (delvis ferdig) — Datakatalog og kildeutvidelse**, i overgang til **Fase 2 — Ankerbane-infrastruktur**.

Prosjektet ble pivotert 2026-04-29 fra SMART (kryssjekk-rammeverk) til ankerbasert dashboard. Pivoten betyr at fasene M0–M4 fra det gamle SMART-prosjektet er erstattet med en ny faseplan i `PROJECT_PLAN.md`. Mye av arbeidet er likevel allerede gjort, fordi datalaget og infrastrukturen gjenbrukes uendret.

## Hva er gjort (gjenbrukt fra SMART)

**Datalag — fungerer i produksjon:**
- [x] `src/data/base.py`: `DataSource`-grensesnitt med fetch/validate/store/run
- [x] `src/data/ssb.py`: SSB Statbank-klient med metadata-validering og JSON-stat2-parser
- [x] `src/data/norges_bank.py`: SDMX-JSON-klient
- [x] `src/data/fred.py`: FRED CSV-klient (uten API-nøkkel)
- [x] `src/data/nav.py`: NAV-data via SSB tabell 05111
- [x] `src/data/pipeline.py`: orkestrering med YAML-konfig
- [x] Discovery-verktøy: `scripts/discover_api.py`

**Vintage-lagring:**
- [x] Rådata lagres som Parquet i `data/raw/<variable_id>/<vintage>.parquet`
- [x] Aldri overskriving av historiske filer

**12 variabler implementert og verifisert:**

| Variabel | Kilde | Status |
|---|---|---|
| `bnp_fastland` | SSB 09190 | A_PROD |
| `kpi` | SSB 03013 | A_PROD |
| `kpi_jae` | SSB 05327 | A_PROD |
| `ledighet_aku` | SSB 05111 | A_PROD |
| `lonnsvekst` | SSB 11417 | A_PROD |
| `boligprisvekst` | SSB 07230 | A_PROD |
| `styringsrente` | Norges Bank SHORT_RATES | A_PROD_WITH_CAVEAT |
| `eurnok` | Norges Bank EXR/B.EUR.NOK.SP | A_PROD |
| `oljepris` | FRED DCOILBRENTEU | A_PROD |
| `ecb_rente` | FRED ECBDFR | A_PROD |
| `handelspartnervekst` | FRED CLVMNACSCAB1GQEA19 | A_PROD |
| `k2_kredittvekst` | SSB 11599 | A_PROD |

**CI/CD:**
- [x] `.github/workflows/data_pipeline.yml`: ukentlig pipeline (mandag 06:00 UTC)
- [x] `.github/workflows/tests.yml`: pytest + ruff på PR
- [x] `.github/workflows/discover_api.yml`: manuell discovery
- [x] `.github/workflows/deploy_dashboard.yml`: GitHub Pages-deploy

**Tester:**
- [x] 130/130 tester grønne på siste kjøring (2026-04-28)

## Hva er gjort (ny pivot)

- [x] Pivotbeslutning dokumentert (denne fasen, 2026-04-29)
- [x] `PROJECT_PLAN.md` oppdatert med ankerbasert produktprinsipp
- [x] `CLAUDE.md` oppdatert med pivot-spesifikke arbeidsregler

## Hva er under arbeid

Ingen aktive utviklingsoppgaver akkurat nå. Pivoten er besluttet, og neste steg er å starte fase 1-restarbeid og fase 2 parallelt.

## Hva står for tur

Prioritert rekkefølge:

1. **Opprette `data_catalog.yaml`** som maskinlesbar oversikt over de 12 eksisterende variablene + de nye (etter mønsteret i `CLAUDE.md` seksjon 5).
2. **Implementere FRED-utvidelser** (`us_10y_yield`, `us_2y_yield`, `fed_funds`, `us_cpi`) — rett frem, eksisterende klient håndterer alt.
3. **Discovery for nye Norges Bank-serier** (`usd_nok`, `i44`, `nowa`, statsrenter) via discovery-skriptet.
4. **Bygge ankerbane-modul** (`src/anchors/`) med vintage-lagring av offisielle prognoser.
5. **Manuell innlastning av siste MPR og Konjunkturtendensene** som første ankerdata. Automatisk parser kommer senere.
6. **News-motor** (`src/news/`): faktisk minus forventet per variabel og horisont.
7. **Skyggerentebane-modell** som første "revisjonsmodell".
8. **Aksel-frontend** starter parallelt fra fase 4 (kan begynne så snart fase 2 har leverbar JSON).

## Blokkeringer og åpne spørsmål

| Spørsmål | Status | Hvem avgjør |
|---|---|---|
| Skal repoet rebrandes (nytt navn enn SMART), eller beholde navnet med ny betydning? | Åpent | Prosjekteier |
| Skal det gamle Plotly-dashboardet kjøre parallelt med Next.js-versjonen, og hvor lenge? | Åpent | Prosjekteier |
| MPR-XLSX-parser: i fase 2 eller fase 4? | Anbefalt: fase 4. Manuelle innlastninger som fallback i fase 2 | Bekreftes etter første test |
| Hvordan håndteres SSB Konjunkturtendensene? (HTML-parser eller manuell) | Anbefalt: manuell først, vurder HTML-parser etter MVP | Bekreftes i fase 2 |
| Skal SMART-ensemblet fortsatt deployes til samme GitHub Pages-URL? | Åpent | Prosjekteier |
| Skal historisk `TILTAK.md` (P1–P4 fra SMART-perioden) lukkes formelt? | Anbefalt: arkiver som referanse, P1-fix beholdes, P2–P4 nedprioriteres | Bekreftes innen Fase 5 |

## SMART-modellenes status (gjenbrukt, ompositionert)

Modellene er teknisk fungerende og under aktiv vedlikehold via P1-tiltakene fra historisk `TILTAK.md` (T1, T2, T3 implementert, T4 og T9 implementert). De flyttes konseptuelt til ny rolle som **kryssjekk mot ankerbanen** i fase 5.

| Modell | Teknisk status | Ny rolle |
|---|---|---|
| ARIMAModel | Fungerer, T1-fix anvendt | Kryssjekk per variabel |
| VARModel | Fungerer | Kryssjekk per variabel |
| BVARModel | Fungerer, T4-fix anvendt | Kryssjekk per variabel |
| DFMModel | Fungerer | Kryssjekk per variabel |
| ARXModel | Fungerer, T2/T6-fix anvendt | Kryssjekk per variabel |
| MLBaselineModel | T5 ikke implementert | Kryssjekk; T5-fix utsettes til fase 5 |

**Konsekvens av rolleendring:** Fan-bredder og R²-verdier som så dårlige ut som hovedprognose, blir akseptable som kryssjekk. Sprik mellom modeller og ankerbane er nå ønsket signal, ikke et problem.

## Pipelinestatus

- Datapipeline kjører ukentlig (mandag 06:00 UTC).
- Siste vellykkede kjøring: 2026-04-28.
- 12 variabler hentes uten feil.
- Modellrunner produserer prognose-JSON; disse er output fra det gamle produktet og skal erstattes.

## Frontend-status

**Eksisterende (gammelt SMART-dashboard):**
- Plotly-basert statisk side på GitHub Pages
- Viser vifte-diagrammer, modellsammenligning, treffsikkerhetstabell
- Deployes automatisk etter pipeline-kjøring

**Nytt (under planlegging):**
- Next.js + `@navikt/ds-react`
- Aksel-design, samme ankerbasert produktprinsipp
- Statisk eksport til samme GitHub Pages-URL
- Bygges fra fase 4

## Tekniske beslutninger så langt

| Beslutning | Begrunnelse | Dato |
|---|---|---|
| Pivot fra SMART (kryssjekk) til ankerbasert dashboard | Klarere produktprinsipp, mindre kritisk avhengighet av SMART-modellenes stabilitet | 2026-04-29 |
| Behold repoet, ikke nytt | Bevarer Git-historikk på datakildene som gjenbrukes | 2026-04-29 |
| Gjenbruk SMART-modellene som kryssjekk, ikke kast | Modellsprik er fortsatt verdifullt signal i fase 5 | 2026-04-29 |
| Aksel/NAV som designsystem | Gir nøkternt, tilgjengelig, offentlig egnet preg | 2026-04-26 (fra SMART) |
| SSB Statbank som ryggrad | Mest stabil og dokumentert kilde for norsk makro | 2026-04-26 (fra SMART) |
| FRED CSV-endepunkt uten API-nøkkel | Null friksjon, matcher eksisterende SMART-kode | 2026-04-26 (fra SMART) |
| Norsk språk i grensesnittet (bokmål) | Målgruppen er norsk | 2026-04-26 (fra SMART) |

## Endringslogg

| Dato | Endring | Av |
|---|---|---|
| 2026-04-29 | Pivot fra SMART til ankerbasert dashboard. Ny `PROJECT_PLAN.md`, `CLAUDE.md`, `STATUS.md`. | Plan-fase |
| 2026-04-28 | (Historisk SMART) M5 metodegjennomgang, 12 funn dokumentert i `TILTAK.md` | SMART |
| 2026-04-28 | (Historisk SMART) M4 fullført — Plotly-dashboard live på GitHub Pages | SMART |
| 2026-04-26 | (Historisk SMART) M0–M3 fullført — datalag, modeller, ensemble | SMART |

For fullstendig SMART-historikk, se Git-loggen og det gamle `prosjektplan.md` (vil bli flyttet til `docs/archive/`).

---

## Hvordan oppdatere dette dokumentet

Etter hver arbeidsøkt der noe vesentlig endres:

1. Oppdater "Sist oppdatert"-dato øverst.
2. Flytt avhukede oppgaver fra "Under arbeid" til "Hva er gjort".
3. Legg nye oppgaver i "Hva står for tur".
4. Oppdater datakildestatus-tabellen ved verifisering.
5. Logg viktige beslutninger i tabellen "Tekniske beslutninger så langt".
6. Skriv én linje i endringsloggen.

Hold dokumentet kort. Detaljer hører hjemme i `docs/SPEC.md` eller i commit-meldinger.
