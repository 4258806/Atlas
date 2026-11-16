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
- Remaining: finish stage 2 verification, then stages 3–9 in order.

## 2026-11-16 Prior work

- Public native fork and immutable baseline established, original MIT and third-party attribution preserved. Earlier independent private repository removed.
- Development/release policy documented in docs/releasing.md. Research results, limitations and evidence are in docs/feasibility-step2.md and docs/verification/step2-20261116.json.
- Research established existing FX API/cache limitations and existing experimental route helper/plugin. Fixture parsing does not prove production route accuracy; rate retrieval does not grant data redistribution rights.
- User selected the two existing FX providers, conversion only for the homepage aggregate, and native per-node currency. Runtime implementation remains pending.
