"""Reject features outside the explicitly authorized first three steps."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("release_gate", ROOT / "scripts/release-gate.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class ScopeTests(unittest.TestCase):
    def test_engineering_reset_and_finance_are_in_scope(self):
        gate.validate_scope_paths(["src/utils/financeHelper.ts", "src/utils/resetSchedule.ts", "src/AGENTS.md", "scripts/verify-theme.py", "docs/finance.md"])

    def test_other_features_or_visual_changes_are_rejected(self):
        for path in ("src/utils/carrierPing.ts", "src/components/NodeEarthTiledMap.vue", "src/components/NodeReturnRoutes.vue", "public/images/new.svg", "src/styles/main.css"):
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, "Out-of-scope"):
                gate.validate_scope_paths([path])

    def test_only_manifest_version_can_change(self):
        gate.validate_manifest({"version": "1.2.1", "default": "original"}, {"version": "0.0.1", "default": "original"})
        with self.assertRaisesRegex(ValueError, "defaults"):
            gate.validate_manifest({"version": "1.2.1", "default": "original"}, {"version": "0.0.1", "default": "modified"})


if __name__ == "__main__":
    unittest.main()
