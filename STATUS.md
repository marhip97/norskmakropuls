# Status

Sist oppdatert: 2026-04-30

Dette dokumentet beskriver hvor prosjektet er **akkurat nå**. Det skal kunne leses på under ett minutt før hver arbeidsøkt og oppdateres etter hver økt der noe vesentlig endres.

---

## Nåværende fase

**Fase 0 — Repo-oppsett og verifisering.**

norskmakropuls er nylig opprettet som etterfølger til SMART-repoet. Datalaget, testene og CI/CD-mønstrene er kopiert fra SMART, men ingen kode er verifisert å fungere i dette nye repoet ennå. Pipeline har ikke kjørt her én eneste gang. Tester har ikke kjørt på CI. Vi vet ikke om SSB-filtrene i `config/variables.yaml` fortsatt er gyldige (SSB endrer dimensjonskoder).

Første mål er å bevise at datalaget fungerer her. Først etter det går vi inn i Fase 1.

## Hva er på plass i repoet (kopiert fra SMART, ikke verifisert her)

**Datalag — kode finnes, ikke testet i dette repoet:**
- [x] `src/data/base.py`: DataSource-grensesnitt med fetch/validate/store/run
- [x] `src/data/ssb.py`: SSB Statbank-klient med metadata-validering
- [x] `src/data/norges_bank.py`: SDMX-JSON-klient
- [x] `src/data/fred.py`: FRED CSV-klient (uten API-nøkkel)
- [x] `src/data/nav.py`: NAV-data via SSB tabell 05111
- [x] `src/data/pipeline.py`: orkestrering med YAML-konfig
- [x] `src/data/discover_api.py`: SSB metadata-inspektør
- [x] `scripts/discover_api.py`: bredt discovery-skript

**Konfigurasjon:**
- [x] `config/variables.yaml` med 12 variabler (oppføringer kopiert fra SMART)
- [x] `data_catalog.yaml` opprettet med samme 12 variabler, status `B_VERIFY` på alle

**Tester:**
- [x] `tests/test_ssb.py`, `test_fred.py`, `test_norges_bank.py`, `test_pipeline.py`, `conftest.py`
- Note: `test_pipeline.py` linje 47 asserter at `registrert_ledige` finnes i config. Det stemmer ikke med faktisk `variables.yaml` (kun 12 variabler, ingen NAV-oppføring). Denne testen vil feile på første kjøring.

**Repo-skjelett:**
- [x] `PROJECT_PLAN.md`, `STATUS.md`, `CLAUDE.md`
- [x] `requirements.txt`, `requirements-dev.txt`, `.gitignore`, `LICENSE`
- [x] README-filer som forklarer plan i `src/anchors/`, `src/news/`, `src/models/`, `src/dashboard/`
- [x] CI/CD-workflows (`.github/workflows/`)

**Kjente problemer i workflows som må fikses før første grønne run:**
- `.github/workflows/data_pipeline.yml` har et `run-models`-jobb som kjører `python -m src.runner` — den filen finnes ikke (hentes i Fase 5). Workflow vil feile på dette steget.
- `.github/workflows/deploy_dashboard.yml` refererer til `dashboard/index.html` etc. som ikke finnes. Workflow vil feile.
- `tests/tests/__init__.py` ligger i feil mappe (skulle vært `tests/__init__.py`).

## Hva er IKKE gjort

- Ingen pipeline-kjøring har skjedd i dette repoet.
- Ingen tester har kjørt på CI.
- `data/raw/` er tom — ingen vintage er hentet ennå.
- Modeller (ARIMA, VAR, BVAR, DFM, AR-X, ML-baseline) er **ikke** kopiert fra SMART. De hentes i Fase 5 som kryssjekk mot ankerbanen.
- `src/anchors/`, `src/news/`, `src/models/`, `src/dashboard/`, `dashboard-aksel/` er tomme mapper med kun en README som beskriver plan.
- `README.md` på topp-nivå er tom.
- `docs/data-sources.md` er tom.
- `docs/SPEC.md` finnes ikke. Brukeren har en lokal SPEC-fil som må kopieres inn ved behov.

## Hva er under arbeid

Ingenting aktivt. Repoet er nettopp opprettet og venter på Fase 0-verifisering.

## Hva står for tur — Fase 0 (gjør disse i rekkefølge)

1. **Fiks workflow-blokkere før første push:**
   - Fjern `run-models`-jobben fra `data_pipeline.yml` (eller kommentér den ut til Fase 5).
   - Bytt `deploy_dashboard.yml`-trigger til `workflow_dispatch` så den ikke kjører automatisk og feiler.
   - Fjern `tests/tests/`-undermappen.

2. **Verifiser tester lokalt:**
   ```
   pip install -r requirements-dev.txt
   pytest tests/ -v
   ```
   Forventet: alle tester passerer bortsett fra `test_load_config_returnerer_alle_variabler` som vil feile på `assert "registrert_ledige" in ids`. Fiks: oppdater testen til å sjekke variabler som faktisk finnes (`bnp_fastland`, `kpi`, `styringsrente`, `oljepris`).

3. **Verifiser pipeline lokalt:**
   ```
   python -m src.data.pipeline kpi
   ```
   Forventet: én vintage skrives til `data/raw/kpi/<dato>.parquet`.
   
   Hvis SSB returnerer feil pga. dimensjonskoder (kjent risiko etter SMART-erfaring): bruk `python -m src.data.discover_api --table 03013` for å finne riktige koder, oppdater `variables.yaml`.

4. **Kjør hele pipeline lokalt:**
   ```
   python -m src.data.pipeline
   ```
   Mål: 12/12 variabler henter uten feil.

5. **Push første grønne run til GitHub** og verifiser at `tests.yml`-workflow kjører grønt.

6. **Når Fase 0 er ferdig:** oppdater dette dokumentet med faktisk status per variabel, sett A_PROD eller passende klassifisering i `data_catalog.yaml`, og gå over til Fase 1.

## Datakildestatus

Alle 12 variabler står som **B_VERIFY** i `data_catalog.yaml` inntil pipeline har kjørt grønt i dette repoet. Når en variabel er verifisert hentet (en parquet-fil i `data/raw/<id>/`), oppdater status til `A_PROD` her og i katalogen.

| Variabel | Kilde | Status | Sist verifisert |
|---|---|---|---|
| bnp_fastland | SSB 09190 | B_VERIFY | — |
| kpi | SSB 03013 | B_VERIFY | — |
| kpi_jae | SSB 05327 | B_VERIFY | — |
| ledighet_aku | SSB 05111 | B_VERIFY | — |
| lonnsvekst | SSB 11417 | B_VERIFY | — |
| boligprisvekst | SSB 07230 | B_VERIFY | — |
| k2_kredittvekst | SSB 11599 | B_VERIFY | — |
| styringsrente | Norges Bank SIREN | B_VERIFY | — |
| eurnok | Norges Bank EXR/B.EUR.NOK.SP | B_VERIFY | — |
| oljepris | FRED DCOILBRENTEU | B_VERIFY | — |
| ecb_rente | FRED ECBDFR | B_VERIFY | — |
| handelspartnervekst | FRED CLVMNACSCAB1GQEA19 | B_VERIFY | — |

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
