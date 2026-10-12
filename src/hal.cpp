#include "hal.h"

// AI-assisted (Claude): rewritten to track target state as bitmasks and write each
// expander in a single SPI transaction, so every target in a command flips together.
//
// HOW THIS FILE WORKS
// -------------------
// Other code never touches the SPI bus or the solenoids directly. Instead it calls
// hal_sendCommand(), which drops a small TargetCommand into a FreeRTOS queue. A dedicated
// task (SolenoidControlTask) running on core 1 is the ONLY code that talks to the MCP23S17
// expanders. Every 10 ms it:
//   1. empties the queue and works out which targets *should* be facing (desiredMask)
//   2. compares that with which targets *are* facing (currentMask)
//   3. flips any target that needs to change AND is past its own 500 ms cooldown
//   4. writes the new state to both expanders in one SPI write each
//
// Target state is stored as a 32-bit "mask": bit 0 = target 1, bit 1 = target 2, ...
// bit 19 = target 20. A 1 bit means facing (solenoid valve powered), 0 means hidden.
// Using a mask lets one command move any group of targets at once, and lets the
// expander write happen in one shot so a group flips at exactly the same moment.

TaskHandle_t SolenoidTaskHandle = NULL;
QueueHandle_t targetQueue = NULL;   // stays NULL until hal_init() runs; hal_isReady() checks this
Adafruit_MCP23X17 mcp1;             // expander #1: targets 1-16
Adafruit_MCP23X17 mcp2;             // expander #2: targets 17-20

// Anything in this unnamed namespace is private to hal.cpp (other files can't see or change it)
namespace{
    // Which targets are physically facing right now (what was last written to the expanders).
    // Only SolenoidControlTask writes this; other tasks read it through hal_getTargetStates().
    // "volatile" tells the compiler another task may read it at any time, so it must really
    // store/load it from memory. A 32-bit aligned read/write is a single instruction on the
    // ESP32, so a reader can never see a half-updated value (no lock needed).
    volatile uint32_t currentMask = 0;

    // Set if an expander fails to start; makes hal_isReady() return false so no one queues
    // commands that will never be carried out.
    volatile bool expanderFailed = false;

    /// @brief writes the full output state to both expanders (one SPI write per chip)
    void writeOutputs(uint32_t mask){
        // Targets 1-16 map to MCP1 (GPA0-7 and GPB0-7).
        // The low 16 bits of the mask line up exactly with MCP1's 16 output pins:
        // bits 0-7 -> port A (targets 1-8), bits 8-15 -> port B (targets 9-16).
        // writeGPIOAB sets all 16 pins in a single SPI transaction.
        mcp1.writeGPIOAB(mask & 0xFFFF);

        // Targets 17-20 map to MCP2 (GPA0-3).
        // Shift bits 16-19 down to bits 0-3 and keep only those 4 bits (0x0F).
        // GPA4-7 are inputs so their output bits are ignored.
        mcp2.writeGPIOA((mask >> 16) & 0x0F);
    }

    /// @brief starts the SPI bus and both expanders, sets target pins as outputs, and hides every target
    /// @return false if either expander fails to start
    bool initSPI(){
        // Initialize SPI Bus and Expanders on Core 1 (pin numbers come from pins.h)
        SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI);

        // Start expander #1 on its own chip-select pin
        if(!mcp1.begin_SPI(PIN_MCP1_CS, &SPI)){
            Serial.println("Error: Expansion Board #1 Failed!");
            return false;
        }

        // Start expander #2 on its own chip-select pin (same SPI bus)
        if(!mcp2.begin_SPI(PIN_MCP2_CS, &SPI)){
            Serial.println("Error: Expansion Board #2 Failed!");
            return false;
        }

        // Set modes, then drive every target LOW (hidden) in one write
        // All 16 MCP1 pins drive relays for targets 1-16
        for(uint8_t i = 0; i < 16; i++){
            mcp1.pinMode(i, OUTPUT);
        }
        // MCP2 only drives targets 17-20 (GPA0-3); remaining pins stay as default inputs
        for(uint8_t i = 0; i < NUM_TARGETS - 16; i++){
            mcp2.pinMode(i, OUTPUT);
        }
        // Known safe starting point: all valves off, all targets hidden (matches currentMask = 0)
        writeOutputs(0);
        return true;
    }
}

bool hal_isReady(){
    // Ready once hal_init() has created the queue, as long as the expanders didn't fail to start
    return targetQueue != NULL && !expanderFailed;
}

bool hal_sendCommand(uint32_t targetMask, bool newState, TickType_t waitTicks){
    // Refuse commands if the HAL isn't running; they would sit in the queue and never happen
    if(!hal_isReady()){
        return false;
    }

    // Package the request. "& ALL_TARGETS_MASK" throws away any bits above target 20 so a bad
    // mask from the caller can never touch pins that don't exist.
    TargetCommand cmd = { targetMask & ALL_TARGETS_MASK, newState };

    // Copy the command into the queue. If the queue is full, wait up to waitTicks for the
    // solenoid task to make room; returns false if it's still full after that.
    return xQueueSend(targetQueue, &cmd, waitTicks) == pdTRUE;
}

uint32_t hal_getTargetStates(){
    // Single 32-bit read; safe from any task (see currentMask above)
    return currentMask;
}

void SolenoidControlTask(void *pvParameters){
    // Step 1: bring up the hardware. If it fails, flag it so hal_isReady() reports false,
    // then delete this task (NULL = "the task calling this"), since there is nothing to drive.
    if(!initSPI()){
        expanderFailed = true;
        vTaskDelete(NULL);
    }

    // Which targets we've been asked to have facing (bit set = facing). Starts all hidden.
    uint32_t desiredMask = 0;

    // millis() timestamp of each target's most recent flip, used for the per-target cooldown.
    // Index 0 = target 1. Starting at 0 means no target can flip in the first 500 ms after boot.
    uint32_t lastActuationMs[NUM_TARGETS] = {0};

    // Buffer that each queued command is copied into
    TargetCommand cmd;

    for(;;){
        uint32_t now = millis(); // grab current ms for buffer

        // Step 2: apply every queued command, in order, to the desired state.
        // Timeout 0 = don't wait; stop as soon as the queue is empty.
        while(xQueueReceive(targetQueue, &cmd, 0) == pdTRUE){
            if(cmd.newState){
                // Present: turn ON the bits for these targets, leave all others alone
                desiredMask |= cmd.targetMask;
            }else{
                // Hide: turn OFF the bits for these targets, leave all others alone
                desiredMask &= ~cmd.targetMask;
            }
        }

        // Step 3: find targets whose desired state differs from what is physically out there.
        // XOR (^) gives a 1 wherever the two masks disagree, i.e. every target that needs to flip.
        uint32_t current = currentMask;
        uint32_t pending = desiredMask ^ current;

        // Step 4: of those, only flip targets that are past the 500 ms mechanical cooldown.
        // Each target has its own timer, so a target that just moved waits, while the others
        // go ahead. A target held back here stays "pending" and is re-checked every 10 ms until
        // its cooldown expires, so the request is delayed, never lost.
        uint32_t ready = 0;
        for(uint8_t i = 0; i < NUM_TARGETS; i++){
            uint32_t bit = 1UL << i; // this target's bit in the mask
            // (now - last) works correctly even when millis() wraps around after ~49 days
            if((pending & bit) && now - lastActuationMs[i] >= MECHANICAL_BUFFER){
                ready |= bit;               // include it in this write
                lastActuationMs[i] = now;   // restart this target's cooldown
            }
        }

        // Step 5: if anything is ready, write the new state to the hardware.
        if(ready){
            // XOR flips exactly the ready targets and leaves every other target as it was
            uint32_t next = current ^ ready;
            writeOutputs(next);
            // Update the shared state only AFTER the hardware write, so hal_getTargetStates()
            // never reports a target as facing before its valve has actually been switched
            currentMask = next;
        }

        // Yield to allow FreeRTOS watchdog / idle tasks to run on Core 1
        // (this 10 ms sleep is also what sets the HAL's timing resolution)
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void hal_init(){
    // Instantiate FreeRTOS Queue for cross-core command passing.
    // Holds up to 32 commands; since one command covers a whole group of targets,
    // a drill only ever has one or two in flight.
    targetQueue = xQueueCreate(32, sizeof(TargetCommand));

    // pin task to core
    xTaskCreatePinnedToCore(
        SolenoidControlTask,   // Function to run
        "SolenoidTask",        // Name of task
        4096,                  // Stack size in bytes (ESP-IDF FreeRTOS)
        NULL,                  // Parameter
        5,                     // Priority (Higher number = higher priority)
        &SolenoidTaskHandle,   // Task handle
        1                      // Pin to Core 1
    );
}
