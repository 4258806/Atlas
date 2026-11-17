# Atlas 0.0.2

Updates since `atlas-v0.0.1`:

- Fix value/cost dialog borders, spacing, mobile tab/filter overlap and centered original tab icons. Icons remain available without an external icon-CDN request.
- Persist a custom three-carrier order, using drag, touch-friendly move buttons or keyboard controls.
- Select block or line Ping history in the existing card/list positions. Missing samples remain gaps.
- Independently show TCP/UDP counts in the existing summary, detail and connection charts; collection and raw history continue unchanged.

Configure the new options in Atlas management → lines/latency and save the category. Defaults preserve the old display. Native per-node currency, single-currency converted totals, and independent timezone/day/minute reset schedules remain unchanged. Map/globe and return-route collection are outside this update.

Native installation ZIP only: top level `komari-theme.json`, `preview.png`, `dist/`. Compatibility: validated against Komari Server 1.6.1. Before upgrading, retain the 0.0.1 ZIP and back up existing theme settings. Roll back by reinstalling the retained ZIP; new display fields are ignored by 0.0.1 and must be retained for a later re-upgrade. The existing Atlas identity and saved reset/finance settings remain.

Release preparation is in progress. Exact source, validation, SHA256 and preview evidence will be linked before publication. See `docs/plan-0.0.2.md`.
