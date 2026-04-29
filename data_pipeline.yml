# src/models/

Revisjonsmodeller. Implementeres i Fase 3 og utvides i Fase 5.

## Modellroller

Modellene her har én av to roller:

1. **Revisjonsmodeller (Fase 3)** — driver "Oppdatert anslag = anker + revisjon".
   - `shadow_rate.py`: skyggerentebane, lineær revisjonsmodell (SPEC.md seksjon 8.2)
   - `inflation_components.py`: komponentmodell for KPI-JAE
   - `nav_to_aku.py`: bro fra NAV-ledighet til AKU-ledighet (NAV publiserer raskere)

2. **Kryssjekkmodeller (Fase 5, hentes fra SMART)** — uavhengig forecast som
   sammenliknes med ankerbanen for å vise modellsprik.
   - `arima.py`, `var.py`, `bvar.py`, `dfm.py`, `arx.py`, `ml_baseline.py`

## Hvorfor todelt struktur

I SMART-rammeverket var "modellsprik" hovedsignalet. I norskmakropuls
er **ankerbanen** hovedproduktet, og modellsprik er en kvalitetssjekk
i bakgrunnen. Det betyr:

- Revisjonsmodellene må være pedagogisk forklarbare og koblet direkte
  til news-tidsserier. Hvis en revisjon flytter renteanslaget, skal
  brukeren kunne se hvilke news som drev endringen.
- Kryssjekkmodellene kan være mer kompliserte (BVAR, DFM) — de skal
  ikke forklares i detalj på dashboardet, bare brukes som sanity check.

## Hva er IKKE her ennå

SMART-modellene (arima, var, bvar, dfm, arx, ml_baseline) er **ikke**
kopiert inn enda. De ligger i SMART-repoet og hentes hit i Fase 5.
Dette er en bevisst beslutning — å holde norskmakropuls rent og
fokusert mens ankerbanen bygges.

## Status

Ikke startet. Mappen er reservert.
