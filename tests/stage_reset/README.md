<!-- Stage-reset regression checks (AI-assisted with Codex). -->
# Stage reset regression checks

This is an optional development-computer regression harness. Its C++ mock runtime,
clock, filesystem, and HAL substitutes are not compiled into the ESP32 firmware or
copied into the controller's website. It remains separate from the 49-group
database suite and the software release gate.

Run from the repository root on a development computer with a C++17 compiler,
after the project ArduinoJson dependency is available:

```text
python tools/release/test_database.py --source tests/stage_reset/runner.cpp --mocks tests/stage_reset/mocks
```

Thirteen scenario groups run the production runner with a simulated clock, notifications,
in-memory JSON, Preferences, and HAL cooldowns. They cover replay/timing, ordinary Resume, nested pauses,
repeated stages/requests, target-facing waits, Stop races (including after replay is ready), invalid requests, failures,
assigned/random targets, restricted selections, late notifications, defective exclusion, cleanup
redoing the last stage from the final-stage hold (AI-added, Claude), a drill without stages replaying
by part, plus persisted target-flip settings and their range boundaries.
No device or production database is modified by this command. The retained npm
unit/browser/preflight commands and Python release gate are also development-only
tools; see [the software test guide](../../docs/testing/README.md).

The maintained `npm run test:ui` browser suite has 48 checks across desktop Chromium,
Pixel 7 viewport/user-agent emulation in Chromium, and iPhone 13 WebKit emulation.
It covers manual target gating and fixture persistence, unavailable-target
exclusion, drill authoring, PDF creation, failed/stale saves, recovery information,
and layouts at 320/360/390/430 CSS pixels. These are host browser checks; emulation
does not establish real Android Chrome, iOS Safari, or target hardware behavior.

The browser suite starts `tests/ui/preview_server.py` and explicitly injects the
development adapter from `tests/fixtures/controller-test.js`. Neither file lives
in production `data/`. The deployed application always contacts its controller;
opening a URL with `?test=1` does not enable a simulation. See
[unit tests, validation, and guardrails](../../docs/testing/tests-validation-and-guardrails.md)
for the test boundaries and the controller's current RAM/storage protections.

Device/browser integration still required:

- Run `Stage 1 -> Pause -> Stage 2` (3000/8000 ms); reset at the boundary and during Stage 2.
  Verify full-stage replay, unchanged earlier progress and normal Resume's remaining delay.
- Check nested pauses, repeated stages, refresh, duplicates and countdown cancellation.
- Verify hiding before replay, mechanical cooldowns, Stop priority/latch recovery and hardware errors.
- Verify defective persistence, grey/unavailable display, assignment rejection, and filter exclusion.

Deployment needs matching firmware/frontend. `uploadfs` replaces saved LittleFS records;
preserve them before an authorized upload. No upload, commit or push is part of these checks.
