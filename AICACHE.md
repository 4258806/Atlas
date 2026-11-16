# AI Cache / Personal Fork Handoff

Public development records only. Do not add deployment addresses, identifiers, credentials or private infrastructure details. Inherited upstream logs remain in Git history; their permissions and results do not authorize or validate current work.

## 2026-11-17 Implementation in progress (M5/M6)

- User authorized the nine ordered stages in docs/implementation-plan.md. Each stage requires GitHub diff and verification evidence; acceptance precedes formal release and production deployment.
- Research PR #1 merged through the protected integration branch. Engineering branch: build/personal-pipeline. Main protection remains active with no bypass; changes use PRs.
- Official Bun 1.3.14 archive checksum and frozen dependency installation passed. Node 24.22.1. Initial production type-check/build passed. Windows test collection requires Linux python3/fcntl; this is pending CI, not a pass.
- Existing documentation formatting errors corrected without lowering lint gates.
- Stage 1: adapt CI branches and non-mutating checks; Linux helper validation; native ZIP verifier; manually triggered acceptance-gated release with immutable tags/assets and downloaded SHA256 verification.
- Manifest remains inherited 1.2.1. No own Release or runtime deployment has occurred.
- CLI credentials cannot write workflows; use the authenticated GitHub website for workflow file commits without expanding credentials. No SSH trust changes were made.
- Automatic review rejected uploading the inherited operational log. This public handoff replaces it with development-only information.
- Stage 1 passed: PR #2 merged as bb5e51e; Code Quality run 43913694261 and Visual Regression run 43913695122 succeeded. Both contexts now required on personal/main, bound to GitHub Actions app 15368. Original no-delete/no-force-push/PR rules and empty bypass list preserved.
- Stage 2 in progress on feat/node-reset-schedule: schema 2 independent IANA/fixed-offset schedule, minute UI, DST/month-end handling and conservative v1 migration. Temporal 0.5.1 and jsbi licenses bundled. Local 89 initial schedule/traffic tests and type-check passed; browser persistence validation continues.
- Native minute history retention may not cover a full month. Do not claim precise cycle usage when only cross-boundary hourly rollups remain; inspect retention/storage and resolve before production acceptance. No production writes have occurred.
- Stage 2 source committed as e41e9b5 and pushed in PR #3: https://github.com/MagnetOscar/Glassmorphism-Enhanced/pull/3. Local non-mutating lint/type-check/production build and 91 calendar/traffic tests pass. Linux quality run 43924180201 passed; full browser run 43924180191 was still pending at the last check. Local Windows browser execution reached the final test without a completion report; it is not recorded as passed.
- Native retention research resolved the design: built-in definitions default to one day. Use the four native traffic metrics with 36-day retention and nondecreasing minute/five-minute/hour tiers as documented in docs/traffic-cycles.md. No backend retention settings have been changed. Minute-edge/hour-body query planning is implemented; actual native integration and storage-growth acceptance remain pending.
- User requested permission to pause after submission. Pause after saving this handoff; do not merge an unverified feature, publish or deploy. Step 3 has only an empty branch/preparatory source reading; no finance runtime changes have been made.
- Resume at PR #3 browser CI and isolated native integration/upgrade/rollback checks, then stages 3–9 in the authorized order. Engineering stage 1 is merged; stage 2 is development code, not an accepted formal version.

## 2026-11-16 Prior work

- Public native fork and immutable baseline established, original MIT and third-party attribution preserved. Earlier independent private repository removed.
- Development/release policy documented in docs/releasing.md. Research results, limitations and evidence are in docs/feasibility-step2.md and docs/verification/step2-20261116.json.
- Research established existing FX API/cache limitations and existing experimental route helper/plugin. Fixture parsing does not prove production route accuracy; rate retrieval does not grant data redistribution rights.
- User selected the two existing FX providers, conversion only for the homepage aggregate, and native per-node currency. Runtime implementation remains pending.
