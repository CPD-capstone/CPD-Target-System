#ifndef TARGET_MANAGER_H
#define TARGET_MANAGER_H

#include <Arduino.h>

// AI-assisted (Claude): drill execution API. A drill is looked up in /database.json,
// expanded into a flat list of steps (nested "Full Drill" entries are inlined), and run by
// a FreeRTOS task that sends target commands to the HAL queue (see hal.h).
//
// Step actions:  "present" -> selected targets face the shooter
//                "hide"    -> selected targets turn away
//                "delay"   -> wait timeMs
//                "pause"   -> hold until resumeDrill() (operator continues the drill)
//                <drill name> -> run that drill's steps in place
// A delay after "present" starts once every selected target is fully facing the shooter
// (solenoid fired + the target flip delay: getFaceTravelMs(), default TARGET_FACE_TRAVEL_MS in hal.h). Timing is accurate to ~10 ms (HAL loop
// period). The HAL enforces a 500 ms per-target cooldown (MECHANICAL_BUFFER), so a target
// flipped again sooner than that is held until its cooldown expires.
//
// Operator controls:
//   pauseDrill()    freezes the drill clock (a delay keeps its remaining time) until resumeDrill()
//   stopDrill()     EMERGENCY STOP: freezes every target exactly where it is -- nothing is hidden or
//                   presented -- and latches. While latched, drills and manual moves are refused.
//   resetTargets()  clears the stop latch and hides every target
//
// hal_init() must have been called first, or executeDrill() returns HalNotReady.

enum class DrillState : uint8_t {
    Idle,     // no drill running
    Running,  // executing steps
    Paused    // waiting for resumeDrill(), at a "pause" step or after pauseDrill()
};

// AI-assisted (Claude): result/status types so the web API can tell the operator *why*
// something was refused and show drill progress.

/// Why executeDrill() did or didn't start a drill
enum class DrillStartResult : uint8_t {
    Started,          // the drill is running
    HalNotReady,      // hal_init() hasn't run or the expander boards failed
    Busy,             // a drill is already running (or targets are being moved manually)
    Stopped,          // the emergency stop is latched; resetTargets() first
    DatabaseError,    // database.json is missing or not valid JSON
    NotFound,         // no drill with that name
    InvalidDrill,     // bad step, missing nested drill, nested too deep, or no steps
    NoWorkingTargets, // none of the selected targets are marked working
    TaskFailed        // the DrillRunner task could not be created (out of memory)
};

/// How the most recent drill ended
enum class DrillOutcome : uint8_t {
    None,      // no drill has finished since boot
    Completed, // every step ran
    Stopped,   // stopDrill() was called; targets were left where they were
    Failed     // aborted by a hardware problem (target queue full or targets didn't fire)
};

/// Why setTargets() / resetTargets() did or didn't move the targets
enum class TargetCommandResult : uint8_t {
    Sent,             // command queued to the HAL
    HalNotReady,      // hal_init() hasn't run or the expander boards failed
    DrillRunning,     // a drill owns the targets; stop it first
    Stopped,          // the emergency stop is latched; resetTargets() first (setTargets() only)
    DatabaseError,    // database.json is missing or not valid JSON
    NoWorkingTargets, // none of the selected targets are marked working
    QueueFull         // the HAL didn't accept the command in time
};

// Results for stage reset requests (AI-assisted with Codex).
// AI-modified (Claude): also returned by jumpToStage(); NoDrill = no drill is running or paused.
enum class StageResetResult : uint8_t { Accepted, NotPaused, NoStage, Busy, Stopped, HalNotReady, NoDrill };

/// AI-generated (Claude): where jumpToStage() moves a running or paused drill.
///   Current  = restart the stage being run (between stages: the stage just completed)
///   Previous = the stage before that
///   Next     = the stage after the one being run (between stages: skip the upcoming one)
/// "Stages" are a full drill's stages; a drill without stages is split into parts at its
/// pause steps, and those parts are used instead (see DrillStatus::stagesAreParts).
/// AI-modified (Claude): CurrentPart / PreviousPart / NextPart do the same with the parts of a
/// full drill's current stage (split at the stage's pause steps), staying inside that stage.
enum class StageJump : uint8_t { Current, Previous, Next, CurrentPart, PreviousPart, NextPart };

/// longest drill name kept for status display (longer names are truncated)
constexpr size_t DRILL_NAME_MAX = 48;

/// Snapshot of the drill runner, for status display. While Idle, drillName / stepCount /
/// targetMask describe the most recent drill (empty/0 if none has run).
struct DrillStatus {
    DrillState state;
    char drillName[DRILL_NAME_MAX];
    uint16_t step;            // 1-based step being run (nested drills already inlined); 0 when idle
    uint16_t stepCount;       // total steps in the drill
    const char* stepAction;   // "present" / "hide" / "delay" / "pause"; "" when idle
    uint32_t targetMask;      // targets the drill uses, after excluding non-working ones
    DrillOutcome lastOutcome; // how the most recent drill ended
    bool stopped;             // emergency stop is latched (cleared by resetTargets())
    // AI-generated (Claude): the delay step being run, for the web UI's countdown. Both are 0
    // when the current step isn't a delay. While paused, delayRemainingMs stays frozen.
    uint32_t delayMs;          // length of the delay step
    uint32_t delayRemainingMs; // time left in it
    // Stage and replay state reported by the controller; empty/0 when idle (AI-assisted with Codex).
    char stageName[DRILL_NAME_MAX];
    uint16_t stageIndex;       // 1-based occurrence within the full drill, even for repeated names
    bool betweenStages;       // stageName is the completed stage at a top-level pause
    bool canResetStage;
    bool stageResetPending;   // hide/rewind has not finished; Resume is refused
    bool stageRestartReady;   // rewound and paused at the first step, waiting for Resume
    // AI-generated (Claude): a full drill's last stage has finished and the controller is holding
    // (targets hidden) so it can be redone. Reset stage replays it; Resume ends the drill.
    bool finalStageComplete;
    // AI-generated (Claude): stage navigation for the web UI.
    uint16_t stageCount;      // stages (or parts, see stagesAreParts) in the drill; 0 when idle
    bool stagesAreParts;      // the drill has no stages, so stageName/stageIndex/stageCount are its parts
    uint16_t partIndex;       // 1-based part within the current stage (parts are split at pause
                              // steps); at a pause inside the stage, the part just completed. 0 if none
    uint16_t partCount;       // parts in the current stage (1 = no pauses); 0 if none
    bool canGoBack;           // jumpToStage(Previous) would be accepted now
    bool canSkip;             // jumpToStage(Next) would be accepted now
    // AI-generated (Claude): the same for the parts of a full drill's current stage
    bool canRedoPart;         // jumpToStage(CurrentPart)
    bool canGoBackPart;       // jumpToStage(PreviousPart)
    bool canSkipPart;         // jumpToStage(NextPart)
};

/// @brief This function executes the drill that is passed into its arg by finding it in the json drills list and converting it to the FreeRTOS cmd queue
/// @param drillName drillName of the drill in database.json to execute
/// @param targetMask targets to use (bit 0 = target 1, see targetBit() in hal.h); 0 = all targets.
///                   Targets marked "working": false in database.json are always excluded.
/// @return Started if the drill was found, is valid, and has started; otherwise the reason it wasn't
DrillStartResult executeDrill(const String& drillName, uint32_t targetMask = 0);

/// @brief operator pause: freezes the drill clock until resumeDrill(). Targets stay where they are
///        (a flip already commanded still completes). Takes effect at the drill's next wait --
///        a delay, or waiting for targets to face -- so a pause sent after the last wait of a
///        drill has nothing to pause and the drill simply finishes.
/// @return true if a running drill was told to pause, false if no drill is running (or already paused)
bool pauseDrill();

/// @brief continues a paused drill, whether it was paused by a "pause" step or by pauseDrill().
///        A delay that was interrupted continues with the time it had left.
/// @return true if Resume was accepted; false if not paused, stopped, or reset/Resume is pending
bool resumeDrill();

/// @brief Hide targets and rewind the paused full drill's current/completed stage (AI-assisted with Codex).
///        Remains paused until Resume. AI-modified (Claude): this includes the last stage, since a
///        full drill holds paused after it (see DrillStatus::finalStageComplete).
///        AI-modified (Claude): same as jumpToStage(StageJump::Current), so it also works while
///        the drill is running.
/// @return Accepted if queued/already rewound; otherwise why reset is unavailable
StageResetResult resetDrillStage();

/// @brief AI-generated (Claude): moves a running or paused drill to another stage (or part). The
///        runner hides the drill's targets, waits out the mechanical buffer, moves to the first step
///        of that stage and pauses there (stageRestartReady) until resumeDrill().
/// @param jump which stage (or part of the current stage) to move to, relative to the current one
///        (see StageJump)
/// @return Accepted if the move was queued; NoStage if there is no such stage (or the drill is not
///         in one); NoDrill, Busy, Stopped or HalNotReady otherwise
StageResetResult jumpToStage(StageJump jump);

/// @brief AI-generated (Claude): like jumpToStage(), but to a given stage and part instead of one
///        relative to the current stage (the web UI's "jump to any stage" list and part chips).
/// @param stage 1-based stage (or part, for a drill without stages; see DrillStatus::stagesAreParts)
/// @param part 1-based part of that stage, split at its pause steps (1 = the stage's start; only 1
///        is valid when stagesAreParts)
/// @return Accepted if the move was queued; NoStage if there is no such stage or part; NoDrill, Busy,
///         Stopped or HalNotReady otherwise
StageResetResult jumpToStagePart(int stage, int part);

/// @brief EMERGENCY STOP. Freezes every target where it is (see hal_hold()), ends any running
///        drill WITHOUT hiding its targets, and latches: drills and manual moves are refused until
///        resetTargets(). Works whether or not a drill is running; calling it again is harmless.
/// @return true once the freeze is confirmed; false if the solenoid task didn't confirm it
bool stopDrill();

/// @brief clears the emergency stop latch and hides ALL targets (including ones marked not
///        working). Refused while a drill is running or paused -- stop it first. After a stop,
///        waits up to 500 ms for the stopped drill to finish winding down.
/// @return Sent if the hide was queued; otherwise the reason it wasn't. The stop latch is cleared
///         whenever the drill runner is idle, even if the HAL isn't ready.
TargetCommandResult resetTargets();

/// @brief current state of the drill runner, for status display
DrillState getDrillState();

/// @brief full snapshot of the drill runner (name, progress, last outcome, stop latch), for status display
DrillStatus getDrillStatus();

// AI-generated (Claude): target flip delay (Settings page) --------------------------------------------

/// longest target flip delay accepted, in ms
constexpr uint32_t FACE_TRAVEL_MAX_MS = 5000;

/// @brief loads the saved target flip delay from NVS (namespace "drill_config", key "face_ms");
///        TARGET_FACE_TRAVEL_MS (hal.h) if none is saved. Call once in setup().
void loadDrillSettings();

/// @brief the target flip delay in use: how long after a present step's targets have fired the
///        runner waits for them to turn fully flat before the next delay starts counting
/// @return milliseconds
uint32_t getFaceTravelMs();

/// @brief changes the target flip delay and saves it in NVS (it survives reboots and uploadfs).
///        Takes effect at the next present step, including in a drill that is running.
/// @param ms 0 to FACE_TRAVEL_MAX_MS
/// @return false if out of range or it could not be saved (the old value stays in use)
bool setFaceTravelMs(uint32_t ms);

/// @brief manually presents or hides targets outside a drill. Refused while a drill is running
///        so it can't fight the runner, and while the emergency stop is latched.
///        Targets marked "working": false are always excluded.
/// @param targetMask targets to move (bit 0 = target 1); 0 = all targets
/// @param present true to face the shooter, false to turn away
/// @return Sent if the command was queued; otherwise the reason it wasn't
TargetCommandResult setTargets(uint32_t targetMask, bool present);

#endif
