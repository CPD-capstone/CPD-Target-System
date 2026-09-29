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
//
// AI-modified (Claude): the relay boards are active-low (RELAY_ACTIVE_LOW in pins.h), so
// "powered" is a LOW pin. That inversion happens ONLY in writeOutputs(); every mask in this
// file and the rest of the firmware still means 1 = powered = facing.

TaskHandle_t SolenoidTaskHandle = NULL;
QueueHandle_t targetQueue = NULL;   // stays NULL until hal_init() runs; hal_isReady() checks this

// Anything in this unnamed namespace is private to hal.cpp (other files can't see or change it)
namespace{
    // AI-assisted (Claude): Adafruit's begin_SPI() only sets up the ESP32's SPI peripheral and
    // never talks to the chip, so on its own it can't tell whether an expander is actually
    // there. This subclass adds single-register read/write (built exactly the way the library
    // builds its own register accesses) so the HAL can read registers back and check.
    class Expander : public Adafruit_MCP23X17 {
    public:
        /// @brief reads one 8-bit register, e.g. readRegister(MCP23XXX_IODIR, 1) = IODIRB
        uint8_t readRegister(uint8_t reg, uint8_t port){
            Adafruit_BusIO_Register r(i2c_dev, spi_dev, MCP23XXX_SPIREG, getRegister(reg, port));
            return (uint8_t)r.read();
        }
        /// @brief writes one 8-bit register
        void writeRegister(uint8_t reg, uint8_t port, uint8_t value){
            Adafruit_BusIO_Register r(i2c_dev, spi_dev, MCP23XXX_SPIREG, getRegister(reg, port));
            r.write(value);
        }
    };

    // AI-modified (Claude): moved in here from global scope -- nothing outside hal.cpp may touch them
    Expander mcp1; // expander #1: targets 1-16
    Expander mcp2; // expander #2: targets 17-20

    // AI-assisted (Claude): how often SolenoidControlTask re-checks that both expanders are
    // still present and configured (see checkExpanders())
    constexpr uint32_t HEALTH_CHECK_MS = 1000;

    // The pin levels last written by writeOutputs() (after the active-low inversion), so the
    // health check knows what the output latches should read back as
    uint32_t writtenPins = 0;
    // Which targets are physically facing right now (what was last written to the expanders).
    // Only SolenoidControlTask writes this; other tasks read it through hal_getTargetStates().
    // "volatile" tells the compiler another task may read it at any time, so it must really
    // store/load it from memory. A 32-bit aligned read/write is a single instruction on the
    // ESP32, so a reader can never see a half-updated value (no lock needed).
    volatile uint32_t currentMask = 0;

    // Set if an expander fails its startup or periodic health check; makes hal_isReady() return
    // false so no one queues commands that will never be carried out.
    volatile bool expanderFailed = false;

    // AI-assisted (Claude): emergency hold (see hal_hold()).
    // holdRequested is set by hal_hold() on any task and cleared by hal_release().
    // holdLoops is incremented ONLY by SolenoidControlTask, once per loop spent in its hold
    // branch. If it changes after hal_hold() set holdRequested, the task has reached the hold
    // branch, so no further SPI write can happen until the hold is released. (Any write that
    // was already in progress finished before that.) A counter is used instead of a flag so a
    // value left over from an earlier hold can't be mistaken for a fresh confirmation.
    volatile bool holdRequested = false;
    volatile uint32_t holdLoops = 0;

    /// @brief writes the full output state to both expanders (one SPI write per chip)
    /// @param mask relays to energize (bit set = powered = target facing). Bits above
    ///             ALL_TARGETS_MASK must be 0; they keep the spare relays on MCP2 GPA4-7 off.
    void writeOutputs(uint32_t mask){
        // AI-modified (Claude): convert "energized" bits to pin levels. On active-low relay
        // boards a relay is ON when its pin is LOW, so every bit is inverted (~). This also
        // turns the always-0 spare bits (MCP2 GPA4-7) into HIGH = off.
        uint32_t pins = RELAY_ACTIVE_LOW ? ~mask : mask;
        writtenPins = pins; // remembered for the health check

        // Targets 1-16 map to MCP1 (GPA0-7 and GPB0-7).
        // The low 16 bits line up exactly with MCP1's 16 output pins:
        // bits 0-7 -> port A (targets 1-8), bits 8-15 -> port B (targets 9-16).
        // writeGPIOAB sets all 16 pins in a single SPI transaction.
        mcp1.writeGPIOAB(pins & 0xFFFF);

        // Targets 17-20 map to MCP2 GPA0-3; GPA4-7 drive the unused relays IN5-8.
        // Shift bits 16-23 down to bits 0-7 and write the whole port so the spare relays
        // are always held at their "off" level.
        mcp2.writeGPIOA((pins >> 16) & 0xFF);
    }

    /// @brief AI-assisted (Claude): checks that one expander is really on the bus and still set up
    ///        the way the HAL left it. Two steps:
    ///        1. Write two test patterns to DEFVALA and read each back. DEFVAL is only used for
    ///           interrupt-on-change, which this firmware never enables, so this can't affect any
    ///           output. With no chip answering, MISO floats and can't echo both 0xA5 and 0x5A.
    ///        2. Read back the direction (IODIR) and output latch (OLAT) registers. A chip that
    ///           lost power and reset comes back with every pin an input, which this catches.
    /// @param mcp the expander to check
    /// @param name label for the serial log
    /// @param iodir expected IODIR, port B in the high byte (0 bit = output)
    /// @param olat expected output latch, port B in the high byte
    /// @param olatMask which OLAT bits to compare (ports/pins this firmware never writes are skipped)
    /// @return true if every read-back matched
    bool expanderHealthy(Expander& mcp, const char* name, uint16_t iodir, uint16_t olat, uint16_t olatMask){
        for(uint8_t pattern : {0xA5, 0x5A}){
            mcp.writeRegister(MCP23XXX_DEFVAL, 0, pattern);
            uint8_t readBack = mcp.readRegister(MCP23XXX_DEFVAL, 0);
            if(readBack != pattern){
                Serial.printf("hal: expander %s not responding (wrote 0x%02X, read 0x%02X)\r\n",
                    name, pattern, readBack);
                return false;
            }
        }
        mcp.writeRegister(MCP23XXX_DEFVAL, 0, 0x00); // back to its power-on value

        uint16_t iodirRead = mcp.readRegister(MCP23XXX_IODIR, 0) | (mcp.readRegister(MCP23XXX_IODIR, 1) << 8);
        uint16_t olatRead  = mcp.readRegister(MCP23XXX_OLAT, 0)  | (mcp.readRegister(MCP23XXX_OLAT, 1) << 8);
        if(iodirRead != iodir || (olatRead & olatMask) != (olat & olatMask)){
            Serial.printf("hal: expander %s lost its configuration (IODIR 0x%04X, expected 0x%04X; "
                "OLAT 0x%04X, expected 0x%04X) -- did it lose power?\r\n",
                name, iodirRead, iodir, olatRead & olatMask, olat & olatMask);
            return false;
        }
        return true;
    }

    /// @brief AI-assisted (Claude): runs expanderHealthy() on both chips against what the HAL wrote
    /// @return true if both expanders are present and configured as expected
    bool checkExpanders(){
        // MCP1: all 16 pins are outputs, latch = the pins last written for targets 1-16
        bool ok1 = expanderHealthy(mcp1, "#1", 0x0000, writtenPins & 0xFFFF, 0xFFFF);
        // MCP2: port A outputs, port B untouched inputs (0xFF); only port A's latch is written
        bool ok2 = expanderHealthy(mcp2, "#2", 0xFF00, (writtenPins >> 16) & 0xFF, 0x00FF);
        return ok1 && ok2; // both always run, so the log names every failed chip
    }

    /// @brief starts the SPI bus and both expanders, sets relay pins as outputs, and hides every target
    /// @return false if either expander is missing or didn't take its configuration
    bool initSPI(){
        // Initialize SPI Bus and Expanders on Core 1 (pin numbers come from pins.h)
        SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI);

        // Set up each expander's chip-select pin (same SPI bus). NOTE: this only configures the
        // ESP32 side -- it succeeds even if no chip is connected. Presence is checked below.
        if(!mcp1.begin_SPI(PIN_MCP1_CS, &SPI)){
            Serial.println("Error: Expansion Board #1 Failed!");
            return false;
        }
        if(!mcp2.begin_SPI(PIN_MCP2_CS, &SPI)){
            Serial.println("Error: Expansion Board #2 Failed!");
            return false;
        }

        // AI-modified (Claude): ORDER MATTERS. Load the "all relays off" pattern into the output
        // latches FIRST, while the pins are still inputs, and only then switch them to outputs.
        // A freshly powered MCP23S17 has its latches at 0 (LOW), which on active-low relay
        // boards means ON -- switching to outputs first would energize every relay and present
        // every target at boot. Writing the GPIO register sets the latch even for input pins.
        // This also covers an ESP32-only reset (crash/brownout) while the expanders stay
        // powered: the relays keep their last state until this runs, then all turn off.
        writeOutputs(0);

        // All 16 MCP1 pins drive relays for targets 1-16
        for(uint8_t i = 0; i < 16; i++){
            mcp1.pinMode(i, OUTPUT);
        }
        // MCP2 port A: GPA0-3 drive targets 17-20, GPA4-7 drive the spare relays (held off
        // so they never float). Port B (GPB0-7) is unconnected and stays as default inputs.
        for(uint8_t i = 0; i < 8; i++){
            mcp2.pinMode(i, OUTPUT);
        }

        // Write again now that the pins are outputs: known safe starting point, all valves off,
        // all targets hidden (matches currentMask = 0)
        writeOutputs(0);

        // AI-modified (Claude): only now confirm both chips are really there and took the setup.
        // Checked last on purpose: the all-off sequence above has already run on whichever
        // chip IS present, so a missing chip #2 never leaves chip #1's relays in an old state.
        if(!checkExpanders()){
            Serial.println("Error: expansion board check failed; target control disabled");
            return false;
        }
        return true;
    }
}

bool hal_isReady(){
    // Ready once hal_init() has created the queue, as long as the expanders didn't fail their
    // startup or periodic health check
    return targetQueue != NULL && !expanderFailed;
}

bool hal_sendCommand(uint32_t targetMask, bool newState, TickType_t waitTicks){
    // Refuse commands if the HAL isn't running; they would sit in the queue and never happen.
    // AI-modified (Claude): also refuse while held, so nothing can move after an emergency stop.
    if(!hal_isReady() || holdRequested){
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

// AI-assisted (Claude): emergency hold
bool hal_hold(){
    // From this moment hal_sendCommand() refuses everything
    holdRequested = true;
    uint32_t startLoops = holdLoops;

    // Solenoid task isn't running, so nothing can move anyway
    if(!hal_isReady()){
        return true;
    }

    // Wait for the solenoid task to pass through its hold branch (it checks every 10 ms loop).
    // Only then is it certain that no more SPI writes will happen.
    constexpr uint32_t CONFIRM_TIMEOUT_MS = 100;
    for(uint32_t waited = 0; holdLoops == startLoops; waited++){
        // AI-modified (Claude): the task shuts itself down if an expander check fails; once
        // it has, it will never write again, so the hold is effectively confirmed
        if(!hal_isReady()){
            return true;
        }
        if(waited >= CONFIRM_TIMEOUT_MS){
            Serial.println("hal_hold: WARNING solenoid task did not confirm the hold");
            return false;
        }
        vTaskDelay(pdMS_TO_TICKS(1));
    }
    return true;
}

void hal_release(){
    holdRequested = false;
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

    // AI-assisted (Claude): when the expanders were last checked (see HEALTH_CHECK_MS)
    uint32_t lastHealthCheckMs = millis();

    for(;;){
        uint32_t now = millis(); // grab current ms for buffer

        // AI-assisted (Claude): periodic health check -- catches an expander that came loose or
        // lost power after boot. On failure the HAL shuts down WITHOUT writing anything: a chip
        // that reset has already turned every relay off (its pins revert to inputs), a missing
        // chip can't be written anyway, and a write into an unknown state could move targets.
        // hal_isReady() goes false, so a running drill fails and new commands are refused until
        // the system is rebooted. Runs during an emergency hold too (it only reads registers
        // and writes DEFVAL, which can't move a target).
        if(now - lastHealthCheckMs >= HEALTH_CHECK_MS){
            lastHealthCheckMs = now;
            if(!checkExpanders()){
                Serial.println("hal: expander health check failed; target control disabled until reboot");
                expanderFailed = true;
                vTaskDelete(NULL);
            }
        }

        // AI-modified (Claude): emergency hold. Throw away every queued command and make the
        // desired state equal what is physically out there, so nothing is "pending" -- including
        // a flip that was waiting on its cooldown. Outputs are NOT written, so no target moves.
        // Because desiredMask == currentMask on release, releasing doesn't move anything either.
        if(holdRequested){
            while(xQueueReceive(targetQueue, &cmd, 0) == pdTRUE){} // discard
            desiredMask = currentMask;
            holdLoops = holdLoops + 1; // tells hal_hold() the task is safely here
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }

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
