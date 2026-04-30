# src/dashboard/

Backend-side cache-bygger for Aksel-frontenden. Implementeres i Fase 4.

## Forskjell fra dashboard-aksel/

- `dashboard-aksel/` er Next.js + Aksel **frontend-koden**.
- `src/dashboard/` er **Python-siden** som bygger en JSON-cache som
  frontenden leser ved build-time. Dette er nødvendig fordi
  frontenden eksporteres statisk til GitHub Pages og ikke kan kalle
  Python-koden direkte.

## Forventet flyt

```
Pipeline (ukentlig)
   v
data/processed/ (Parquet)
   v
src/anchors/ + src/news/ + src/models/ produserer revidert anslag
   v
src/dashboard/cache_builder.py  --->  dashboard-aksel/public/data/*.json
   v
Next.js statisk bygg leser JSON-filene
   v
GitHub Pages serverer statisk site
```

## Status

Ikke startet.
