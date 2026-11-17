# Homepage TCP/UDP tile verification

User authorization (2026-11-17): extend the homepage node card below the existing three mini metric tiles. The new fourth tile occupies the first column of a second row and reuses the original individual tile width, padding, rounded glass background and text sizing. No empty placeholder tiles or unrelated features are added.

The existing `showTcpConnections` and `showUdpConnections` settings control the two rows independently. Both off removes the entire tile and second row. One protocol retains the original tile height. Values use the same reactive node counters as the detail page; no additional request, collector, setting, currency calculation or reset operation is introduced. Zero remains zero; absent/invalid/offline values are unavailable (`—`). Large counts retain their full value in the title while clipping within the tile.

Local Windows verification:

- Non-mutating lint, TypeScript checking and production build passed. The local development build is not a formal Release or production installation.
- 81 focused unit/contract cases passed. The original 0.0.2 presentation contract still checks every existing element after removing only the marked new tile; a separate contract pins the complete extended presentation. No original contract hashes, screenshot references or tolerances were changed.
- Twelve new browser cases passed their assertions: desktop/mobile and light/dark, exact tile geometry and unchanged first row, all four TCP/UDP combinations and refresh, mini/compact/comfortable/large sizes, live updates, true zero, missing/invalid values, offline transition and large counts.
- Existing baseline screenshots compare inherited UI with only the newly authorized tile hidden during screenshot capture. The new tile remains visible and is measured in the dedicated browser cases and previews.
- All 55 related browser cases passed in a normal-network run, including the inherited homepage/detail screenshots and existing step 4/5 controls. The initial sandbox run passed 54 and failed the existing no-Ping console check solely on `ERR_NETWORK_ACCESS_DENIED` while loading public resources; no assertion/threshold was weakened. The preview follow-up waits for the existing CPU icon and synthetic carrier history; all 12 dedicated cases passed again.
- The full local unit command cannot collect the inherited helper fixtures because this Windows PATH has no `python3`. Do not claim that command passed; complete Linux CI is required for the review head.

Synthetic previews: [desktop dark](../previews/home-connections/1440-dark.png), [desktop light](../previews/home-connections/1440-light.png), [mobile dark](../previews/home-connections/390-dark.png), [mobile light](../previews/home-connections/390-light.png). These are fixture data, not live production/network/billing measurements.

Review: [PR #14](https://github.com/MagnetOscar/Atlas/pull/14). Complete Linux Code Quality and Visual Regression must pass on the final review head before merge. Scope is a development PR. Atlas v0.0.2 and its published tags/assets remain unchanged. No new Release, version selection or production replacement is included. No production write was performed for this feature.
