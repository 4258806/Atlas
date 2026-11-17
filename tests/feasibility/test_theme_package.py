"""Exercise release ZIP validation with actual malformed archives."""
import importlib.util
import json
import pathlib
import subprocess
import tempfile
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("verify_theme", ROOT / "scripts/verify-theme.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = pathlib.Path(self.temp.name) / "theme.zip"
        self.manifest = json.loads((ROOT / "komari-theme.json").read_text(encoding="utf-8"))
        self.commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()

    def tearDown(self):
        self.temp.cleanup()

    def archive(self, extra=None, dirty=False, commit=None, omit=None, mode="production"):
        files = {"komari-theme.json": json.dumps(self.manifest),
                 "preview.png": (ROOT / "docs/preview.png").read_bytes(),
                 "dist/index.html": "<html></html>",
                 "dist/BUILD.json": json.dumps({"version": self.manifest["version"],
                                                "commit": commit or self.commit, "dirty": dirty, "mode": mode}),
                 "dist/licenses/MIT.txt": (ROOT / "LICENSE").read_bytes()}
        files.update(extra or {})
        if omit:
            del files[omit]
        with zipfile.ZipFile(self.path, "w") as archive:
            for key, value in files.items():
                info = zipfile.ZipInfo("placeholder")
                info.filename = key
                archive.writestr(info, value)

    def test_clean_native_package(self):
        self.archive()
        self.assertEqual(module.validate(self.path, True)["commit"], self.commit)

    def test_dirty_is_diagnostic_only(self):
        self.archive(dirty=True)
        self.assertTrue(module.validate(self.path)["dirty"])
        with self.assertRaisesRegex(ValueError, "clean-source"):
            module.validate(self.path, True)

    def test_tampered_commit(self):
        self.archive(commit="0" * 40)
        with self.assertRaisesRegex(ValueError, "commit mismatch"):
            module.validate(self.path)

    def test_visual_and_unknown_modes_cannot_be_released(self):
        for mode in ("visual-test", "development", None):
            with self.subTest(mode=mode):
                self.archive(mode=mode)
                with self.assertRaisesRegex(ValueError, "production-mode"):
                    module.validate(self.path, True)

    def test_unsafe_paths(self):
        for name in ("../escape", "/absolute", "dist/../escape", "dist\\escape", "dist/C:secret"):
            with self.subTest(name=name):
                self.archive({name: "invalid"})
                with self.assertRaisesRegex(ValueError, "unsafe"):
                    module.validate(self.path)

    def test_install_contract(self):
        self.archive({"Source code/main.ts": "not a theme"})
        with self.assertRaisesRegex(ValueError, "top-level"):
            module.validate(self.path)
        self.archive(omit="dist/index.html")
        with self.assertRaisesRegex(ValueError, "missing required"):
            module.validate(self.path)

    def test_manifest_mismatch(self):
        self.archive({"komari-theme.json": json.dumps({**self.manifest, "version": "0.0.0"})})
        with self.assertRaisesRegex(ValueError, "version mismatch"):
            module.validate(self.path)

    def test_missing_licenses(self):
        self.archive(omit="dist/licenses/MIT.txt")
        with self.assertRaisesRegex(ValueError, "license"):
            module.validate(self.path, True)

    def test_preview_integrity(self):
        self.archive({"preview.png": b"broken"})
        with self.assertRaisesRegex(ValueError, "preview mismatch"):
            module.validate(self.path)


if __name__ == "__main__":
    unittest.main()
