#include "hal.h"

TaskHandle_t SolenoidTaskHandle = NULL;
QueueHandle_t targetQueue;
Adafruit_MCP23X17 mcp1;
Adafruit_MCP23X17 mcp2;
Target targets[24] = {0};

/**
 * Executes SPI write to the appropriate MCP23S17 chip
 */
void updateTargetState(uint8_t targetIndex, bool newState){
    if(targetIndex < 16){
        // Targets 1-16 map to MCP1 (GPA0-7 and GPB0-7)
        mcp1.digitalWrite(targetIndex, newState ? HIGH : LOW);
    }else{
        // Targets 17-24 map to MCP2 (GPA0-7)
        uint8_t mcp2Pin = targetIndex - 16;
        mcp2.digitalWrite(mcp2Pin, newState ? HIGH : LOW);
    }
}

void initSPI(){
    // Initialize SPI Bus and Expanders on Core 1
    SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI);

    if(!mcp1.begin_SPI(PIN_MCP1_CS, &SPI)){
        Serial.println("Error: Expansion Board #1 Failed!");
        vTaskDelete(NULL);
    }

    if(!mcp2.begin_SPI(PIN_MCP2_CS, &SPI)){
        Serial.println("Error: Expansion Board #2 Failed!");
        vTaskDelete(NULL);
    }

    // Set modes and ensure initial state is LOW
    for(uint8_t i = 0; i < 16; i++){
        mcp1.pinMode(i, OUTPUT);
        mcp1.digitalWrite(i, LOW);
    }
    for(uint8_t i = 0; i < 8; i++){
        mcp2.pinMode(i, OUTPUT);
        mcp2.digitalWrite(i, LOW);
    }
}

void SolenoidControlTask(void *pvParameters){
    initSPI();

    TargetCommand cmd;
    
    for(;;){
        uint32_t now = millis(); // grab current ms for buffer

        while (xQueueReceive(targetQueue, &cmd, 0) == pdTRUE){
            if (cmd.targetId < 24) {
                targets[cmd.targetId].desiredState = cmd.newState;
            }
        }

        // loop through each target
        for (uint8_t i = 0; i < 24; i++){
            // grab desired & current states
            bool desired = targets[i].desiredState;
            bool current = targets[i].currentState;

            // check if state change is requested
            if(desired != current){
                // Enforce the 500 ms mechanical cooldown safety check
                if(now - targets[i].lastActuationMs >= MECHANICAL_BUFFER){
                    updateTargetState(i, desired); // activate/deactivate target
                    targets[i].currentState = desired; // update activeArray
                    targets[i].lastActuationMs = now; // grab last actuation time.
                }
            }
        }

        // Yield to allow FreeRTOS watchdog / idle tasks to run on Core 1
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void hal_init(){
    // Instantiate FreeRTOS Queue for cross-core command passing
    targetQueue = xQueueCreate(32, sizeof(TargetCommand));
    
    // pin task to core
    xTaskCreatePinnedToCore(
        SolenoidControlTask,   // Function to run
        "SolenoidTask",        // Name of task
        4096,                  // Stack size in words
        NULL,                  // Parameter
        5,                     // Priority (Higher number = higher priority)
        &SolenoidTaskHandle,   // Task handle
        1                      // Pin to Core 1
    );  
}