# Atlas v0.0.4 · Komari TcpQuality attachment

This attachment belongs to the existing Komari deployment. It creates no daemon, systemd unit/timer, listener or sidecar. CA's native Komari plugin receives and stores results; probes run on the measured node beside its Komari Agent. Running on the manager would measure the manager's route instead.

The MIT adapter invokes the unmodified, pinned upstream TcpQuality process in a private rootfs. `vendor/` retains GPL-3.0-only source, LICENSE and upstream attribution. It is separately packaged and is never linked or copied into the theme's MIT classifier. The rootfs contains separately licensed Debian/NextTrace components; obtain it from the pinned upstream artifact and retain its notices. The prepare command verifies its exact SHA256 before extraction; if upstream replaces that artifact, it refuses the changed bytes. Retain the downloaded archive for reproducibility.

## Layout and install

Requires Linux, Python >=3.12, existing bash/unshare/chroot/mount/ip tools, outbound HTTPS/WHOIS and raw-packet permission. Rootfs packages stay inside the attachment; no host package manager is called by this adapter. Preparation uses about 100 MB download plus rootfs disk space.

- Manager: `<existing Komari stack>/attachments/tcpquality/<version>` for code, `<existing Komari data>/attachments/tcpquality` for manager records; native plugin state remains under its Komari-owned storage.
- Nodes: `<existing Komari Agent library>/attachments/tcpquality/<version>` for code; `/etc/komari-agent/attachments/tcpquality` for root-owned 0600 config/token, and `/var/lib/komari-agent/attachments/tcpquality` for private rootfs/results. Match the actual deployment prefixes before installing. Do not move/overwrite the Agent itself.

Install the separate native plugin ZIP using Komari 1.6.1. Approve only the existing node/route permissions. Keep public summary opt-in. In its existing per-node policy add `collector: "tcpquality"`, `enabled: true`, retain a valid legacy city and set `periodMinutes: 60`. Other node policies remain unchanged. No new gateway paths: reuse the existing exact POST register/poll/result endpoints with native node authentication; the attachment uses poll/result only.

Extract the separate attachment tar.gz archive to the selected attachment code directory. Run `prepare.py --data <private node attachment data>`. Then run `enroll.py --agent-config <existing native Agent config> --uuid <verified native UUID> --data <private data> --config <private attachment config>`. It copies only the same node's existing token into a private attachment file; credentials never appear in argv, environment or public reports. It does not alter native Agent configuration or create credentials. Existing differing attachment files are refused.

Run `collector.py run --config <private attachment config>` once for acceptance. After that succeeds, repeat the same enrollment command with `--enable-schedule`. It adds only `/etc/cron.d/komari-tcpquality` to the already installed cron scheduler. The minute invocation is a due check: the native plugin issues at most one bounded job per configured 60-minute start interval, persists leases across restart and prevents overlap/replay. Actual tests are hourly, not minutely. Disabling this node's plugin policy stops future probes. No independent service is installed or enabled.

## Tests and results

The fixed command runs only the default three-carrier IPv4/IPv6 tests, UDP route identification and IPv4 large packets, with parallelism 4, 30 packets and report upload explicitly disabled. It does not select `--all`, speed tests, international/education tests or ranking. UDP identifies route labels only; it does not fabricate UDP latency/loss. IPv6 is marked unavailable when the node has no usable connectivity. Large-packet labels can differ from ordinary TCP/UDP and remain separate.

Preserve upstream classification as attributed observations, not a provider certification. The headline uses IPv4 carrier results; mixed provinces, failed/Hidden observations, different variants and expiry remain visible in details. Per-variant rows group the 31 provinces by the exact upstream labels. No destination-carrier ASN is substituted for the whole transit path, and no desired CN2GIA label is forced.

Raw CSV/debug traces remain private on the node. Native results carry only bounded province IDs, labels, summary statistics, source commit and the raw CSV hash; there are no raw IPs/hostnames or lease/token fields in the public projection. Requests reject redirects and bodies above 16 KB. A host-owned lock, native lease and 30-minute wall limit protect collection; RSS is sampled for the descendant tree and collection stops above 384 MiB. CPU seconds and sampled descendant RSS are measurements, not an isolated network byte count. The adapter keeps the newest 24 app-owned run directories, deleting only explicitly marked runs below its own data directory; unknown/operator/legacy folders are retained.

Upstream still obtains its target catalog and enriches public responding hop IPs through Team Cymru and its configured ASN relay. That registry lookup is distinct from publishing a report. The attachment does not pass Agent credentials to the upstream process; full report/ranking uploads remain disabled.

## Upgrade and rollback

Keep the previous theme/plugin ZIPs, per-node configuration, private state and code. Upgrade the plugin before enabling this collector. The old fixed-target evidence is retained separately. Existing manual labels, finance/reset settings, sorting, old routes and theme defaults remain compatible. Disable only the attachment cron entry and the node's collector policy before rollback; restore the matching older plugin policy/ZIP and code. Do not delete Agent credentials, historical raw traces or unrelated services. Source ZIPs are not interchangeable with the native theme/plugin ZIPs.
