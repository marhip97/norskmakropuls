# CLAUDE.md

Dette dokumentet er instruks til Claude Code når den arbeider i dette repoet. Det er ikke en prosjektplan — den ligger i `PROJECT_PLAN.md`. Det er ikke en statusrapport — den ligger i `STATUS.md`. Det er en oppskrift på hvordan vi arbeider her.

norskmakropuls er etterfølger til prosjektet SMART. Datalaget, testene og infrastrukturen er hentet fra SMART; produktprinsippet og frontenden er nytt. Ved spørsmål om bakgrunn, se `PROJECT_PLAN.md` seksjon 0 og 11.

Ved konflikt: brukerens eksplisitte instruks i en samtale vinner alltid over dette dokumentet. Men i fravær av annen instruks gjelder reglene under.

---

## 1. Først, hver økt

Før du gjør noe annet:

1. Les `STATUS.md`. Det forteller hvor prosjektet er nå.
2. Les `PROJECT_PLAN.md` seksjonen som er relevant for oppgaven.
3. Hvis oppgaven berører datakilder, parsere eller modeller: les relevant del av `docs/SPEC.md`.
4. Hvis du er usikker på hva som er gjort: spør brukeren før du begynner. Ikke gjett.

Avslutt aldri en arbeidsøkt uten å foreslå en oppdatering av `STATUS.md`.

## 2. Språk og kommunikasjon

- Repoet, kode, dokumentasjon og dashboard er på norsk bokmål. Variabel- og funksjonsnavn i koden er på engelsk (standard programmeringsspråk-norm).
- Commit-meldinger skrives på norsk eller engelsk, men konsekvent i samme repo. Vi bruker norsk.
- Ingen emojis i kode, kommentarer, commit-meldinger eller dokumentasjon.
- Forklar pedagogisk i dialog hva du gjør og hvorfor, særlig når du tar beslutninger med konsekvenser senere i prosjektet.

## 3. Kjøreregel som overstyrer alt annet

> Første versjon skal være datamessig robust, forklarbar og smal. Modellkompleksitet kan økes etter at automatisert datagrunnlag, ankerbane-håndtering og news-motor fungerer.

Hvis en endring øker omfang eller modellkompleksitet før ankerbane-laget er stabilt — stopp og spør.

## 4. Repostruktur

Forventet katalogstruktur:

```
.
├── PROJECT_PLAN.md
├── STATUS.md
├── CLAUDE.md
├── README.md
├── data_catalog.yaml             # maskinlesbar kildekatalog
├── docs/
│   ├── SPEC.md
│   ├── data-sources.md
│   ├── data_source_validation_report.md
│   ├── decisions/                # ADR-stil beslutningslogg
│   └── archive/                  # arkivert materiale
├── config/
│   └── variables.yaml            # arvet fra SMART
├── src/
│   ├── data/                     # arvet fra SMART, uendret
│   ├── anchors/                  # ankerprognose-håndtering
│   ├── news/                     # news-motor
│   └── models/                   # nye revisjonsmodeller (skygge, komponent, NAV-til-AKU)
├── tests/                        # arvet fra SMART + nye tester
├── data/
│   ├── raw/                      # rådata med vintage
│   ├── anchors/                  # ankerprognoser med vintage
│   └── processed/                # kuraterte datasett
├── dashboard-aksel/              # Next.js + Aksel
├── scripts/
└── .github/workflows/
```

## 5. Datakatalog først

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

## 6. Standard datamodell

Alle tidsserier normaliseres til skjemaet i `docs/SPEC.md` seksjon 5.3. Minimumsfelter per observasjon: `date`, `vintage_date`, `ingestion_time`, `source`, `series_id`, `value`, `status`.

Rådata lagres uendret i `data/raw/<source>/<series_id>/<vintage>.{json|csv|xlsx}`. Kuraterte data lagres som Parquet i `data/processed/`.

## 7. Vintage-håndtering er obligatorisk

Hver innhenting lagrer:

- `observation_date` (datoen verdien gjelder for)
- `publication_date` (når kilden publiserte den)
- `ingestion_time` (når vi hentet den)
- `vintage_id` (entydig id for innhentingsversjonen)
- `source_revision_id` der mulig

Dette gjelder **også for ankerprognoser** lagret i `data/anchors/`. En MPR-bane fra mars og en fra juni er to forskjellige objekter, ikke en oppdatering av samme objekt. News-motoren må vite hvilket anker den sammenligner mot.

## 8. Kildeklassifisering før produksjon

Ny variabel går aldri rett til produksjon. Veien er:

1. **Discovery**: hent metadata, valider dimensjoner, test-fetches.
2. **Lagre responskontrakt**: lagre eksempel på rårespons under `tests/fixtures/`.
3. **Klassifiser**: sett status i `data_catalog.yaml` (`A_PROD`, `B_TEST`, ...).
4. **Implementer extractor og validering**.
5. **Oppdater `STATUS.md`** med faktisk status og verifiseringsdato.

Hopp aldri over discovery-steget med begrunnelsen "jeg tror tabellen heter X". Vi gjetter ikke SSB-tabeller, Norges Bank series keys eller FRED series IDs.

## 9. MVP-grenser

Disse er **utenfor MVP** og skal ikke implementeres uten eksplisitt brukerbeslutning:

- Norges Bank MPR-XLSX-parser (vurderes i fase 4)
- IEA, EIA, ENTSO-E, Nord Pool
- Eiendom Norge uten lisensavklaring
- PMI uten åpent API
- Consensus Economics eller andre betalte kilder
- PDF-scraping som primærpipeline
- Finansdepartementets prognoser som kritisk feed

Hvis du blir bedt om noe i denne listen: påpek at det er utenfor MVP-grensene og bekreft før du fortsetter.

## 10. Test før commit

- Hver extractor skal ha en test som kjører mot en fixture (ikke nettverket).
- Hver pipeline-transformasjon skal ha en test på normalisert format.
- Skjemavalidering skal feile kontrollert ved strukturendring i kilden, ikke stille.
- Kjør `pytest` og `ruff check src/ tests/` før du foreslår commit.

## 11. Forholdet til SMART-arven

Datalaget i `src/data/` er hentet uendret fra SMART. Ikke refaktorer det uten grunn — det er modent og dekket av tester.

SMART-modellene (ARIMA, VAR, BVAR, DFM, AR-X, ML-baseline) er **ikke** kopiert inn ennå. De hentes i Fase 5 som kryssjekk mot ankerbanen. Hvis du blir bedt om å implementere dem tidligere: påpek at det er utenfor gjeldende fase.

## 12. Hva du IKKE skal gjøre uten å spørre

- Endre `PROJECT_PLAN.md` (det er en strategisk beslutning).
- Refaktorere SMART-arven i `src/data/` uten konkret grunn.
- Legge til nye datakilder utenfor MVP.
- Bytte ut grunnleggende avhengigheter (Python-versjon, Next.js, Aksel).
- Slette historikk eller gjøre force-push på `main`.
- Skrive til `data/raw/` med modifisert innhold — rådata er uendret per definisjon.
- Begynne på modellbygging før ankerbane-laget er stabilt.
- Hente SMART-modellene før Fase 5 starter.

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
- `feature/<kort-beskrivelse>`: en gren per oppgave eller funksjon. Eksempel: `feature/data-katalog`, `feature/anchor-storage`, `feature/aksel-makropuls`.
- `fix/<kort-beskrivelse>`: småfiks.
- `experiment/<kort-beskrivelse>`: utforskning som kanskje aldri merges. Lov å forkaste.

Regel: én oppgave = én gren = én pull request. Ikke samle ti urelaterte endringer i samme PR.

## C. Standard arbeidsflyt for én oppgave

```
# 1. Sørg for at du er på main og at main er oppdatert
git checkout main
git pull

# 2. Lag en ny gren for oppgaven
git checkout -b feature/data-katalog

# 3. Gjør jobben. Commit ofte og smått.
git add data_catalog.yaml
git commit -m "Legg til datakatalog for 12 SMART-arvede variabler"

# 4. Push grenen til GitHub
git push -u origin feature/data-katalog

# 5. Åpne pull request på GitHub. Be om review (eller selv-review).

# 6. Når PR er godkjent og merget, oppdater lokalt:
git checkout main
git pull
git branch -d feature/data-katalog
```

`-u origin feature/data-katalog` første gang gjør at senere `git push` og `git pull` på den grenen vet hvor de skal.

## D. Commit-meldinger

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

## E. Hva commiter vi, hva commiter vi ikke

**Commit:**
- All kildekode
- Konfigurasjonsfiler (`pyproject.toml`, `package.json`, `tsconfig.json`, ...)
- Dokumentasjon (`*.md`)
- `data_catalog.yaml`
- Test-fixtures (små eksempler på rårespons)
- Datavintager i `data/raw/` (følger eksisterende SMART-praksis — pipeline committer)

**Commit ikke:**
- Hemmeligheter (API-nøkler, passord, tokens)
- Lokale miljøvariabler (`.env`)
- Genererte artefakter (`__pycache__/`, `node_modules/`, `dist/`, `.next/`)
- IDE-spesifikke filer (`.vscode/`, `.idea/`) med mindre teamet er enig

Repoet har en `.gitignore` som dekker dette. Hvis en hemmelighet noensinne blir committet ved uhell: stopp og varsle brukeren umiddelbart. Det krever historikk-rensing og rotering av nøkkelen.

## F. Pull requests

Når du åpner en PR:

1. Tittel: samme stil som commit-melding.
2. Beskrivelse:
   - **Hva**: kort om endringen.
   - **Hvorfor**: kobling til oppgave eller status.
   - **Test**: hvordan kan man verifisere at det virker?
   - **Risiko**: hva kan gå galt?
3. Hvis PR endrer datakatalog eller introduserer ny kilde, koble eksplisitt til klassifiseringen (`A_PROD`, `B_TEST`, ...).
4. Hold PR-en så liten som mulig. Helst under 400 endrede linjer. Store PR-er får ikke skikkelig review.

## G. Holde grenen oppdatert

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

## H. Når noe går galt

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

## I. Initiell push av norskmakropuls

For å pushe denne pakken til det nye GitHub-repoet:

```
# 1. Pakk ut zipen i en lokal mappe
cd /sti/til/utpakket-norskmakropuls

# 2. Initialiser Git
git init
git branch -M main

# 3. Legg til alle filer og lag initial commit
git add .
git commit -m "Initial commit: norskmakropuls, etterfølger til SMART

Datalaget, testene og CI/CD er hentet fra SMART-repoet.
SMART-modellene hentes inn senere i Fase 5 som kryssjekk
mot ankerbanen. Se PROJECT_PLAN.md for full plan."

# 4. Koble til GitHub-repoet
git remote add origin https://github.com/<ditt-brukernavn>/norskmakropuls.git

# 5. Push
git push -u origin main

# 6. Sett første tag
git tag -a v0.1.0 -m "Initial release: datalag arvet fra SMART"
git push origin v0.1.0
```

## J. Tagger og versjoner

Etter initiell push tagges hver milepæl etter ankerbane-fasene:

```
git tag -a v0.2.0 -m "Fase 2 ferdig: ankerbane-infrastruktur"
git tag -a v1.0.0 -m "MVP fullført: ankerbasert dashboard live"
```

Tagger er udelelige peker til en commit. De brukes til å markere stabile versjoner og kunne sjekke ut nøyaktig den koden senere.

## K. GitHub-spesifikke ting

- **Issues**: én per konkret oppgave. Lenkes fra PR-er med `Closes #12`.
- **Branch protection** på `main`: krev minst én review og at tester passerer. Anbefales aktivert tidlig.
- **Actions**: kjører tester og data-pipeline automatisk. Aktiveres ved første push.
- **Secrets**: API-nøkler hører hjemme i GitHub Actions secrets eller en miljøvariabelfil som ikke committes. Aldri i kode.

## L. Rytmen vi anbefaler

Daglig:

1. Start med `git pull` på `main`.
2. Lag eller bytt til feature-gren.
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

---

## Til slutt

Når du er i tvil: spør. Det er bedre å bruke ett minutt på å avklare enn å bygge i feil retning i en time.
