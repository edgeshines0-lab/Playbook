# Edge Shines Holiday Lighting Sales Studio

A single-file React app (published as a Claude artifact) that takes a phone rep from the first hello to a
priced, customer-ready estimate and a FLYRA handoff.

- `edge-shines-sales-assistant.html` — the built app (publish this file).
- `studio/src/` — React source (JSX, bundled with esbuild; React 18.3.1 loads from cdnjs).
- `studio/data/workbook.json` — every tab of the sales playbook workbook, extracted verbatim.
- `studio/data/flyra.json` — snapshot of the FLYRA holiday-lighting price book, lead sources and the
  “Annual Holiday Light Service Plan - 3 Years” terms (retrieved 2026-11-15).

## Build

```
cd studio && npm install && node build.mjs
```

After the workbook changes, refresh its data first:

```
python3 -I studio/extract.py path/to/Edge_Shines_Sales_Playbook.xlsx studio/data/workbook.json
```

The extractor reads fixed cell ranges per tab; if rows move in the workbook, update `studio/extract.py`.

## What it uses from the platform

- **Shared storage (`db`)**: quotes (`leads/*`, Contributors and up) and owner pricing (`config/settings`,
  owner and editors only). Without it, the app saves on the device.
- **Viewer identity (`user`)**: rep names on quotes and in scripts. No separate login.
- **Downloads**: PDF estimates, CSV export and JSON backups.
- **Ask Claude (`sample`)**: Claude picks matching knowledge-base entries; the app shows only their own wording.

Photos and screenshots stay in the browser that added them (IndexedDB).

## Pricing rules

Only 3-year agreements are offered. Rates start from the workbook reference; FLYRA price-book rates are one
click away in Pricing & Settings. Nothing counts toward a Verified quote until the owner approves it, tax is
off until configured, and wreath and garland prices come from FLYRA.
