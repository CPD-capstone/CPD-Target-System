#ifndef PINS_H
#define PINS_H

#include <Arduino.h>

// =============================================================================
// ESP32 (Espressif ESP32-DevKitC-32E / ESP32-WROOM-32E) HARDWARE PIN DEFINITIONS
// =============================================================================
// AI-assisted (Claude): pins reassigned. The old map (MOSI 13, MISO 12, SCK 14,
// CS 10/11) was written for an ESP32-S3. On a classic ESP32, GPIO 6-11 are wired
// to the SPI flash (using them crashes the chip) and GPIO 12 is a boot strapping
// pin (if held high at reset it sets flash voltage to 1.8V and boot fails).
// SPI now uses the native VSPI pins; CS uses GPIO 16/17, which are not strapping
// pins and are idle during boot.
// NOTE: the range wiring diagram (docs/architecture, v3.6) matches these pins and adds
// 10k pull-ups on both CS lines. If the two ever disagree, THIS FILE is authoritative.
// NOTE: GPIO 16/17 are free on the WROOM-32E module. Do not move to a WROVER-based
// board without changing the CS pins: WROVER modules use GPIO 16/17 for PSRAM.
// AI-assisted (Claude): header positions below are checked against Espressif's
// ESP32-DevKitC V4 user guide. Every SPI signal is on header J3 (the side with IO23 at the
// top); J3-1 and J3-7 are GND and 3V3 is J2-1. Pins to AVOID on this board: J2-16/17/18
// and J3-17/18/19 (labeled D0-D3/CMD/CLK = GPIO 6-11, the flash chip), and the strapping
// pins IO0, IO2, IO5, IO12, IO15.

// SPI Bus Pins (Shared between both MCP23S17 I/O Expanders)
#define PIN_SPI_MOSI    23  // J3-2  "IO23" -> SI  (Pin 13) on both MCP23S17 chips
#define PIN_SPI_MISO    19  // J3-8  "IO19" -> SO  (Pin 14) on both MCP23S17 chips
#define PIN_SPI_SCK     18  // J3-9  "IO18" -> SCK (Pin 12) on both MCP23S17 chips

// Dedicated Chip Select (CS) Pins
#define PIN_MCP1_CS     16  // J3-12 "IO16" -> CS (Pin 11) on board #1 -> Controls Targets 1-16
#define PIN_MCP2_CS     17  // J3-11 "IO17" -> CS (Pin 11) on board #2 -> Controls Targets 17-20

// Hardware SPI Address Configuration
// Note: A0, A1, A2 are hardwired to GND on both chips in hardware, and RESET is tied to VDD.
// Each chip has its own CS line, so hardware addressing (HAEN) is not used.
#define MCP_HW_ADDRESS  0x20

// =============================================================================
// RELAY BOARD INPUT POLARITY
// =============================================================================
// AI-assisted (Claude): the relay boards are SainSmart 8-channel modules (Songle
// SRD-05VDC-SL-C, opto-isolated, VCC-JD-VCC jumper removed). These energize a relay
// when its IN pin is pulled LOW (active-low). hal.cpp applies this in ONE place
// (writeOutputs()); everything else in the firmware works in "1 = energized = target
// facing" terms. Set to 0 only if a bench test shows the boards are active-high.
// TODO: bench-verify -- with the board powered, tie one IN pin to GND; the relay
// should click if this is correct.
//
// All three relay boards are to be physically matched so one setting covers all of them.
//
// This setting only covers the ELECTRICAL polarity of the relay inputs. The air lines are
// plumbed so an UNPOWERED valve HIDES its target (verified), which is what makes the
// targets hide on power loss. Keep it that way: firmware cannot make an unpowered valve safe.
#define RELAY_ACTIVE_LOW 1

// =============================================================================
// EXPANDER PIN CHANNEL MAPPINGS
// =============================================================================

// MCP23S17 #1 (Targets 1 - 16)
// -----------------------------------------------------------------------------
// Relay Module #1 (Targets 1 - 8) -> MCP1 Port A -> Relay #1 IN1-IN8
#define TARGET_1_PIN    0   // GPA0 (Pin 21)
#define TARGET_2_PIN    1   // GPA1 (Pin 22)
#define TARGET_3_PIN    2   // GPA2 (Pin 23)
#define TARGET_4_PIN    3   // GPA3 (Pin 24)
#define TARGET_5_PIN    4   // GPA4 (Pin 25)
#define TARGET_6_PIN    5   // GPA5 (Pin 26)
#define TARGET_7_PIN    6   // GPA6 (Pin 27)
#define TARGET_8_PIN    7   // GPA7 (Pin 28)

// Relay Module #2 (Targets 9 - 16) -> MCP1 Port B -> Relay #2 IN1-IN8
#define TARGET_9_PIN    8   // GPB0 (Pin 1)
#define TARGET_10_PIN   9   // GPB1 (Pin 2)
#define TARGET_11_PIN   10  // GPB2 (Pin 3)
#define TARGET_12_PIN   11  // GPB3 (Pin 4)
#define TARGET_13_PIN   12  // GPB4 (Pin 5)
#define TARGET_14_PIN   13  // GPB5 (Pin 6)
#define TARGET_15_PIN   14  // GPB6 (Pin 7)
#define TARGET_16_PIN   15  // GPB7 (Pin 8)


// MCP23S17 #2 (Targets 17 - 20)
// -----------------------------------------------------------------------------
// Relay Module #3 (Targets 17 - 20) -> MCP2 Port A -> Relay #3 IN1-IN4
#define TARGET_17_PIN   0   // GPA0 (Pin 21)
#define TARGET_18_PIN   1   // GPA1 (Pin 22)
#define TARGET_19_PIN   2   // GPA2 (Pin 23)
#define TARGET_20_PIN   3   // GPA3 (Pin 24)
// GPA4-GPA7 (Pins 25-28) are wired to Relay #3 IN5-IN8, but those relays have no fuse
// and no solenoid (spare capacity). The firmware drives them as outputs held OFF so
// they are never left floating.
// GPB0-GPB7 are not connected (reserved: status LEDs, interlock switch, more targets).
// They stay as the chip's default inputs.

// =============================================================================
// FIELD CONNECTORS (2x ZBLZGP SP21, 12-position, solder terminal)
// =============================================================================
// AI-assisted (Claude): the field cable runs ~50 yards (original 1995 buried cable) from
// the control tower to the targets through two 12-pin panel connectors, 24 positions total:
// 20 switched +13.8V "hot" lines (one per target, from relay NO -> 3A fuse -> diode/MOV)
// and a shared solenoid ground return split across spare positions so no single 5A-rated
// pin carries the whole ~4.6A worst-case return current. The connectors are also the
// lightning mitigation: unplug them when the range is not in use.
//
// !!! DUMMY DATA !!! The real pin-to-target assignment is unknown until the field wires
// (unlabeled, run under concrete) are traced on site. The table below is a PLACEHOLDER
// layout only -- replace it once the wiring is identified.
/*
 * Connector A                          Connector B
 * Pin 1  --> Target 1  (MCP1 GPA0)     Pin 1  --> Target 11 (MCP1 GPB2)
 * Pin 2  --> Target 2  (MCP1 GPA1)     Pin 2  --> Target 12 (MCP1 GPB3)
 * Pin 3  --> Target 3  (MCP1 GPA2)     Pin 3  --> Target 13 (MCP1 GPB4)
 * Pin 4  --> Target 4  (MCP1 GPA3)     Pin 4  --> Target 14 (MCP1 GPB5)
 * Pin 5  --> Target 5  (MCP1 GPA4)     Pin 5  --> Target 15 (MCP1 GPB6)
 * Pin 6  --> Target 6  (MCP1 GPA5)     Pin 6  --> Target 16 (MCP1 GPB7)
 * Pin 7  --> Target 7  (MCP1 GPA6)     Pin 7  --> Target 17 (MCP2 GPA0)
 * Pin 8  --> Target 8  (MCP1 GPA7)     Pin 8  --> Target 18 (MCP2 GPA1)
 * Pin 9  --> Target 9  (MCP1 GPB0)     Pin 9  --> Target 19 (MCP2 GPA2)
 * Pin 10 --> Target 10 (MCP1 GPB1)     Pin 10 --> Target 20 (MCP2 GPA3)
 * Pin 11 --> Ground return             Pin 11 --> Ground return
 * Pin 12 --> Unused / spare            Pin 12 --> Unused / spare
 */

#endif
