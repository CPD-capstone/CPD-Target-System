#include "target_manager.h"
#include "hal.h"
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <vector>

// AI-assisted (Claude): drill runner. executeDrill() validates the drill and hands a flat
// step list to a persistent DrillRunner task; the task walks the steps, sending commands to
// the HAL queue and sleeping on task notifications so stop/resume can interrupt any wait.
//
// HOW THIS FILE WORKS
// -------------------
// 1. executeDrill() is called (by the web server) with a drill name and which targets to use.
// 2. It reads that drill from /database.json and "flattens" it: nested drills (e.g. a
//    "Full Drill" made of "Stage 1" ... "Stage 5") are replaced by their steps, giving one
//    simple list like: present, delay 4000, hide, pause, present, ...
// 3. The list is handed to the DrillRunner task, and executeDrill() returns right away, so
//    the web server is never stuck waiting while a drill runs.
// 4. DrillRunner walks the list: present/hide send a command to the HAL queue (hal.cpp),
//    delay waits, pause waits for resumeDrill().
// 5. resumeDrill() and stopDrill() talk to DrillRunner with FreeRTOS "task notifications":
//    a small set of flag bits that can wake a task instantly, even in the middle of a delay.
//
// Task notifications work like this: xTaskNotify(task, BITS, eSetBits) ORs BITS into that
// task's notification value and wakes it if it's waiting. xTaskNotifyWait(0, ULONG_MAX,
// &bits, timeout) sleeps until a notification arrives (or the timeout passes), copies the
// value into "bits", and clears it (ULONG_MAX = clear every bit on the way out).

// Anything in this unnamed namespace is private to target_manager.cpp
namespace{
    // The four step types a drill is reduced to once nested drills are expanded
    enum class StepType : uint8_t { Present, Hide, Delay, Pause };

    // One entry in the flattened step list
    struct DrillStep {
        StepType type;
        uint32_t timeMs; // only used by Delay
    };

    // "Full Drill" -> "Stage N" is depth 2; anything deeper is almost certainly a drill that
    // (directly or indirectly) includes itself, which would otherwise expand forever
    constexpr uint8_t MAX_NESTING_DEPTH = 4;

    // task notification bits sent to the runner. Each is a separate bit so several can be
    // pending at once (e.g. START and STOP) and none overwrite each other.
    constexpr uint32_t NOTIFY_START  = 1UL << 0; // executeDrill(): a new drill is ready to run
    constexpr uint32_t NOTIFY_RESUME = 1UL << 1; // resumeDrill(): continue past a pause step
    constexpr uint32_t NOTIFY_STOP   = 1UL << 2; // stopDrill(): abort the drill now

    // The DrillRunner task; created the first time a drill runs, then kept for reuse
    TaskHandle_t drillTaskHandle = NULL;

    // What the runner is doing, reported by getDrillState(). volatile because it is written
    // by one task and read by others.
    volatile DrillState drillState = DrillState::Idle;

    // true from the moment executeDrill() claims the runner until the drill finishes;
    // guards against two drills being set up or run at once
    bool runnerBusy = false;
    // Spinlock protecting runnerBusy. portENTER_CRITICAL/portEXIT_CRITICAL make the
    // check-and-set of runnerBusy happen as one step, even with both ESP32 cores running.
    portMUX_TYPE runnerLock = portMUX_INITIALIZER_UNLOCKED;

    // handed from executeDrill() to the runner; only written while the runner is idle
    std::vector<DrillStep> activeSteps; // the flattened drill
    uint32_t activeMask = 0;            // which targets this drill uses (bit 0 = target 1)

    /// @brief loads only the drills and targets sections of the database (Officers can grow large)
    bool loadDrillData(JsonDocument& doc){
        // Open the database stored in the ESP32's flash filesystem (uploaded from data/)
        File file = LittleFS.open("/database.json", "r");
        if(!file){
            Serial.println("executeDrill: database.json not found");
            return false;
        }

        // A filter tells ArduinoJson which fields to keep while reading; everything else is
        // skipped without using memory. "[0]" means "apply to every element of this array".
        // We keep: each drill's name and each step's action/timeMs, plus each target's id/working.
        JsonDocument filter;
        filter["drills"][0]["drillName"] = true;
        filter["drills"][0]["sequence"][0]["action"] = true;
        filter["drills"][0]["sequence"][0]["timeMs"] = true;
        filter["targets"][0]["id"] = true;
        filter["targets"][0]["working"] = true;

        // Parse the file straight from flash into doc, keeping only the filtered fields
        DeserializationError error = deserializeJson(doc, file, DeserializationOption::Filter(filter));
        file.close();

        // Malformed JSON (e.g. a missing comma after a manual edit) ends up here
        if(error){
            Serial.printf("executeDrill: failed to parse database.json: %s\r\n", error.c_str());
            return false;
        }
        return true;
    }

    /// @brief finds the drill whose drillName matches (exact, case-sensitive)
    /// @return the drill object, or a null object (check with .isNull()) if there is no match
    JsonObjectConst findDrill(JsonArrayConst drills, const char* drillName){
        for(JsonObjectConst drill : drills){
            // "| """ supplies an empty string if a drill is missing its drillName
            const char* name = drill["drillName"] | "";
            if(strcmp(name, drillName) == 0){
                return drill;
            }
        }
        return JsonObjectConst();
    }

    /// @brief appends a drill's steps to out, inlining nested drills. Steps run in array order.
    /// @param depth how many drills deep we are (1 = the drill executeDrill() was asked for)
    /// @return false if the drill, or any drill it includes, is missing or has an invalid step
    bool expandDrill(JsonArrayConst drills, const char* drillName, uint8_t depth, std::vector<DrillStep>& out){
        // Stop runaway recursion, e.g. drill A includes drill B which includes drill A
        if(depth > MAX_NESTING_DEPTH){
            Serial.printf("executeDrill: \"%s\" nested too deeply (does a drill include itself?)\r\n", drillName);
            return false;
        }

        // Look the drill up by name
        JsonObjectConst drill = findDrill(drills, drillName);
        if(drill.isNull()){
            Serial.printf("executeDrill: drill \"%s\" not found\r\n", drillName);
            return false;
        }

        // Walk the drill's steps in order and translate each "action" into a DrillStep.
        // (The "step" numbers in the JSON are not used; order comes from array position.)
        for(JsonObjectConst step : drill["sequence"].as<JsonArrayConst>()){
            const char* action = step["action"] | "";

            if(strcmp(action, "present") == 0){
                out.push_back({StepType::Present, 0});
            }else if(strcmp(action, "hide") == 0){
                out.push_back({StepType::Hide, 0});
            }else if(strcmp(action, "pause") == 0){
                out.push_back({StepType::Pause, 0});
            }else if(strcmp(action, "delay") == 0){
                // A delay must have a whole, non-negative timeMs; reject the drill otherwise
                // rather than guess a time during a qualification
                if(!step["timeMs"].is<uint32_t>()){
                    Serial.printf("executeDrill: delay step in \"%s\" has no valid timeMs\r\n", drillName);
                    return false;
                }
                out.push_back({StepType::Delay, step["timeMs"].as<uint32_t>()});
            }else if(!expandDrill(drills, action, depth + 1, out)){
                // anything else must be the name of another drill: expand it in place, one level
                // deeper. If it can't be expanded (not found, bad step, too deep), fail the whole drill.
                return false;
            }
        }
        return true;
    }

    /// @brief mask of targets marked working in the database; all targets if the section is missing
    uint32_t workingTargetsMask(JsonArrayConst targets){
        // No "targets" section at all: don't block drills, but make it visible in the log
        if(targets.isNull()){
            Serial.println("executeDrill: no targets section in database.json, assuming all working");
            return ALL_TARGETS_MASK;
        }

        // Build the mask one target at a time. A target counts only if it is explicitly
        // "working": true and has a valid id (1-20); missing fields default to not working.
        uint32_t mask = 0;
        for(JsonObjectConst target : targets){
            int id = target["id"] | 0;
            bool working = target["working"] | false;
            if(working && id >= 1 && id <= NUM_TARGETS){
                mask |= targetBit(id); // turn on this target's bit (target 1 -> bit 0)
            }
        }
        return mask;
    }

    /// @brief waits ms, returning early with false if the drill is stopped
    /// Used instead of vTaskDelay() so that stopDrill() can cut a long delay short.
    bool waitMs(uint32_t ms){
        // FreeRTOS measures time in "ticks" (1 tick = 1 ms on the ESP32 Arduino core)
        TickType_t start = xTaskGetTickCount();
        TickType_t total = pdMS_TO_TICKS(ms);

        // Loop because a notification can wake us early; if it wasn't a stop, go back to
        // sleep for whatever time is left
        for(;;){
            TickType_t elapsed = xTaskGetTickCount() - start;
            if(elapsed >= total){
                return true; // the full delay has passed
            }

            // Sleep until a notification arrives or the remaining time runs out.
            // pdTRUE means we were woken by a notification (not the timeout).
            uint32_t bits = 0;
            if(xTaskNotifyWait(0, ULONG_MAX, &bits, total - elapsed) == pdTRUE && (bits & NOTIFY_STOP)){
                return false; // stopDrill() was called
            }
            // any other notification (e.g. a stray resume) just continues the wait
        }
    }

    /// @brief after a present command, waits until the targets are fully facing the shooter so the
    ///        next delay is timed from that point. Waits for the HAL to actually fire every target
    ///        (it may hold one back for its MECHANICAL_BUFFER cooldown), then TARGET_FACE_TRAVEL_MS.
    /// @return false if the drill is stopped, or the targets never fire (HAL not responding)
    bool waitUntilFacing(){
        constexpr uint32_t POLL_MS = 5; // how often to re-check the HAL's target state
        // worst case the HAL holds a target for a full cooldown, plus margin for its 10 ms loop
        constexpr uint32_t TIMEOUT_MS = MECHANICAL_BUFFER + 100;

        // Phase 1: wait until every one of this drill's targets shows as fired.
        // "& activeMask" looks only at our targets; the check passes when all of them are set.
        uint32_t waited = 0;
        while((hal_getTargetStates() & activeMask) != activeMask){
            // Something is wrong with the hardware task; abort instead of running with bad timing
            if(waited >= TIMEOUT_MS){
                Serial.println("executeDrill: targets did not fire, aborting drill");
                return false;
            }
            if(!waitMs(POLL_MS)){
                return false; // stopped while waiting
            }
            waited += POLL_MS;
        }

        // Phase 2: the valves have switched; now give the targets time to rotate fully flat.
        // With TARGET_FACE_TRAVEL_MS = 0 this returns immediately.
        return waitMs(TARGET_FACE_TRAVEL_MS);
    }

    /// @brief blocks until resumeDrill() (true) or stopDrill() (false)
    bool waitForResume(){
        for(;;){
            // Sleep with no timeout (portMAX_DELAY) until any notification arrives
            uint32_t bits = 0;
            xTaskNotifyWait(0, ULONG_MAX, &bits, portMAX_DELAY);
            // Stop is checked first so that it wins if both arrive together
            if(bits & NOTIFY_STOP){
                return false;
            }
            if(bits & NOTIFY_RESUME){
                return true;
            }
            // anything else: keep waiting
        }
    }

    /// @brief runs activeSteps; returns false if stopped or a command couldn't be queued
    bool runSteps(){
        for(const DrillStep& step : activeSteps){
            switch(step.type){
                case StepType::Present:
                    // Ask the HAL to turn this drill's targets to face the shooter
                    if(!hal_sendCommand(activeMask, true)){
                        Serial.println("executeDrill: target queue full, aborting drill");
                        return false;
                    }
                    // drill delays are timed from when the targets are fully facing
                    if(!waitUntilFacing()){
                        return false;
                    }
                    break;

                case StepType::Hide:
                    // Ask the HAL to turn this drill's targets away from the shooter
                    if(!hal_sendCommand(activeMask, false)){
                        Serial.println("executeDrill: target queue full, aborting drill");
                        return false;
                    }
                    break;

                case StepType::Delay:
                    // Hold the current target position for timeMs (stop can cut it short)
                    if(!waitMs(step.timeMs)){
                        return false;
                    }
                    break;

                case StepType::Pause: {
                    // Report Paused so the web UI can show a Resume button, wait for the
                    // operator, then go back to Running
                    drillState = DrillState::Paused;
                    bool resumed = waitForResume();
                    drillState = DrillState::Running;
                    if(!resumed){
                        return false; // stopped while paused
                    }
                    break;
                }
            }
        }
        return true; // every step ran
    }

    /// @brief the DrillRunner task: sleeps until executeDrill() sends START, runs the drill,
    ///        cleans up, and goes back to sleep. Runs forever.
    void DrillRunnerTask(void *pvParameters){
        for(;;){
            // Sleep (using no CPU) until someone notifies this task
            uint32_t bits = 0;
            xTaskNotifyWait(0, ULONG_MAX, &bits, portMAX_DELAY);
            if(!(bits & NOTIFY_START)){
                continue; // stray notification while idle
            }

            // a stop that arrived before we woke up cancels the drill before it starts.
            // (&& short-circuits: if STOP is set, runSteps() is never called.)
            bool completed = !(bits & NOTIFY_STOP) && runSteps();
            Serial.println(completed ? "Drill complete" : "Drill stopped");

            // always leave the drill's targets hidden, whether it finished or was stopped.
            // Wait up to 1 s for queue space, since this command matters for safety.
            if(!hal_sendCommand(activeMask, false, pdMS_TO_TICKS(1000))){
                Serial.println("executeDrill: WARNING could not queue final hide command");
            }

            // discard any notifications sent while finishing, then release the runner.
            // (Timeout 0 = just clear whatever is pending, don't wait.) This stops a late
            // STOP or RESUME from leaking into the next drill.
            xTaskNotifyWait(0, ULONG_MAX, &bits, 0);
            // Mark idle and free the runner as one step, so executeDrill() on another core
            // never sees one updated without the other
            portENTER_CRITICAL(&runnerLock);
            drillState = DrillState::Idle;
            runnerBusy = false;
            portEXIT_CRITICAL(&runnerLock);
        }
    }

    /// @brief loads, validates and flattens the drill into activeSteps/activeMask
    bool prepareDrill(const String& drillName, uint32_t targetMask){
        // Step 1: read the drills and targets from flash
        JsonDocument doc;
        if(!loadDrillData(doc)){
            return false;
        }

        // Step 2: flatten the requested drill (and any drills inside it) into one step list.
        // Built in a local list first so a failure part-way through doesn't touch activeSteps.
        std::vector<DrillStep> steps;
        if(!expandDrill(doc["drills"].as<JsonArrayConst>(), drillName.c_str(), 1, steps)){
            return false;
        }
        if(steps.empty()){
            Serial.printf("executeDrill: drill \"%s\" has no steps\r\n", drillName.c_str());
            return false;
        }

        // Step 3: work out which targets to use. targetMask 0 means "all"; otherwise take the
        // caller's selection (ignoring bits above target 20). Then drop anything that is not
        // marked working, so a broken target is never fired even if it was selected.
        uint32_t requested = targetMask ? (targetMask & ALL_TARGETS_MASK) : ALL_TARGETS_MASK;
        uint32_t mask = requested & workingTargetsMask(doc["targets"].as<JsonArrayConst>());
        if(mask == 0){
            Serial.println("executeDrill: no working targets selected");
            return false;
        }

        // Step 4: hand the result to the runner. std::move transfers the list without copying it.
        activeSteps = std::move(steps);
        activeMask = mask;
        // %05lX prints the mask in hex, e.g. 0xFFFFF = all 20 targets
        Serial.printf("Starting drill \"%s\": %u steps, target mask 0x%05lX\r\n",
            drillName.c_str(), (unsigned)activeSteps.size(), (unsigned long)activeMask);
        return true;
    }
}

bool executeDrill(const String& drillName, uint32_t targetMask){
    // Nothing can move without the HAL, so fail fast and say why
    if(!hal_isReady()){
        Serial.println("executeDrill: HAL not initialized (is hal_init() called?)");
        return false;
    }

    // claim the runner so only one drill can be set up or running at a time.
    // Read the old value and set it to true inside the lock, so two callers can never both
    // see "not busy".
    portENTER_CRITICAL(&runnerLock);
    bool alreadyBusy = runnerBusy;
    runnerBusy = true;
    portEXIT_CRITICAL(&runnerLock);

    if(alreadyBusy){
        Serial.println("executeDrill: a drill is already running");
        return false;
    }

    // Load and validate the drill. This happens here (not in the runner) so the caller gets an
    // immediate true/false answer. It runs outside the lock because reading flash takes time,
    // and runnerBusy = true already keeps everyone else out.
    bool ok = prepareDrill(drillName, targetMask);

    // runner task is created on first use and lives for the rest of the program
    // (never deleting it means drillTaskHandle is always safe to notify once set)
    if(ok && drillTaskHandle == NULL){
        ok = xTaskCreatePinnedToCore(
            DrillRunnerTask,   // Function to run
            "DrillRunner",     // Name of task
            4096,              // Stack size in bytes (ESP-IDF FreeRTOS)
            NULL,              // Parameter
            4,                 // Priority (just below SolenoidTask)
            &drillTaskHandle,  // Task handle
            1                  // Pin to Core 1
        ) == pdPASS;
    }

    // Anything failed: release the runner again so the next executeDrill() can try
    if(!ok){
        portENTER_CRITICAL(&runnerLock);
        runnerBusy = false;
        portEXIT_CRITICAL(&runnerLock);
        return false;
    }

    // Everything is ready: mark Running and wake the runner to start the drill
    drillState = DrillState::Running;
    xTaskNotify(drillTaskHandle, NOTIFY_START, eSetBits);
    return true;
}

bool resumeDrill(){
    // Only meaningful while the runner is waiting at a pause step
    if(drillState != DrillState::Paused){
        return false;
    }
    xTaskNotify(drillTaskHandle, NOTIFY_RESUME, eSetBits);
    return true;
}

bool stopDrill(){
    // Nothing to stop if no drill is running
    if(drillState == DrillState::Idle){
        return false;
    }
    // Wakes the runner from any delay or pause; it then hides the targets and goes idle
    xTaskNotify(drillTaskHandle, NOTIFY_STOP, eSetBits);
    return true;
}

DrillState getDrillState(){
    return drillState;
}
