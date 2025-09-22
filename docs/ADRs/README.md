# ADRs — Architecture Decision Records

Questa cartella raccoglie le decisioni architetturali rilevanti per il progetto.

Formato suggerito per ogni ADR:

- Titolo
- Contesto
- Decisione
- Conseguenze (pro/contro)
- Alternative considerate
- Stato (Proposta | Accettata | Deprecata)

Esempio file: `docs/ADRs/0001-doppia-modalita-mappa.md`

```md
# 0001 — Doppia modalità mappa (Google Maps e MapLibre)

## Contesto
Dataset variabili (da centinaia a decine di migliaia di marker), necessità di UX avanzata e performance.

## Decisione
- Modalità "complessa" con Google Maps per interazioni ricche e marker React custom.
- Modalità "semplice" con MapLibre per dataset molto grandi con rendering geojson efficiente.

## Conseguenze
+ Scalabilità e UX adeguata ai volumi
- Maggiore complessità di codice e manutenzione doppia pipeline

## Alternative
- Solo Google Maps
- Solo MapLibre

## Stato
Accettata
```
