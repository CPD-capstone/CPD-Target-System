# CPD Range Target System — Hardware Context & Decision Log

Handoff summary from a separate Claude chat session (hardware design, parts selection,
diagramming) for the Claude Code instance working on firmware. Covers everything
decided about the physical system so firmware assumptions can be checked against it.

## Project overview

Rebuild of a pneumatic pop-up target system for a police department gun range
(Cookeville PD). Original system (Action Target, 1995, ET-2800 controller) is dead —
one of its boards was accidentally damaged (fried PCB trace) during initial
troubleshooting and is not being reused. This is a from-scratch rebuild: ESP32 +
SPI I/O expanders + relay boards + MAC pneumatic solenoid valves, driving 20 targets.

Control electronics live in an **indoor control tower**, ~50 yards from the targets.
Two existing waterproof enclosures are already in place at the target end (reused from
the old system). The 50-yard field wiring (shared ground return) is the **original
1995 buried cable**, reused as-is — it was confirmed to have already carried this
exact load (20 solenoids, same current) for ~30 years, so it was not resized or
replaced. No new wire gauge was purchased for that run.

## Core component list (as currently purchased/planned)

| Component | Qty | Notes |
|---|---|---|
| ESP32 dev board | 1 | **See "Open discrepancy" below** — this chat spec'd an official Espressif ESP32-DevKitC-32E (38-pin) for pin-labeling reliability, replacing an earlier ambiguous "DOIT clone" board. Reasoning: DOIT-clone boards exist in 30/36/38-pin variants with inconsistent silkscreen labeling. |
| MCP23S17 (SPI I/O expander) | 2 | Bare **MCP23S17-E/SP** DIP-28 chips (from microchipdirect.com), each in a 28-pin DIP socket (swappable), NOT the $14 "EXPAND Click" breakout board — switched to bare chip + socket for ~$12/chip savings, consistent with the project's overall "everything socketed/swappable" philosophy. |
| 0.1 µF ceramic decoupling capacitor | 2 | One per MCP23S17, wired directly across VDD/VSS pins (in parallel, as close to the pins as possible — NOT in series with the power line). Confirmed part: SparkFun COM-08375-style 0.1µF ceramic, through-hole. |
| Relay modules | 3 | **SainSmart 8-Channel Relay Module, ASIN B0057OC5WK** (Songle SRD-05VDC-SL-C relay, opto-isolated). VCC–JD-VCC jumper **removed** on all three boards to enable true opto-isolation. VCC → 3.3V (logic/opto side), JD-VCC → 5V (relay coil side, separate feed). |
| Step-down regulator | 1 | **Pololu D24V50F5** — fixed 5V output, 5A continuous, synchronous buck. Chosen over generic adjustable LM2596/MP1584/Mini-360 modules specifically to avoid trimpot drift under vibration. Pinout: VIN, GND, OUT, GND, EN (EN left unconnected — pulled high internally by default, always-on). |
| Main PSU | 1 | **Tripp Lite PR-40** — 13.8VDC (not literal 12V; standard automotive/radio "12V" nominal), 40A peak / 32A continuous, linear regulated, 120VAC input. Has a built-in 10A front-panel fuse (twist-lock glass fuse holder, not an adjustable current dial). |
| Per-channel diode | 20 | **1N4007**, flyback suppression across each solenoid coil. Orientation (see Wiring/Protection section below) is critical and was corrected once already (see Known bugs already caught, below). |
| Per-channel MOV | 20 | **S14K25** (20V-rated, non-polarized), added as fast-clamping backup alongside the diode, given the 50-yard cable run could pick up induced transients beyond just the solenoid's own switching spike. |
| Reused 3A glass fuses | 20 (+ spares) | Cannibalized from the original 1995 board, along with their PCB-mount leaf-spring fuse clips. Per-channel fuse, sized well above the ~0.23A per-solenoid draw (large margin, catches real faults without nuisance-tripping). |
| Connector (field disconnect) | 2× 12-position | **ZBLZGP SP21 12-pin, ASIN B0BMPTBK4P** (~$11.60 each). Panel mount, IP68, solder-terminal (NOT crimp — confirmed from listing: "wire connection is by solder terminals"). Rated 5A/pin, 400V, accepts up to 18AWG. Two of these (24 positions) cover 20 switched "hot" channels + a **ground return split across 2–3 spare positions** (to avoid overloading a single 5A-rated pin with the ~4.6A worst-case combined return current). This connector is also the **primary lightning-mitigation strategy**: physically disconnect it when the range is not in use / before storms, rather than a full grounding/surge-protection system (which was deliberately scoped out as a job for a licensed professional under NFPA 780, not a DIY addition — this was an explicit, documented decision, not an oversight). |
| MAC solenoid valves | 20 | **MAC Model 46A-AA2-JDDA-1BA**, 12VDC nominal, 2.4W. Measured coil resistance: **62.6Ω both directions** → confirmed non-polarized (plain coil, no internal LED/diode). Calculated current at actual PSU voltage (~14.2V): ~0.227A per solenoid. Pilot valves — they route compressed air to pneumatic cylinders, they do not move the target directly. |

## Wire gauge plan (backbone/branch sizing, finalized)

- **PSU → terminal block backbone (both 13.8V hot and its ground return): 20 AWG stranded.** (Originally spec'd 16AWG for this run; user made a deliberate, reasoned decision to downgrade to 20AWG given the load is intermittent/duty-cycled — not continuous — citing that the original 1995 system's wiring survived 30 years under the same real load. This was accepted as a legitimate engineering judgment call, not an error.)
- **Individual 12V branches (terminal block → relay COM, and relay NO → fuse → diode/MOV node → connector): 20 AWG stranded.** Each only carries one channel's ~0.23A.
- **Logic-level wire that stays on the perfboard (point-to-point between ESP32 and MCP23S17 pins): 24–26 AWG SOLID core.** Chosen specifically because it holds its shape/bends cleanly for board-level soldering and isn't subject to flex/vibration fatigue there.
- **Logic-level wire that runs BETWEEN separate boards (expander → relay board IN pins; regulator 5V output → ESP32/expander rail): 24–26 AWG STRANDED.** Chosen over solid-core specifically because these runs flex/get handled and stranded resists fatigue cracking.
- No new wire was purchased for the 50-yard field run (existing buried cable, reused as-is).
- Final wire gauge labels were **deliberately removed from the diagram itself** (kept out-of-diagram, in build notes / this doc) after an earlier revision had stale/contradictory gauge labels on it.

## Wiring / protection chain (per channel, ×20 — this is the part firmware doesn't need but a bench tester might)

```
Relay NO ──[3A fuse]──┬──────┬──── Connector → 50yd run → Solenoid lead #1
                       │      │
                    [1N4007] [S14K25 MOV]
                       │      │
Relay GND ─────────────┴──────┴──── Connector → 50yd run → Solenoid lead #2
```

- Fuse placement: **between relay NO and the diode/MOV node** (upstream of both), not after — so the fuse protects the diode/MOV/connector/cable/solenoid as a unit, and a failed diode or MOV doesn't sit unprotected.
- **Diode orientation (already corrected once in a prior diagram revision): cathode toward the NO/switched side, anode toward the GND/return side.** This makes the diode reverse-biased (idle) during normal energized operation, and only forward-biased (conducting) during the brief instant the relay opens and the solenoid's collapsing field reverses polarity. The diagram had this backwards in an earlier revision (v2) and was corrected in v2.2 — worth re-verifying visually on any diagram this Claude Code instance produces or touches, since it's an easy thing to silently regress.
- MOV is non-polarized, no orientation to worry about.
- Diode/MOV/fuse all live **at the control box end** (not at each solenoid, despite that being textbook-ideal placement) — a deliberate choice given the 50-yard run makes solenoid-end placement impractical (would mean disassembling steel targets to service). Trade-off was explicitly reasoned through and accepted: relay contacts (the most wear-prone part) get full protection either way since they're right next to the diode/MOV; the cable/connector see a secondary, smaller transient ripple, which the chosen hardware's voltage ratings comfortably absorb.

## Relay/expander channel mapping (as designed in this chat — cross-check against what the Code instance found in HAL)

- MCP23S17 #1, GPA0–GPA7 → Relay Module #1, IN1–IN8 → Targets 1–8
- MCP23S17 #1, GPB0–GPB7 → Relay Module #2, IN1–IN8 → Targets 9–16
- MCP23S17 #2, GPA0–GPA7 → Relay Module #3, IN1–IN8 → Targets 17–20 use GPA0–GPA3 (IN1–IN4); GPA4–GPA7/IN5–IN8 wired but **unused/no fuse populated** (spare capacity, matches "only 4 of module #3's relays are fused and used" from the Code instance's HAL read)
- MCP23S17 #2, GPB0–GPB7 → fully spare, nothing connected — reserved for future expansion (status LEDs, interlock switch, additional targets)
- Both chips: A0/A1/A2 tied to GND (not using hardware SPI addressing — each chip has its own dedicated CS line instead, a deliberate simplification over sharing one CS across both chips)
- Both chips: RESET tied to VDD (never held in reset)
- Both chips: VDD → 3V3, VSS → GND, plus 0.1µF decoupling cap across VDD/VSS as noted above

## SPI bus — OPEN DISCREPANCY, please reconcile

This chat's diagram work used the following SPI pin assignments (based on the
project's original wiring/diagram and an early code review in this conversation):

| Signal | GPIO (per this chat's diagram) |
|---|---|
| MOSI (expander SI) | 13 |
| MISO (expander SO) | 14 |
| SCK | 12 |
| CS, board #1 | 11 |
| CS, board #2 | 10 |

**The Code instance's message (which prompted this summary) reports `pins.h` actually
uses a completely different set: SCK=18, MISO=19, MOSI=23, CS1=16, CS2=17** — and
correctly flags that GPIO 10/11 are wired to internal flash on this chip (using them
crashes the board) and GPIO 12 is a boot-mode strapping pin (dangerous if held high at
reset). **The Code instance's assessment is very likely correct and should be trusted
over this chat's older diagram** — this chat's GPIO 10/11/12 assignment was carried
over from an earlier phase of the project and was flagged, in this chat, as needing a
board change specifically to get away from strapping-pin/flash-pin conflicts. It looks
like `pins.h` was already updated to safe pins (18/19/23/16/17) independent of this
chat's diagram, and the **diagram simply never got updated to match** — this is a
diagram bug, not a firmware bug. Whoever updates the diagram next should pull the
pin numbers from `pins.h`, not from this chat's history.

## Board — also an open discrepancy

This chat's diagram specifies an **ESP32-DevKitC-32E** (official Espressif, 38-pin,
PlatformIO board name `esp32dev`), chosen specifically to get away from an earlier
generic "DOIT clone" board with inconsistent/ambiguous pin labeling across
manufacturer variants. The Code instance reports `platformio.ini` currently says
`esp32doit-devkit-v1`. Since it's the same underlying ESP32 chip, none of the GPIO
assignments above are affected either way — but the project should settle on one
board and make the diagram and `platformio.ini` agree. This chat's recommendation
remains: buy/use the official DevKitC-32E and set `board = esp32dev`.

## Active-high vs. active-low relay trigger — KNOWN OPEN ITEM, explicitly deferred

This was discussed explicitly in this chat. When asked whether the SainSmart relay
boards are active-high or active-low, **the user made a deliberate call to assume
active-high in the wiring/diagram, on the explicit basis that it could be corrected
in firmware (or, they noted, "in air lines") if wrong** — this was never actually
bench-verified in this chat. The Code instance's independent assessment — that these
SainSmart/Songle-SRD boards are in fact active-LOW, and that the current HAL/firmware
assumes active-HIGH, creating a real bug (every relay energized at boot, inverted
present/hide logic) — is new information from the firmware side and is not
inconsistent with anything decided in this chat. **This chat never confirmed the
trigger polarity electrically; treat the Code instance's electrical/firmware analysis
as authoritative here, and follow its suggested bench test** (JD-VCC jumper removed,
board powered, tie one IN pin to GND, relay should click if active-low is correct).

## Fail-safe behavior on power loss — confirmed consistent

This chat's hardware design uses the relay's **normally-open (NO)** contact to switch
power to each solenoid, and the MAC valves are spring-return pilot valves. This means
**any loss of power — full system power loss, or just the 13.8V/5V rail — results in
every relay de-energizing and every target dropping/hiding**, which was the intended
fail-safe direction (targets should default to hidden/safe, not exposed, on any power
interruption). This matches the Code instance's own analysis exactly. The one
scenario this chat did not specifically analyze is the Code instance's point about an
**ESP32-only reset/brownout while the expanders stay powered** — in that case relay
state would hold at whatever it last was until firmware restarts, at which point
correct startup-sequencing in `initSPI()` (writing the all-off pattern *before*
switching pins to outputs) becomes the thing that determines safe behavior. This
chat did not design or review that startup sequencing — that is purely a firmware
concern for the Code instance to own.

## 3.3V rail loading — flagged by Code instance, not independently verified in this chat

The Code instance raises a good point this chat did not explicitly calculate: all
three relay boards' opto-isolator/logic sides (VCC) are powered from the ESP32
DevKit's own onboard 3.3V regulator (not from the Pololu 5V rail, which only feeds
JD-VCC/coil power). This chat separately calculated worst-case 5V-rail current
(~2.2A against the Pololu's 5A rating, comfortable margin) but did **not** separately
budget the 3.3V rail's opto-isolator LED current across 20+ active channels plus the
ESP32's own WiFi current draw against the DevKit's small onboard 3.3V regulator's
capacity. This is a legitimate open item — worth measuring on real hardware as the
Code instance suggests, and if there's a real deficit, worth considering feeding the
relay boards' VCC from a separate, more capable 3.3V source rather than the DevKit's
onboard regulator.

## Mechanical buffer — required per-target cooldown

Added after this summary was written (not discussed in the hardware chat). Flipping the
same target again too soon **shears its pins**, so the firmware enforces a minimum time
between two actuations of the same target (`MECHANICAL_BUFFER` in `hal.h`). It is tracked
per target, so other targets are unaffected, and a flip requested too soon is delayed, not
dropped. The **buffer itself is mandatory**; the current **500 ms** value is an arbitrary
safe margin, not a measured limit, and may be tuned on the real targets.

## Resolution of the open items above (from the firmware side, 2026-09-29)

- **SPI pins:** `pins.h` (SCK 18, MISO 19, MOSI 23, CS 16/17) is authoritative and was
  checked against Espressif's DevKitC V4 pin tables. All five are on header J3: MOSI J3-2,
  MISO J3-8, SCK J3-9, CS2 J3-11, CS1 J3-12 (GND J3-1/J3-7, 3V3 J2-1). The old GPIO 10/11
  are the board's D3/CMD flash pins. Diagram v3.6 is updated to these pins and adds 10 kΩ
  pull-ups on both CS lines (to 3V3) so the expanders stay deselected while the ESP32 boots.
- **Board:** settled on the ESP32-DevKitC-32E; `platformio.ini` now uses `board = esp32dev`.
- **Relay polarity:** firmware now assumes active-low (`RELAY_ACTIVE_LOW` in `pins.h`),
  inverts the outputs in one place, and loads the all-off pattern *before* switching the
  expander pins to outputs so no relay energizes at boot. Still to bench-verify.
- **Air-line polarity:** already plumbed correctly (unpowered valve = hidden). Only the
  relay boards' electrical polarity varies, and all three will be physically matched.
- **Relay logic supply (VCC):** moved from 3.3 V to the Pololu 5 V rail (diagram v3.5+). At
  3.3 V the SainSmart input's two series LEDs (indicator + opto) through ~1 kΩ would get only
  ~0.3 mA, likely too little to switch reliably. This also resolves the 3.3 V rail-loading item.
- **Expander detection:** the Adafruit library's `begin_SPI()` never talks to the chip, so a
  missing expander went unnoticed. The HAL now reads registers back from both chips at
  startup and every second; on failure it stops driving the relays and reports the hardware
  as not ready until reboot.
- **Spare relays:** MCP #2 GPA4–7 (relay #3 IN5–8) are now driven as outputs held off
  instead of floating.
- **Field connectors:** the pin-to-target assignment is unknown until the unlabeled field
  wires are traced on site; `pins.h` holds a placeholder table marked as dummy data.
- **Diode orientation:** confirmed correct on v3.4 (cathode toward the NO side).
- **Stop button:** there will be no physical stop button (distance from the tower); Stop
  exists only in the web UI, and it freezes targets in place rather than hiding them.

## Enclosure / mounting (physical build context, not firmware-relevant but included for completeness)

- Control electronics: standard (non-weatherproof) project enclosure, since it's indoors in the control tower.
- Perfboard (not custom PCB, not breadboard) hosts the ESP32 (via female header sockets, so it's swappable) and both MCP23S17s (via DIP sockets).
- Nylon M3 standoffs mount the perfboard to the enclosure.
- Terminal blocks (screw-type, various sizes 6/10/12-position) handle all bus distribution (13.8V, 5V, GND) rather than point-to-point wiring for power.
- Spares budgeted: +1 ESP32, +1 MCP23S17, +10 extra diodes, +10 extra MOVs, extra crimp contacts/ferrules — cheap insurance against build-time damage or a repeat of the original board's fried-trace incident.

## Where to find more detail

The full design conversation (parts selection reasoning, wiring diagrams v1 through
v3.4, multimeter usage, connector research, terminal block sizing, etc.) lives in a
separate Claude.ai chat session that this Code instance cannot access directly. This
document is a best-effort summary of everything in it relevant to firmware/electrical
correctness. If a question comes up that isn't answered here, it's reasonable to flag
it back to the user rather than guess.

## Switch to ESP32-S3 (2026-10-01)

- **Board:** the project moved from the ESP32-DevKitC-32E to a **Hosyond ESP32-S3** dev
  board (3-pack, DevKitC-1 pin layout, 44-pin) with an ESP32-S3-WROOM-1 **N16R8** module
  (16 MB flash, 8 MB octal PSRAM). `platformio.ini` uses `board = esp32-s3-devkitc-1`
  with 16 MB flash, `qio_opi` memory type and the 16 MB partition table. Flash and
  monitor through the USB-C port labeled COM/UART. Pin labels are on the bottom of the PCB.
  GPIO 33-37 are taken by the octal PSRAM and must not be used.
- **SPI pins (`pins.h`, authoritative):** the S3's FSPI pins — CS1 GPIO 10 (J1-16),
  MOSI GPIO 11 (J1-17), SCK GPIO 12 (J1-18), MISO GPIO 13 (J1-19), CS2 GPIO 14 (J1-20);
  3V3 J1-1, GND J1-22. On the S3 none of these is a flash or strapping pin (the earlier
  objection to GPIO 10–12 applied only to the classic ESP32). The 10 kΩ CS pull-ups stay.
  The wiring diagram (v3.6) still shows the classic-ESP32 pins and needs updating.
