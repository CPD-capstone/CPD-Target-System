"""AI-generated (Codex): portable command guards, with all device access replaced by mocks."""
import argparse
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("cpd_release", ROOT / "tools/release/release.py")
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


class ReleaseGuards(unittest.TestCase):
    def options(self, **changes):
        defaults = dict(mode="Upgrade", database_backup=None, bundle="release-under-test",
                        part="Filesystem", current_backup=None, rollback_bundle=None,
                        rollback_archive=None, dry_run=False, confirm_upload=False,
                        port=None, confirm_read=False, confirm_restore=False)
        defaults.update(changes)
        return argparse.Namespace(**defaults)

    def test_upgrade_requires_backup_before_build_commands(self):
        with patch.object(release, "run") as run, patch.object(release, "node_json") as node:
            with self.assertRaisesRegex(ValueError, "requires --database-backup"):
                release.build(self.options())
            run.assert_not_called()
            node.assert_not_called()

    def test_provision_upload_requires_explicit_flag_and_port(self):
        with patch.object(release, "node_json", return_value={"mode": "Provision"}), \
             patch.object(release, "esptool") as tool, patch.object(release, "run") as run:
            for changes in ({}, {"port": "SERIAL_PORT"}, {"confirm_upload": True}):
                with self.assertRaisesRegex(ValueError, "--port and --confirm-upload"):
                    release.deploy(self.options(**changes))
            tool.assert_not_called()
            run.assert_not_called()

    def test_dry_run_verifies_without_touching_device(self):
        with patch.object(release, "node_json", return_value={"mode": "Provision"}) as node, \
             patch.object(release, "esptool") as tool, patch.object(release, "run") as run:
            release.deploy(self.options(dry_run=True))
            node.assert_called_once_with("bundle.cjs", "verify", Path("release-under-test").resolve())
            tool.assert_not_called()
            run.assert_not_called()

    def test_upgrade_needs_current_records_and_rollback(self):
        for supplied in ({}, {"current_backup": "current.json"}, {"rollback_bundle": "previous"},
                         {"rollback_archive": "archive"}):
            with self.subTest(supplied=supplied), \
                 patch.object(release, "node_json", return_value={"mode": "Upgrade"}) as verifier, \
                 patch.object(release, "esptool") as tool:
                with self.assertRaisesRegex(ValueError, "requires --current-backup"):
                    release.deploy(self.options(dry_run=True, **supplied))
                verifier.assert_called_once_with("bundle.cjs", "verify", Path("release-under-test").resolve())
                tool.assert_not_called()

    # AI-assisted (Codex): exercise deployment decisions using local files and dry runs only.
    def test_unknown_release_mode_cannot_take_the_provision_path(self):
        for manifest in ({}, {"mode": "upgrade"}, {"mode": None}):
            with self.subTest(manifest=manifest), patch.object(release, "node_json", return_value=manifest), \
                 patch.object(release, "esptool") as tool:
                with self.assertRaisesRegex(ValueError, "release mode"):
                    release.deploy(self.options(dry_run=True))
                tool.assert_not_called()

    def test_upgrade_cannot_use_its_bundled_database_as_the_current_backup(self):
        with tempfile.TemporaryDirectory() as temporary:
            bundle = Path(temporary) / "candidate"
            (bundle / "backup").mkdir(parents=True)
            original = bundle / "backup/database-original.json"
            original.write_bytes((ROOT / "data/database.json").read_bytes())
            alias = Path(temporary) / "same-file.json"
            os.link(original, alias)
            for backup in (original, alias):
                with self.subTest(backup=backup), patch.object(release, "node_json", return_value={"mode": "Upgrade"}), \
                     patch.object(release, "esptool") as tool:
                    with self.assertRaisesRegex(ValueError, "independent current"):
                        release.deploy(self.options(bundle=bundle, current_backup=backup,
                                                    rollback_archive="archive", dry_run=True))
                    tool.assert_not_called()

    def test_upgrade_requires_a_different_verified_rollback_release(self):
        with tempfile.TemporaryDirectory() as temporary:
            bundle = Path(temporary) / "candidate"
            previous = Path(temporary) / "prior"
            current = Path(temporary) / "current.json"
            (bundle / "backup").mkdir(parents=True)
            valid = (ROOT / "data/database.json").read_bytes()
            (bundle / "backup/database-original.json").write_bytes(valid)
            current.write_bytes(valid)
            candidate = {"mode": "Upgrade", "builtAt": "2026-11-23T00:00:00Z"}
            distinct = {"mode": "Upgrade", "builtAt": "2026-10-01T00:00:00Z"}
            options = self.options(bundle=bundle, current_backup=current, rollback_bundle=previous, dry_run=True)
            for rollback in (dict(candidate), distinct):
                with self.subTest(rollback=rollback), \
                     patch.object(release, "node_json", side_effect=[candidate, {"ok": True}, rollback]) as verifier, \
                     patch.object(release, "esptool") as tool:
                    if rollback == candidate:
                        with self.assertRaisesRegex(ValueError, "separate prior release"):
                            release.deploy(options)
                    else:
                        release.deploy(options)
                    self.assertEqual([c.args for c in verifier.call_args_list], [
                        ("bundle.cjs", "verify", bundle), ("validate-database.cjs", current),
                        ("bundle.cjs", "verify", previous)])
                    tool.assert_not_called()

    def test_failed_archive_verification_stops_a_confirmed_upgrade(self):
        with tempfile.TemporaryDirectory() as temporary:
            bundle = Path(temporary) / "candidate"
            current = Path(temporary) / "current.json"
            archive = Path(temporary) / "archive"
            (bundle / "backup").mkdir(parents=True)
            valid = (ROOT / "data/database.json").read_bytes()
            (bundle / "backup/database-original.json").write_bytes(valid)
            current.write_bytes(valid)
            failure = subprocess.CalledProcessError(1, "verify-rollback")
            with patch.object(release, "node_json", side_effect=[{"mode": "Upgrade"}, {"ok": True}, failure]) as verifier, \
                 patch.object(release, "esptool") as tool, patch.object(release, "run") as run:
                with self.assertRaises(subprocess.CalledProcessError):
                    release.deploy(self.options(bundle=bundle, current_backup=current, rollback_archive=archive,
                                                confirm_upload=True, port="test-port"))
                self.assertEqual([c.args for c in verifier.call_args_list], [
                    ("bundle.cjs", "verify", bundle), ("validate-database.cjs", current),
                    ("bundle.cjs", "verify-rollback", archive)])
                tool.assert_not_called()
                run.assert_not_called()

    def test_changed_records_block_upgrade_before_device_access(self):
        with tempfile.TemporaryDirectory(prefix="cpd-release-python-") as temporary:
            folder = Path(temporary)
            (folder / "bundle/backup").mkdir(parents=True)
            (folder / "bundle/backup/database-original.json").write_text("old", encoding="utf-8")
            (folder / "current.json").write_text("new", encoding="utf-8")
            with patch.object(release, "node_json", return_value={"mode": "Upgrade"}), \
                 patch.object(release, "esptool") as tool:
                with self.assertRaisesRegex(ValueError, "Records changed"):
                    release.deploy(self.options(bundle=str(folder / "bundle"), current_backup=str(folder / "current.json"),
                                                rollback_archive="prior-archive", dry_run=True))
                tool.assert_not_called()

    def test_flash_capture_needs_explicit_confirmation(self):
        with patch.object(release, "run") as run, patch.object(release, "esptool") as tool:
            with self.assertRaisesRegex(ValueError, "--confirm-read"):
                release.backup_controller(self.options())
            run.assert_not_called()
            tool.assert_not_called()

    def test_restore_needs_confirmation_before_file_or_network_access(self):
        with patch.object(release.urllib.request, "urlopen") as connection:
            with self.assertRaisesRegex(ValueError, "--confirm-restore"):
                release.restore_database(self.options())
            connection.assert_not_called()

    def test_invalid_export_never_becomes_a_usable_backup(self):
        with tempfile.TemporaryDirectory(prefix="cpd-release-python-") as temporary:
            output = Path(temporary) / "records.json"
            with patch.object(release.urllib.request, "urlopen", return_value=io.BytesIO(b"{broken")):
                with self.assertRaises(subprocess.CalledProcessError):
                    release.backup_database(argparse.Namespace(controller="http://controller.invalid", output=str(output)))
            self.assertFalse(output.exists())
            self.assertEqual(list(Path(temporary).iterdir()), [])

    def test_export_preserves_a_backup_or_sidecar_created_while_download_is_pending(self):
        valid = (ROOT / "data/database.json").read_bytes()
        for collision in ("records.json", "records.json.metadata.json"):
            with self.subTest(collision=collision), tempfile.TemporaryDirectory() as folder:
                output = Path(folder) / "records.json"
                existing = Path(folder) / collision

                def concurrent_export(*args, **kwargs):
                    existing.write_bytes(b"prior export")
                    return io.BytesIO(valid)

                with patch.object(release.urllib.request, "urlopen", side_effect=concurrent_export):
                    with self.assertRaises(FileExistsError):
                        release.backup_database(self.options(controller="http://controller.invalid", output=output))
                self.assertEqual(list(Path(folder).iterdir()), [existing])
                self.assertEqual(existing.read_bytes(), b"prior export")

    def test_valid_export_keeps_verified_bytes_and_matching_metadata(self):
        valid = (ROOT / "data/database.json").read_bytes()
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "records.json"
            with patch.object(release.urllib.request, "urlopen", return_value=io.BytesIO(valid)) as connection:
                release.backup_database(self.options(controller="http://controller.invalid", output=output))
                connection.assert_called_once_with("http://controller.invalid/api/database/backup", timeout=20)
            self.assertEqual(output.read_bytes(), valid)
            metadata = json.loads(Path(str(output) + ".metadata.json").read_text(encoding="utf-8"))
            self.assertEqual(metadata["sha256"], hashlib.sha256(valid).hexdigest())
            self.assertEqual(metadata["controller"], "http://controller.invalid")

    def test_restore_rejects_a_hard_link_to_its_input_as_a_separate_backup(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "replacement.json"
            backup = Path(folder) / "current.json"
            source.write_bytes((ROOT / "data/database.json").read_bytes())
            os.link(source, backup)
            with patch.object(release.urllib.request, "urlopen") as connection:
                with self.assertRaisesRegex(ValueError, "separate nonempty copy"):
                    release.restore_database(self.options(input=source, current_backup=backup, confirm_restore=True,
                                                          controller="http://controller.invalid"))
                connection.assert_not_called()

    def test_restore_validates_both_databases_before_sending(self):
        # Exercise the real preflight. A nonempty but unusable rollback file must stop a restore.
        valid = (ROOT / "data/database.json").read_bytes()
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "replacement.json"
            current = Path(folder) / "current.json"
            options = self.options(input=source, current_backup=current, confirm_restore=True,
                                   controller="http://controller.invalid")
            for replacement, rollback in [(valid, b"maintenance log"), (b"{}", valid)]:
                source.write_bytes(replacement)
                current.write_bytes(rollback)
                with self.subTest(invalid="current" if replacement == valid else "replacement"), \
                     patch.object(release.urllib.request, "urlopen") as connection:
                    with self.assertRaises(subprocess.CalledProcessError):
                        release.restore_database(options)
                    connection.assert_not_called()
            source.write_bytes(valid)
            current.write_bytes(valid)
            with patch.object(release.urllib.request, "urlopen", return_value=io.BytesIO(b'{"ok":true}')) as connection:
                release.restore_database(options)
                connection.assert_called_once()
                request = connection.call_args.args[0]
                self.assertEqual(request.data, valid)
                self.assertEqual(request.get_method(), "POST")
                self.assertEqual(request.full_url, "http://controller.invalid/api/database/restore?confirm=restore")


if __name__ == "__main__":
    unittest.main()
