#ifndef PINS_H
#define PINS_H

#include <Arduino.h>

// =============================================================================
// ESP32-S3 (Hosyond ESP32-S3 dev board, DevKitC-1 layout / ESP32-S3-WROOM-1 N16R8) PIN DEFINITIONS
// =============================================================================
// AI-assisted (Claude): pins reassigned for the move from the classic ESP32
// (DevKitC-32E) to the ESP32-S3. The SPI bus now uses the S3's FSPI IO_MUX pins
// (SCK 12, MOSI 11, MISO 13), which are also the Arduino core's default SPI pins on
// the S3. AI-modified (Claude): CS for board #1 is GPIO 14 and board #2 is GPIO 10, to
// match the as-built wiring. All five are on header J1, pins 16-20,
// in a row (3V3 is J1-1, GND is J1-22). This clone board prints its pin labels on the
// BOTTOM of the PCB -- check them there before wiring.
// None of GPIO 10-14 is a strapping pin on the S3, and none is used by flash or PSRAM.
// Keep the 10k pull-ups on both CS lines so the expanders stay deselected at boot.
// NOTE: the range wiring diagram (docs/architecture) must match these pins. If the two
// ever disagree, THIS FILE is authoritative.
// Pins to AVOID on the ESP32-S3-DevKitC-1:
//   - GPIO 26-32: SPI flash / PSRAM (not on the headers on most modules)
//   - GPIO 33-37: octal PSRAM (this board is an N16R8 module, so these are NOT usable)
//   - GPIO 0, 3, 45, 46: strapping pins
//   - GPIO 19/20: native USB D-/D+;  GPIO 43/44: UART0 TX/RX (serial monitor)
//   - GPIO 38 or 48: onboard RGB LED (depends on board revision)

// SPI Bus Pins (Shared between both MCP23S17 I/O Expanders)
#define PIN_SPI_MOSI    11  // J1-17 "11" -> SI  (Pin 13) on both MCP23S17 chips
#define PIN_SPI_MISO    13  // J1-19 "13" -> SO  (Pin 14) on both MCP23S17 chips
#define PIN_SPI_SCK     12  // J1-18 "12" -> SCK (Pin 12) on both MCP23S17 chips

// Dedicated Chip Select (CS) Pins
#define PIN_MCP1_CS     14  // J1-20 "14" -> CS (Pin 11) on board #1 -> Controls Targets 1-16
#define PIN_MCP2_CS     10  // J1-16 "10" -> CS (Pin 11) on board #2 -> Controls Targets 17-20

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
// AI-modified (Claude): MCP1's 16 outputs are wired in fully reversed order (bench-verified):
// target n -> MCP1 pin index 16 - n. hal.cpp's writeOutputs() reads every TARGET_n_PIN
// define, so change the mapping here only. Index 0-7 = GPA0-7, 8-15 = GPB0-7.

// Relay Module #2 (MCP1 Port B, GPB7-GPB0) -> Targets 1 - 8
#define TARGET_1_PIN    15  // GPB7 (Pin 8)
#define TARGET_2_PIN    14  // GPB6 (Pin 7)
#define TARGET_3_PIN    13  // GPB5 (Pin 6)
#define TARGET_4_PIN    12  // GPB4 (Pin 5)
#define TARGET_5_PIN    11  // GPB3 (Pin 4)
#define TARGET_6_PIN    10  // GPB2 (Pin 3)
#define TARGET_7_PIN    9   // GPB1 (Pin 2)
#define TARGET_8_PIN    8   // GPB0 (Pin 1)

// Relay Module #1 (MCP1 Port A, GPA7-GPA0) -> Targets 9 - 16
#define TARGET_9_PIN    7   // GPA7 (Pin 28)
#define TARGET_10_PIN   6   // GPA6 (Pin 27)
#define TARGET_11_PIN   5   // GPA5 (Pin 26)
#define TARGET_12_PIN   4   // GPA4 (Pin 25)
#define TARGET_13_PIN   3   // GPA3 (Pin 24)
#define TARGET_14_PIN   2   // GPA2 (Pin 23)
#define TARGET_15_PIN   1   // GPA1 (Pin 22)
#define TARGET_16_PIN   0   // GPA0 (Pin 21)


// MCP23S17 #2 (Targets 17 - 20)
// -----------------------------------------------------------------------------
// Relay Module #3 (Targets 17 - 20) -> MCP2 Port A (GPA7-GPA4, reversed) -> Relay #3 IN1-IN4
// AI-modified (Claude): moved from GPA0-3 to GPA7-4 to match the as-built wiring.
// hal.cpp's writeOutputs() reads these four defines, so change the mapping here only.
#define TARGET_17_PIN   7   // GPA7 (Pin 28) -> Relay #3 IN1
#define TARGET_18_PIN   6   // GPA6 (Pin 27) -> Relay #3 IN2
#define TARGET_19_PIN   5   // GPA5 (Pin 26) -> Relay #3 IN3
#define TARGET_20_PIN   4   // GPA4 (Pin 25) -> Relay #3 IN4
// GPA0-GPA3 (Pins 21-24) are not connected. The firmware drives them as outputs held
// at the relay "off" level so they are never left floating.
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
 * Pin 1  --> Target 1  (MCP1 GPB7)     Pin 1  --> Target 11 (MCP1 GPA5)
 * Pin 2  --> Target 2  (MCP1 GPB6)     Pin 2  --> Target 12 (MCP1 GPA4)
 * Pin 3  --> Target 3  (MCP1 GPB5)     Pin 3  --> Target 13 (MCP1 GPA3)
 * Pin 4  --> Target 4  (MCP1 GPB4)     Pin 4  --> Target 14 (MCP1 GPA2)
 * Pin 5  --> Target 5  (MCP1 GPB3)     Pin 5  --> Target 15 (MCP1 GPA1)
 * Pin 6  --> Target 6  (MCP1 GPB2)     Pin 6  --> Target 16 (MCP1 GPA0)
 * Pin 7  --> Target 7  (MCP1 GPB1)     Pin 7  --> Target 17 (MCP2 GPA7)
 * Pin 8  --> Target 8  (MCP1 GPB0)     Pin 8  --> Target 18 (MCP2 GPA6)
 * Pin 9  --> Target 9  (MCP1 GPA7)     Pin 9  --> Target 19 (MCP2 GPA5)
 * Pin 10 --> Target 10 (MCP1 GPA6)     Pin 10 --> Target 20 (MCP2 GPA4)
 * Pin 11 --> Ground return             Pin 11 --> Ground return
 * Pin 12 --> Unused / spare            Pin 12 --> Unused / spare
 */

#endif
