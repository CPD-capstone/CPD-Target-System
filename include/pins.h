#ifndef PINS_H
#define PINS_H

#include <Arduino.h>

// =============================================================================
// ESP32-S3 HARDWARE PIN DEFINITIONS
// =============================================================================

// SPI Bus Pins (Shared between both MCP23S17 I/O Expanders)
#define PIN_SPI_MOSI    13  // Connects to SI (Pin 13) on both MCP23S17 chips
#define PIN_SPI_MISO    12  // Connects to SO (Pin 14) on both MCP23S17 chips
#define PIN_SPI_SCK     14  // Connects to SCK (Pin 12) on both MCP23S17 chips

// Dedicated Chip Select (CS) Pins
#define PIN_MCP1_CS     10  // Board #1 Chip Select -> Controls Targets 1-16
#define PIN_MCP2_CS     11  // Board #2 Chip Select -> Controls Targets 17-24

// Hardware SPI Address Configuration
// Note: A0, A1, A2 are hardwired to GND on both chips in hardware
#define MCP_HW_ADDRESS  0x20

// =============================================================================
// EXPANDER PIN CHANNEL MAPPINGS
// =============================================================================

// MCP23S17 #1 (Targets 1 - 16)
// -----------------------------------------------------------------------------
// Relay Board #1 (Targets 1 - 8) -> MCP1 Port A
#define TARGET_1_PIN    0   // GPA0 (Pin 21)
#define TARGET_2_PIN    1   // GPA1 (Pin 22)
#define TARGET_3_PIN    2   // GPA2 (Pin 23)
#define TARGET_4_PIN    3   // GPA3 (Pin 24)
#define TARGET_5_PIN    4   // GPA4 (Pin 25)
#define TARGET_6_PIN    5   // GPA5 (Pin 26)
#define TARGET_7_PIN    6   // GPA6 (Pin 27)
#define TARGET_8_PIN    7   // GPA7 (Pin 28)

// Relay Board #2 (Targets 9 - 16) -> MCP1 Port B
#define TARGET_9_PIN    8   // GPB0 (Pin 1)
#define TARGET_10_PIN   9   // GPB1 (Pin 2)
#define TARGET_11_PIN   10  // GPB2 (Pin 3)
#define TARGET_12_PIN   11  // GPB3 (Pin 4)
#define TARGET_13_PIN   12  // GPB4 (Pin 5)
#define TARGET_14_PIN   13  // GPB5 (Pin 6)
#define TARGET_15_PIN   14  // GPB6 (Pin 7)
#define TARGET_16_PIN   15  // GPB7 (Pin 8)


// MCP23S17 #2 (Targets 17 - 24)
// -----------------------------------------------------------------------------
// Relay Board #3 (Targets 17 - 24) -> MCP2 Port A
#define TARGET_17_PIN   0   // GPA0 (Pin 21)
#define TARGET_18_PIN   1   // GPA1 (Pin 22)
#define TARGET_19_PIN   2   // GPA2 (Pin 23)
#define TARGET_20_PIN   3   // GPA3 (Pin 24)
#define TARGET_21_PIN   4   // GPA4 (Pin 25)
#define TARGET_22_PIN   5   // GPA5 (Pin 26)
#define TARGET_23_PIN   6   // GPA6 (Pin 27)
#define TARGET_24_PIN   7   // GPA7 (Pin 28)

// =============================================================================
// FIELD CONNECTOR (25-PIN) REFERENCE MATRIX
// =============================================================================
/*
 * DB25 Pin 1  --> Target 1 (+12V)  [MCP1 Pin GPA0]
 * DB25 Pin 2  --> Target 2 (+12V)  [MCP1 Pin GPA1]
 * DB25 Pin 3  --> Target 3 (+12V)  [MCP1 Pin GPA2]
 * DB25 Pin 4  --> Target 4 (+12V)  [MCP1 Pin GPA3]
 * DB25 Pin 5  --> Target 5 (+12V)  [MCP1 Pin GPA4]
 * DB25 Pin 6  --> Target 6 (+12V)  [MCP1 Pin GPA5]
 * DB25 Pin 7  --> Target 7 (+12V)  [MCP1 Pin GPA6]
 * DB25 Pin 8  --> Target 8 (+12V)  [MCP1 Pin GPA7]
 * DB25 Pin 9  --> Target 9 (+12V)  [MCP1 Pin GPB0]
 * DB25 Pin 10 --> Target 10 (+12V) [MCP1 Pin GPB1]
 * DB25 Pin 11 --> Target 11 (+12V) [MCP1 Pin GPB2]
 * DB25 Pin 12 --> Target 12 (+12V) [MCP1 Pin GPB3]
 * DB25 Pin 13 --> Target 13 (+12V) [MCP1 Pin GPB4]
 * DB25 Pin 14 --> Target 14 (+12V) [MCP1 Pin GPB5]
 * DB25 Pin 15 --> Target 15 (+12V) [MCP1 Pin GPB6]
 * DB25 Pin 16 --> Target 16 (+12V) [MCP1 Pin GPB7]
 * DB25 Pin 17 --> Target 17 (+12V) [MCP2 Pin GPA0]
 * DB25 Pin 18 --> Target 18 (+12V) [MCP2 Pin GPA1]
 * DB25 Pin 19 --> Target 19 (+12V) [MCP2 Pin GPA2]
 * DB25 Pin 20 --> Target 20 (+12V) [MCP2 Pin GPA3]
 * DB25 Pin 21 --> Target 21 (+12V) [MCP2 Pin GPA4]
 * DB25 Pin 22 --> Target 22 (+12V) [MCP2 Pin GPA5]
 * DB25 Pin 23 --> Target 23 (+12V) [MCP2 Pin GPA6]
 * DB25 Pin 24 --> Target 24 (+12V) [MCP2 Pin GPA7]
 * DB25 Pin 25 --> Common Solenoid Return (Ground Rail, 10 AWG Wire)
 */

#endif