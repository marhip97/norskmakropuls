# Prosjektplan: Realtidsdashboard for norsk økonomi

Sist revidert: 2026-04-29

Dette dokumentet er den strategiske oversikten over prosjektet. Den fullstendige tekniske spesifikasjonen ligger i `docs/SPEC.md` og inneholder detaljerte API-spørringer, datakatalog, modellspesifikasjoner og parser-regler.

---

## 0. Bakgrunn: pivot fra SMART

Dette repoet startet som SMART (System for Model Analysis in Real Time), et kryssjekkrammeverk der flere uavhengige modeller produserte parallelle prognoser. Den 29. april 2026 ble prosjektet pivotert til en ankerbasert tilnærming. Bakgrunnen er kort:

- Det opprinnelige produktprinsippet — "modellsprik som signal" — er metodisk interessant, men forklarer ikke til en bruker hva prognosen *er* akkurat nå.
- Offisielle prognoser fra Norges Bank og SSB er av høy kvalitet, men oppdateres sjelden. Det reelle behovet er å oppdatere disse mellom publiseringene basert på ny statistikk.
- SMART-modellene (ARIMA, VAR, BVAR, DFM, AR-X, ML-baseline) hadde dokumenterte stabilitetsproblemer på korte serier (se historisk `TILTAK.md`). Som hovedprodukt blokkerer dette lansering. Som kryssjekk mot en ankerbane er det akseptabelt.

Pivoten beholder datalaget, CI/CD, testene og modellene fra SMART, men endrer produktprinsippet og toppmotorhetten. Mer i seksjon 11.

---

## 1. Hva prosjektet er

Et automatisert, forklarbart dashboard som viser et oppdatert situasjonsbilde av norsk økonomi og anslag for de neste 1–3 årene. Dashboardet bruker offisielle prognoser fra Norges Bank og SSB som anker, og oppdaterer vurderingen løpende med ny statistikk.

Kjernespørsmålet dashboardet skal svare på:

> Hvordan ser det norske makrobildet trolig ut i dag, gitt all ny informasjon publisert siden siste offisielle prognoserunde?

## 2. Hva prosjektet ikke er

- Ikke et forsøk på å "slå Norges Bank" med egne modeller alene.
- Ikke et handelssystem eller investeringsverktøy.
- Ikke en erstatning for offisielle prognoser. Dashboardet er en strukturert oppdatering av dem.
- Ikke en tjeneste som skal tilby data andre kilder allerede leverer bedre.

## 3. Produktprinsipp

Hovedlogikken:

```
Oppdatert anslag = siste offisielle anslag + modellert revisjon fra nye data
```

Revisjonen drives av: inflasjonsnyheter, arbeidsmarkedsnyheter, energipriser, valutakurs, internasjonale renter og inflasjon, aktivitetsindikatorer og markedsbaserte signaler.

Dashboardet skal alltid kunne svare på:

- Hva endret seg?
- Hvor mye avvek det fra forventning?
- Hvilken variabel påvirkes?
- Hvilken vei trekker det rente-, inflasjons- og aktivitetsbildet?
- Hvor stor er usikkerheten?

## 4. Kjernearkitektur

```
[Datakilder]  ->  [Pipeline: discover -> extract -> store_raw -> validate -> transform -> store_curated]
                                                                                                |
                                                                                                v
                                  [Anker: offisielle prognoser]   [Observasjoner: ny statistikk]
                                                |                              |
                                                v                              v
                                          [News-motor: faktisk - forventet]
                                                                |
                                                                v
                              [Skyggerentebane + komponentmodell + nowcast + ensemble-kryssjekk]
                                                                |
                                                                v
                                                       [Dashboard-cache]
                                                                |
                                                                v
                                                  [Aksel/Next.js frontend]
```

Lagring: Parquet for tidsserier (med vintage-håndtering), JSON for dashboard-cache, YAML for datakatalog. PostgreSQL/TimescaleDB vurderes hvis volumet vokser, men er ikke nødvendig i MVP.

## 5. MVP-avgrensning

MVP bygger videre på det eksisterende datalaget og legger til ankerbane- og news-logikken på toppen.

**MVP-datakilder** (alle allerede implementert):

- SSB Statbank (JSON-stat2)
- Norges Bank Data API (SDMX-JSON)
- FRED CSV (uten API-nøkkel)
- NAV-data hentet via SSB der det er stabilt

**MVP-variabler som er hentet og verifisert:**

`policy_rate_no` (Norges Bank), `eurnok` (Norges Bank), `bnp_fastland` (SSB 09190), `kpi` (SSB 03013), `kpi_jae` (SSB 05327), `ledighet_aku` (SSB 05111), `lonnsvekst` (SSB 11417), `boligprisvekst` (SSB 07230), `oljepris` (FRED DCOILBRENTEU), `ecb_rente` (FRED ECBDFR), `handelspartnervekst`, `k2_kredittvekst`.

**MVP-variabler som må legges til:**

`usd_nok`, `i44`, `nowa`, `gov_yield_2y_no`, `gov_yield_10y_no` (Norges Bank — krever discovery), `us_10y_yield`, `us_2y_yield`, `fed_funds`, `us_cpi` (FRED — kan implementeres direkte).

**MVP-funksjonalitet som må bygges:**

- News-motor: beregner avvik mellom siste offisielle prognose og faktiske observasjoner.
- Vintage-lagring av offisielle prognoser (ikke bare observasjoner).
- Skyggerentebane-modell (lineær revisjonsmodell, seksjon 8.2 i SPEC.md).
- Komponentmodell for inflasjon (KPI-JAE + energi/mat/tjenester/importerte varer/husleie).
- Variabelkort-grensesnitt på dashboardet i Aksel-stil.

**Eksplisitt utenfor MVP:**

Norges Bank MPR-XLSX-parser (fase 2), IEA/EIA, Eiendom Norge uten lisens, PMI uten åpent API, Consensus Economics, Nord Pool uten lisensavklaring, PDF-scraping som primærpipeline, Finansdepartementets prognoser som kritisk pipeline.

## 6. Designkrav

Frontend bygges om fra dagens statiske Plotly-side til Next.js med Aksel.

- Next.js (statisk eksport for GitHub Pages-deployment)
- `@navikt/ds-react` for komponenter
- `@navikt/ds-css` for grunnleggende styling
- `@navikt/ds-tokens` for tokens
- `@navikt/aksel-icons` for ikoner
- Plotly eller Recharts for grafer (Plotly beholdes fra eksisterende dashboard)

Designprinsippene er nøkternhet, tilgjengelighet, responsivitet, tallorientering og forklarbarhet. Dashboardet skal forstås av en bruker uten økonometrisk spesialistkompetanse.

Hovedsider: Makropuls, Rente og finansielle forhold, Inflasjon, Arbeidsmarked, Aktivitet, Prognoser, Datakvalitet og metode.

## 7. Faseplan

Fasene reflekterer at vi starter fra et fungerende datalag, ikke fra null.

### Fase 1: Datakatalog og kildeutvidelse (delvis ferdig)

Mål: dokumentere eksisterende kilder i `data_catalog.yaml` og legge til de nye variablene.

Leveranser:

- `data_catalog.yaml` opprettes som maskinlesbar oversikt over alle implementerte kilder.
- Discovery for nye Norges Bank-serier (`usd_nok`, `i44`, `nowa`, statsrenter).
- Implementering av nye FRED-serier (rett frem).
- `data_source_validation_report.md` oppdaterer dagens kildestatus.

### Fase 2: Ankerbane-infrastruktur (ny)

Mål: lagre og bruke offisielle prognoser som ankre.

Leveranser:

- Datamodell for `anchor_forecast` med vintage-felter.
- Manuell parser for SSB Konjunkturtendensene-tabeller (eller manuelle innlastninger som første versjon).
- Defensiv MPR-XLSX-parser (kan utsettes til fase 4 hvis manuelle innlastninger holder for MVP).
- News-motor: `forecast_news_t = faktisk - forventet`.

### Fase 3: Skyggerentebane og komponentmodell

Mål: bygge revisjonsmodellene som driver "Oppdatert anslag = anker + revisjon".

Leveranser:

- Lineær skyggerentebane (seksjon 8.2 i SPEC.md).
- Komponentmodell for inflasjon (KPI-JAE + komponenter).
- NAV-til-AKU bro for arbeidsmarked.

### Fase 4: Aksel-dashboard

Mål: erstatte dagens statiske Plotly-dashboard med Next.js + Aksel.

Leveranser:

- Next.js-prosjekt med statisk eksport.
- Makropuls-side med variabelkort.
- Rente-, inflasjon-, arbeidsmarked-, aktivitet-sider.
- Datakvalitetsside som viser pipelinestatus.

### Fase 5: Modeller som kryssjekk (gjenbruk fra SMART)

Mål: ompositionere SMART-modellene (ARIMA, VAR, BVAR, DFM, AR-X, ML-baseline) som kryssjekk mot ankerbanen, ikke som hovedprognose.

Leveranser:

- Ensemble-output vises på `Prognoser`-siden som "modell-kryssjekk".
- Sprik mellom modeller og ankerbane vises eksplisitt.
- Stabilitetsproblemene fra historisk `TILTAK.md` blir mindre kritiske i denne rollen, men dokumenteres.

### Fase 6: Backtesting og kvalitet

RMSE/MAE for skyggerentebane, intervallkalibrering, modellscore per horisont, sammenligning av oppdatert anslag mot faktisk utfall ved neste offisielle prognose.

## 8. Datakildeklassifisering

Alle kilder vurderes etter denne klassifiseringen.

- `A_PROD`: stabilt, dokumentert API/SDMX/CSV, klart for produksjon
- `B_TEST`: offentlig og maskinlesbart, må testes før produksjon
- `C_FALLBACK`: kan automatiseres med høy bruddrisiko
- `D_EXCLUDE`: ikke egnet uten manuell behandling

Standardregel: ingen variabel går til produksjon uten å være klassifisert og uten oppføring i datakatalogen.

## 9. Vintage-håndtering

Alle observasjoner og alle ankerprognoser lagres med:

- `observation_date` (når ble verdien målt / hva gjelder den)
- `publication_date` (når ble verdien publisert)
- `ingestion_time` (når hentet vi den)
- `vintage_id` (hvilken versjon av rådataen)
- `source_revision_id` der mulig

For ankerprognoser er dette ekstra viktig: en MPR-bane fra mars og en fra juni er to forskjellige objekter, ikke en oppdatering av det samme. News-motoren trenger å vite hvilket anker den sammenligner mot.

Eksisterende vintage-lagring i `data/raw/<variable_id>/<vintage>.parquet` videreføres og utvides til ankerprognoser.

## 10. Risiko og avbøtende tiltak

| Risiko | Avbøtende tiltak |
|---|---|
| MPR-XLSX endrer struktur | Defensiv parser, test mot 6–8 historiske filer, varsle ved skjemabrudd. Manuelle innlastninger som fallback. |
| SSB endrer tabellnummer | Datakatalog støtter tabellmigrering, ikke hardkode tabell-ID-er på tvers av repoet |
| For bred datakatalog for tidlig | Streng MVP-avgrensning |
| Energi/kraftpriser med uklar lisens | Ekskludert fra MVP, vurderes i fase 6 |
| Manglende vintage-håndtering for prognoser | Påkrevd fra fase 2 |
| Modellambisjon før data er stabilt | Kjøreregel: smal og robust før kompleks |
| Pivoten skaper forvirring i koden | Tydelig commit-historikk, oppdatert README, denne planen som referanse |

## 11. Hva gjenbrukes fra SMART, hva endres

### Gjenbrukes direkte (ingen endring)

- Datalaget i `src/data/`: `base.py`, `ssb.py`, `norges_bank.py`, `fred.py`, `nav.py`, `pipeline.py`
- Discovery-verktøy: `scripts/discover_api.py`, `src/data/discover_api.py`
- Tester for datalaget: `tests/test_ssb.py`, `tests/test_norges_bank.py`, `tests/test_fred.py`, `tests/test_pipeline.py`
- CI/CD: `.github/workflows/data_pipeline.yml`, `tests.yml`, `discover_api.yml`
- Vintage-lagring i `data/raw/`
- Alle eksisterende variabeloppføringer i `config/variables.yaml`
- `requirements.txt`, `requirements-dev.txt`, `LICENSE`, `.gitignore`

### Tilpasses

- `config/variables.yaml`: utvides med nye variabler (`usd_nok`, `i44`, `nowa`, statsrenter, FRED-utvidelser).
- `src/models/`: modellene beholdes, men flyttes konseptuelt fra "hovedprognose" til "kryssjekk". Stabilitetsfix-ene fra historisk `TILTAK.md` (T1, T2, T3) er fortsatt verdifulle og beholdes.
- `src/runner.py`: må utvides med ankerbane-input og news-beregning. Eksisterende ensemble-logikk beholdes, men presenteres som kryssjekk.
- `dashboard/`: bygges om fra grunnen som Next.js + Aksel. Eksisterende Plotly-grafer kan gjenbrukes inne i de nye komponentene.

### Bygges nytt

- `src/anchors/`: ny modul for ankerprognose-håndtering (lagring, henting, vintage).
- `src/news/`: ny modul for news-motor (faktisk vs forventet).
- `src/models/shadow_rate.py`: skyggerentebane-modell.
- `src/models/inflation_components.py`: komponentmodell for inflasjon.
- `src/models/nav_to_aku.py`: nowcast-modell.
- Aksel-basert frontend i nytt `dashboard-aksel/`-katalog.

### Forkastes eller arkiveres

- Historisk `TILTAK.md` arkiveres som referanse, men er ikke aktiv arbeidsliste lenger.
- Eksisterende `data/processed/forecasts/`-filer er resultater fra gammelt produkt; beholdes inntil nytt dashboard er på plass, deretter slettes.
- Gammel `prosjektplan.md` (SMART) erstattes av denne filen.

## 12. Åpne avklaringer

1. Hvordan skal SSB Konjunkturtendensene parses? Stabil HTML-tabell, eller manuell innlastning som fallback?
2. Skal MPR-XLSX-parser inn i fase 2 eller fase 4? Vurderes etter at vi har testet stabiliteten på 2–3 historiske filer.
3. Hvor lenge skal det gamle Plotly-dashboardet leve parallelt med Next.js-versjonen?
4. Skal SMART-ensemble fortsatt deployes til samme GitHub Pages-URL, eller skal det nye dashboardet ta over?
5. Skal repoet rebrandes (nytt navn, ny domene), eller beholde "SMART"-navnet med ny betydning?

Status og beslutninger på disse spørsmålene følges opp i `STATUS.md`.

## 13. Kjøreregel

> Første versjon skal være datamessig robust, forklarbar og smal. Modellkompleksitet kan økes etter at automatisert datagrunnlag, ankerbane-håndtering og news-motor fungerer.

Denne regelen overstyrer all annen prioritering ved tvil.

---

## Vedlegg

- `docs/SPEC.md`: full teknisk spesifikasjon med API-spørringer, datakatalog, modellbeskrivelser
- `STATUS.md`: levende statusdokument for hvor prosjektet er nå
- `CLAUDE.md`: arbeidsregler for Claude Code i dette repoet
- `docs/decisions/`: ADR-stil beslutningslogg, inkludert pivot-beslutningen 2026-04-29
