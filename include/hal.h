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
extern TaskHandle_t SolenoidTaskHandle;

// Global queue handle declaration
extern QueueHandle_t targetQueue;

// time in ms that holds our delay time between target activation to prevent pin sheering
constexpr uint32_t MECHANICAL_BUFFER = 500;

// MCP23S17 Objects
extern Adafruit_MCP23X17 mcp1;
extern Adafruit_MCP23X17 mcp2;

struct Target{
    bool desiredState;
    bool currentState;
    uint32_t lastActuationMs;
};

// TEMP: WILL PROBABLY CHANGE
struct TargetCommand { 
    uint8_t targetId; // Target index (0 to 23)
    bool newState;    // true = UP/FLIP, false = DOWN/UNFLIP
};

extern Target targets[24];

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