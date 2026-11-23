# Software test guide

See the [ESP32 and mobile operator change review](change-review.md) for the reasons behind the changes and the storage and recovery issues found during review.

The deployed application runs on the ESP32-S3 and in the operator's mobile browser. Python, Node, and the host compiler are development tools only. The checks below are portable and do not upload firmware, connect to the controller, or actuate targets.

For the complete explanation of the new suites, validation limits, and operator protections, see [Unit tests data validation and guardrails](tests-validation-and-guardrails.md).

## Unit and database checks

From the repository root:

```text
npm test
python tools/release/test_database.py
node tools/release/validate-database.cjs data/database.json --strict
node tools/release/validate-assets.cjs data
```

Use Node 24, Python, a C++17 compiler, and the project's installed ArduinoJson dependency. The database runner detects `c++`, `g++`, or `clang++`, or accepts the `CXX` environment setting. Its executable exists only in a temporary host directory; it is never flashed onto the ESP32.

Database checks exercise the production database implementation with an in-memory filesystem. They cover short writes, failed replacement, recovery, backups, schema boundaries, dates, score statistics, qualifications, and atomic drill edits. The native stage-reset/HAL suite remains outside this deployment gate.

## Browser checks

The pinned Playwright package and its Chromium/WebKit browser binaries must be installed. Install browser dependencies using Playwright's normal command for the development host when needed. No system Edge installation is required.

```text
npm run test:ui
npm run test:ui:desktop
```

The suite starts `tests/ui/preview_server.py` on localhost and blocks external page requests. It covers persistence, availability, drill authoring, PDF output, phone widths, failed and uncertain saves, repeated submissions, stale dialogs, versions, health, and compressed asset headers. The projects are desktop Chromium, Pixel 7 viewport/user-agent emulation in Chromium, and iPhone 13 WebKit emulation. Emulation does not replace real-phone checks.

The browser suite injects `tests/fixtures/controller-test.js` using a test-only helper. The fixture keeps writes in sessionStorage, leaving `data/database.json` unchanged. Neither the fixture nor the preview server belongs in `data/`, and a production page does not enable a simulator when given `?test=1`. The release gate selects a staged filesystem with `CPD_PREVIEW_DATA` and refuses to reuse an unrelated running preview.

## ESP32 build and release

```text
pio run -e esp32
pio run -e esp32 -t buildfs
python tools/release/release.py build --mode Upgrade --database-backup PATH_TO_CURRENT_DATABASE_BACKUP
```

The firmware and LittleFS commands build for the configured ESP32-S3. They do not upload. Use the [release and rollback procedure](deployment-and-rollback.md) for backups, reviewed deployment, and recovery. Physical phone and controller checks are listed separately in the [connected-device test list](connected-device-test-list.md).

## Audit evidence

The earlier [deployment safety audit](deployment-safety-audit.md) records pre-fix observations. Its historical reproduction harness prints observations, while the current tests assert the guarded behavior. Earlier UI bug reports remain in [bug_reports.txt](../../bug_reports.txt).
