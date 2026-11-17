# Fork UI preservation

The user's 2026-11-17 correction takes precedence over earlier feature and UI plans.

- Reference: original fork baseline `0332d5f7c73f7994ba21c01e4b739d04835120b1` (`baseline/v1.2.1`). Preserve its layout, styles, visual attributes, defaults, globe/map components and assets.
- Development scope is backend parameters and features. Do not add frontend controls, redesign panels, change sizes/spacing/colors/icons, or modify the original rendering choices. Existing positions may display corrected business data without a new layout or extra currency badges.
- A future three-network synthesis display may be considered only after explicit discussion, using exactly the existing UI form. It is not authorized now. Earlier drag-order and display-toggle plans are suspended.
- This repository builds a Vue theme. Its services, composables and calculations execute on the client; they are not the Komari Server backend. A real server implementation needs the relevant backend source and a separately defined implementation scope.

## Corrective rollback

The globe/map source, CSS, image assets and manifest defaults already matched the fixed fork baseline. Do not replace them with an older or different upstream theme. The changed tiled-home screenshot did not prove that the map renderer itself had changed.

Restore the original header wrapper/grid and currency-unit presentation, remove the extra attribution row, restore the inherited day-only reset editor and its presentation, and restore the original tiled-home screenshot reference. Keep business computations and existing data slots; the change does not clear saved schedules, prices, currency choices or history. Day edits preserve the existing zone/hour/minute/second and other schedule fields. The original schedule display remains in Asia/Shanghai as in the fork UI.

The native finance calculations, FX validation and calendar schema remain client-side logic from the preceding milestones. Their prior acceptance is historical. The removed timezone/time editor and attribution-row tests are replaced by tests that verify their absence and preservation of saved configuration; they must not be reported as current UI capabilities. The native integration runner now writes a schedule through the official backend settings API, then verifies that the original day-only UI preserves its timezone/minute and other fields on desktop/mobile. This is configuration compatibility, not a claim of new server-side schedule calculation.

Source attribution/status uses the inherited finance tooltip and existing rate-source text position; no extra header row. The unchanged public source and third-party notices remain available in the repository. This corrective branch is not a formal release, and no production settings are changed.

## Verification

The unit suite compares inherited Vue element structure, static visual attributes, bound visual properties, styles, layout helpers, protected assets/defaults and screenshot baselines against the exact baseline. Dynamic business bindings and text values are not treated as layout redesign. Desktop/mobile browser regression still runs with the original thresholds.

Any later UI exception must be explicitly agreed with the user and recorded before changing these checks. Do not update screenshot references merely to legitimize a new layout.
