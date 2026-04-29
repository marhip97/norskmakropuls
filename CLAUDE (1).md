# CLAUDE.md

Dette dokumentet er instruks til Claude Code når den arbeider i dette repoet. Det er ikke en prosjektplan — den ligger i `PROJECT_PLAN.md`. Det er ikke en statusrapport — den ligger i `STATUS.md`. Det er en oppskrift på hvordan vi arbeider her.

Repoet ble pivotert 2026-04-29 fra SMART (kryssjekk-rammeverk) til ankerbasert dashboard. Mye av kodebasen er gjenbrukt fra SMART; mye er nytt. Reglene under reflekterer denne hybride situasjonen.

Ved konflikt: brukerens eksplisitte instruks i en samtale vinner alltid over dette dokumentet. Men i fravær av annen instruks gjelder reglene under.

---

## 1. Først, hver økt

Før du gjør noe annet:

1. Les `STATUS.md`. Det forteller hvor prosjektet er nå, inkludert hvilken fase vi er i etter pivoten.
2. Les `PROJECT_PLAN.md` seksjonen som er relevant for oppgaven, særlig seksjon 11 (hva som er gjenbrukt fra SMART).
3. Hvis oppgaven berører datakilder, parsere eller modeller: les relevant del av `docs/SPEC.md`.
4. Hvis du er usikker på om en SMART-fil skal endres, gjenbrukes uendret eller forkastes: spør brukeren før du begynner.

Avslutt aldri en arbeidsøkt uten å foreslå en oppdatering av `STATUS.md`.

## 2. Språk og kommunikasjon

- Repoet, kode, dokumentasjon og dashboard er på norsk bokmål. Variabel- og funksjonsnavn i koden er på engelsk (standard programmeringsspråk-norm).
- Commit-meldinger skrives på norsk eller engelsk, men konsekvent i samme repo. Vi bruker norsk.
- Ingen emojis i kode, kommentarer, commit-meldinger eller dokumentasjon.
- Forklar pedagogisk i dialog hva du gjør og hvorfor, særlig når du tar beslutninger med konsekvenser senere i prosjektet.

## 3. Kjøreregel som overstyrer alt annet

> Første versjon skal være datamessig robust, forklarbar og smal. Modellkompleksitet kan økes etter at automatisert datagrunnlag, ankerbane-håndtering og news-motor fungerer.

Hvis en endring øker omfang eller modellkompleksitet før ankerbane-laget er stabilt — stopp og spør.

## 4. Pivot-spesifikke regler

Disse reglene gjelder så lenge vi er i overgangsperioden mellom SMART og ankerbasert dashboard.

### Hvordan håndtere SMART-arven

**Behold uendret med mindre eksplisitt nødvendig:**

- Alle filer i `src/data/` (datalag, kildeklienter, pipeline)
- Tester i `tests/test_ssb.py`, `tests/test_norges_bank.py`, `tests/test_fred.py`, `tests/test_pipeline.py`
- CI/CD-workflows i `.github/workflows/`
- `scripts/discover_api.py`, `src/data/discover_api.py`
- `requirements.txt`, `requirements-dev.txt`, `LICENSE`, `.gitignore`

**Tilpass forsiktig:**

- `config/variables.yaml`: kan utvides med nye variabler. Eksisterende oppføringer endres ikke uten begrunnelse.
- `src/models/`: modellene beholdes med dagens grensesnitt. Ikke refaktorer uten grunn — de skal flyttes til "kryssjekk"-rolle, ikke skrives om.
- `src/runner.py`: må utvides med ankerbane og news-input. Ensemble-logikk beholdes.

**Forkast eller arkiver med forsiktighet:**

- `TILTAK.md`: arkiveres til `docs/archive/TILTAK_smart_phase.md` ved første anledning. Ikke slett — den dokumenterer kjente svakheter.
- Gammelt `prosjektplan.md`: arkiveres til `docs/archive/prosjektplan_smart.md`.
- `data/processed/forecasts/`: gamle resultatfiler. Beholdes inntil nytt dashboard er på plass; deretter slettes.
- `dashboard/`: byttes ut med Next.js + Aksel i fase 4. Eksisterende Plotly-kode kan brukes som referanse for grafer.

### Bygg nytt i nye kataloger

For å unngå sammenblanding mellom gammel og ny kode skal nye moduler legges i nye kataloger:

- Ankerprognoser: `src/anchors/`
- News-motor: `src/news/`
- Nye revisjonsmodeller: `src/models/shadow_rate.py`, `src/models/inflation_components.py`, `src/models/nav_to_aku.py`
- Ny frontend: `dashboard-aksel/` (parallelt med dagens `dashboard/` inntil pivoten er fullført)

Når pivoten er fullført flyttes `dashboard/` til `docs/archive/dashboard_plotly/` og `dashboard-aksel/` omdøpes til `dashboard/`.

### Når en SMART-fil må endres

Før du endrer en SMART-fil utenfor de spesifikke unntakene over:

1. Forklar i dialog hva som må endres og hvorfor.
2. Få bekreftelse før du gjør endringen.
3. Bruk en egen feature-gren med navn `pivot/<beskrivelse>`.

## 5. Repostruktur (etter pivoten)

Forventet katalogstruktur når pivot-arbeidet er ferdig:

```
.
├── PROJECT_PLAN.md
├── STATUS.md
├── CLAUDE.md
├── README.md
├── docs/
│   ├── SPEC.md
│   ├── data_source_validation_report.md
│   ├── decisions/                   # ADR-stil beslutningslogg
│   ├── models/                      # modellkort (gjenbrukt fra SMART)
│   ├── variables/                   # variabelbeskrivelser (gjenbrukt fra SMART)
│   └── archive/                     # arkivert SMART-materiale
├── data_catalog.yaml                # NY: maskinlesbar kildekatalog
├── config/
│   ├── variables.yaml               # eksisterende, utvides
│   └── models.yaml                  # eksisterende
├── src/
│   ├── data/                        # GJENBRUKT fra SMART, uendret
│   ├── anchors/                     # NY: ankerprognose-håndtering
│   ├── news/                        # NY: news-motor
│   ├── models/                      # GJENBRUKT fra SMART, ny rolle (kryssjekk)
│   │   ├── shadow_rate.py           # NY
│   │   ├── inflation_components.py  # NY
│   │   └── nav_to_aku.py            # NY
│   ├── ensemble/                    # GJENBRUKT fra SMART
│   └── runner.py                    # GJENBRUKT, utvides
├── tests/                           # eksisterende + nye tester
├── data/
│   ├── raw/                         # eksisterende vintage-lagring
│   ├── anchors/                     # NY: ankerprognoser med vintage
│   └── processed/                   # eksisterende
├── dashboard/                       # eksisterende Plotly-versjon, utgår
├── dashboard-aksel/                 # NY: Next.js + Aksel
├── scripts/
└── .github/workflows/
```

## 6. Datakatalog først

Ingen ny datakilde implementeres uten oppføring i `data_catalog.yaml`. Minimum felter per oppføring:

```yaml
series_id: <id>
name: <leselig navn>
source: <SSB|norges_bank|FRED|NAV|...>
source_type: <pxweb_api|sdmx_json|csv|xlsx|...>
endpoint: <URL>
source_table: <tabell-id eller series key>
frequency: <daily|weekly|monthly|quarterly|annual>
unit: <percent|index|nok|usd|...>
seasonal_adjustment: <sa|not_sa|trend>
release_lag: <beskrivelse>
license: <public_ssb_terms|fred_public|...>
status: <A_PROD|B_TEST|C_FALLBACK|D_EXCLUDE>
required_for_mvp: <true|false>
transformations: [...]
validation:
  min_date: <YYYY-MM-DD>
  expected_frequency: <...>
  max_missing_recent: <n>
notes: <...>
```

Regel: kode som henter en serie skal lese fra denne katalogen. Tabell-ID-er, series keys og endepunkter hardkodes ikke spredt i koden.

For eksisterende SMART-variabler skal informasjonen migreres fra `config/variables.yaml` og `docs/variables/<variabel>.md` til `data_catalog.yaml`. Migreringen er én tidlig oppgave i fase 1 etter pivoten.

## 7. Standard datamodell

Alle tidsserier normaliseres til skjemaet i `docs/SPEC.md` seksjon 5.3. Minimumsfelter per observasjon: `date`, `vintage_date`, `ingestion_time`, `source`, `series_id`, `value`, `status`.

Rådata lagres uendret i `data/raw/<source>/<series_id>/<vintage>.{json|csv|xlsx}`. Kuraterte data lagres som Parquet i `data/curated/`.

## 8. Vintage-håndtering er obligatorisk

Hver innhenting lagrer:

- `observation_date` (datoen verdien gjelder for)
- `publication_date` (når kilden publiserte den)
- `ingestion_time` (når vi hentet den)
- `vintage_id` (entydig id for innhentingsversjonen)
- `source_revision_id` der mulig

Dette gjelder **også for ankerprognoser**. En MPR-bane fra mars og en fra juni er to forskjellige objekter, ikke en oppdatering av samme objekt. News-motoren må vite hvilket anker den sammenligner mot.

## 9. Kildeklassifisering før produksjon

Ny variabel går aldri rett til produksjon. Veien er:

1. **Discovery**: hent metadata, valider dimensjoner, test-fetches.
2. **Lagre responskontrakt**: lagre eksempel på rårespons under `tests/fixtures/`.
3. **Klassifiser**: sett status i `data_catalog.yaml` (`A_PROD`, `B_TEST`, ...).
4. **Implementer extractor og validering**.
5. **Oppdater `STATUS.md`** med faktisk status og verifiseringsdato.

Hopp aldri over discovery-steget med begrunnelsen "jeg tror tabellen heter X". Vi gjetter ikke SSB-tabeller, Norges Bank series keys eller FRED series IDs.

## 10. MVP-grenser

Disse er **utenfor MVP** og skal ikke implementeres uten eksplisitt brukerbeslutning:

- Norges Bank MPR-XLSX-parser (vurderes i fase 4, ikke fase 2)
- IEA, EIA, ENTSO-E, Nord Pool
- Eiendom Norge uten lisensavklaring
- PMI uten åpent API
- Consensus Economics eller andre betalte kilder
- PDF-scraping som primærpipeline
- Finansdepartementets prognoser som kritisk feed

Hvis du blir bedt om noe i denne listen: påpek at det er utenfor MVP-grensene og bekreft før du fortsetter.

## 11. Test før commit

- Hver extractor skal ha en test som kjører mot en fixture (ikke nettverket).
- Hver pipeline-transformasjon skal ha en test på normalisert format.
- Skjemavalidering skal feile kontrollert ved strukturendring i kilden, ikke stille.
- Kjør `pytest` og `ruff check src/ tests/` før du foreslår commit.
- Eksisterende SMART-tester (130 stykker per 2026-04-28) må fortsatt være grønne. Hvis en SMART-test må endres pga. pivoten, dokumenter hvorfor.

## 12. Hva du IKKE skal gjøre uten å spørre

- Endre `PROJECT_PLAN.md` (det er en strategisk beslutning).
- Slette eller flytte SMART-filer som ikke er eksplisitt forkastet i seksjon 4.
- Refaktorere SMART-modellene utover P1-tiltakene fra historisk `TILTAK.md`.
- Legge til nye datakilder utenfor MVP.
- Bytte ut grunnleggende avhengigheter (Python-versjon, Next.js, Aksel, statsmodels).
- Slette historikk eller gjøre force-push på `main`.
- Skrive til `data/raw/` med modifisert innhold — rådata er uendret per definisjon.
- Begynne på modellbygging før ankerbane-laget er stabilt.

## 13. Forklar pedagogisk

Brukeren har eksplisitt bedt om at du forklarer hvordan du tenker og vurderer underveis. Dette betyr:

- Når du tar valg med konsekvenser senere, beskriv valget og alternativene.
- Når du oppdager et problem, si hva som er problemet før du foreslår løsning.
- Når du lurer på noe, spør i stedet for å gjette.
- Når en oppgave er ferdig, oppsummer kort hva som ble gjort, hva som gjenstår, og hva neste naturlige skritt er.

Korte svar er bedre enn lange. Men ikke skjul resonnementet.

---

# Del II: Hvordan vi jobber med Git og GitHub

Denne seksjonen er pedagogisk skrevet. Den forklarer ikke bare *hva* du skal gjøre, men *hvorfor* — slik at brukeren kan styre kodeutviklingen trygt over tid.

## A. Kjernemodellen

Tenk på Git som tre lag:

1. **Working directory** — filene du faktisk redigerer.
2. **Staging area** (også kalt "index") — filene du har valgt ut for neste commit.
3. **Repository** — historikken av commits, både lokalt og på GitHub.

En commit er et frosset bilde av prosjektet på et tidspunkt, med en melding som forklarer hvorfor endringen ble gjort. GitHub er bare en kopi av repoet på en server, slik at flere kan jobbe sammen og du har sikkerhetskopi.

Mental modell:

```
[Du redigerer]    ->  git add      ->  [Staging]   ->  git commit  ->  [Lokalt repo]
                                                                              |
                                                                              |  git push
                                                                              v
                                                                       [GitHub-repo]
```

Når en annen jobber på GitHub og du vil hente endringene:

```
[GitHub-repo]  ->  git fetch  ->  [Lokalt repo]  ->  git merge / rebase  ->  [Working directory]
```

`git pull` er bare `fetch + merge` i ett.

## B. Branchstrategi for dette prosjektet

Vi bruker en enkel modell:

- `main`: alltid kjørbar. Aldri push direkte hit etter at prosjektet har første kjørbare versjon.
- `feature/<kort-beskrivelse>`: en gren per oppgave eller funksjon. Eksempel: `feature/anchor-storage`, `feature/news-motor`, `feature/aksel-makropuls`.
- `pivot/<kort-beskrivelse>`: spesialgren for pivot-relaterte endringer som rører eksisterende SMART-kode. Eksempel: `pivot/arkiver-tiltak`, `pivot/dashboard-coexistence`. Bruk denne i stedet for `feature/` når du endrer SMART-arven.
- `fix/<kort-beskrivelse>`: småfiks.
- `experiment/<kort-beskrivelse>`: utforskning som kanskje aldri merges. Lov å forkaste.

Regel: én oppgave = én gren = én pull request. Ikke samle ti urelaterte endringer i samme PR.

## C. Standard arbeidsflyt for én oppgave

```
# 1. Sørg for at du er på main og at main er oppdatert
git checkout main
git pull

# 2. Lag en ny gren for oppgaven
git checkout -b feature/news-motor

# 3. Gjør jobben. Commit ofte og smått.
git add src/news/ tests/test_news.py
git commit -m "Legg til news-motor med forecast_news_t = faktisk - forventet"

# 4. Push grenen til GitHub
git push -u origin feature/news-motor

# 5. Åpne pull request på GitHub. Be om review (eller selv-review).

# 6. Når PR er godkjent og merget, oppdater lokalt:
git checkout main
git pull
git branch -d feature/news-motor
```

`-u origin feature/news-motor` første gang gjør at senere `git push` og `git pull` på den grenen vet hvor de skal.

## D. Spesielt om pivot-arbeid

Pivot-grener (`pivot/...`) skal være **ekstra forsiktige** fordi de rører eksisterende SMART-kode. Tilleggsregler:

1. Hver pivot-PR må eksplisitt vise hva som *ikke* er endret. Skriv i PR-beskrivelsen: "Endrer ikke `src/data/`, `tests/test_ssb.py`, ..."
2. Pivot-PR-er bør ikke kombineres med ny funksjonalitet. Først arkiver, deretter bygg nytt.
3. Hvis tester slutter å passere, stopp og forklar hvorfor før du fortsetter.

Eksempel på en god pivot-PR:

```
Tittel: Arkiver TILTAK.md og gammel prosjektplan til docs/archive/

Hva:
- Flyttet TILTAK.md til docs/archive/TILTAK_smart_phase.md
- Flyttet prosjektplan.md til docs/archive/prosjektplan_smart.md
- Lagt til README i docs/archive/ som forklarer at dette er SMART-historikk

Hvorfor:
Ifølge PROJECT_PLAN.md seksjon 11 (etter pivoten 2026-04-29) er disse
filene ikke lenger aktive arbeidsdokumenter. De arkiveres for sporbarhet.

Endrer ikke:
- src/, tests/, .github/workflows/, config/

Test:
- pytest passerer (130/130)
- Lenker fra README og STATUS.md oppdatert

Risiko:
Lav. Kun filflytting, ingen kodendring.
```

## E. Commit-meldinger

En god commit-melding har:

- Én linje på maks ~72 tegn som oppsummerer hva.
- Eventuelt en blank linje, så en lengre forklaring av hvorfor.

Gode eksempler:

```
Legg til ankerprognose-modul med vintage-lagring

Modulen lagrer offisielle prognosebaner per vintage_date slik at
news-motoren kan referere til den banen som faktisk var siste
offisielle ved et gitt tidspunkt. Implementert per SPEC.md seksjon 6.1.
```

```
Fiks NaN-håndtering i FRED-parser

FRED markerer manglende observasjoner med ".", som tidligere
ble tolket som tekststreng. Nå konverteres de til NaN før
numerisk parsing.
```

Dårlige eksempler å unngå: "fix", "wip", "endringer", "diverse oppdateringer".

Regel: en commit skal være liten nok til å beskrives i én setning. Hvis du må skrive "og" i tittellinjen, er commiten for stor.

## F. Hva commiter vi, hva commiter vi ikke

**Commit:**
- All kildekode
- Konfigurasjonsfiler (`pyproject.toml`, `package.json`, `tsconfig.json`, ...)
- Dokumentasjon (`*.md`)
- `data_catalog.yaml`
- Test-fixtures (små eksempler på rårespons)
- Datavintager i `data/raw/` (følger eksisterende SMART-praksis — pipeline committer)
- Prognoseresultater i `data/processed/` inntil pivot er fullført

**Commit ikke:**
- Hemmeligheter (API-nøkler, passord, tokens)
- Lokale miljøvariabler (`.env`)
- Genererte artefakter (`__pycache__/`, `node_modules/`, `dist/`, `.next/`)
- IDE-spesifikke filer (`.vscode/`, `.idea/`) med mindre teamet er enig

Repoet har en `.gitignore` fra SMART-perioden som dekker dette. Hvis en hemmelighet noensinne blir committet ved uhell: stopp og varsle brukeren umiddelbart. Det krever historikk-rensing og rotering av nøkkelen.

## G. Pull requests

Når du åpner en PR:

1. Tittel: samme stil som commit-melding.
2. Beskrivelse:
   - **Hva**: kort om endringen.
   - **Hvorfor**: kobling til oppgave eller status.
   - **Test**: hvordan kan man verifisere at det virker?
   - **Risiko**: hva kan gå galt?
3. Hvis PR endrer datakatalog eller introduserer ny kilde, koble eksplisitt til klassifiseringen (`A_PROD`, `B_TEST`, ...).
4. Hold PR-en så liten som mulig. Helst under 400 endrede linjer. Store PR-er får ikke skikkelig review.
5. For pivot-PR-er: følg spesialreglene i seksjon D.

## H. Holde grenen oppdatert

Hvis arbeidet på `main` har gått videre mens du jobbet på en gren, oppdater grenen før merge:

```
git checkout feature/min-gren
git fetch origin
git rebase origin/main
```

Hvis det blir konflikter: løs dem fil for fil, deretter `git rebase --continue`.

Alternativ til rebase er merge (`git merge origin/main`). Forskjellen:

- **Rebase** gir lineær historikk, ser ryddigere ut, men endrer commit-hashes. Bruk på dine egne grener før de er pushet eller delt.
- **Merge** beholder eksakt historikk, men gir flere "merge commits". Tryggere når flere jobber på samme gren.

Tommelfingerregel for solo-utvikling: rebase egne grener før merge til main.

## I. Når noe går galt

| Situasjon | Kommando |
|---|---|
| Angre siste commit, behold endringene | `git reset --soft HEAD~1` |
| Angre siste commit og slett endringene | `git reset --hard HEAD~1` (forsiktig) |
| Angre `git add` av en fil | `git restore --staged <fil>` |
| Forkast lokale endringer i en fil | `git restore <fil>` |
| Se hva som er endret | `git status`, `git diff`, `git log --oneline -20` |
| Fant ut hvem som endret en linje | `git blame <fil>` |
| Lagre arbeid midlertidig | `git stash`, hent tilbake med `git stash pop` |

Regel: aldri kjør `git push --force` på `main`. På egne feature-grener kan `--force-with-lease` brukes etter rebase, men varsle eventuelle medarbeidere først.

## J. Tagger og versjoner

SMART-perioden har ingen formelle tagger. Vi setter første tagg ved fullført pivot:

```
git tag -a v0.1.0-pivot -m "Pivot fra SMART til ankerbasert dashboard"
git push origin v0.1.0-pivot
```

Etter dette tagges hver milepæl etter ankerbane-fasene:

```
git tag -a v0.2.0 -m "Fase 2 ferdig: ankerbane-infrastruktur"
git tag -a v1.0.0 -m "MVP fullført: ankerbasert dashboard live"
```

Tagger er udelelige peker til en commit. De brukes til å markere stabile versjoner og kunne sjekke ut nøyaktig den koden senere.

## K. GitHub-spesifikke ting

- **Issues**: én per konkret oppgave. Lenkes fra PR-er med `Closes #12`.
- **Branch protection** på `main`: krev minst én review og at tester passerer. Anbefales aktivert nå hvis det ikke allerede er det.
- **Actions**: kjører tester og deployer dashboard automatisk. Allerede etablert fra SMART-perioden.
- **Secrets**: API-nøkler hører hjemme i GitHub Actions secrets eller en miljøvariabelfil som ikke committes. Aldri i kode.

## L. Rytmen vi anbefaler

Daglig:

1. Start med `git pull` på `main`.
2. Lag eller bytt til feature/pivot-gren.
3. Commit smått og ofte underveis. Si hva og hvorfor.
4. Push til GitHub minst én gang om dagen, slik at arbeid ikke ligger sårbart bare lokalt.

Per oppgave:

1. Branch ut.
2. Implementer.
3. Test.
4. Rebase mot oppdatert `main`.
5. PR.
6. Merge.
7. Slett gren.
8. Oppdater `STATUS.md` om relevant.

Dette skaper en jevn rytme der historikken er ryddig, hver endring er sporbar, og det er lett å rulle tilbake hvis noe går galt.

## M. Spesielt om denne pivoten

For å gjøre selve pivoten ryddig anbefaler jeg denne sekvensen i Git:

```
# 1. Et tydelig pivot-commit på main
git checkout main
git pull

# Legg til de tre nye dokumentene (PROJECT_PLAN.md, STATUS.md, CLAUDE.md)
# og oppdater README med ny prosjektbeskrivelse
git add PROJECT_PLAN.md STATUS.md CLAUDE.md README.md
git commit -m "Pivot: SMART -> ankerbasert dashboard for norsk økonomi

Endrer prosjektets produktprinsipp fra modell-kryssjekk
(SMART) til ankerbasert oppdatering av offisielle prognoser.
Datalag, modeller og CI/CD beholdes; toppmotorhetten endres.
Se PROJECT_PLAN.md seksjon 0 og 11 for begrunnelse."

git tag -a v0.1.0-pivot -m "Pivot fra SMART"
git push origin main --tags

# 2. Arkivering av SMART-spesifikt materiale (egen pivot-gren)
git checkout -b pivot/arkiver-smart-dokumenter
mkdir -p docs/archive
git mv TILTAK.md docs/archive/TILTAK_smart_phase.md
git mv prosjektplan.md docs/archive/prosjektplan_smart.md
# Legg til docs/archive/README.md som forklarer arkivet
git add docs/archive/README.md
git commit -m "Arkiver SMART-fase-dokumenter til docs/archive/"
git push -u origin pivot/arkiver-smart-dokumenter
# Åpne PR, merge

# 3. Deretter: vanlig feature-grener for nytt arbeid
git checkout main
git pull
git checkout -b feature/data-katalog
# osv.
```

Dette etterlater en klar og lesbar historikk: én pivot-commit som markerer punktet, deretter ryddige feature-grener for det nye arbeidet.

---

## Til slutt

Når du er i tvil: spør. Det er bedre å bruke ett minutt på å avklare enn å bygge i feil retning i en time.

Pivoten gjør prosjektet midlertidig mer komplisert å resonnere om, fordi gammel og ny kode lever side om side. Reglene i seksjon 4 og branchstrategien i seksjon B/D er der for å redusere den friksjonen. Hvis noe i disse reglene viser seg å ikke fungere, si fra — `CLAUDE.md` skal oppdateres når arbeidsformen endrer seg, ikke holdes hellig.
