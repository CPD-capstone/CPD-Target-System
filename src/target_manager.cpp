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
// 5. pauseDrill(), resumeDrill() and stopDrill() talk to DrillRunner with FreeRTOS "task
//    notifications": a small set of flag bits that can wake a task instantly, even in the
//    middle of a delay.
// 6. stopDrill() is the operator's emergency stop. It first freezes the HAL (hal_hold()) so
//    no target can move, then tells the runner to end WITHOUT hiding anything, and latches
//    (stopLatched) so nothing can move again until resetTargets() hides every target.
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
        // AI-generated (Claude): present/hide only. The step's own "targets" list as a mask, or 0
        // for "all" (every target the drill was started on). See stepTargets().
        uint32_t mask;
        // AI-generated (Claude): present only. >0 = present this many targets picked at random
        // (fresh each time the step runs) from the drill's targets; mask is then unused.
        uint8_t randomCount;
    };

    // Each direct child drill is a separate stage for replay (AI-assisted with Codex).
    // Nested children stay inside that stage; boundaries are runtime data, not database fields.
    struct DrillStage {
        char name[DRILL_NAME_MAX];
        size_t first;
        size_t end; // exclusive
    };
    enum class WaitResult : uint8_t { Complete, Stopped, ResetStage };
    enum class PauseControl : uint8_t { Waiting, ResumePending, ResetPending, ReplayReady };

    // "Full Drill" -> "Stage N" is depth 2; anything deeper is almost certainly a drill that
    // (directly or indirectly) includes itself, which would otherwise expand forever
    constexpr uint8_t MAX_NESTING_DEPTH = 4;

    // task notification bits sent to the runner. Each is a separate bit so several can be
    // pending at once (e.g. START and STOP) and none overwrite each other.
    constexpr uint32_t NOTIFY_START  = 1UL << 0; // executeDrill(): a new drill is ready to run
    constexpr uint32_t NOTIFY_RESUME = 1UL << 1; // resumeDrill(): continue past a pause step
    constexpr uint32_t NOTIFY_STOP   = 1UL << 2; // stopDrill(): abort the drill now
    constexpr uint32_t NOTIFY_PAUSE  = 1UL << 3; // pauseDrill(): freeze the drill clock (AI-added, Claude)
    constexpr uint32_t NOTIFY_RESET_STAGE = 1UL << 4; // wake to rewind

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
    // Replace stage metadata only while idle, when currentStageIndex is -1 (AI-assisted with Codex).
    std::vector<DrillStage> activeStages;
    int currentStageIndex = -1;
    PauseControl pauseControl = PauseControl::Waiting;
    uint32_t activeMask = 0;            // which targets this drill uses (bit 0 = target 1)

    // AI-assisted (Claude): progress/outcome reported by getDrillStatus(). Written under
    // runnerLock so a status snapshot never mixes two drills.
    char activeName[DRILL_NAME_MAX] = "";               // drill being (or last) run
    uint16_t activeStepCount = 0;                       // activeSteps.size(), safe to read under the lock
    // AI-generated (Claude): 1-based step of the pause prepareDrill() appends after a full drill's
    // last stage (see "final-stage hold" there); 0 when the drill has none
    uint16_t finalHoldStep = 0;
    volatile uint16_t currentStep = 0;                  // 1-based; 0 when idle
    volatile StepType currentType = StepType::Present;  // type of currentStep
    volatile DrillOutcome lastOutcome = DrillOutcome::None;
    // set by the runner when it aborts because of the hardware rather than stopDrill()
    bool drillFailed = false;

    // AI-generated (Claude): timing of the delay step being run, for getDrillStatus() (the web
    // UI's countdown). Only waitMs() calls made for a "delay" step publish these, not the short
    // internal waits. delayTotalMs is 0 when no delay step is running. While the delay counts
    // down it ends at tick delayDeadline; while paused, delayPausedRemainingMs holds the frozen
    // time left instead. Written under runnerLock.
    uint32_t delayTotalMs = 0;
    TickType_t delayDeadline = 0;
    uint32_t delayPausedRemainingMs = 0;

    // AI-assisted (Claude): emergency stop latch. Set by stopDrill() (before it freezes the HAL)
    // and cleared only by resetTargets(). While set, executeDrill() and setTargets() refuse,
    // and a drill that ends does not send its usual final hide.
    volatile bool stopLatched = false;

    /// @brief action name of a step type, as written in database.json
    const char* stepActionName(StepType type){
        switch(type){
            case StepType::Present: return "present";
            case StepType::Hide:    return "hide";
            case StepType::Delay:   return "delay";
            case StepType::Pause:   return "pause";
        }
        return "";
    }

    /// @brief loads only the drills and targets sections of the database (Officers can grow large)
    /// @param includeDrills false to load just the targets section (for setTargets())
    bool loadDrillData(JsonDocument& doc, bool includeDrills = true){
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
        if(includeDrills){
            filter["drills"][0]["drillName"] = true;
            filter["drills"][0]["sequence"][0]["action"] = true;
            filter["drills"][0]["sequence"][0]["timeMs"] = true;
            filter["drills"][0]["sequence"][0]["targets"] = true; // AI-generated (Claude): per-step targets
            filter["drills"][0]["sequence"][0]["random"] = true;  // AI-generated (Claude): random present
        }
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
    // Keep stage boundaries when flattening the drill (AI-assisted with Codex).
    bool expandDrill(JsonArrayConst drills, const char* drillName, uint8_t depth,
                     std::vector<DrillStep>& out, std::vector<DrillStage>& stages){
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

            if(strcmp(action, "present") == 0 || strcmp(action, "hide") == 0){
                // AI-modified (Claude): optional "targets": [n, ...] limits the step to those
                // targets; missing means all of the drill's targets. A bad list rejects the drill.
                uint32_t mask = 0;
                if(!step["targets"].isNull()){
                    JsonArrayConst list = step["targets"].as<JsonArrayConst>();
                    if(list.isNull() || list.size() == 0){
                        Serial.printf("executeDrill: %s step in \"%s\" has an invalid targets list\r\n", action, drillName);
                        return false;
                    }
                    for(JsonVariantConst n : list){
                        int id = n.is<int>() ? n.as<int>() : 0;
                        if(id < 1 || id > NUM_TARGETS){
                            Serial.printf("executeDrill: %s step in \"%s\" names target %d\r\n", action, drillName, id);
                            return false;
                        }
                        mask |= targetBit(id);
                    }
                }
                // AI-generated (Claude): "random": n (present only) picks n targets each run
                uint8_t randomCount = 0;
                if(!step["random"].isNull()){
                    int count = step["random"].is<int>() ? step["random"].as<int>() : 0;
                    if(strcmp(action, "present") != 0 || mask != 0 || count < 1 || count > NUM_TARGETS){
                        Serial.printf("executeDrill: invalid random step in \"%s\"\r\n", drillName);
                        return false;
                    }
                    randomCount = (uint8_t)count;
                }
                out.push_back({strcmp(action, "present") == 0 ? StepType::Present : StepType::Hide, 0, mask, randomCount});
            }else if(strcmp(action, "pause") == 0){
                out.push_back({StepType::Pause, 0, 0});
            }else if(strcmp(action, "delay") == 0){
                // A delay must have a whole, non-negative timeMs; reject the drill otherwise
                // rather than guess a time during a qualification
                if(!step["timeMs"].is<uint32_t>()){
                    Serial.printf("executeDrill: delay step in \"%s\" has no valid timeMs\r\n", drillName);
                    return false;
                }
                out.push_back({StepType::Delay, step["timeMs"].as<uint32_t>(), 0});
            }else{
                // anything else must be the name of another drill: expand it in place, one level
                // deeper. If it can't be expanded (not found, bad step, too deep), fail the whole drill.
                size_t first = out.size();
                if(!expandDrill(drills, action, depth + 1, out, stages)) return false;
                if(depth == 1 && out.size() > first){
                    DrillStage stage = {};
                    strlcpy(stage.name, action, sizeof(stage.name));
                    stage.first = first;
                    stage.end = out.size();
                    stages.push_back(stage);
                }
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

    /// @brief Check whether a paused control is queued or being applied (AI-assisted with Codex).
    bool hasPendingControl(){
        return pauseControl == PauseControl::ResumePending || pauseControl == PauseControl::ResetPending;
    }

    /// @brief Queue paused controls without changing the runner's position (AI-assisted with Codex).
    StageResetResult requestPausedControl(PauseControl request){
        if(request == PauseControl::ResetPending && !hal_isReady()) return StageResetResult::HalNotReady;
        portENTER_CRITICAL(&runnerLock);
        StageResetResult result = StageResetResult::Accepted;
        if(stopLatched) result = StageResetResult::Stopped;
        else if(drillState != DrillState::Paused) result = StageResetResult::NotPaused;
        else if(request == PauseControl::ResetPending && currentStageIndex < 0) result = StageResetResult::NoStage;
        else if(hasPendingControl()) result = StageResetResult::Busy;
        // Reset is idempotent once the stage is ready. Resume always needs a new request.
        bool notify = result == StageResetResult::Accepted
                      && (request == PauseControl::ResumePending || pauseControl != PauseControl::ReplayReady);
        if(notify) pauseControl = request;
        portEXIT_CRITICAL(&runnerLock);
        if(notify) xTaskNotify(drillTaskHandle, request == PauseControl::ResumePending
                              ? NOTIFY_RESUME : NOTIFY_RESET_STAGE, eSetBits);
        return result;
    }

    /// @brief Wait for Resume or Reset, giving Stop priority (AI-assisted with Codex).
    WaitResult waitForResume(){
        for(;;){
            // Notifications only wake us; a late notification cannot repeat an old request.
            portENTER_CRITICAL(&runnerLock);
            bool stopped = stopLatched;
            PauseControl request = pauseControl;
            if(!stopped && request == PauseControl::ResumePending){
                pauseControl = PauseControl::Waiting;
                drillState = DrillState::Running;
            }
            portEXIT_CRITICAL(&runnerLock);
            if(stopped) return WaitResult::Stopped;
            if(request == PauseControl::ResetPending) return WaitResult::ResetStage;
            if(request == PauseControl::ResumePending) return WaitResult::Complete;
            uint32_t bits = 0;
            xTaskNotifyWait(0, ULONG_MAX, &bits, portMAX_DELAY);
        }
    }

    /// @brief Report Paused while waiting for the operator (AI-assisted with Codex).
    WaitResult pauseUntilResumed(){
        portENTER_CRITICAL(&runnerLock);
        drillState = DrillState::Paused;
        portEXIT_CRITICAL(&runnerLock);
        return waitForResume();
    }

    /// @brief waits ms, propagating stop/reset without continuing the interrupted wait
    /// Used instead of vTaskDelay() so that stopDrill() can cut a long delay short.
    /// AI-modified (Claude): pauseDrill() freezes the countdown; after resume, the wait continues
    /// with the time it had left (time spent paused doesn't count).
    /// @param publish true for a drill "delay" step: its timing is reported by getDrillStatus()
    // A reset discards the interrupted countdown (AI-assisted with Codex).
    WaitResult waitMs(uint32_t ms, bool publish = false){
        // FreeRTOS measures time in "ticks" (1 tick = 1 ms on the ESP32 Arduino core)
        TickType_t start = xTaskGetTickCount();
        TickType_t total = pdMS_TO_TICKS(ms);

        // AI-generated (Claude): publish the delay for the web UI; cleared however we return
        struct DelayReport {
            bool active;
            DelayReport(bool on, uint32_t lengthMs, TickType_t deadline) : active(on) {
                if(!active) return;
                portENTER_CRITICAL(&runnerLock);
                delayTotalMs = lengthMs;
                delayDeadline = deadline;
                delayPausedRemainingMs = 0;
                portEXIT_CRITICAL(&runnerLock);
            }
            ~DelayReport(){
                if(!active) return;
                portENTER_CRITICAL(&runnerLock);
                delayTotalMs = 0;
                portEXIT_CRITICAL(&runnerLock);
            }
        } report(publish, ms, start + total);

        // Loop because a notification can wake us early; if it wasn't a stop, go back to
        // sleep for whatever time is left
        for(;;){
            if(stopLatched) return WaitResult::Stopped;
            TickType_t elapsed = xTaskGetTickCount() - start;
            if(elapsed >= total){
                return WaitResult::Complete; // the full delay has passed
            }

            // Sleep until a notification arrives or the remaining time runs out.
            // pdTRUE means we were woken by a notification (not the timeout).
            uint32_t bits = 0;
            if(xTaskNotifyWait(0, ULONG_MAX, &bits, total - elapsed) == pdTRUE){
                if(bits & NOTIFY_STOP){
                    return WaitResult::Stopped; // stopDrill() was called
                }
                // Ignore an old Pause request while reset waits for targets to hide (AI-assisted with Codex).
                if((bits & NOTIFY_PAUSE) && drillState == DrillState::Running){
                    // Operator pause: sit here until resumed, then push the start time forward
                    // by however long we were paused, so "elapsed" only counts unpaused time
                    TickType_t pausedAt = xTaskGetTickCount();
                    if(publish){
                        // AI-generated (Claude): freeze the reported time left while paused
                        TickType_t done = pausedAt - start;
                        portENTER_CRITICAL(&runnerLock);
                        delayPausedRemainingMs = done < total ? pdTICKS_TO_MS(total - done) : 0;
                        portEXIT_CRITICAL(&runnerLock);
                    }
                    WaitResult result = pauseUntilResumed();
                    if(result != WaitResult::Complete) return result;
                    start += xTaskGetTickCount() - pausedAt;
                    if(publish){
                        portENTER_CRITICAL(&runnerLock);
                        delayDeadline = start + total; // the countdown continues from here
                        portEXIT_CRITICAL(&runnerLock);
                    }
                }
            }
            // any other notification (e.g. a stray resume) just continues the wait
        }
    }

    /// @brief after a present command, waits until the targets are fully facing the shooter so the
    ///        next delay is timed from that point. Waits for the HAL to actually fire every target
    ///        (it may hold one back for its MECHANICAL_BUFFER cooldown), then TARGET_FACE_TRAVEL_MS.
    /// @param mask the targets the present step turned (AI-modified (Claude): was always activeMask)
    /// @return Complete when facing, ResetStage to rewind, or Stopped on stop/hardware failure
    // Reset must also interrupt a wait for targets to face (AI-assisted with Codex).
    WaitResult waitUntilFacing(uint32_t mask){
        constexpr uint32_t POLL_MS = 5; // how often to re-check the HAL's target state
        // worst case the HAL holds a target for a full cooldown, plus margin for its 10 ms loop
        constexpr uint32_t TIMEOUT_MS = MECHANICAL_BUFFER + 100;

        // Phase 1: wait until every one of this drill's targets shows as fired.
        // "& mask" looks only at this step's targets; the check passes when all of them are set.
        uint32_t waited = 0;
        while((hal_getTargetStates() & mask) != mask){
            // Something is wrong with the hardware task; abort instead of running with bad timing
            if(waited >= TIMEOUT_MS){
                Serial.println("executeDrill: targets did not fire, aborting drill");
                drillFailed = true; // AI-modified (Claude): reported as DrillOutcome::Failed
                return WaitResult::Stopped;
            }
            WaitResult result = waitMs(POLL_MS);
            if(result != WaitResult::Complete) return result;
            waited += POLL_MS;
        }

        // Phase 2: the valves have switched; now give the targets time to rotate fully flat.
        // With TARGET_FACE_TRAVEL_MS = 0 this returns immediately.
        return waitMs(TARGET_FACE_TRAVEL_MS);
    }

    /// @brief AI-generated (Claude): the targets a present/hide step moves: its own list limited to
    ///        the targets the drill was started on (non-working ones are already excluded there),
    ///        or all of those when the step has no list
    uint32_t stepTargets(const DrillStep& step){
        return step.mask ? (step.mask & activeMask) : activeMask;
    }

    /// @brief AI-generated (Claude): picks `count` targets at random from `from` (every one of them
    ///        if it has `count` or fewer), using the ESP32's hardware random number generator
    uint32_t pickRandomTargets(uint32_t from, uint8_t count){
        uint8_t ids[NUM_TARGETS];
        uint8_t available = 0;
        for(uint8_t bit = 0; bit < NUM_TARGETS; bit++){
            if(from & (1UL << bit)) ids[available++] = bit;
        }
        if(count >= available) return from;
        // partial Fisher-Yates shuffle: the first `count` entries end up a uniform random pick
        uint32_t picked = 0;
        for(uint8_t i = 0; i < count; i++){
            uint8_t j = i + esp_random() % (available - i);
            uint8_t swap = ids[i];
            ids[i] = ids[j];
            ids[j] = swap;
            picked |= 1UL << ids[i];
        }
        return picked;
    }

    /// @brief Report the current stage, or the completed stage at a pause (AI-assisted with Codex).
    void publishStep(size_t index){
        int stageIndex = -1;
        for(size_t n = 0; n < activeStages.size(); n++){
            const DrillStage& stage = activeStages[n];
            if(stage.first > index) break;
            if(index < stage.end || activeSteps[index].type == StepType::Pause){
                stageIndex = n;
            }
        }
        portENTER_CRITICAL(&runnerLock);
        currentStep = index + 1;
        currentType = activeSteps[index].type;
        currentStageIndex = stageIndex;
        portEXIT_CRITICAL(&runnerLock);
    }

    /// @brief Hide targets before replay, keeping any emergency hold intact (AI-assisted with Codex).
    bool rewindStage(size_t& index){
        if(stopLatched) return false;
        if(!hal_sendCommand(activeMask, false)){
            drillFailed = true;
            return false;
        }
        // Let the HAL consume the hide and finish any cooldown before replay can present again.
        if(waitMs(MECHANICAL_BUFFER + 100) != WaitResult::Complete) return false;
        if(!hal_isReady() || (hal_getTargetStates() & activeMask)){
            drillFailed = true;
            return false;
        }
        index = activeStages[currentStageIndex].first;
        publishStep(index);
        portENTER_CRITICAL(&runnerLock);
        pauseControl = PauseControl::ReplayReady;
        portEXIT_CRITICAL(&runnerLock);
        // A fresh Resume is required; all previous waits and their timing are gone.
        return waitForResume() == WaitResult::Complete;
    }

    /// @brief runs activeSteps; returns false if stopped or a command couldn't be queued
    bool runSteps(){
        // Only this task advances or rewinds the drill (AI-assisted with Codex).
        for(size_t i = 0; i < activeSteps.size(); ){
            if(stopLatched) return false;
            const DrillStep& step = activeSteps[i];
            publishStep(i);
            WaitResult result = WaitResult::Complete;

            switch(step.type){
                case StepType::Present: {
                    // AI-modified (Claude): a random step picks its targets now, so each run
                    // differs; otherwise the step's list (or all). A custom list whose targets
                    // were all left out of this run (or are not working) has nothing to move.
                    uint32_t targets = step.randomCount ? pickRandomTargets(activeMask, step.randomCount)
                                                        : stepTargets(step);
                    if(!targets){
                        break;
                    }
                    // Ask the HAL to turn this step's targets to face the shooter
                    if(!hal_sendCommand(targets, true)){
                        Serial.println("executeDrill: target command not accepted (queue full or stopped), aborting drill");
                        drillFailed = true; // AI-modified (Claude)
                        return false;
                    }
                    // drill delays are timed from when the targets are fully facing
                    result = waitUntilFacing(targets);
                    break;
                }

                case StepType::Hide:
                    if(!stepTargets(step)){
                        break; // AI-modified (Claude): see Present
                    }
                    // Ask the HAL to turn this step's targets away from the shooter
                    if(!hal_sendCommand(stepTargets(step), false)){
                        Serial.println("executeDrill: target command not accepted (queue full or stopped), aborting drill");
                        drillFailed = true; // AI-modified (Claude)
                        return false;
                    }
                    break;

                case StepType::Delay:
                    // Hold the current target position for timeMs (stop can cut it short)
                    result = waitMs(step.timeMs, true);
                    break;

                case StepType::Pause:
                    // Wait for the operator to press Resume
                    result = pauseUntilResumed();
                    break;
            }
            if(result == WaitResult::ResetStage){
                if(!rewindStage(i)) return false;
                continue; // execute the rewound first step, not the old step's successor
            }
            if(result == WaitResult::Stopped) return false;
            i++;
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
            drillFailed = false;
            bool completed = !(bits & NOTIFY_STOP) && runSteps();
            // AI-modified (Claude): distinguish an operator stop from a hardware abort.
            // stopLatched is checked before drillFailed because a stop freezes the HAL, which
            // makes the runner's next command fail -- that is still a stop, not a hardware fault.
            bool stopped = stopLatched;
            DrillOutcome outcome = completed ? DrillOutcome::Completed
                                 : stopped ? DrillOutcome::Stopped
                                 : drillFailed ? DrillOutcome::Failed
                                 : DrillOutcome::Stopped;
            Serial.println(outcome == DrillOutcome::Completed ? "Drill complete"
                         : outcome == DrillOutcome::Failed ? "Drill failed"
                         : "Drill stopped (targets frozen)");

            // Leave the drill's targets hidden when it finished or failed. Wait up to 1 s for
            // queue space, since this command matters for safety.
            // AI-modified (Claude): NOT after an emergency stop -- the operator stopped because
            // something was unsafe, so nothing may move until they press Reset.
            if(!stopped && !hal_sendCommand(activeMask, false, pdMS_TO_TICKS(1000))){
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
            currentStep = 0;
            // Clear replay state before releasing the runner (AI-assisted with Codex).
            currentStageIndex = -1;
            pauseControl = PauseControl::Waiting;
            lastOutcome = outcome;
            runnerBusy = false;
            portEXIT_CRITICAL(&runnerLock);
        }
    }

    /// @brief loads, validates and flattens the drill into activeSteps/activeMask
    /// AI-modified (Claude): returns the reason for failure instead of false
    DrillStartResult prepareDrill(const String& drillName, uint32_t targetMask){
        // Step 1: read the drills and targets from flash
        JsonDocument doc;
        if(!loadDrillData(doc)){
            return DrillStartResult::DatabaseError;
        }

        // Step 2: flatten the requested drill (and any drills inside it) into one step list.
        // Built in a local list first so a failure part-way through doesn't touch activeSteps.
        // The top-level lookup is checked separately so "no such drill" can be reported apart
        // from "the drill is broken".
        JsonArrayConst drills = doc["drills"].as<JsonArrayConst>();
        if(findDrill(drills, drillName.c_str()).isNull()){
            Serial.printf("executeDrill: drill \"%s\" not found\r\n", drillName.c_str());
            return DrillStartResult::NotFound;
        }
        std::vector<DrillStep> steps;
        // Build stage metadata locally until the whole drill validates (AI-assisted with Codex).
        std::vector<DrillStage> stages;
        if(!expandDrill(drills, drillName.c_str(), 1, steps, stages)){
            return DrillStartResult::InvalidDrill;
        }
        if(steps.empty()){
            Serial.printf("executeDrill: drill \"%s\" has no steps\r\n", drillName.c_str());
            return DrillStartResult::InvalidDrill;
        }
        // AI-generated (Claude): final-stage hold. A full drill whose last step belongs to its
        // last stage would otherwise end the moment that stage finishes, leaving nothing to
        // redo. Append "hide all, pause" so the runner waits there like the pause between
        // stages: Reset stage replays the last stage, Resume ends the drill. A drill that already
        // ends with a top-level pause (or other top-level steps) is left as written.
        uint16_t finalHold = 0;
        if(!stages.empty() && stages.back().end == steps.size()){
            steps.push_back({StepType::Hide, 0, 0, 0});  // mask 0 = all of the drill's targets
            steps.push_back({StepType::Pause, 0, 0, 0});
            finalHold = steps.size();                    // 1-based step number of that pause
        }

        // Step 3: work out which targets to use. targetMask 0 means "all"; otherwise take the
        // caller's selection (ignoring bits above target 20). Then drop anything that is not
        // marked working, so a broken target is never fired even if it was selected.
        uint32_t requested = targetMask ? (targetMask & ALL_TARGETS_MASK) : ALL_TARGETS_MASK;
        uint32_t mask = requested & workingTargetsMask(doc["targets"].as<JsonArrayConst>());
        if(mask == 0){
            Serial.println("executeDrill: no working targets selected");
            return DrillStartResult::NoWorkingTargets;
        }

        // Step 4: hand the result to the runner. std::move transfers the list without copying it.
        activeSteps = std::move(steps);
        activeStages = std::move(stages);
        // AI-modified (Claude): publish name/mask/step count for getDrillStatus() under the
        // lock, since it can be called from the web server at any moment
        portENTER_CRITICAL(&runnerLock);
        activeMask = mask;
        activeStepCount = activeSteps.size();
        finalHoldStep = finalHold;
        strlcpy(activeName, drillName.c_str(), sizeof(activeName));
        portEXIT_CRITICAL(&runnerLock);
        // %05lX prints the mask in hex, e.g. 0xFFFFF = all 20 targets
        Serial.printf("Starting drill \"%s\": %u steps, target mask 0x%05lX\r\n",
            drillName.c_str(), (unsigned)activeSteps.size(), (unsigned long)activeMask);
        return DrillStartResult::Started;
    }
}

DrillStartResult executeDrill(const String& drillName, uint32_t targetMask){
    // Nothing can move without the HAL, so fail fast and say why
    if(!hal_isReady()){
        Serial.println("executeDrill: HAL not initialized (is hal_init() called?)");
        return DrillStartResult::HalNotReady;
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
        return DrillStartResult::Busy;
    }

    // AI-modified (Claude): refuse early while the emergency stop is latched (re-checked
    // before starting, in case Stop is pressed while the drill is being loaded)
    if(stopLatched){
        portENTER_CRITICAL(&runnerLock);
        runnerBusy = false;
        portEXIT_CRITICAL(&runnerLock);
        Serial.println("executeDrill: emergency stop is latched, press Reset first");
        return DrillStartResult::Stopped;
    }

    // Load and validate the drill. This happens here (not in the runner) so the caller gets an
    // immediate answer. It runs outside the lock because reading flash takes time,
    // and runnerBusy = true already keeps everyone else out.
    DrillStartResult result = prepareDrill(drillName, targetMask);

    // runner task is created on first use and lives for the rest of the program
    // (never deleting it means drillTaskHandle is always safe to notify once set)
    if(result == DrillStartResult::Started && drillTaskHandle == NULL){
        bool created = xTaskCreatePinnedToCore(
            DrillRunnerTask,   // Function to run
            "DrillRunner",     // Name of task
            4096,              // Stack size in bytes (ESP-IDF FreeRTOS)
            NULL,              // Parameter
            4,                 // Priority (just below SolenoidTask)
            &drillTaskHandle,  // Task handle
            1                  // Pin to Core 1
        ) == pdPASS;
        if(!created){
            Serial.println("executeDrill: could not create DrillRunner task");
            result = DrillStartResult::TaskFailed;
        }
    }

    // Anything failed: release the runner again so the next executeDrill() can try
    if(result != DrillStartResult::Started){
        portENTER_CRITICAL(&runnerLock);
        runnerBusy = false;
        portEXIT_CRITICAL(&runnerLock);
        return result;
    }

    // Everything is ready: mark Running and wake the runner to start the drill.
    // AI-modified (Claude): the stop latch is checked here, under the same lock stopDrill() uses,
    // so either we see the stop and don't start, or stopDrill() sees Running and stops us.
    portENTER_CRITICAL(&runnerLock);
    bool stoppedMeanwhile = stopLatched;
    if(stoppedMeanwhile){
        runnerBusy = false;
    }else{
        drillState = DrillState::Running;
    }
    portEXIT_CRITICAL(&runnerLock);
    if(stoppedMeanwhile){
        Serial.println("executeDrill: emergency stop is latched, press Reset first");
        return DrillStartResult::Stopped;
    }
    xTaskNotify(drillTaskHandle, NOTIFY_START, eSetBits);
    return DrillStartResult::Started;
}

// AI-assisted (Claude): operator pause
bool pauseDrill(){
    // Only a running drill can be paused (a paused one already is)
    if(drillState != DrillState::Running){
        return false;
    }
    // The runner acts on this at its next wait (see waitMs())
    xTaskNotify(drillTaskHandle, NOTIFY_PAUSE, eSetBits);
    return true;
}

bool resumeDrill(){
    // Share the request lock with stage reset (AI-assisted with Codex).
    return requestPausedControl(PauseControl::ResumePending) == StageResetResult::Accepted;
}

// Let the runner perform the rewind and target movement (AI-assisted with Codex).
StageResetResult resetDrillStage(){
    return requestPausedControl(PauseControl::ResetPending);
}

// AI-modified (Claude): emergency stop -- freezes targets instead of hiding them
bool stopDrill(){
    // Step 1: latch, and see whether a drill is running, in one locked step (pairs with the
    // check at the end of executeDrill())
    portENTER_CRITICAL(&runnerLock);
    stopLatched = true;
    bool drillActive = drillState != DrillState::Idle;
    portEXIT_CRITICAL(&runnerLock);

    // Step 2: freeze the hardware FIRST, so nothing moves even while the runner is waking up.
    // This also cancels any flip still waiting on its cooldown.
    bool frozen = hal_hold();

    // Step 3: wake the runner from any delay or pause; it ends the drill without hiding
    if(drillActive){
        xTaskNotify(drillTaskHandle, NOTIFY_STOP, eSetBits);
    }
    Serial.println(frozen ? "EMERGENCY STOP: targets frozen"
                          : "EMERGENCY STOP: WARNING freeze not confirmed by solenoid task");
    return frozen;
}

// AI-assisted (Claude): Reset button -- clears the stop latch and hides everything
TargetCommandResult resetTargets(){
    // Claim the runner so no drill or manual move can start while we reset. If it's busy:
    // after a stop, the drill is just winding down, so wait briefly; without a stop, a drill
    // (or manual move) is genuinely running and the operator must stop it first.
    constexpr uint32_t WIND_DOWN_MS = 500;
    constexpr uint32_t POLL_MS = 10;
    for(uint32_t waited = 0; ; waited += POLL_MS){
        portENTER_CRITICAL(&runnerLock);
        bool busy = runnerBusy;
        if(!busy){
            runnerBusy = true;
        }
        bool latched = stopLatched;
        portEXIT_CRITICAL(&runnerLock);

        if(!busy){
            break; // claimed
        }
        if(!latched || waited >= WIND_DOWN_MS){
            return TargetCommandResult::DrillRunning;
        }
        vTaskDelay(pdMS_TO_TICKS(POLL_MS));
    }

    // Clear the latch and unfreeze the HAL. Nothing moves on release (see hal_release()), and
    // nothing else can queue a command before our hide because we hold the runner.
    stopLatched = false;
    hal_release();

    // Hide every target, including ones marked not working: "reset" means everything down.
    // Wait up to 1 s for queue space, like the runner's final hide.
    TargetCommandResult result = TargetCommandResult::Sent;
    if(!hal_isReady()){
        result = TargetCommandResult::HalNotReady;
    }else if(!hal_sendCommand(ALL_TARGETS_MASK, false, pdMS_TO_TICKS(1000))){
        result = TargetCommandResult::QueueFull;
    }
    Serial.println(result == TargetCommandResult::Sent ? "Reset: hiding all targets"
                                                       : "Reset: WARNING could not queue hide");

    portENTER_CRITICAL(&runnerLock);
    runnerBusy = false;
    portEXIT_CRITICAL(&runnerLock);
    return result;
}

DrillState getDrillState(){
    return drillState;
}

// AI-assisted (Claude): status snapshot and manual target control for the web API

DrillStatus getDrillStatus(){
    DrillStatus status;
    TickType_t now = xTaskGetTickCount(); // AI-generated (Claude): for the delay time left
    // copy everything under the lock so the snapshot can't mix two drills or two steps
    portENTER_CRITICAL(&runnerLock);
    status.state = drillState;
    memcpy(status.drillName, activeName, sizeof(status.drillName));
    status.step = currentStep;
    status.stepCount = activeStepCount;
    status.stepAction = currentStep ? stepActionName(currentType) : "";
    status.targetMask = activeMask;
    status.lastOutcome = lastOutcome;
    status.stopped = stopLatched;
    // Stage metadata stays fixed during a run; idle skips this lookup (AI-assisted with Codex).
    const DrillStage* stage = currentStageIndex >= 0 ? &activeStages[currentStageIndex] : nullptr;
    strlcpy(status.stageName, stage ? stage->name : "", sizeof(status.stageName));
    status.stageIndex = currentStageIndex + 1;
    status.betweenStages = stage && currentStep > stage->end;
    status.canResetStage = drillState == DrillState::Paused && currentStageIndex >= 0
                           && !stopLatched && !hasPendingControl();
    status.stageResetPending = pauseControl == PauseControl::ResetPending;
    status.stageRestartReady = pauseControl == PauseControl::ReplayReady;
    // AI-generated (Claude): waiting at the final-stage hold, before any Reset/Resume is accepted
    status.finalStageComplete = drillState == DrillState::Paused && finalHoldStep != 0
                                && currentStep == finalHoldStep && pauseControl == PauseControl::Waiting;
    // AI-generated (Claude): delay countdown. The signed difference handles tick wrap-around.
    status.delayMs = delayTotalMs;
    if(delayTotalMs == 0){
        status.delayRemainingMs = 0;
    }else if(drillState == DrillState::Paused){
        status.delayRemainingMs = delayPausedRemainingMs;
    }else{
        int32_t left = (int32_t)(delayDeadline - now);
        status.delayRemainingMs = left > 0 ? pdTICKS_TO_MS(left) : 0;
    }
    portEXIT_CRITICAL(&runnerLock);
    return status;
}

TargetCommandResult setTargets(uint32_t targetMask, bool present){
    if(!hal_isReady()){
        return TargetCommandResult::HalNotReady;
    }

    // Claim the runner exactly like executeDrill() does, so a drill can't start while we are
    // moving targets by hand (and we can't move them while a drill owns them)
    portENTER_CRITICAL(&runnerLock);
    bool alreadyBusy = runnerBusy;
    runnerBusy = true;
    portEXIT_CRITICAL(&runnerLock);
    if(alreadyBusy){
        return TargetCommandResult::DrillRunning;
    }

    // Same target rules as a drill: 0 = all, and never move a target marked not working.
    // Nothing moves while the emergency stop is latched (the HAL would refuse anyway).
    TargetCommandResult result = TargetCommandResult::Sent;
    JsonDocument doc;
    if(stopLatched){
        result = TargetCommandResult::Stopped;
    }else if(!loadDrillData(doc, false)){
        result = TargetCommandResult::DatabaseError;
    }else{
        uint32_t requested = targetMask ? (targetMask & ALL_TARGETS_MASK) : ALL_TARGETS_MASK;
        uint32_t mask = requested & workingTargetsMask(doc["targets"].as<JsonArrayConst>());
        if(mask == 0){
            result = TargetCommandResult::NoWorkingTargets;
        }else if(!hal_sendCommand(mask, present)){
            result = TargetCommandResult::QueueFull;
        }
    }

    portENTER_CRITICAL(&runnerLock);
    runnerBusy = false;
    portEXIT_CRITICAL(&runnerLock);
    return result;
}
