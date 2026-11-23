"""AI-generated (Codex): portable ESP32 release, backup, and confirmed deployment commands."""
import argparse
from contextlib import ExitStack
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools/release"
POLICY = json.loads((TOOLS / "production-policy.json").read_text(encoding="utf-8"))
MAX_DATABASE_BYTES = 262144


def require(condition, message):
    if not condition:
        raise ValueError(message)


def run(command, log=None, environment=None):
    command = [str(value) for value in command]
    if log is None:
        subprocess.run(command, cwd=str(ROOT), env=environment, check=True)
        return
    with log.open("w", encoding="utf-8") as output:
        result = subprocess.run(command, cwd=str(ROOT), env=environment, stdout=output,
                                stderr=subprocess.STDOUT)
    if result.returncode:
        print("\n".join(log.read_text(encoding="utf-8", errors="replace").splitlines()[-35:]), file=sys.stderr)
        raise RuntimeError("Release check failed; see {}".format(log))


def node_json(script, *arguments):
    node = shutil.which("node")
    require(node, "Node.js is required for release validation")
    output = subprocess.check_output([node, str(TOOLS / script)] + [str(value) for value in arguments],
                                     cwd=str(ROOT), encoding="utf-8")
    return json.loads(output)


def write_json(file, value):
    file.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def pio_core():
    return Path(os.environ.get("PLATFORMIO_CORE_DIR", str(Path.home() / ".platformio")))


def esptool():
    file = pio_core() / "packages/tool-esptoolpy/esptool.py"
    require(file.is_file(), "The PlatformIO esptool package is required")
    return [sys.executable, str(file), "--chip", POLICY["chip"]]


def controller_base(url):
    parsed = urllib.parse.urlsplit(url)
    require(parsed.scheme in ("http", "https") and parsed.netloc, "Use an HTTP or HTTPS controller URL")
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))


def build(options):
    require(options.mode != "Upgrade" or options.database_backup,
            "Upgrade requires --database-backup; the repository seed is never selected implicitly")
    release_root = (ROOT / options.output).resolve()
    require(ROOT in release_root.parents, "Release output must be inside the project workspace")
    versions = json.loads((ROOT / "data/release.json").read_text(encoding="utf-8"))
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    destination = release_root / (versions["uiVersion"] + "-" + stamp + "-" + uuid.uuid4().hex[:8])
    arguments = ["stage", destination, options.mode]
    if options.database_backup:
        arguments.append(Path(options.database_backup).resolve())
    node_json("bundle.cjs", *arguments)
    checks = {name: name in ("database", "assets") for name in
              ("database", "assets", "javascript", "unit", "release-unit", "native", "browser", "firmware", "littlefs")}
    node = shutil.which("node")

    def check(name, command, environment=None):
        print("Checking {}...".format(name), flush=True)
        run(command, destination / "reports" / (name + ".log"), environment)
        checks[name] = True

    check("javascript", [node, TOOLS / "check-javascript.cjs", destination / "data", sys.executable])
    check("unit", [node, TOOLS / "test-unit.cjs"])
    check("release-unit", [sys.executable, TOOLS / "test_release_guards.py"])
    check("native", [sys.executable, TOOLS / "test_database.py"])
    environment = dict(os.environ, CPD_PREVIEW_DATA=str(destination / "data"),
                       CPD_RELEASE_TEST="1", CPD_PYTHON=sys.executable)
    check("browser", [node, ROOT / "node_modules/@playwright/test/cli.js", "test"], environment)
    configuration = destination / "platformio-release.ini"
    pio = [sys.executable, "-m", "platformio", "run", "-d", ROOT, "-c", configuration, "-e", "esp32"]
    check("firmware", pio)
    check("littlefs", pio + ["-t", "buildfs"])
    images = destination / "images"
    images.mkdir()
    for name in ("firmware.bin", "partitions.bin", "bootloader.bin", "littlefs.bin"):
        shutil.copy2(str(destination / "build/esp32" / name), str(images / name))
    shutil.copy2(str(pio_core() / "packages/framework-arduinoespressif32/tools/partitions/boot_app0.bin"),
                 str(images / "boot_app0.bin"))
    checks_file = destination / "reports/checks.json"
    write_json(checks_file, checks)
    generated_build = (destination / "build").resolve()
    require(generated_build.parent == destination.resolve() and generated_build.name == "build",
            "Unexpected build cleanup path")
    shutil.rmtree(str(generated_build))
    node_json("bundle.cjs", "finish", destination, checks_file)
    node_json("bundle.cjs", "verify", destination)
    print("Validated ESP32 release bundle: {}".format(destination))
    print("No firmware or filesystem was uploaded.")


def deploy(options):
    bundle = Path(options.bundle).resolve()
    manifest = node_json("bundle.cjs", "verify", bundle)
    # AI-assisted (Codex): only explicit provisioning may skip upgrade backup checks.
    require(manifest.get("mode") in ("Upgrade", "Provision"), "Unrecognized release mode")
    if manifest["mode"] == "Upgrade":
        require(options.current_backup and (options.rollback_bundle or options.rollback_archive),
                "Upgrade requires --current-backup and --rollback-bundle or --rollback-archive")
        current = Path(options.current_backup).resolve()
        original = bundle / "backup/database-original.json"
        require(bundle not in current.parents and not current.samefile(original),
                "Supply an independent current records backup from outside the candidate bundle")
        node_json("validate-database.cjs", current)
        require(digest(current) == digest(original),
                "Records changed after staging; export again and rebuild the upgrade")
        if options.rollback_bundle:
            previous = Path(options.rollback_bundle).resolve()
            require(previous != bundle, "Rollback must use a separate prior release")
            previous_manifest = node_json("bundle.cjs", "verify", previous)
            require(previous_manifest != manifest, "Rollback must use a separate prior release")
        else:
            node_json("bundle.cjs", "verify-rollback", Path(options.rollback_archive).resolve())
    if options.dry_run:
        print("Dry run: {} images and backups verified. No controller contacted.".format(options.part))
        return
    require(options.confirm_upload and options.port, "Upload requires --port and --confirm-upload")
    names = ("littlefs.bin",) if options.part == "Filesystem" else (
        "bootloader.bin", "partitions.bin", "boot_app0.bin", "firmware.bin")
    command = esptool() + ["--port", options.port, "write_flash", "--flash_size", "keep",
                           "--flash_mode", "keep", "--flash_freq", "keep"]
    for name in names:
        command += [POLICY["images"][name], str(bundle / "images" / name)]
    run(command)


def backup_database(options):
    output = Path(options.output).resolve()
    metadata = Path(str(output) + ".metadata.json")
    require(not output.exists() and not metadata.exists(),
            "Choose a new labeled backup filename; existing backups are never overwritten")
    output.parent.mkdir(parents=True, exist_ok=True)
    base = controller_base(options.controller)
    try:
        response = urllib.request.urlopen(base + "/api/database/backup", timeout=20)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        response = urllib.request.urlopen(base + "/database.json", timeout=20)
    with response:
        contents = response.read(MAX_DATABASE_BYTES + 1)
    require(len(contents) <= MAX_DATABASE_BYTES, "Export exceeds the supported database size")
    temporary = output.with_name(output.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temporary.write_bytes(contents)
        node_json("validate-database.cjs", temporary)
        # AI-assisted (Codex): reserve both names exclusively after validation. Another
        # export can claim this label while the download or preflight is running.
        with ExitStack() as cleanup:
            with output.open("xb"):
                pass
            cleanup.callback(output.unlink)
            with metadata.open("x", encoding="utf-8") as sidecar:
                cleanup.callback(metadata.unlink)
                json.dump({"capturedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                           "controller": base, "sha256": digest(temporary)}, sidecar, indent=2)
                sidecar.write("\n")
            temporary.replace(output)
            cleanup.pop_all()
        print("Validated saved-record backup: {}".format(output))
    finally:
        if temporary.exists():
            temporary.unlink()


def backup_controller(options):
    require(options.confirm_read, "Flash capture can restart the controller; use --confirm-read during maintenance")
    directory = Path(options.output).resolve()
    require(not directory.exists(), "Choose a new labeled backup directory")
    directory.mkdir(parents=True)
    image = directory / "controller-flash.bin"
    run(esptool() + ["--port", options.port, "read_flash", "0x0", "0x1000000", image])
    require(image.stat().st_size == 16777216, "Flash capture was incomplete")
    write_json(directory / "rollback-manifest.json", {
        "chip": POLICY["chip"], "board": POLICY["settings"]["board"], "bytes": 16777216,
        "file": image.name, "sha256": digest(image),
        "capturedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()})
    node_json("bundle.cjs", "verify-rollback", directory)
    print("Verified prior flash archive: {}".format(directory))


def restore_database(options):
    require(options.confirm_restore, "Review the replacement and supply --confirm-restore")
    source, current = Path(options.input).resolve(), Path(options.current_backup).resolve()
    require(current.is_file() and current.stat().st_size and not current.samefile(source),
            "Keep a separate nonempty copy of current records before restoring different data")
    # AI-modified (Codex): require a usable rollback database before opening a network connection.
    node_json("validate-database.cjs", current)
    node_json("validate-database.cjs", source)
    request = urllib.request.Request(controller_base(options.controller) + "/api/database/restore?confirm=restore",
                                     data=source.read_bytes(), method="POST",
                                     headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=20) as response:
        reply = json.load(response)
    require(isinstance(reply, dict) and reply.get("ok") is True,
            "Restore unconfirmed; reload and check records before retrying")
    print("Controller confirmed the restore. Reload the operator pages and verify records.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    build_parser = commands.add_parser("build", help="Run software checks and build an ESP32 release without uploading")
    build_parser.add_argument("--mode", choices=("Upgrade", "Provision"), default="Upgrade")
    build_parser.add_argument("--database-backup")
    build_parser.add_argument("--output", default="releases")
    build_parser.set_defaults(action=build)
    upload = commands.add_parser("deploy", help="Verify and explicitly upload an ESP32 release")
    upload.add_argument("--bundle", required=True)
    upload.add_argument("--part", choices=("Firmware", "Filesystem"), required=True)
    upload.add_argument("--port")
    upload.add_argument("--current-backup")
    upload.add_argument("--rollback-bundle")
    upload.add_argument("--rollback-archive")
    upload.add_argument("--confirm-upload", action="store_true")
    upload.add_argument("--dry-run", action="store_true")
    upload.set_defaults(action=deploy)
    export = commands.add_parser("backup-database", help="Export saved records from the controller")
    export.add_argument("--controller", required=True)
    export.add_argument("--output", required=True)
    export.set_defaults(action=backup_database)
    capture = commands.add_parser("backup-controller", help="Capture prior ESP32 flash for rollback")
    capture.add_argument("--port", required=True)
    capture.add_argument("--output", required=True)
    capture.add_argument("--confirm-read", action="store_true")
    capture.set_defaults(action=backup_controller)
    restore = commands.add_parser("restore-database", help="Validate and deliberately restore saved records")
    restore.add_argument("--controller", required=True)
    restore.add_argument("--input", required=True)
    restore.add_argument("--current-backup", required=True)
    restore.add_argument("--confirm-restore", action="store_true")
    restore.set_defaults(action=restore_database)
    options = parser.parse_args()
    options.action(options)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
