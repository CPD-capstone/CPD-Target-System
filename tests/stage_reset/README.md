<!-- Stage-reset regression checks (AI-assisted with Codex). -->
# Stage reset regression checks

Run from the repository root with a C++17 compiler, after `pio run` installs ArduinoJson:

```text
python tools/test_database.py --source tests/stage_reset/runner.cpp --mocks tests/stage_reset/mocks
```

<!-- AI-modified (Codex): use the portable host compiler runner and current part-replay contract. -->
The temporary executable runs on the development computer. The small Preferences
substitute keeps settings in memory; it does not access a controller's NVS.

Eleven scenario groups run the production runner with a simulated clock, notifications,
in-memory JSON and HAL cooldowns. They cover replay/timing, ordinary Resume, nested pauses,
repeated stages/requests, target-facing waits, Stop races (including after replay is ready), invalid requests, failures,
assigned/random targets, restricted selections, late notifications, defective exclusion, cleanup
and redoing the last stage from the final-stage hold (AI-added, Claude).
The ordinary Resume group also checks that redoing a standalone part replays its
full delay, while ordinary Resume preserves only the remaining delay.
No device/database is modified.

Validation completed: firmware build, native tests, JavaScript syntax, and headless Edge
against a local mock API (full-drill Start/target picker, buttons, duplicates, pending/ready refresh,
countdown/cancel, rejected/failed resets, accurate failure feedback,
mobile wrapping and defective toggle/persistence/filtering). The one-off browser harness
is kept outside the repository; these checks do not establish hardware behavior.

<!-- AI-modified (Codex): the local browser simulator has been removed. -->
Pages always use the controller API, including on localhost or with `?test=1`.
The retained [JavaScript and database tests](../../docs/testing/README.md) run
without a controller. The browser checks above describe earlier validation.

Device/browser integration still required:

- Run `Stage 1 -> Pause -> Stage 2` (3000/8000 ms); reset at the boundary and during Stage 2.
  Verify full-stage replay, unchanged earlier progress and normal Resume's remaining delay.
- Check nested pauses, repeated stages, refresh, duplicates and countdown cancellation.
- Verify hiding before replay, mechanical cooldowns, Stop priority/latch recovery and hardware errors.
- Verify defective persistence, grey/unavailable display, assignment rejection, and filter exclusion.

Deployment needs matching firmware/frontend. `uploadfs` replaces saved LittleFS records;
preserve them before an authorized upload. No upload, commit or push is part of these checks.
