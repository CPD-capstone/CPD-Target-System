"""AI-generated (Codex): portable host tests for ESP32 database code; no device access."""
import argparse
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="tests/database/runner.cpp")
    parser.add_argument("--mocks", default="tests/database/mocks")
    parser.add_argument("--database", default="data/database.json")
    options = parser.parse_args()
    configured = os.environ.get("CXX")
    compiler = shlex.split(configured) if configured else []
    if not compiler:
        found = next((shutil.which(name) for name in ("c++", "g++", "clang++") if shutil.which(name)), None)
        if not found:
            parser.error("A C++17 compiler is required; select it with CXX if necessary")
        compiler = [found]
    dependency = ROOT / ".pio/libdeps/esp32/ArduinoJson/src"
    if not (dependency / "ArduinoJson.h").is_file():
        parser.error("Install the PlatformIO project dependencies before running host checks")
    with tempfile.TemporaryDirectory(prefix="cpd-database-tests-") as temporary:
        # The host executable is temporary and never becomes an ESP32 release artifact.
        binary = Path(temporary) / "database-tests.bin"
        command = compiler + ["-std=c++17", "-I", str(ROOT / options.mocks), "-I", str(ROOT / "include"),
                              "-I", str(dependency), str(ROOT / options.source), "-o", str(binary)]
        subprocess.run(command, cwd=str(ROOT), check=True)
        subprocess.run([str(binary), str(ROOT / options.database)], cwd=str(ROOT), check=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, subprocess.CalledProcessError) as error:
        print("Database host checks failed: {}".format(error), file=sys.stderr)
        sys.exit(1)
