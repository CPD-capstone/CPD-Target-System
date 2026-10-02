# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ESP32 firmware for the Cookeville Police Department shooting range's target control system, used for shooting qualifications. It is a from-scratch rebuild of a dead 1995 Action Target pneumatic pop-up system: the ESP32 hosts its own WiFi access point and captive-portal web UI, and range staff use it to raise/hide **20** pneumatic turning targets and run timed drills. Requirements and the wiring diagram live in `docs/requirements/` and `docs/architecture/` (PDFs); the hardware design history is in `docs/AI/CPD_Range_System_Context.md` (summarized under **Physical system** below).

## Commands (PlatformIO)

```sh
pio run                      # build firmware (env: esp32)
pio run -t upload            # flash firmware
pio run -t uploadfs          # build + flash the LittleFS image from data/ (web UI + database.json)
pio device monitor           # serial monitor @ 115200
```

Changes to anything in `data/` require `uploadfs`; firmware upload alone does not update them. There is no test suite or linter configured. `data/package.json` references react-scripts but is vestigial — the UI is plain HTML/JS/Bootstrap with no build step.

`platformio.ini` targets `esp32-s3-devkitc-1`, configured for the board actually purchased: a **Hosyond ESP32-S3** dev board (DevKitC-1 pin layout, 44-pin) with an **ESP32-S3-WROOM-1 N16R8** module (16 MB flash, 8 MB octal PSRAM, so `memory_type = qio_opi` and the 16 MB partition table). The project moved here from the classic ESP32-DevKitC-32E (`esp32dev`). Flash and monitor through the USB-C port labeled **COM/UART**, not the native-USB port. Pin labels are printed on the bottom of the board.

## Physical system

What the firmware drives, and design decisions that constrain it. Hardware has not arrived yet, so nothing below is bench-verified.

- **Signal chain:** ESP32 → SPI → 2× MCP23S17 (bare DIP-28 chips, socketed) → 3× SainSmart 8-channel relay modules (Songle SRD-05VDC-SL-C, opto-isolated, VCC–JD-VCC jumper removed) → relay NO contact → 3 A fuse → 1N4007 flyback diode + S14K25 MOV (at the control box end, cathode toward NO — verified on the diagram) → field connectors → ~50-yard original 1995 buried cable → **MAC 46A-AA2-JDDA-1BA** 12 V pilot valves (62.6 Ω, ~0.23 A each), which route compressed air to each target's cylinder.
- **Power:** Tripp Lite PR-40 (13.8 V) → terminal blocks → relay contacts/solenoids; Pololu D24V50F5 (fixed 5 V, 5 A) → relay coil side (JD-VCC) **and** relay logic side (VCC). The ESP32 and both MCP23S17s (VDD) run from 3.3 V. At 5 V VCC, a 3.3 V HIGH from the MCP leaves too little voltage across the relay input's LEDs to light them, so HIGH = off and LOW = on.
- **Control location:** electronics sit indoors in the control tower, ~50 yards from the targets. **There is no physical stop button** (too far to run one); Stop exists only in the web UI.
- **Fail-safe direction:** an unpowered valve **hides** its target. The relay's normally-open contact plus spring-return valves mean any power loss hides every target — this is intended and relied on.
- **Relay polarity:** the SainSmart boards are active-low (IN pulled LOW = relay on), and all three will be physically matched. `RELAY_ACTIVE_LOW` in `pins.h` is applied only in `hal.cpp`'s `writeOutputs()`; everywhere else, a set mask bit means "valve powered = target facing." `initSPI()` loads the all-off pattern into the output latches **before** switching pins to outputs — otherwise every relay energizes at boot. Keep that order.
- **Air lines are plumbed so an unpowered valve hides its target (verified).** Never compensate for plumbing in firmware — firmware can't make an unpowered valve safe.
- **Channel map:** MCP1 GPA0–7 → relay #1 → targets 1–8; MCP1 GPB0–7 → relay #2 → targets 9–16; MCP2 GPA0–3 → relay #3 IN1–4 → targets 17–20. MCP2 GPA4–7 are wired to relay #3 IN5–8 but unfused/unused; the firmware drives them as outputs held off. MCP2 GPB0–7 are unconnected (reserved: status LEDs, interlock, expansion). Both chips: A0–A2 to GND, RESET to VDD, separate CS lines, 0.1 µF decoupling across VDD/VSS.
- **Field connectors:** 2× 12-pin ZBLZGP SP21 (24 positions: 20 target lines + ground return split across spares so no 5 A pin carries the ~4.6 A total). Unplugging them is the lightning mitigation — a full surge/grounding system was deliberately scoped out (NFPA 780, licensed professional). **The pin-to-target table in `pins.h` is dummy data**: the field wires are unlabeled and run under concrete, so they must be traced on site.
- **`MECHANICAL_BUFFER` (500 ms per target) is mandatory** — flipping a target again sooner shears its pins. The 500 ms value is an arbitrary safe margin and may be tuned, but the buffer must never be removed or bypassed.
- **SPI wiring:** `pins.h` uses the S3's FSPI pins — SCK 12, MOSI 11, MISO 13, CS 10 (board #1) / 14 (board #2), all on DevKitC-1 header J1 (pins 16–20) — with 10 kΩ pull-ups on both CS lines so the expanders stay deselected while the ESP32 boots. The wiring diagram must be updated to match (v3.6 still shows the classic-ESP32 pins 16/17/18/19/23). If the two ever disagree, `pins.h` is authoritative.

## Architecture

Module per concern, each with a header in `include/` and implementation in `src/` (note: `web_server.h` ↔ `src/webserver.cpp`):

- **wifi_manager** — Starts a soft AP (`SSID "CPD Range Control"`). Password persisted in NVS via `Preferences` (namespace `wifi_config`, key `ap_pass`), defaulting to `DEFAULT_PASSWORD`. Passwords < 8 chars are rejected (WPA2 minimum).
- **webserver** — `ESPAsyncWebServer` + a `DNSServer` wildcard that resolves every hostname to the AP IP (captive portal). `/`, `/generate_204`, and `/redirect` serve `targets.html`; `/api/*` goes to the REST API; everything else is served statically from LittleFS (unknown paths fall back to `targets.html`). `loop()` only pumps DNS via `processCaptivePortalDNS()`.
- **api** — JSON REST routes, registered by `registerApiRoutes()` before `serveStatic`. The route list is in `api.h`. ESPAsyncWebServer matches handlers in registration order and `/a` also matches `/a/b`, so sub-paths must be registered before their parents. JSON bodies need `Content-Type: application/json`. Unmatched `/api/*` returns a JSON 404.
- **database** — LittleFS-backed JSON store in `/database.json`. Each CRUD function loads the whole file, mutates it, and writes atomically (write `/database.tmp` → remove → rename). `get*` readers load only the needed section with an ArduinoJson filter.
- **hal** — Hardware layer for the expanders and relays (see **Physical system** for wiring). The range has exactly **20 targets** — use `NUM_TARGETS` (`hal.h`), never a literal. SPI is on the S3's FSPI pins (SCK 12, MOSI 11, MISO 13) with CS on GPIO 10/14; avoid GPIO 26–32 (flash/PSRAM), 33–37 (octal PSRAM on this N16R8 module), strapping pins (0, 3, 45, 46), 19/20 (USB) and 43/44 (UART0). Pin map, relay polarity and the (dummy) field-connector table are in `pins.h`.
- **target_manager** — Drill execution API for the web layer: `executeDrill(name, targetMask)` (returns a `DrillStartResult` reason), `pauseDrill()` (freezes the drill clock; a delay keeps its remaining time), `resumeDrill()`, `stopDrill()`, `resetTargets()`, `getDrillState()`, `getDrillStatus()` (name, step progress, last `DrillOutcome`, stop latch), and `setTargets(mask, present)` for manual raise/hide, which claims the same `runnerBusy` flag so it is refused while a drill runs. **`stopDrill()` is the operator's emergency stop and must never move a target**: it freezes the HAL via `hal_hold()` (discards queued commands and cooldown-pending flips, leaves outputs as-is), ends the drill without the usual final hide, and latches until `resetTargets()`, which releases the hold and hides all targets. `executeDrill` reads `/database.json` (filtered to `drills` + `targets`), recursively inlines nested drills into a flat step list, excludes targets with `working: false`, and hands the list to a persistent `DrillRunner` task (core 1, priority 4). The runner sleeps on FreeRTOS task notifications (START/RESUME/STOP/PAUSE bits) so `pause` waits for the operator and stop interrupts any delay; it hides the drill's targets when it completes or fails, but not after an emergency stop. Drill delays are timed from when targets are *fully facing*: after `present`, the runner waits until `hal_getTargetStates()` shows every target fired, then `TARGET_FACE_TRAVEL_MS` (`hal.h`, not yet measured — currently 0). Exposed over HTTP as `/api/stop`, `/api/reset`, `/api/drill/*` and `/api/targets/{present,hide,state}`.

### Target actuation flow (cross-core)

Nothing outside `hal.cpp` touches SPI or the queue directly (the expander objects are private to `hal.cpp`) — use `hal_sendCommand(targetMask, newState)` and `hal_getTargetStates()`. Targets are handled as 20-bit masks (bit 0 = target 1; `targetBit(n)`), so one `TargetCommand` moves a whole group. `SolenoidControlTask` (core 1, priority 5) applies queued commands to a desired mask every 10 ms, flips only targets past the per-target `MECHANICAL_BUFFER` cooldown, and writes each expander in one SPI transaction so a group flips simultaneously.

**Expander health check:** Adafruit's `begin_SPI()` never talks to the chip, so the HAL verifies each expander itself (`Expander` subclass in `hal.cpp` adds raw register access): at startup and every `HEALTH_CHECK_MS` (1 s) it round-trips test patterns through DEFVALA (unused — interrupts are never enabled) and reads back IODIR/OLAT against what it wrote. A failure (chip missing, or reset by a power glitch so its pins reverted to inputs) sets `expanderFailed`, and the solenoid task deletes itself **without writing anything** — a write into an unknown state could move targets. `hal_isReady()` then stays false until reboot, so drills fail, the API returns 503, and `/api/drill/status` reports `hardwareReady: false`.

`hal_init()` runs at the start of `setup()`. Hardware has not arrived, so the pin map, relay polarity and timing are unverified.

### Web UI (`data/`)

Static pages (`targets.html`, `drills.html`, `uspsa-target-status.html`) share `script.js` / `style.css`. The frontend still reads `database.json` directly via `fetch` and keeps edits in localStorage; it has not been moved to the `/api/*` routes yet. Drill status is **polled** from `GET /api/drill/status` (about every 500 ms while a drill is active, slower when idle); there is deliberately no WebSocket. Only one phone connects at a time, and captive-portal browsers often suspend or drop connections, which polling survives without any reconnect logic. Stop, Pause and Reset are ordinary POSTs, so the polling rate never delays them. Bootstrap and icons load from jsDelivr CDN, which won't resolve for clients on the offline AP — the fix (vendor gzipped copies into `data/vendor/`) is described in a comment in each page's `<head>`.

## Database schema

`data/database.json` is the **authoritative** schema: top-level arrays `Officers` (keyed by `BadgeNum`, with `pistol/rifle/swatQualScores` as newest-first `[score, "YYYY-MM-DD"]` pairs), `drills` (`drillName` + `sequence` of steps whose `action` is `present`/`hide`/`pause`/`delay`+`timeMs`, or another drill's name for composite "Full Drill" entries), and `targets` (`{id, working}`).

## Known issues / open items

- **Still to measure on hardware:** relay polarity (tie one IN to GND — it should click), `TARGET_FACE_TRAVEL_MS`, the field-connector pinout, and that the expander health check trips when a chip is pulled from its socket.
- An ESP32-only reset (crash/brownout) with the expanders still powered leaves relays in their last state until `initSPI()` runs, which then turns them all off (targets hide).

## Team conventions

- Five-person team; work happens on feature branches (`hardware`, `backend`, `drill_changes`, …) merged toward `main` via PRs.
- The PR template (`.github/PULL_REQUEST_TEMPLATE.md`) requires AI-use disclosure (tool/model, how it was credited, and files touched; prompts are not included), and AI-generated or AI-modified code must be **identified with comments**. When writing code here, mark AI-generated sections with a comment so the author can fill in the PR template accurately.
- Functions are documented with `/// @brief` / `@param` / `@return` Doxygen comments in headers.
- Never commit or push unless the user explicitly asks.
