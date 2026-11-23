"""AI-assisted (Codex): require the Python release guard tests to run and pass."""
from pathlib import Path
import sys
import unittest


def main():
    folder = Path(__file__).resolve().parents[2] / "tests/release"
    suite = unittest.defaultTestLoader.discover(str(folder), pattern="test_*.py")
    if not suite.countTestCases():
        print("No Python release guard tests were discovered", file=sys.stderr)
        return 1
    result = unittest.TextTestRunner().run(suite)
    return int(not result.wasSuccessful() or bool(result.skipped or result.expectedFailures))


if __name__ == "__main__":
    sys.exit(main())
