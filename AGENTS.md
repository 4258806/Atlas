# AGENTS.md

Root-scope guide for the personal public fork **Atlas** (`MagnetOscar/Atlas`).

## Mandatory development and release policy

- Latest Atlas v0.0.4 authorization (2026-11-18): compare the user-supplied TcpQuality report with the current collector, integrate/replace the route collector with pinned upstream TcpQuality if feasible, and run only three-carrier IPv4/IPv6, UDP return-route and IPv4 large-packet tests on the existing trial node. No speed tests, international/education tests, ranking/report upload or automatic recurring rollout. Missing IPv6 connectivity must be reported, not fabricated or enabled by changing networking. Match the supplied image's three-row return-route glass panel while preserving surrounding layout, globe/maps, finance/reset behavior and saved carrier order. Publish Atlas v0.0.4 only after appropriate native, parser/security, responsive UI and package checks. Keep TcpQuality's GPL source/notices separate from the MIT theme and use a separate process/package. Existing native per-node auth and the three approved Agent POST paths remain the transport boundary; no extra public gateway paths.
- User clarified v0.0.4 deployment: TcpQuality is a Komari attachment, using the existing CA stack/komari and data/komari layout and the native Komari plugin lifecycle. Do not create an independent service/daemon, systemd unit/timer, listener or sidecar server. The node-side test is a bounded foreground invocation of the attachment under the existing Agent's attachment directories; CA manages/stores results, while DMIT-origin probes execute on DMIT. Separate GPL process/package does not mean a separate service. Preserve the inactive 0.0.3 helper as rollback, without starting it.
- User subsequently explicitly authorizes hourly automatic collection, initially DMIT only. Reuse the existing cron scheduler to invoke the attachment; native authenticated poll leases enforce a 60-minute start interval and prevent overlapping/replayed work. A minute cron tick only checks for due work; it does not probe every minute. Do not enroll the other ten nodes. No new TcpQuality daemon, service, systemd unit/timer or public endpoint.

- Latest 0.0.3 authorization: implement the homepage return-route tile to the right of TCP/UDP on row two, spanning two original columns; install the backend plugin on CA and Helper on DMIT, perform one bounded real DMIT round, verify native Komari 1.6.1 integration and publish Atlas v0.0.3 with native theme ZIP, companion packages/checksums and evidence. This supersedes previous exclusions for this exact scope. Use existing OpenSSH aliases, private backups and supported native APIs; preserve other services, Cloudflare protections, other ten nodes, reset/finance semantics, maps/globe and previous releases. Public homepage may consume a sanitized opt-in ASN summary; full raw evidence remains administrator-only. Do not claim unknown/partial paths as certified commercial routes; do not start repeated probes when one round was requested.

- Latest homepage-card instruction (2026-11-17): add one TCP/UDP mini tile below the existing three metric tiles, at the same single-column width and glass styling. Reuse existing showTcpConnections/showUdpConnections preferences and live counters; both disabled hides the extra row. This explicitly permits that narrow NodeCard presentation addition. Preserve the first three tiles, other UI, maps/globe, collection, currency/reset semantics and published assets; no Release or production deployment is authorized by this request.

- Latest Release-page instruction (2026-11-17): remove only the pre-rename duplicate `personal-v0.0.1` Release and its attached historical build from the public Release list. Retain its Git tag/source history and local archive. Keep the two formal Atlas releases and their tags/assets unchanged. Release display titles and future versioned material headings use `Atlas v<version>` (for example, `Atlas v0.0.2`); tags remain `atlas-v<version>`, manifest versions stay numeric and native ZIP filenames retain their build-SHA contract. This supersedes the earlier requirement to keep the pre-rename Release downloadable.

- Latest 2026-11-17 authorization: prepare 0.0.2 after implementing PR #10 finance-dialog repairs, carrier drag ordering with persistence, blocks/line display selection and TCP/UDP count visibility. Generate desktop/mobile previews before release preparation. These are narrow exceptions to the UI freeze; preserve maps/globe and unrelated layout, reset/finance data, original defaults when new settings are absent. Return-route collection and production deployment remain excluded.

- Atlas branding authorization (2026-11-17): after checking the official theme market, the user explicitly requests the Atlas project/repository/ZIP name and all visible theme labels, including `Theme by Atlas`. This permits those exact text/metadata/link changes and source-symbol renames, not layout/style/rendering changes. Preserve MIT/upstream notices and historical evidence. Use `short: Atlas` for the current theme. An authenticated, conditional native configuration migration may read old `Enhanced` settings and fill an absent/empty Atlas row; it must not overwrite existing Atlas settings or alter/delete the legacy row. Optional companion protocol IDs stay compatible. Publish a fresh `atlas-v0.0.1` build with provenance; update the earlier release display to Atlas and retain its original tag/assets as history.
- User constraint (2026-11-17): preserve the fork-time frontend UI from `baseline/v1.2.1` (`0332d5f7c73f7994ba21c01e4b739d04835120b1`). Do not redesign layouts, styles, defaults, visual attributes, globe/map rendering, or add frontend controls. Backend parameters/features are the development scope; necessary data bindings use existing UI positions without changing presentation. Theme services/composables are client code, not the Komari Server backend.
- Only a future, explicitly discussed three-network synthesis display may extend the UI, using exactly the existing UI form. This is not current authorization. Earlier step 4/5 UI plans and passed UI tests do not override this constraint. See `docs/ui-preservation.md`.
- Later release authorization (2026-11-17): publish independent stable `0.0.1`, covering steps 1–3 together. Preserve the complete independent-reset logic and its timezone/day/hour/minute administrator fields; include native-node/single-summary-currency finance. Administrative parameter editing and required API credit in the existing rate-source text position are part of this scope; public layout, globe/map and defaults remain fixed. Do not develop steps 4–6 or deploy production; the user will upload the ZIP.
- The user's GitHub fork is the authoritative source. Every delivered change must have a pushed commit and a reviewable GitHub diff; local or production-only patches are not completed updates.
- Preserve `baseline/v1.2.1` at `0332d5f7c73f7994ba21c01e4b739d04835120b1`. The development branch is `personal/main`; all other upstream repositories are read-only.
- Read and follow [docs/releasing.md](docs/releasing.md) before development, acceptance, packaging, release or deployment. It is this fork's current policy; inherited upstream logs and old release approvals are historical evidence, not present authorization.
- Each formal software version needs its own version, tag, GitHub Release, installable native theme ZIP, SHA256 and linked source/validation records. Retain previous versions; never silently overwrite published tags or assets.
- Validate appropriate functionality, integration, upgrade/rollback and documentation before release. Distinguish fixtures, local checks, real server acceptance and actual downloaded release verification.
- Preserve authorship, MIT and third-party notices. Publish reusable source and installation guidance, with no credentials or private deployment data.
- Changes to feature code, release automation and production deployment require the applicable user task scope. This policy alone does not authorize those actions, and existing explicit authorization does not need repeated confirmation.
- Documentation-only updates do not require a fabricated software version or release. The fork's first independent software version is `0.0.1`, tag `personal-v0.0.1`; upstream baseline remains `1.2.1` at the fixed original commit.

For the complete AI/developer manual, read [AIAGENTREADME.md](AIAGENTREADME.md). For persistent task handoff and progress tracking, read and update [AICACHE.md](AICACHE.md).

## Snapshot

- Updated: 2026-11-16
- Branch: `personal/main`
- App: Vue 3 + Vite + reka-ui + Tailwind CSS v4 theme for Komari Monitor
- Package manager: `bun` >= 1.2
- Theme manifest and version source: [komari-theme.json](komari-theme.json)

## Required workflow for agents

1. Read [AIAGENTREADME.md](AIAGENTREADME.md).
2. Read [docs/releasing.md](docs/releasing.md), then [AICACHE.md](AICACHE.md), and preserve/update useful handoff notes.
3. Check the nearest scoped `AGENTS.md`; [src/AGENTS.md](src/AGENTS.md) overrides this file for app source.
4. Before broad edits, identify the milestone class:
   - M2 performance only
   - M3 security/permissions only
   - M4 UI/UX only
   - M5 new feature
   - M6 docs/tests/DX
5. For multi-file or interruptible work, record plan/progress/results in [AICACHE.md](AICACHE.md).
6. Validate with `bun run lint` and `bun run build` unless the change is docs-only or you explicitly record why validation was skipped.

## What this repo builds

This repository builds a Komari theme package, not a generic deployed web app.

Release contract:

- `bun run build` must output `dist/` and `komari-theme-Atlas-build-<short-sha>.zip`.
- Zip layout must stay: `komari-theme.json`, `preview.png`, `dist/`.
- Packaged `preview.png` comes from [docs/preview.png](docs/preview.png).
- Do not rename [komari-theme.json](komari-theme.json), [docs/preview.png](docs/preview.png), or the zip pattern.

## Commands

Run from repo root only:

```bash
bun run dev
bun run lint
bun run build
bun run preview
```

Playwright tests exist: run `bun run test:visual` (includes deterministic transit tests and visual regression). Also run `bun run type-check`. Do not invent `bun test` / Vitest commands.

## Root map

- [AIAGENTREADME.md](AIAGENTREADME.md) — full AI/developer guide, architecture, development paths.
- [AICACHE.md](AICACHE.md) — persistent AI work cache and handoff log.
- [src/](src/) — Vue app source.
- [src/AGENTS.md](src/AGENTS.md) — source-tree agent rules.
- [docs/](docs/) — architecture, auth, cache, data flow, migration, milestones.
- [public/images/](public/images/) — runtime image contract.
- [.github/workflows/release-on-version-bump.yml](.github/workflows/release-on-version-bump.yml) — release automation.
- [vite.config.ts](vite.config.ts) — Vite config, build constants, manual chunks, zip packaging.
- [package.json](package.json) — bun scripts and dependencies; intentionally no top-level `version`.

## Architecture anchor

New app code must follow:

```text
Component -> Composable -> Service -> RequestManager / CacheService -> API / RPC
```

Detailed rules are in [AIAGENTREADME.md](AIAGENTREADME.md) and [src/AGENTS.md](src/AGENTS.md).

Quick placement guide:

- UI and view orchestration: `src/components/`, `src/views/`
- Vue lifecycle/reactive glue: `src/composables/`
- Business/infrastructure logic: `src/services/`
- Shared constants: `src/constants/`
- Pure helpers: `src/utils/`
- Global app state: `src/stores/`
- Low-level transport: `src/utils/api.ts`, `src/utils/rpc.ts`, `src/utils/init.ts`

## Safeguards

- [komari-theme.json](komari-theme.json) is the only release-version source; do not add `package.json.version`.
- Default node card size must remain `compact`; `mini` is optional.
- Realtime node metrics must update without page refresh; node indexes must point to Vue-reactive node objects.
- Public home/detail routes stay public; sensitive actions/data paths perform permission checks instead of router guards.
- Do not bypass service/cache/request layers with component-local business logic.
- Do not reintroduce Naive UI, UnoCSS, SCSS, `lucide-vue-next`, or extra icon component packages.
- Runtime filenames under [public/images/](public/images/) are code contracts.
- GitHub Release verification is required after release workflow or version changes; local build success alone is not enough.

## Child guides

- [src/AGENTS.md](src/AGENTS.md) applies to `/src` and overrides this file for app code.
- If future scoped guides are added, the nearest guide wins.
