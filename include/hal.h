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
// The buffer itself is REQUIRED (the pins will shear without it); the 500 ms value is an
// arbitrary safe margin, not a measured limit. Tune on the real targets, but never remove it.
constexpr uint32_t MECHANICAL_BUFFER = 500;

// time in ms for a target to rotate from edge-on to fully flat facing the shooter after its
// solenoid fires. Drill delays start counting only after this has elapsed.
// TODO: measure on the real targets and set this; 0 means delays start the moment the solenoid fires.
constexpr uint32_t TARGET_FACE_TRAVEL_MS = 0;

// total number of targets on the range (MCP1 drives 1-16, MCP2 drives 17-20)
constexpr uint8_t NUM_TARGETS = 20;

// TEMP: WILL PROBABLY CHANGE
struct TargetCommand { 
    uint8_t targetId; // Target index (0 to 23)
    bool newState;    // true = UP/FLIP, false = DOWN/UNFLIP
};

extern Target targets[24];

// =============================================================================
// FUNCTION PROTOTYPES
// =============================================================================

/// @brief initializes the hardware abstraction layer. Pins the task and starts the queue
void hal_init();

/// @brief true once hal_init() has run and both expanders are present and correctly configured.
///        AI-modified (Claude): both chips are checked by reading registers back at startup and
///        every second after (HEALTH_CHECK_MS in hal.cpp). Once a check fails this stays false
///        until reboot, and the HAL stops writing to the expanders.
bool hal_isReady();

/// @brief queues a state change for a group of targets; safe to call from any task/core
/// @param targetMask targets to change (bits outside ALL_TARGETS_MASK are ignored)
/// @param newState true for facing, false for hiding
/// @param waitTicks how long to wait if the queue is full
/// @return true if the command was queued; false if the queue stayed full, the HAL isn't
///         ready, or the outputs are held (see hal_hold())
bool hal_sendCommand(uint32_t targetMask, bool newState, TickType_t waitTicks = pdMS_TO_TICKS(50));

/// @brief snapshot of which targets are physically facing right now (bit set = facing)
uint32_t hal_getTargetStates();

// AI-assisted (Claude): emergency hold for the operator's Stop button.

/// @brief freezes every target where it is: discards queued commands, cancels any flip still
///        waiting on its MECHANICAL_BUFFER cooldown, and refuses new commands until hal_release().
///        Outputs are left as they are (not turned off), so no target moves.
///        Blocks up to ~100 ms until the solenoid task confirms it has stopped writing.
/// @return true once the hold is confirmed (or the HAL isn't running, so nothing can move);
///         false if the solenoid task didn't confirm in time
bool hal_hold();

/// @brief ends a hal_hold(); commands are accepted again. Nothing moves until a new command arrives.
void hal_release();

/// @brief starts the solenoid control task; task continuously looks at the target array and updates solenoids accordingly (delay built in to prevent sheering of pins)
/// @param pvParameters unused; required by the FreeRTOS TaskFunction_t signature for xTaskCreatePinnedToCore
void SolenoidControlTask(void *pvParameters);

#endif
