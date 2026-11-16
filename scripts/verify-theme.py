"""Validate the native theme ZIP and optional clean-source release provenance."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import zipfile


def validate(path, release=False):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError("duplicate ZIP entries")
        for name in names:
            normalized = name.replace("\\", "/")
            parts = pathlib.PurePosixPath(normalized).parts
            if normalized != name or name.startswith("/") or ".." in parts or ":" in name:
                raise ValueError(f"unsafe ZIP path: {name}")
            if parts[0] not in {"komari-theme.json", "preview.png", "dist"}:
                raise ValueError(f"unexpected top-level path: {name}")
            if (archive.getinfo(name).external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("symlinks are not supported")
        required = {"komari-theme.json", "preview.png", "dist/index.html", "dist/BUILD.json"}
        if not required.issubset(names):
            raise ValueError(f"missing required entries: {required - set(names)}")
        manifest = json.loads(archive.read("komari-theme.json"))
        build = json.loads(archive.read("dist/BUILD.json"))
        local = json.loads(pathlib.Path("komari-theme.json").read_text(encoding="utf-8"))
        if manifest != local or build["version"] != manifest["version"]:
            raise ValueError("manifest/version mismatch")
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
        if build["commit"] != head:
            raise ValueError("source commit mismatch")
        if release and build.get("dirty") is not False:
            raise ValueError("release requires a clean-source build")
        if archive.read("preview.png") != pathlib.Path("docs/preview.png").read_bytes():
            raise ValueError("preview mismatch")
        if release and not any(name.startswith("dist/licenses/") for name in names):
            raise ValueError("release is missing license notices")
        return {"version": manifest["version"], "commit": head,
                "dirty": build["dirty"], "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "file": path.name, "entries": len(names)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("zip", type=pathlib.Path)
    parser.add_argument("--release", action="store_true")
    args = parser.parse_args()
    print(json.dumps(validate(args.zip, args.release), indent=2))
