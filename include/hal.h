#ifndef HAL_H
#define HAL_H
// HAL stands for hardware abstraction layer

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <SPI.h>
#include <Adafruit_MCP23X17.h>
#include "pins.h"

// AI-assisted (Claude): commands changed from one-target-per-item to a bitmask so a whole
// drill step (e.g. "present targets 1-12") is one queue item and flips in one SPI write.

// Handle for the FreeRTOS task
extern TaskHandle_t SolenoidTaskHandle;

// Global queue handle declaration
extern QueueHandle_t targetQueue;

// minimum time in ms between two actuations of the SAME target; flipping a single solenoid
// again sooner will sheer its metal pins. Tracked per target, so other targets are unaffected;
// a change requested too soon is held (not dropped) until that target's cooldown expires.
constexpr uint32_t MECHANICAL_BUFFER = 500;

// time in ms for a target to rotate from edge-on to fully flat facing the shooter after its
// solenoid fires. Drill delays start counting only after this has elapsed.
// TODO: measure on the real targets and set this; 0 means delays start the moment the solenoid fires.
constexpr uint32_t TARGET_FACE_TRAVEL_MS = 0;

// total number of targets on the range (MCP1 drives 1-16, MCP2 drives 17-20)
constexpr uint8_t NUM_TARGETS = 20;

// bitmask with one bit per target: bit 0 = target 1 ... bit 19 = target 20
// (1 << 20) - 1 = 0xFFFFF = the lowest 20 bits all set = every target.
// Building a mask for specific targets, e.g. targets 1, 2 and 5:
//     uint32_t mask = targetBit(1) | targetBit(2) | targetBit(5);   // = 0b10011 = 0x13
constexpr uint32_t ALL_TARGETS_MASK = (1UL << NUM_TARGETS) - 1;

/// @brief converts a 1-based target number (as shown on the range / in database.json) to its mask bit
constexpr uint32_t targetBit(uint8_t targetNumber){
    return 1UL << (targetNumber - 1);
}

// MCP23S17 Objects
extern Adafruit_MCP23X17 mcp1;
extern Adafruit_MCP23X17 mcp2;

// One request sitting in targetQueue. Created by hal_sendCommand(), consumed by
// SolenoidControlTask. It is copied into the queue, so the caller's variable can go away.
struct TargetCommand {
    uint32_t targetMask; // which targets this command applies to (see targetBit())
    bool newState;       // true = UP/FACING, false = DOWN/HIDDEN
};

// =============================================================================
// FUNCTION PROTOTYPES
// =============================================================================

/// @brief initializes the hardware abstraction layer. Pins the task and starts the queue
void hal_init();

/// @brief true once hal_init() has run and the expander boards have not reported a failure
bool hal_isReady();

/// @brief queues a state change for a group of targets; safe to call from any task/core
/// @param targetMask targets to change (bits outside ALL_TARGETS_MASK are ignored)
/// @param newState true for facing, false for hiding
/// @param waitTicks how long to wait if the queue is full
/// @return true if the command was queued
bool hal_sendCommand(uint32_t targetMask, bool newState, TickType_t waitTicks = pdMS_TO_TICKS(50));

/// @brief snapshot of which targets are physically facing right now (bit set = facing)
uint32_t hal_getTargetStates();

/// @brief starts the solenoid control task; task continuously looks at the target array and updates solenoids accordingly (delay built in to prevent sheering of pins)
/// @param pvParameters unused; required by the FreeRTOS TaskFunction_t signature for xTaskCreatePinnedToCore
void SolenoidControlTask(void *pvParameters);

#endif
