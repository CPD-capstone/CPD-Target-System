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

`platformio.ini` currently targets `ttgo-lora32-v21` as a temporary board; the real board is `esp32doit-devkit-v1`.

## Architecture

Module per concern, each with a header in `include/` and implementation in `src/` (note: `web_server.h` ↔ `src/webserver.cpp`):

- **wifi_manager** — Starts a soft AP (`SSID "CPD Range Control"`). Password persisted in NVS via `Preferences` (namespace `wifi_config`, key `ap_pass`), defaulting to `DEFAULT_PASSWORD`. Passwords < 8 chars are rejected (WPA2 minimum).
- **webserver** — `ESPAsyncWebServer` + a `DNSServer` wildcard that resolves every hostname to the AP IP (captive portal). `/`, `/generate_204`, and `/redirect` serve `targets.html`; everything else is served statically from LittleFS. `loop()` only pumps DNS via `processCaptivePortalDNS()`.
- **database** — LittleFS-backed JSON store in `/database.json`. Each CRUD function loads the whole file, mutates it, and writes atomically (write `/database.tmp` → remove → rename). Most CRUD functions are not declared in `database.h` yet.
- **hal** — Hardware layer. Two MCP23S17 SPI I/O expanders drive relay boards (MCP1 = targets 1–16 on ports A/B, MCP2 = targets 17–20 on GPA0–3). The range has exactly **20 targets** — use `NUM_TARGETS` (`hal.h`), never a literal. SPI is on the VSPI pins (SCK 18, MISO 19, MOSI 23) with CS on GPIO 16/17, chosen for the DevKit V1; avoid GPIO 6–11 (flash) and strapping pins (0, 2, 5, 12, 15). Pin map and DB25 field-connector wiring are documented in `pins.h`.
- **target_manager** — Drill execution API for the web layer: `executeDrill(name, targetMask)`, `resumeDrill()`, `stopDrill()`, `getDrillState()`. `executeDrill` reads `/database.json` (filtered to `drills` + `targets`), recursively inlines nested drills into a flat step list, excludes targets with `working: false`, and hands the list to a persistent `DrillRunner` task (core 1, priority 4). The runner sleeps on FreeRTOS task notifications (START/RESUME/STOP bits) so `pause` waits for the operator and stop interrupts any delay; it always hides the drill's targets when it finishes or is stopped. Drill delays are timed from when targets are *fully facing*: after `present`, the runner waits until `hal_getTargetStates()` shows every target fired, then `TARGET_FACE_TRAVEL_MS` (`hal.h`, not yet measured — currently 0). Wiring these calls to the web server belongs to another team member.

### Target actuation flow (cross-core)

Nothing outside `hal.cpp` touches SPI or the queue directly — use `hal_sendCommand(targetMask, newState)` and `hal_getTargetStates()`. Targets are handled as 20-bit masks (bit 0 = target 1; `targetBit(n)`), so one `TargetCommand` moves a whole group. `SolenoidControlTask` (core 1, priority 5) applies queued commands to a desired mask every 10 ms, flips only targets past the per-target `MECHANICAL_BUFFER` (500 ms) cooldown — this prevents shearing the target pins — and writes each expander in one SPI transaction so a group flips simultaneously.

`hal_init()` is currently commented out in `setup()` pending hardware testing, so the solenoid task does not run.

### Web UI (`data/`)

Static pages (`targets.html`, `drills.html`, `uspsa-target-status.html`) share `script.js` / `style.css`. The frontend currently reads `database.json` directly via `fetch`; there are no REST/WebSocket endpoints yet (`ws` is declared `extern` in `web_server.h` but never defined). Bootstrap and icons load from jsDelivr CDN, which won't resolve for clients on the offline AP — the fix (vendor gzipped copies into `data/vendor/`) is described in a comment in each page's `<head>`.

## Database schema

`data/database.json` is the **authoritative** schema: top-level arrays `Officers` (keyed by `BadgeNum`, with `pistol/rifle/swatQualScores` as newest-first `[score, "YYYY-MM-DD"]` pairs), `drills` (`drillName` + `sequence` of steps whose `action` is `present`/`hide`/`pause`/`delay`+`timeMs`, or another drill's name for composite "Full Drill" entries), and `targets` (`{id, working}`). `src/database.cpp` still targets an older object-keyed schema and is owned by another team member — do not modify its code; its header comment and per-function `SUGGESTED CHANGE` comments describe the migration.

## Known issues

- `onNotFound` serves `/index.html`, which no longer exists (old name of the landing page); see TODO in `webserver.cpp`.
- The temporary TTGO LoRa32 board's onboard radio shares some of the new SPI pins; do hardware testing on the DevKit V1.

## Team conventions

- Five-person team; work happens on feature branches (`hardware`, `backend`, `drill_changes`, …) merged toward `main` via PRs.
- The PR template (`.github/PULL_REQUEST_TEMPLATE.md`) requires AI-use disclosure: tool/model, files touched, and the exact prompts, and AI-generated or AI-modified code must be **identified with comments**. When writing code here, mark AI-generated sections with a comment so the author can fill in the PR template accurately.
- Functions are documented with `/// @brief` / `@param` / `@return` Doxygen comments in headers.
- Never commit or push unless the user explicitly asks.
