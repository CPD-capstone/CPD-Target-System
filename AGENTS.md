# AGENTS.md

This file provides working guidance for AI coding agents and contributors working in this repository. It captures the project’s architecture, workflow, design conventions, and the expected behavior for web UI updates to the target system.

## Project

ESP32 firmware for the Cookeville Police Department shooting range’s target control system, used for shooting qualifications. The ESP32 hosts its own WiFi access point and captive-portal web UI; range staff use it to raise/hide up to 24 solenoid-driven turning targets and run timed drills. Requirements and architecture references live in `docs/requirements/` and `docs/architecture/`.

## Core responsibilities by area

- `src/` and `include/` — ESP32 firmware and device-control logic
- `data/` — static frontend files for the captive portal web UI (`targets.html`, `drills.html`, `style.css`, `script.js`, and static assets like `uspsa-target.svg`)
- `docs/` — requirements, architecture, testing, maintenance, and design guidance
- `platformio.ini` — PlatformIO build configuration for the ESP32 firmware

## Build and deployment workflow

Run the firmware build and upload with PlatformIO:

```sh
pio run
pio run -t upload
pio run -t uploadfs
```

Important notes:
- Changes to anything under `data/` require `uploadfs`; firmware upload alone does not update the web UI.
- There is no test suite or linter configured for this project.
- `data/package.json` references `react-scripts`, but it is vestigial; the UI is currently plain HTML, CSS, and JavaScript using Bootstrap, not a modern frontend framework.
- The current board target is temporary; `platformio.ini` currently targets `ttgo-lora32-v21`, while the expected production board is `esp32doit-devkit-v1`.

## Architecture overview

### Firmware modules

Each module is split by concern, with headers in `include/` and implementations in `src/`.

- **wifi_manager** — Starts the soft AP, uses NVS/Preferences for configuration, and defaults to the range access point credentials.
- **webserver** — Hosts the captive portal and serves static files from LittleFS. It resolves hostnames to the AP IP and serves the target page via the ESP32’s embedded web UI.
- **database** — LittleFS-backed JSON store used for drills, targets, and officer data. Writes must be atomic and preserve the schema in `data/database.json`.
- **hal** — Hardware abstraction for the target solenoid and GPIO control layer.
- **target_manager** — Drill execution and target-state logic.

### Web UI

The frontend is static and lives under `data/`:

- `targets.html` — target control page
- `drills.html` — drill definition and library page
- `uspsa-target-status.html` — status page
- `script.js` — shared frontend logic
- `style.css` — shared project styling

The web UI currently reads `database.json` directly via `fetch`. There are no REST endpoints or a live WebSocket layer yet, and Bootstrap assets are currently loaded from jsDelivr CDN; the project notes describe a local vendor-based fix for offline AP use.

## Design and style constraints

Follow the project’s visual conventions and avoid introducing custom design language that conflicts with the existing Bootstrap-based UI.

### General rules
- Keep the interface clean, direct, and operational; this is a range-control tool, not a consumer app.
- Use simple state styling that is obvious at a glance.
- Red should be reserved for immediate action or high-severity warning states.
- Grey/neutral states should be used for unavailable or inactive states.
- Do not add decorative elements or clutter in the target representation.
- Keep controls deliberate and explicit; users should not accidentally trigger destructive or disabling actions.

### Defective target behavior
The defective-target feature is a key business requirement for this project. When implementing it, follow these rules:

1. A target can be marked as defective/unavailable.
2. The defect state must be visually distinct from the active drill/red state.
3. The target should remain visible in the grid, but should be clearly unavailable.
4. The defect control should be intentionally placed and clearly labeled, not incidental or easy to trigger accidentally.
5. The target should not be usable in odd, even, or random selection groups.
6. The target should still appear under the “All” view so staff can clearly see it is present but unavailable.
7. A defective target must be blocked from drill creation and drill editing.
8. The defective state should persist across refreshes using localStorage or an equivalent client-side persistence mechanism.
9. Accessibility is required: update aria labels and keyboard behavior to match the visual state.
10. Do not put a large warning icon in the middle of the target graphic; keep the target clean and minimal.

## Database schema and business rules

`data/database.json` is the authoritative schema. Treat it as the source of truth for:

- `Officers` records
- `drills` definitions
- `targets` working/availability state

Do not modify older legacy firmware code without explicit reason or team confirmation. The code in `src/database.cpp` is still tied to an older schema and is not the current target for new feature work unless directed by the project owner.

## Known issues and constraints

- `onNotFound` currently serves `/index.html`, which no longer exists; treat this as an existing issue, not a reason to introduce new routing patterns.
- The current hardware setup is still under testing; do not assume the target system is fully operational in firmware until hardware verification is complete.
- Do not assume all CSS/JS assets resolve when offline; this project is designed for use on the range’s own access point and should be resilient to those conditions.

## Team workflow conventions

- Work happens on feature branches and is merged toward `main` through PRs.
- Use small, focused changes and keep code readable.
- Prefer minimal, surgical edits over broad rewrites.
- Match the existing coding style and naming patterns in the repository.
- Do not commit or push unless the user explicitly asks.

## AI and automation guidelines

- AI-generated or AI-modified code must be identified clearly in comments when needed for the PR workflow.
- When modifying code, include enough context in comments or code structure to make the purpose obvious.
- Any prompt or tool usage that materially affects the repo should be traceable for the team.
- For this repository, always preserve the project’s hardware/firmware boundaries: do not mix frontend-only logic into low-level firmware code unless the task explicitly requires it.

## Quality bar for code changes

Any change should satisfy the following:

- minimal and direct
- consistent with existing Bootstrap patterns
- visually obvious and intentional
- safe for range staff to use under time pressure
- free from accidental state changes
- easy to validate by manual browser testing

## Manual validation expectations

For frontend changes, validate behavior in the browser by checking:

- target defect toggle works and is clear
- defective target is greyed out and unavailable
- target cannot be assigned to a drill when defective
- odd/even/random filters exclude defective targets
- All filter still shows defective targets
- refresh persistence works
- the UI is still readable and consistent under normal range conditions

## Example of the desired target-defect workflow

A staff user should be able to:

1. Open the target grid.
2. Toggle a target as defective with one clear, deliberate action.
3. See that the target is greyed out and unavailable.
4. Confirm that the target is excluded from random/odd/even selection.
5. Attempt to create a drill with that target number and receive a validation error.
6. Keep that mark after refreshing the page.

This is the intended pattern for target availability in the system: clear state, minimal confusion, and no accidental drill assignment.
