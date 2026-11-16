# Isolated real-backend compatibility tests

## Personal fork reset acceptance (official 1.6.1)

`reset-native.mjs` is a separate targeted runner for the independent reset schedule. It starts a fresh official backend on a random **127.0.0.1** port under `test-results/full/native-lab-reset-*`, exercises real chunked theme upload, v1 migration, desktop/mobile persistence, native retention settings, metric RPC sums and baseline rollback/re-upgrade. It never connects to production or installs an Agent.

```text
node tests/integration/reset-native.mjs BACKEND_BINARY PYTHON_BINARY BASELINE_THEME_ZIP CANDIDATE_THEME_ZIP
```

Verified toolchain: Node 24, Playwright Chromium, standard-library Python, official Komari Windows amd64 1.6.1 (release SHA256 `0c6e73c42ac166d34562e57037007a21692599e9e868ddae18217691e0f5d932`). Verify the official digest for another platform before using it. The baseline is the original Enhanced 1.2.1 native ZIP, not a source archive.

Traffic history is explicitly synthetic and inserted only into the newly created lab by `seed-reset-history.py`; HTTP/RPC responses are from the actual backend. This proves native query/retention/calendar integration, not real network billing accuracy. Public-safe results and screenshots are written under `test-results/native-reset/`; private lab databases/logs stay ignored. Backend and browser processes are stopped by the runner. Native ZIP and settings must both be restored for a v2-to-v1 rollback.

The older broader compatibility runner below has its own requirements and evidence scope.

These scripts do not mock Komari responses, metrics or Ping history. They install and exercise theme ZIPs against disposable official backends. Never use an existing or production installation.

## Prerequisites

- Theme dependencies from the unchanged lockfile, Bun 1.3.14 and Node 26.7.0 (the standalone integration runner uses Node's WebSocketInit headers support; this is not a change to the theme's supported Node versions).
- Playwright Chromium and its runtime libraries/fonts. `PLAYWRIGHT_BROWSERS_PATH`, `LD_LIBRARY_PATH` and `FONTCONFIG_FILE` may point into an isolated tools directory; do not replace screenshot baselines to compensate for missing libraries.
- Official Komari 1.6.0 / 1.5.1 Linux binaries with matching GitHub release digests, and official Agent 1.5.11. Pinned backend commits are in [the compatibility review](../../docs/komari-1.6.0-compatibility.md).
- A separate runtime directory for each backend, listening only on `127.0.0.1:28760` and `127.0.0.1:28510`. Start the binaries in those directories with `server --listen <address> --database ./data/komari.db`. They must still be at the first-run install guide.

## Prepare once

From the theme root:

```bash
node tests/integration/prepare.mjs /absolute/path/to/runtime
```

`prepare.mjs` refuses to overwrite an existing private state file and requires a fresh installation. It uses the supported installation/login/client/Ping APIs and verifies their readback. It writes private test credentials and Agent configs with mode 0600 under each version directory. Never commit or publish those files.

For each version, start two separate official Agent processes in that version's runtime directory:

```bash
/path/to/komari-agent-1.5.11 --config RelayNode.json --disable-web-ssh --disable-auto-update --get-ip-addr-from-nic --interval 2
/path/to/komari-agent-1.5.11 --config TargetNode.json --disable-web-ssh --disable-auto-update --get-ip-addr-from-nic --interval 2
```

Check backend readiness and actual Agent reports. Allow the backend to persist real load and Ping records before verifying. This is bounded setup for a test run, not a production monitoring job. Stop only these test processes when finished.

The three carrier-named TCP tasks use `www.10010.com:443`, `www.189.cn:443` and `www.10086.cn:443`. The link task probes the actual local backend socket. These are genuine probes for protocol, history, task mapping and loss regressions; they are not a geographic three-carrier benchmark or a claim that the two test agents run on different physical hosts. Actual failures remain loss, not replacement latencies.

## Verify

Keep the untouched baseline 1.0.8 ZIP and build the candidate from its own commit. Then run:

```bash
node tests/integration/verify.mjs /absolute/path/to/runtime /absolute/path/to/baseline-v1.0.8.zip /absolute/path/to/candidate.zip /absolute/path/to/evidence/integration.json
```

The runner restricts its targets to loopback. It checks real node metrics and persisted history, all four Ping tasks and metric statistics, SDK WebSocket heartbeat/reconnection/error handling, official chunked ZIP upload, both theme identities, exact settings copy/readback/rollback, installed-theme browser home/detail/home and charts in both transports, ordinary admin logs, absence of the removed visitor RPC on 1.6.0, and successful visitor-audit settings/event submission on 1.5.1. The backend WebSocket origin check remains enabled; Node sends the same-origin header a browser normally supplies.

Unit fixtures live in `tests/unit/`, are explicitly labeled as fixtures, and are not substituted for these real integration assertions. The test host provides a virtio display, not an NVIDIA/AMD device suitable for physical GPU telemetry verification; no physical-GPU coverage is claimed.

Release publication, GitHub Actions execution and market Issue/PR verification are separate approval-gated steps. Passing this runner does not assert that they happened.
