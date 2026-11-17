"""Fail closed against the exact source and the user's authorized release scope."""
import json
import pathlib
import re
import subprocess

BASELINE = "0332d5f7c73f7994ba21c01e4b739d04835120b1"
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
    return subprocess.check_output(["git", *args], text=True).strip()


def validate_scope_paths(paths):
    unexpected = [path for path in paths if
                  ((path.startswith("src/") and not path.endswith(".md")) or
                   path.startswith("public/images/")) and path not in FIRST_THREE_RUNTIME]
    if unexpected:
        raise ValueError(f"Out-of-scope runtime changes: {unexpected}")


def validate_manifest(before, after):
    before, after = dict(before), dict(after)
    before.pop("version", None)
    after.pop("version", None)
    if before != after:
        raise ValueError("Release cannot change unrelated theme fields or defaults")


def audit_scope(source):
    validate_scope_paths(git("diff", "--name-only", BASELINE, source).splitlines())
    manifest = json.loads(git("show", f"{source}:komari-theme.json"))
    if manifest.get("version") != "0.0.1":
        raise ValueError("Accepted source must contain the authorized 0.0.1 version")
    validate_manifest(json.loads(git("show", f"{BASELINE}:komari-theme.json")), manifest)
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
    print(f"Accepted source {source}; release tag personal-v{version}; checks: {', '.join(stages)}")


if __name__ == "__main__":
    main()
