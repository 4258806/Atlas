# Personal fork implementation and acceptance

The user authorized these stages in order on 2026-11-17. Runtime changes are M5; engineering and verification are M6. Each stage has a scoped branch/PR and evidence. Unaccepted work is excluded from formal releases.

The 2026-11-17 UI constraint preserves the fork-time public layout, styles, defaults and globe/map. Client services remain client code. The user's subsequent stable **0.0.1** release instruction includes steps **1–3** together, including the already accepted administrator timezone/day/hour/minute parameter fields. Existing data positions display corrected values; required API attribution uses the existing rate-information text position. Three-network synthesis presentation requires a later discussion. See [UI preservation](ui-preservation.md).

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
- The manifest is the sole version source. The user selected `0.0.1` as the first independent stable release, superseding the earlier proposed 1.3.0. Tags use `personal-v<version>` to distinguish inherited history.
- Release is manual on `personal/main`. For 0.0.1, a committed `docs/verification/acceptance-0.0.1.json` must bind passed engineering, reset, finance, UI preservation, native integration and package checks to an exact `source_commit`, with scope `steps-1-3` and the fixed baseline. The release gate rejects unrelated runtime/default/dependency changes. Sorting, display and return-route work is excluded rather than marked passed. Other versions retain their applicable release gate. Only evidence documents/AICACHE may differ from accepted source; release notes must exist as `docs/release-notes-personal-<version>.md`.
- The workflow rechecks tests, rebuilds production after browser tests, checks ZIP paths/manifest/commit/clean state/license notices, publishes SHA256 and build metadata, then downloads the actual ZIP to verify SHA256.
- Existing tags/assets are never replaced. Failed publication/download verification needs an explicit repair record; never relabel an unverified release as accepted.

Current stage status is maintained in `AICACHE.md`; this plan does not assert completion.
