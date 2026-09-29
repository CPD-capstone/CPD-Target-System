# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ESP32 firmware for the Cookeville Police Department shooting range's target control system, used for shooting qualifications. The ESP32 hosts its own WiFi access point and captive-portal web UI; range staff use it to raise/hide up to 24 solenoid-driven turning targets and run timed drills. Requirements and the architecture diagram live in `docs/requirements/` and `docs/architecture/` (PDFs).

## Commands (PlatformIO)

```sh
pio run                      # build firmware (env: esp32)
pio run -t upload            # flash firmware
pio run -t uploadfs          # build + flash the LittleFS image from data/ (web UI + database.json)
pio device monitor           # serial monitor @ 115200
```

Changes to anything in `data/` require `uploadfs`; firmware upload alone does not update them. There is no test suite or linter configured. `data/package.json` references react-scripts but is vestigial — the UI is plain HTML/JS/Bootstrap with no build step.

`platformio.ini` targets `esp32doit-devkit-v1` (ESP32 DevKit V1).

## Architecture

Module per concern, each with a header in `include/` and implementation in `src/` (note: `web_server.h` ↔ `src/webserver.cpp`):

- **wifi_manager** — Starts a soft AP (`SSID "CPD Range Control"`). Password persisted in NVS via `Preferences` (namespace `wifi_config`, key `ap_pass`), defaulting to `DEFAULT_PASSWORD`. Passwords < 8 chars are rejected (WPA2 minimum).
- **webserver** — `ESPAsyncWebServer` + a `DNSServer` wildcard that resolves every hostname to the AP IP (captive portal). `/`, `/generate_204`, and `/redirect` serve `targets.html`; `/api/*` goes to the REST API; everything else is served statically from LittleFS (unknown paths fall back to `targets.html`). `loop()` only pumps DNS via `processCaptivePortalDNS()`.
- **api** — JSON REST routes, registered by `registerApiRoutes()` before `serveStatic`. The route list is in `api.h`. ESPAsyncWebServer matches handlers in registration order and `/a` also matches `/a/b`, so sub-paths must be registered before their parents. JSON bodies need `Content-Type: application/json`. Unmatched `/api/*` returns a JSON 404.
- **database** — LittleFS-backed JSON store in `/database.json`. Each CRUD function loads the whole file, mutates it, and writes atomically (write `/database.tmp` → remove → rename). `get*` readers load only the needed section with an ArduinoJson filter.
- **hal** — Hardware layer. Two MCP23S17 SPI I/O expanders drive relay boards (MCP1 = targets 1–16 on ports A/B, MCP2 = targets 17–20 on GPA0–3). The range has exactly **20 targets** — use `NUM_TARGETS` (`hal.h`), never a literal. SPI is on the VSPI pins (SCK 18, MISO 19, MOSI 23) with CS on GPIO 16/17, chosen for the DevKit V1; avoid GPIO 6–11 (flash) and strapping pins (0, 2, 5, 12, 15). Pin map and DB25 field-connector wiring are documented in `pins.h`.
- **target_manager** — Drill execution API for the web layer: `executeDrill(name, targetMask)` (returns a `DrillStartResult` reason), `pauseDrill()` (freezes the drill clock; a delay keeps its remaining time), `resumeDrill()`, `stopDrill()`, `resetTargets()`, `getDrillState()`, `getDrillStatus()` (name, step progress, last `DrillOutcome`, stop latch), and `setTargets(mask, present)` for manual raise/hide, which claims the same `runnerBusy` flag so it is refused while a drill runs. **`stopDrill()` is the operator's emergency stop and must never move a target**: it freezes the HAL via `hal_hold()` (discards queued commands and cooldown-pending flips, leaves outputs as-is), ends the drill without the usual final hide, and latches until `resetTargets()`, which releases the hold and hides all targets. `executeDrill` reads `/database.json` (filtered to `drills` + `targets`), recursively inlines nested drills into a flat step list, excludes targets with `working: false`, and hands the list to a persistent `DrillRunner` task (core 1, priority 4). The runner sleeps on FreeRTOS task notifications (START/RESUME/STOP/PAUSE bits) so `pause` waits for the operator and stop interrupts any delay; it hides the drill's targets when it completes or fails, but not after an emergency stop. Drill delays are timed from when targets are *fully facing*: after `present`, the runner waits until `hal_getTargetStates()` shows every target fired, then `TARGET_FACE_TRAVEL_MS` (`hal.h`, not yet measured — currently 0). Exposed over HTTP as `/api/stop`, `/api/reset`, `/api/drill/*` and `/api/targets/{present,hide,state}`.

### Target actuation flow (cross-core)

Nothing outside `hal.cpp` touches SPI or the queue directly — use `hal_sendCommand(targetMask, newState)` and `hal_getTargetStates()`. Targets are handled as 20-bit masks (bit 0 = target 1; `targetBit(n)`), so one `TargetCommand` moves a whole group. `SolenoidControlTask` (core 1, priority 5) applies queued commands to a desired mask every 10 ms, flips only targets past the per-target `MECHANICAL_BUFFER` (500 ms) cooldown — this prevents shearing the target pins — and writes each expander in one SPI transaction so a group flips simultaneously.

`hal_init()` runs at the start of `setup()`; hardware bring-up on the DevKit V1 is in progress, so the pin map and timing are not yet verified on the real range.

### Web UI (`data/`)

Static pages (`targets.html`, `drills.html`, `uspsa-target-status.html`) share `script.js` / `style.css`. The frontend still reads `database.json` directly via `fetch` and keeps edits in localStorage; it has not been moved to the `/api/*` routes yet. There is no WebSocket (`ws` is declared `extern` in `web_server.h` but never defined), so drill status must be polled from `GET /api/drill/status`. Bootstrap and icons load from jsDelivr CDN, which won't resolve for clients on the offline AP — the fix (vendor gzipped copies into `data/vendor/`) is described in a comment in each page's `<head>`.

## Database schema

`data/database.json` is the **authoritative** schema: top-level arrays `Officers` (keyed by `BadgeNum`, with `pistol/rifle/swatQualScores` as newest-first `[score, "YYYY-MM-DD"]` pairs), `drills` (`drillName` + `sequence` of steps whose `action` is `present`/`hide`/`pause`/`delay`+`timeMs`, or another drill's name for composite "Full Drill" entries), and `targets` (`{id, working}`).

## Known issues

- On boot or reset (power loss, brownout, crash) every relay output is off, so every target moves to its valve-off position — even after an emergency stop. Firmware can't prevent this; it depends on the valve/relay hardware.

## Team conventions

- Five-person team; work happens on feature branches (`hardware`, `backend`, `drill_changes`, …) merged toward `main` via PRs.
- The PR template (`.github/PULL_REQUEST_TEMPLATE.md`) requires AI-use disclosure: tool/model, files touched, and the exact prompts, and AI-generated or AI-modified code must be **identified with comments**. When writing code here, mark AI-generated sections with a comment so the author can fill in the PR template accurately.
- Functions are documented with `/// @brief` / `@param` / `@return` Doxygen comments in headers.
- Never commit or push unless the user explicitly asks.
