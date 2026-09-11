#ifndef HAL_H
#define HAL_H
// HAL stands for hardware abstraction layer

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <bitset>
#include <SPI.h>
#include <Adafruit_MCP23X17.h>
#include "pins.h"

// Handle for the FreeRTOS task
TaskHandle_t SolenoidTaskHandle = NULL;

// time in ms that holds our delay time between target activation to prevent pin sheering
const uint32_t MECHANICAL_BUFFER = 500;

// MCP23S17 Objects
Adafruit_MCP23X17 mcp1;
Adafruit_MCP23X17 mcp2;

struct Target{
    bool desiredState;
    bool currentState;
    uint32_t lastActuationMs;
};

Target targets[24] = {0};

// =============================================================================
// FUNCTION PROTOTYPES
// =============================================================================

/// @brief initializes the hardware abstraction layer
void hal_init();

// Function prototype for target actuation
void updateTargetState(uint8_t targetIndex, bool newState);

/// @brief starts the solenoid control task; task continuously looks at the target array and updates solenoids accordingly (delay built in to prevent sheering of pins)
void SolenoidControlTask(void);


#endif