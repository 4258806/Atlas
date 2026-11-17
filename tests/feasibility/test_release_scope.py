"""Reject features outside the explicitly authorized first three steps."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("release_gate", ROOT / "scripts/release-gate.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class ScopeTests(unittest.TestCase):
    def test_display_scope_does_not_authorize_return_routes_or_maps(self):
        gate.validate_display_paths(["src/components/CarrierOrderEditor.vue", "src/utils/displayPreferences.ts", "src/components/FinanceDetailsDialog.vue"])
        for path in ["src/components/NodeEarthTiledMap.vue", "src/utils/returnRoutes.ts", "src/styles/main.css", "public/images/logo.svg"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                gate.validate_display_paths([path])

    def test_display_manifest_preserves_all_existing_fields(self):
        before = {"version": "0.0.1", "configuration": {"data": [{"key": "original", "default": 42}]}}
        after = {"version": "0.0.2", "configuration": {"data": before["configuration"]["data"] + [{"key": k, "default": v} for k, v in gate.DISPLAY_DEFAULTS.items()]}}
        gate.validate_display_manifest(before, after)
        after["configuration"]["data"][0] = {"key": "original", "default": 99}
        with self.assertRaises(ValueError):
            gate.validate_display_manifest(before, after)

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

    def test_atlas_branding_preserves_configuration_defaults(self):
        before = {"name": "Glassmorphism Enhanced", "author": "casiuna", "url": "upstream", "description": "upstream", "short": "Enhanced", "configuration": {"default": "original"}, "version": "1.2.1"}
        after = {**before, "name": "Atlas", "short": "Atlas", "author": "MagnetOscar", "url": "https://github.com/MagnetOscar/Atlas", "description": "Atlas — Komari theme with independent reset schedules and native-currency node billing", "version": "0.0.1"}
        gate.validate_manifest(before, after, branding=True)
        for changed in ({**after, "short": "Other"}, {**after, "configuration": {"default": "modified"}}):
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                gate.validate_manifest(before, changed, branding=True)

    def test_branding_exception_does_not_allow_map_or_style_changes(self):
        gate.validate_scope_paths(["src/components/AtlasManagementDialog.vue", "src/components/Footer.vue"], branding=True)
        for path in ("src/components/NodeEarthTiledMap.vue", "src/styles/main.css", "public/images/new.svg"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                gate.validate_scope_paths([path], branding=True)


if __name__ == "__main__":
    unittest.main()
