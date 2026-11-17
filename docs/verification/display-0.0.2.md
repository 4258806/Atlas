# Atlas 0.0.2 display verification

Scope: PR #10 finance dialog + carrier ordering + display options. No production changes or new collectors. See `docs/plan-0.0.2.md` for controls and defaults.

Local evidence on Windows: non-mutating lint/type-check; 204 reset/finance/UI/settings/display unit checks; seven release-scope negative cases; ten new display browser cases plus all twelve finance browser cases. They exercise desktop drag, mobile move controls, repeat keyboard movement/focus, refresh persistence, unknown-field/reset preservation, valid/invalid carrier permutations, null gaps/real zero in line mode, list history, all four TCP/UDP combinations, light/dark, desktop/mobile layouts and native-node/converted-summary currency behavior. Preview images under `docs/previews/0.0.2/` are synthetic fixtures, not production network/billing measurements.

Release preparation still requires exact clean candidate installation, real native-settings persistence and upgrade/rollback on isolated Komari 1.6.1, complete GitHub checks and ZIP/checksum verification. These pending checks must not be represented as passed. Current release version is not published.

First complete CI attempt: quality passed all 426 cases; visual run 44082368906 passed 236 cases and failed the legacy management form's broad `getByRole('status')` selector because the new carrier-order editor also exposes an accessible live status. Native saving succeeded. Scope that assertion to the original save-confirmation text; retain both status announcements and all assertions. A complete final-source rerun is required. Exact final acceptance is recorded in the separate release-candidate report; this initial failure is not suppressed or counted as passed.
