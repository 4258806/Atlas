"""Fail closed until the fork's recorded acceptance is complete."""
import json
import pathlib
import re
import subprocess

version = json.loads(pathlib.Path("komari-theme.json").read_text(encoding="utf-8"))["version"]
if not re.fullmatch(r"\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?", version):
    raise SystemExit("Invalid independent SemVer")
if version == "1.2.1":
    raise SystemExit("The inherited baseline cannot be released as our own version")
report = json.loads(pathlib.Path(f"docs/verification/acceptance-{version}.json").read_text(encoding="utf-8"))
if report.get("version") != version or report.get("status") != "passed":
    raise SystemExit("Acceptance has not passed")
for stage in ("reset", "finance", "sorting", "display", "return-route", "integration"):
    item = report.get("checks", {}).get(stage, {})
    if item.get("status") != "passed" or not item.get("evidence"):
        raise SystemExit(f"Missing accepted evidence: {stage}")
source = report["source_commit"]
if not re.fullmatch(r"[0-9a-f]{40}", source):
    raise SystemExit("Acceptance must reference an exact source commit")
subprocess.run(["git", "merge-base", "--is-ancestor", source, "HEAD"], check=True)
subprocess.run(["git", "diff", "--exit-code", source, "HEAD", "--", ".",
                ":(exclude)docs/verification/**", ":(exclude)AICACHE.md"], check=True)
print(f"Accepted source {source}; release tag personal-v{version}")
