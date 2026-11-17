# Personal fork implementation and acceptance

The user authorized these stages in order on 2026-11-17. Runtime changes are M5; engineering and verification are M6. Each stage has a scoped branch/PR and evidence. Unaccepted work is excluded from formal releases.

The later 2026-11-17 UI constraint takes precedence: preserve the fork-time frontend layout, styles, defaults and globe/map. Backend parameters/features only; client services are not the server backend. Existing data positions may display corrected values. No new frontend controls. Three-network synthesis presentation requires a later explicit discussion and must reuse the original UI form. See [UI preservation](ui-preservation.md).

1. Engineering: non-mutating lint, Linux unit/helper tests, browser regression, clean-source native ZIP validation and guarded manual release.
2. Node reset schedules: timezone/day/hour/minute, DST and month-end rules, migration without deleting traffic history.
3. Finance: native node currencies; support multiple currencies but display only one selected currency in the home aggregate; validated, attributed, fresh FX sources. No simultaneous extra-currency UI.
4. Carrier ordering: suspended under the later UI constraint; no drag handles, keyboard/touch UI or new controls are currently authorized.
5. Display: suspended under the later UI constraint; no blocks/sparklines or TCP/UDP presentation changes are currently authorized.
6. Return routes: audit existing opt-in helper/plugin; verify targets/ASN and measured DMIT trial before rollout.
7. Acceptance: desktop/mobile, persisted settings, boundary cases, actual theme install/upgrade/rollback.
8. Release: independent version/tag, native ZIP, SHA256, source and acceptance links, downloaded asset verification.
9. Production: CA theme update with rollback, existing layout and Cloudflare protection, staged eleven-node acceptance.

## Engineering contract

- `personal/main` is the protected integration branch. Development uses `build/*`, `feat/*` or `fix/*` branches and PRs. Keep `baseline/v1.2.1` unchanged.
- Node 24 and Bun 1.3.14; install with the committed lockfile. CI checks code without fixing it.
- Quality and browser jobs run for PRs and pushes to `personal/main`. Candidate ZIP artifacts are temporary validation outputs, not public Releases.
- The manifest is the sole version source. First own feature version is planned as `1.3.0`; prereleases use `1.3.0-rc.1` etc. Own tags use `personal-v<version>` to distinguish inherited history.
- Release is manual on `personal/main`. It requires a committed `docs/verification/acceptance-<version>.json` with `status: passed`, exact accepted `source_commit`, and passed checks/evidence for reset, finance, sorting, display, return-route and integration. Only evidence documents/AICACHE may differ from the accepted source. Release notes must exist as `docs/release-notes-personal-<version>.md`.
- The workflow rechecks tests, rebuilds production after browser tests, checks ZIP paths/manifest/commit/clean state/license notices, publishes SHA256 and build metadata, then downloads the actual ZIP to verify SHA256.
- Existing tags/assets are never replaced. Failed publication/download verification needs an explicit repair record; never relabel an unverified release as accepted.

Current stage status is maintained in `AICACHE.md`; this plan does not assert completion.
