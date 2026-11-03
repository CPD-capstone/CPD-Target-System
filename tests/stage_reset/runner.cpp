// Stage-reset regression tests using the production runner (AI-assisted with Codex).
// Clock, notifications and HAL outputs are simulated; no hardware or database is changed.
#include "mocks/Arduino.h"
#include <iostream>
#include "../../src/target_manager.cpp"

#define CHECK(condition) do { if(!(condition)) throw std::runtime_error( \
    std::string(__func__) + ":" + std::to_string(__LINE__) + " " #condition); } while(false)

struct EndRunner {};
struct Event { TickType_t at; std::function<void()> call; };
struct Move { TickType_t at; uint32_t mask; bool present; };
std::vector<Event> events;
std::vector<Move> commands, flips;
TickType_t now;
uint32_t notification, facing, desired, rng;
TickType_t lastFlip[NUM_TARGETS];
bool hardwareReady, held, rejectQueue, stuckHide;

TickType_t xTaskGetTickCount(){ return now; }
int xTaskNotify(TaskHandle_t, uint32_t bits, int){ notification |= bits; return pdPASS; }
int xTaskCreatePinnedToCore(void (*)(void*), const char*, uint32_t, void*, int, TaskHandle_t* handle, int){
    *handle = reinterpret_cast<void*>(1);
    return pdPASS;
}
uint32_t esp_random(){ return ++rng * 2654435761UL; }
bool hal_isReady(){ return hardwareReady; }
uint32_t hal_getTargetStates(){ return facing; }
bool hal_sendCommand(uint32_t mask, bool present, TickType_t){
    if(held || !hardwareReady || rejectQueue) return false;
    commands.push_back({now, mask, present});
    desired = present ? desired | mask : desired & ~mask;
    return true;
}
bool hal_hold(){ held = true; desired = facing; return true; }
void hal_release(){ held = false; }

void tick(){
    now++;
    if(now % 10 == 0 && hardwareReady && !held){
        uint32_t ready = 0;
        for(uint8_t n = 0; n < NUM_TARGETS; n++){
            uint32_t bit = 1UL << n;
            if(((facing ^ desired) & bit) && now - lastFlip[n] >= MECHANICAL_BUFFER
                && !(stuckHide && !(desired & bit))){
                ready |= bit;
                lastFlip[n] = now;
            }
        }
        if(ready){
            facing ^= ready;
            flips.push_back({now, facing, facing != 0});
        }
    }
    while(!events.empty() && events.front().at <= now){
        auto call = events.front().call;
        events.erase(events.begin());
        call();
    }
}
void vTaskDelay(TickType_t length){ while(length--) tick(); }
int xTaskNotifyWait(uint32_t, uint32_t, uint32_t* bits, TickType_t timeout){
    TickType_t started = now;
    while(!notification){
        if(timeout == portMAX_DELAY && events.empty()){
            if(drillState == DrillState::Idle && !runnerBusy) throw EndRunner{};
            throw std::runtime_error("runner stuck without an operator event");
        }
        if(now - started >= timeout){ *bits = 0; return 0; }
        tick();
    }
    *bits = notification;
    notification = 0;
    return pdTRUE;
}
void at(TickType_t when, std::function<void()> call){
    events.push_back({when, call});
    std::stable_sort(events.begin(), events.end(), [](const Event& a, const Event& b){ return a.at < b.at; });
}

const char* fixture = R"({"targets":[{"id":1,"working":true},{"id":2,"working":false},{"id":3,"working":true}],"drills":[
 {"drillName":"Stage 1","sequence":[{"action":"present"},{"action":"delay","timeMs":3000},{"action":"hide"}]},
 {"drillName":"Stage 2","sequence":[{"action":"present"},{"action":"delay","timeMs":8000},{"action":"hide"}]},
 {"drillName":"Full","sequence":[{"action":"Stage 1"},{"action":"pause"},{"action":"Stage 2"}]},
 {"drillName":"Repeated","sequence":[{"action":"Stage 1"},{"action":"pause"},{"action":"Stage 1"},{"action":"pause"}]},
 {"drillName":"Inside","sequence":[{"action":"present"},{"action":"pause"},{"action":"hide"}]},
 {"drillName":"Nested","sequence":[{"action":"Stage 1"},{"action":"Inside"}]},
 {"drillName":"Outer","sequence":[{"action":"Nested"},{"action":"pause"}]},
 {"drillName":"Before","sequence":[{"action":"pause"},{"action":"Stage 1"}]},
 {"drillName":"Random","sequence":[{"action":"present","random":1},{"action":"pause"},{"action":"hide"}]},
 {"drillName":"Random full","sequence":[{"action":"Random"}]},
 {"drillName":"Assigned","sequence":[{"action":"present","targets":[2,3]},{"action":"pause"},{"action":"hide","targets":[2,3]}]},
 {"drillName":"Assigned full","sequence":[{"action":"Assigned"}]}
]})";

void setup(const char* name = "Full", uint32_t targetMask = 0){
    now = 1000;
    notification = facing = desired = rng = 0;
    std::fill(std::begin(lastFlip), std::end(lastFlip), 0);
    hardwareReady = true;
    held = rejectQueue = stuckHide = false;
    events.clear(); commands.clear(); flips.clear();
    drillState = DrillState::Idle;
    runnerBusy = stopLatched = drillFailed = false;
    pauseControl = PauseControl::Waiting;
    currentStageIndex = -1;
    currentStep = 0;
    delayTotalMs = delayPausedRemainingMs = 0;
    fixtureDatabase = fixture;
    CHECK(executeDrill(name, targetMask) == DrillStartResult::Started);
    CHECK(activeMask == ((targetMask ? targetMask : ALL_TARGETS_MASK) & (targetBit(1) | targetBit(3))));
}
void run(){
    try { DrillRunnerTask(nullptr); } catch(const EndRunner&) {}
    CHECK(events.empty());
    CHECK(drillState == DrillState::Idle);
    CHECK(!getDrillStatus().canResetStage);
    CHECK(getDrillStatus().stageIndex == 0);
    CHECK(!getDrillStatus().stageResetPending && !getDrillStatus().stageRestartReady);
}
size_t presents(){
    return std::count_if(commands.begin(), commands.end(), [](const Move& m){return m.present;});
}
void completed(){ CHECK(lastOutcome == DrillOutcome::Completed); }
// AI-generated (Claude): a full drill ending on a stage now holds after it; Resume ends the drill
void finishAtFinalHold(TickType_t when){
    at(when, []{
        auto s = getDrillStatus();
        CHECK(s.finalStageComplete && s.betweenStages && s.canResetStage && !facing);
        CHECK(resumeDrill());
        CHECK(!getDrillStatus().finalStageComplete);
    });
}

void boundaryReplay(){
    setup();
    at(4100, []{
        auto s = getDrillStatus();
        CHECK(s.betweenStages && s.stageIndex == 1 && std::string(s.stageName) == "Stage 1");
        CHECK(resetDrillStage() == StageResetResult::Accepted);
        CHECK(resetDrillStage() == StageResetResult::Busy);
        CHECK(!resumeDrill());
    });
    at(4800, []{
        auto s = getDrillStatus();
        CHECK(s.stageRestartReady && s.canResetStage && !s.betweenStages && s.step == 1 && s.delayMs == 0);
        CHECK(!facing);
        CHECK(resetDrillStage() == StageResetResult::Accepted); // idempotent ready retry
        CHECK(resumeDrill());
        CHECK(resetDrillStage() == StageResetResult::Busy);
    });
    at(7900, []{
        CHECK(presents() == 2);
        CHECK(getDrillStatus().betweenStages && getDrillStatus().stageIndex == 1);
        CHECK(resumeDrill());
    });
    finishAtFinalHold(20000);
    run(); completed();
    CHECK(presents() == 3);
    CHECK(now >= 16000);
}
void midDelayReplay(){
    setup();
    at(4100, []{ CHECK(resumeDrill()); });
    at(6000, []{ CHECK(pauseDrill()); });
    at(6010, []{
        CHECK(getDrillStatus().stageIndex == 2 && getDrillStatus().delayRemainingMs < 8000);
        CHECK(resetDrillStage() == StageResetResult::Accepted);
    });
    at(6700, []{
        CHECK(getDrillStatus().stageRestartReady && getDrillStatus().delayMs == 0 && !facing);
        CHECK(resumeDrill());
    });
    finishAtFinalHold(20000);
    run(); completed();
    CHECK(presents() == 3);
    CHECK(now >= 14710); // full eight seconds after replay is facing
}
void plainResume(){
    setup("Stage 1");
    at(2000, []{ CHECK(pauseDrill()); });
    at(2100, []{
        CHECK(resetDrillStage() == StageResetResult::NoStage);
        CHECK(getDrillStatus().delayRemainingMs == 2010);
    });
    at(3000, []{ CHECK(getDrillStatus().delayRemainingMs == 2010); CHECK(resumeDrill()); });
    run(); completed(); CHECK(now == 5010); CHECK(presents() == 1);
}
void repeatedStage(){
    setup("Repeated");
    at(4100, []{ CHECK(resumeDrill()); });
    at(7800, []{
        CHECK(getDrillStatus().stageIndex == 2);
        CHECK(resetDrillStage() == StageResetResult::Accepted);
    });
    at(8500, []{ CHECK(getDrillStatus().stageIndex == 2); CHECK(resumeDrill()); });
    at(11600, []{ CHECK(getDrillStatus().stageIndex == 2); CHECK(resumeDrill()); });
    run(); completed(); CHECK(presents() == 3);
}
void nestedInternalPause(){
    setup("Outer");
    at(4700, []{
        CHECK(std::string(getDrillStatus().stageName) == "Nested");
        CHECK(!getDrillStatus().betweenStages);
        CHECK(resetDrillStage() == StageResetResult::Accepted);
    });
    at(5400, []{ CHECK(resumeDrill()); });
    at(9100, []{ CHECK(getDrillStatus().step == 5); CHECK(resumeDrill()); });
    at(9200, []{ CHECK(getDrillStatus().betweenStages); CHECK(resumeDrill()); });
    run(); completed(); CHECK(presents() == 4);
}
void facingWaitReplay(){
    setup();
    // Force the first present to wait on cooldown, then reset while paused in that wait.
    std::fill(std::begin(lastFlip), std::end(lastFlip), now);
    at(1050, []{ CHECK(pauseDrill()); });
    at(1060, []{ CHECK(resetDrillStage() == StageResetResult::Accepted); });
    at(1700, []{ CHECK(!facing); CHECK(resumeDrill()); });
    at(4800, []{ CHECK(resumeDrill()); });
    finishAtFinalHold(20000);
    run(); completed(); CHECK(presents() == 3);
}
void stopRaces(){
    for(int order = 0; order < 3; order++){
        setup();
        at(2000, []{ CHECK(pauseDrill()); });
        at(2100, [order]{
            if(order == 0){ CHECK(resetDrillStage() == StageResetResult::Accepted); CHECK(!resumeDrill()); }
            if(order == 1){ CHECK(resumeDrill()); CHECK(resetDrillStage() == StageResetResult::Busy); }
            CHECK(stopDrill());
            CHECK(resetDrillStage() == StageResetResult::Stopped);
            CHECK(!resumeDrill());
        });
        run();
        CHECK(lastOutcome == DrillOutcome::Stopped && stopLatched && held);
        CHECK(facing == activeMask && commands.size() == 1); // Stop issued no hide
    }
    setup();
    at(2000, []{ CHECK(pauseDrill()); });
    at(2100, []{ CHECK(resetDrillStage() == StageResetResult::Accepted); });
    at(2110, []{ CHECK(stopDrill()); }); // interrupt the hide settling wait
    run(); CHECK(lastOutcome == DrillOutcome::Stopped && held && presents() == 1);

    setup();
    size_t beforeStop = 0;
    at(2000, []{ CHECK(pauseDrill()); });
    at(2100, []{ CHECK(resetDrillStage() == StageResetResult::Accepted); });
    at(2800, [&beforeStop]{
        CHECK(getDrillStatus().stageRestartReady && !facing);
        beforeStop = commands.size();
        CHECK(stopDrill());
        CHECK(!resumeDrill() && resetDrillStage() == StageResetResult::Stopped);
    });
    run();
    CHECK(lastOutcome == DrillOutcome::Stopped && held && !facing);
    CHECK(commands.size() == beforeStop && presents() == 1); // no movement after Stop
}
void invalidAndFailure(){
    setup("Before");
    CHECK(resetDrillStage() == StageResetResult::NotPaused);
    at(1010, []{ CHECK(resetDrillStage() == StageResetResult::NoStage); CHECK(resumeDrill()); });
    finishAtFinalHold(10000);
    run(); completed();
    CHECK(resetDrillStage() == StageResetResult::NotPaused);
    for(int failure = 0; failure < 3; failure++){
        setup();
        at(2000, []{ CHECK(pauseDrill()); });
        at(2100, [failure]{
            CHECK(resetDrillStage() == StageResetResult::Accepted);
            rejectQueue = failure == 0;
            stuckHide = failure == 1;
        });
        if(failure == 2) at(2110, []{ hardwareReady = false; });
        run(); CHECK(lastOutcome == DrillOutcome::Failed && presents() == 1);
    }
    setup(); hardwareReady = false;
    CHECK(resetDrillStage() == StageResetResult::HalNotReady);
}
void assignmentsAndRandom(){
    for(const char* name : {"Assigned full", "Random full"}){
        setup(name);
        at(1600, []{ CHECK(resetDrillStage() == StageResetResult::Accepted); });
        at(2300, []{ CHECK(resumeDrill()); });
        at(2900, []{ CHECK(resumeDrill()); });
        finishAtFinalHold(5000);
        run(); completed();
        CHECK(presents() == 2);
        for(const auto& command : commands) CHECK(!(command.mask & targetBit(2)));
        if(std::string(name) == "Assigned full") CHECK(commands.front().mask == targetBit(3));
        else CHECK(rng == 2); // each execution makes a fresh random choice, which may repeat
    }
}

// Check replay with a restricted selection and stale notification bits (AI-assisted with Codex).
void selectedTargetsAndLateNotifications(){
    setup("Full", targetBit(1) | targetBit(2)); // target 2 is defective
    at(2000, []{ CHECK(pauseDrill()); });
    at(2100, []{ CHECK(resetDrillStage() == StageResetResult::Accepted); });
    at(2200, []{ CHECK(!resumeDrill()); CHECK(getDrillStatus().stageResetPending); });
    at(2800, []{
        auto status = getDrillStatus();
        CHECK(status.stageRestartReady && !status.stageResetPending && status.targetMask == targetBit(1));
        CHECK(!facing && presents() == 1);
        notification |= NOTIFY_RESUME | NOTIFY_RESET_STAGE | NOTIFY_PAUSE; // old wakeups, no new request
    });
    at(2900, []{
        CHECK(getDrillStatus().stageRestartReady && presents() == 1);
        CHECK(resumeDrill());
    });
    at(5900, []{ CHECK(getDrillStatus().delayMs == 3000 && getDrillStatus().delayRemainingMs == 10); });
    at(6000, []{ CHECK(getDrillStatus().betweenStages); CHECK(resumeDrill()); });
    finishAtFinalHold(20000);
    run(); completed();
    CHECK(presents() == 3);
    for(const auto& command : commands) CHECK(command.mask == targetBit(1));
}
// AI-generated (Claude): redo the last stage of a full drill from the final-stage hold
void finalStageReplay(){
    setup();
    at(4100, []{ CHECK(resumeDrill()); });
    at(16000, []{
        auto s = getDrillStatus();
        CHECK(s.state == DrillState::Paused && s.finalStageComplete && s.betweenStages);
        CHECK(s.stageIndex == 2 && std::string(s.stageName) == "Stage 2");
        CHECK(s.step == s.stepCount && !facing);
        CHECK(resetDrillStage() == StageResetResult::Accepted);
        CHECK(!getDrillStatus().finalStageComplete); // reset pending
    });
    at(16700, []{
        auto s = getDrillStatus();
        CHECK(s.stageRestartReady && s.stageIndex == 2 && !s.finalStageComplete && !facing);
        CHECK(resumeDrill());
    });
    at(26000, []{
        CHECK(presents() == 3);
        CHECK(getDrillStatus().finalStageComplete);
        CHECK(stopDrill()); // Stop at the hold freezes; nothing was facing
    });
    run();
    CHECK(lastOutcome == DrillOutcome::Stopped && !facing);
    // Drills that already end with a top-level pause get no extra hold
    setup("Repeated");
    CHECK(finalHoldStep == 0);
    CHECK(activeSteps.size() == 8);
    setup("Stage 1");
    CHECK(finalHoldStep == 0);
}
int main(){
    try {
        for(auto test : {boundaryReplay, midDelayReplay, plainResume, repeatedStage,
                        nestedInternalPause, facingWaitReplay, stopRaces, invalidAndFailure,
                        assignmentsAndRandom, selectedTargetsAndLateNotifications, finalStageReplay}) test();
        std::cout << "PASS: 11 scenario groups (production runner, simulated FreeRTOS/HAL)\n";
    }catch(const std::exception& error){ std::cerr << error.what() << '\n'; return 1; }
}
