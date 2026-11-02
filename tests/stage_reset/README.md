<!-- Stage-reset regression checks (AI-assisted with Codex). -->
# Stage reset regression checks

Run from the repository root with MinGW/C++17, after `pio run` installs ArduinoJson:

```powershell
g++ -std=c++17 -I tests/stage_reset/mocks -I include -I .pio/libdeps/esp32/ArduinoJson/src tests/stage_reset/runner.cpp -o "$env:TEMP\cpd-stage-reset-tests.exe"
& "$env:TEMP\cpd-stage-reset-tests.exe"
```

Ten scenario groups run the production runner with a simulated clock, notifications,
in-memory JSON and HAL cooldowns. They cover replay/timing, ordinary Resume, nested pauses,
repeated stages/requests, target-facing waits, Stop races (including after replay is ready), invalid requests, failures,
assigned/random targets, restricted selections, late notifications, defective exclusion and cleanup.
No device/database is modified.

Validation completed: firmware build, native tests, JavaScript syntax, and headless Edge
against a local mock API (full-drill Start/target picker, buttons, duplicates, pending/ready refresh,
countdown/cancel, rejected/failed resets, accurate failure feedback,
mobile wrapping and defective toggle/persistence/filtering). The one-off browser harness
is kept outside the repository; these checks do not establish hardware behavior.

Local webpage testing: serve `data/` over HTTP on localhost and open
`/targets.html?test=1`. The server must serve JavaScript with a JavaScript MIME type
and support the vendored `.gz` assets with `Content-Encoding: gzip`. A yellow banner
confirms testing mode; Clear test data resets the tab's test records and Exit test mode
returns to controller mode. Wi-Fi changes and officer edits require the controller.
Browser checks cover all five Pistol qualification stages, stage replay, real desktop/mobile
clicks, stale manual-mode recovery, and control colors. Reload existing tabs after changes.

Device/browser integration still required:

- Run `Stage 1 -> Pause -> Stage 2` (3000/8000 ms); reset at the boundary and during Stage 2.
  Verify full-stage replay, unchanged earlier progress and normal Resume's remaining delay.
- Check nested pauses, repeated stages, refresh, duplicates and countdown cancellation.
- Verify hiding before replay, mechanical cooldowns, Stop priority/latch recovery and hardware errors.
- Verify defective persistence, grey/unavailable display, assignment rejection, and filter exclusion.

Deployment needs matching firmware/frontend. `uploadfs` replaces saved LittleFS records;
preserve them before an authorized upload. No upload, commit or push is part of these checks.
