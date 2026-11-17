"""Fail closed against the exact source and the user's authorized release scope."""
import json
import hashlib
import pathlib
import re
import subprocess

BASELINE = "0332d5f7c73f7994ba21c01e4b739d04835120b1"
BRANDING_BASELINE = "92e6f827b5cdef105149e096365aebef28fdad74"
ATLAS_001 = "31c69e80cb629a5ccdb0144dabf4164583a54405"
ATLAS_002 = "aae95c6f96360ccbc1ff07e4ecfc833c70ce4e43"
ATLAS_003 = "1762647c7762efb22d5dfac3807d572c95d668db"
QUALITY_RUNTIME = {
    "src/components/NodeCard.vue", "src/components/NodeReturnRouteTile.vue",
    "src/composables/useNodeReturnRoutes.ts", "src/utils/routeProbeSnapshot.ts",
    "src/utils/tcpQuality.ts", "src/utils/atlasManagement.ts", "src/composables/useAtlasManagement.ts",
}


def audit_quality_scope(source):
    for path in git("diff", "--name-only", ATLAS_003, source).splitlines():
        if path.startswith("src/") and not path.endswith(".md") and path not in QUALITY_RUNTIME:
            raise ValueError(f"Out-of-scope 0.0.4 runtime: {path}")
        if path.startswith("public/"):
            raise ValueError(f"0.0.4 cannot change public assets: {path}")
    before = json.loads(git("show", f"{ATLAS_003}:komari-theme.json"))
    after = json.loads(git("show", f"{source}:komari-theme.json"))
    if after.get("version") != "0.0.4":
        raise ValueError("Expected 0.0.4 source")
    validate_manifest(before, after)
    for path in ("package.json", "bun.lock"):
        if git("show", f"{ATLAS_003}:{path}") != git("show", f"{source}:{path}"):
            raise ValueError("0.0.4 cannot change dependencies")
    plugin_path = "companion/enhanced-route-probe/komari-plugin.json"
    old_plugin = json.loads(git("show", f"{ATLAS_003}:{plugin_path}"))
    plugin = json.loads(git("show", f"{source}:{plugin_path}"))
    if plugin["permissions"] != old_plugin["permissions"] or plugin["komari"] != "1.6.1":
        raise ValueError("No extra plugin execution/network permissions")
    attachment = json.loads(git("show", f"{source}:companion/tcpquality/attachment.json"))
    if attachment.get("periodMinutes") != 60 or attachment.get("scheduler") != "existing-cron" or attachment.get("residentService") is not False or attachment.get("listenPorts") != [] or attachment.get("speedTests") is not False or attachment.get("upstreamReportUpload") is not False or attachment.get("tests") != ["ipv4", "ipv6", "udp4", "udp6", "large4"]:
        raise ValueError("Invalid attachment scheduling/test scope")
    lock = json.loads(git("show", f"{source}:companion/tcpquality/upstream-lock.json"))
    if lock.get("commit") != "db52fc60523320fc4a34b5c369f28be38df21d13" or lock.get("license") != "GPL-3.0-only" or set(lock.get("files", {})) != {"runTcpQuality.sh", "runTcpQuality-core.sh", "runTcpQuality-rootfs.sh", "LICENSE", "README.md"}:
        raise ValueError("Pinned separate upstream sources/license required")
    for path, expected in lock["files"].items():
        content = subprocess.check_output(["git", "show", f"{source}:companion/tcpquality/vendor/{path}"])
        if hashlib.sha256(content).hexdigest() != expected:
            raise ValueError("Upstream source bytes differ from audited lock")
ROUTE_RUNTIME = {
    "src/components/NodeCard.vue", "src/components/NodeReturnRouteTile.vue",
    "src/stores/app.ts", "src/composables/useNodeReturnRoutes.ts",
    "src/services/routeProbe.service.ts", "src/services/atlasManagement.service.ts",
    "src/utils/routeProbeSnapshot.ts",
}


def audit_route_scope(source):
    for path in git("diff", "--name-only", ATLAS_002, source).splitlines():
        if path.startswith("src/") and not path.endswith(".md") and path not in ROUTE_RUNTIME:
            raise ValueError(f"Out-of-scope 0.0.3 runtime: {path}")
        if path.startswith("public/"):
            raise ValueError(f"Out-of-scope 0.0.3 public asset: {path}")
    before = json.loads(git("show", f"{ATLAS_002}:komari-theme.json"))
    after = json.loads(git("show", f"{source}:komari-theme.json"))
    extra = [f for f in after["configuration"]["data"] if f.get("key") == "returnRouteHomeTileEnabled"]
    if len(extra) != 1 or extra[0].get("default") is not False or after.get("version") != "0.0.3":
        raise ValueError("Invalid 0.0.3 opt-in setting/version")
    after["configuration"]["data"] = [f for f in after["configuration"]["data"] if f.get("key") != "returnRouteHomeTileEnabled"]
    validate_manifest(before, after)
    for path in ("package.json", "bun.lock"):
        if git("show", f"{ATLAS_002}:{path}") != git("show", f"{source}:{path}"):
            raise ValueError("0.0.3 cannot change dependencies")
DISPLAY_RUNTIME = {
    "src/components/FinanceDetailsDialog.vue", "src/constants/financeIcons.ts",
    "src/components/CarrierOrderEditor.vue", "src/components/PingHistoryLine.vue",
    "src/components/LoadChart.vue", "src/components/NodeCard.vue",
    "src/components/NodeGeneralCards.vue", "src/components/NodePingListCell.vue",
    "src/components/ThemeSettingsPanel.vue", "src/composables/useNodeCarrierPingDisplay.ts",
    "src/stores/app.ts", "src/utils/displayPreferences.ts", "src/utils/themeSettings.ts",
    "src/views/InstanceDetail.vue",
}
DISPLAY_DEFAULTS = {"carrierOrder": "unicom,telecom,mobile", "pingDisplayStyle": "方块",
                    "showTcpConnections": True, "showUdpConnections": True}


def validate_display_paths(paths):
    for path in paths:
        if path.startswith("src/") and not path.endswith(".md") and path not in DISPLAY_RUNTIME:
            raise ValueError(f"Out-of-scope 0.0.2 runtime: {path}")
        if path.startswith("public/") and path != "public/licenses/tabler-icons-MIT.txt":
            raise ValueError(f"Out-of-scope 0.0.2 public asset: {path}")


def validate_display_manifest(before, after):
    after = json.loads(json.dumps(after))
    fields = after["configuration"]["data"]
    added = [f for f in fields if f.get("key") in DISPLAY_DEFAULTS]
    if len(added) != 4 or any(f.get("default") != DISPLAY_DEFAULTS[f["key"]] for f in added):
        raise ValueError("Missing or invalid 0.0.2 display defaults")
    after["configuration"]["data"] = [f for f in fields if f.get("key") not in DISPLAY_DEFAULTS]
    validate_manifest(before, after)


def audit_display_scope(source):
    changes = git("diff", "--name-only", ATLAS_001, source).splitlines()
    validate_display_paths(changes)
    before = json.loads(git("show", f"{ATLAS_001}:komari-theme.json"))
    after = json.loads(git("show", f"{source}:komari-theme.json"))
    if after.get("version") != "0.0.2":
        raise ValueError("Expected 0.0.2 source")
    validate_display_manifest(before, after)
    for path in ("package.json", "bun.lock"):
        if git("show", f"{ATLAS_001}:{path}") != git("show", f"{source}:{path}"):
            raise ValueError("0.0.2 cannot change dependency manifests/lockfile")
BRANDING_RUNTIME = {
    "src/components/Header.vue", "src/components/Footer.vue",
    "src/components/EnhancedManagementDialog.vue", "src/components/AtlasManagementDialog.vue",
    "src/composables/useEnhancedManagement.ts", "src/composables/useAtlasManagement.ts",
    "src/services/enhancedManagement.service.ts", "src/services/atlasManagement.service.ts",
    "src/utils/enhancedManagement.ts", "src/utils/atlasManagement.ts",
    "src/components/ManualRouteManager.vue", "src/components/ThemeSettingsPanel.vue",
    "src/components/TrafficCycleRow.vue", "src/composables/useNodeLoadStats.ts",
    "src/services/themeSettings.service.ts", "src/utils/api.ts",
    "src/utils/returnRouteClassification.ts", "src/utils/themeSettings.ts",
    "src/utils/atlasIdentity.ts", "src/services/atlasIdentity.service.ts",
    "src/utils/init.ts", "src/utils/rpc.ts",
    "src/components/Background.vue",
}
FIRST_THREE_RUNTIME = {
    "src/components/FinanceDetailsDialog.vue", "src/components/NodeGeneralCards.vue",
    "src/components/ProviderValuePanel.vue", "src/components/SnapshotExportPanel.vue",
    "src/components/TrafficCycleRow.vue", "src/components/TrafficCycleManager.vue",
    "src/composables/useSummaryRates.ts", "src/composables/useNodeTraffic.ts",
    "src/services/exchangeRates.service.ts", "src/services/themeSettings.service.ts",
    "src/services/trafficCycle.service.ts", "src/utils/resetSchedule.ts",
    "src/utils/financeHelper.ts", "src/utils/trafficCycle.ts",
    "src/views/HomeView.vue", "src/views/InstanceDetail.vue",
}


def git(*args):
    return subprocess.check_output(["git", *args], text=True, encoding="utf-8").strip()


def validate_scope_paths(paths, branding=False):
    allowed = FIRST_THREE_RUNTIME | (BRANDING_RUNTIME if branding else set())
    unexpected = [path for path in paths if
                  ((path.startswith("src/") and not path.endswith(".md")) or
                   path.startswith("public/images/")) and path not in allowed]
    if unexpected:
        raise ValueError(f"Out-of-scope runtime changes: {unexpected}")


def validate_manifest(before, after, branding=False):
    before, after = dict(before), dict(after)
    if branding:
        expected = {
            "name": "Atlas", "short": "Atlas", "author": "MagnetOscar",
            "url": "https://github.com/MagnetOscar/Atlas",
            "description": "Atlas — Komari theme with independent reset schedules and native-currency node billing",
        }
        if any(after.get(key) != value for key, value in expected.items()):
            raise ValueError("Invalid authorized Atlas metadata")
        for key in expected:
            before.pop(key, None)
            after.pop(key, None)
    before.pop("version", None)
    after.pop("version", None)
    if before != after:
        raise ValueError("Release cannot change unrelated theme fields or defaults")


def audit_scope(source):
    manifest = json.loads(git("show", f"{source}:komari-theme.json"))
    branding = manifest.get("name") == "Atlas"
    validate_scope_paths(git("diff", "--name-only", BASELINE, source).splitlines(), branding)
    if branding:
        # First preserve the previously accepted three-step release, then audit
        # only the explicit naming exception against that immutable source.
        audit_scope(BRANDING_BASELINE)
        changes = git("diff", "--name-only", BRANDING_BASELINE, source).splitlines()
        unexpected = [path for path in changes if path.startswith("src/") and not path.endswith(".md") and path not in BRANDING_RUNTIME]
        if unexpected:
            raise ValueError(f"Non-branding runtime changes after 0.0.1: {unexpected}")
        allowed_public = {"public/admin-app/index.html", "public/admin-app/enhanced-settings-bridge.js", "public/admin-app/atlas-settings-bridge.js"}
        if any(path.startswith("public/") and path not in allowed_public for path in changes):
            raise ValueError("Branding cannot change public assets or renderers")
    if manifest.get("version") != "0.0.1":
        raise ValueError("Accepted source must contain the authorized 0.0.1 version")
    validate_manifest(json.loads(git("show", f"{BASELINE}:komari-theme.json")), manifest, branding)
    expected = json.loads(git("show", f"{BASELINE}:package.json"))["dependencies"]
    expected["@js-temporal/polyfill"] = "0.5.1"
    actual = json.loads(git("show", f"{source}:package.json"))["dependencies"]
    if expected != actual:
        raise ValueError("Unexpected runtime dependency changes")


def main():
    version = json.loads(pathlib.Path("komari-theme.json").read_text(encoding="utf-8"))["version"]
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?", version):
        raise SystemExit("Invalid independent SemVer")
    if version == "1.2.1":
        raise SystemExit("The inherited baseline cannot be released as our own version")
    report = json.loads(pathlib.Path(f"docs/verification/acceptance-{version}.json").read_text(encoding="utf-8"))
    if report.get("version") != version or report.get("status") != "passed":
        raise SystemExit("Acceptance has not passed")
    source = report["source_commit"]
    if not re.fullmatch(r"[0-9a-f]{40}", source):
        raise SystemExit("Acceptance must reference an exact source commit")
    subprocess.run(["git", "merge-base", "--is-ancestor", source, "HEAD"], check=True)
    if version == "0.0.1":
        if report.get("scope") != "steps-1-3" or report.get("baseline_commit") != BASELINE:
            raise SystemExit("0.0.1 is authorized for engineering, independent reset and finance only")
        audit_scope(source)
        stages = ("engineering", "reset", "finance", "ui-preservation", "integration", "package")
    elif version == "0.0.2":
        if report.get("scope") != "finance-dialog-sorting-display" or report.get("baseline_commit") != ATLAS_001:
            raise SystemExit("0.0.2 is limited to finance dialog, carrier sorting and display options")
        audit_display_scope(source)
        stages = ("engineering", "reset", "finance", "sorting", "display", "ui-preservation", "integration", "package", "previews")
    elif version == "0.0.3":
        if report.get("scope") != "home-connection-and-return-route" or report.get("baseline_commit") != ATLAS_002:
            raise SystemExit("0.0.3 is limited to homepage connection/return-route and companion integration")
        audit_route_scope(source)
        stages = ("engineering", "reset", "finance", "sorting", "display", "return-route", "integration", "package", "previews", "production-trial")
    elif version == "0.0.4":
        if report.get("scope") != "komari-tcpquality-attachment" or report.get("baseline_commit") != ATLAS_003:
            raise SystemExit("0.0.4 is limited to the Komari attachment and reference return-route panel")
        audit_quality_scope(source)
        stages = ("engineering", "reset", "finance", "sorting", "display", "tcpquality", "hourly-schedule", "license", "integration", "package", "previews", "production-trial")
    else:
        stages = ("reset", "finance", "sorting", "display", "return-route", "integration")
    for stage in stages:
        item = report.get("checks", {}).get(stage, {})
        if item.get("status") != "passed" or not item.get("evidence"):
            raise SystemExit(f"Missing accepted evidence: {stage}")
        evidence = pathlib.PurePosixPath(item["evidence"])
        if ".." in evidence.parts or not str(evidence).startswith("docs/verification/") or not pathlib.Path(evidence).is_file():
            raise SystemExit(f"Missing verification file: {stage}")
    subprocess.run(["git", "diff", "--exit-code", source, "HEAD", "--", ".",
                    ":(exclude)docs/verification/**", ":(exclude)AICACHE.md"], check=True)
    manifest = json.loads(pathlib.Path("komari-theme.json").read_text(encoding="utf-8"))
    prefix = "atlas" if manifest.get("name") == "Atlas" else "personal"
    if prefix == "atlas" and report.get("branding", {}).get("name") != "Atlas":
        raise SystemExit("Atlas requires explicit branding acceptance")
    print(f"Accepted source {source}; release tag {prefix}-v{version}; checks: {', '.join(stages)}")


if __name__ == "__main__":
    main()
