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
// (solenoid fired + TARGET_FACE_TRAVEL_MS in hal.h). Timing is accurate to ~10 ms (HAL loop
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

/// longest drill name kept for status display (longer names are truncated)
const expr size_t DRILL_NAME_MAX = 48;

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
/// @return true if a paused drill was resumed, false if no drill is paused
bool resumeDrill();

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

/// @brief manually presents or hides targets outside a drill. Refused while a drill is running
///        so it can't fight the runner, and while the emergency stop is latched.
///        Targets marked "working": false are always excluded.
/// @param targetMask targets to move (bit 0 = target 1); 0 = all targets
/// @param present true to face the shooter, false to turn away
/// @return Sent if the command was queued; otherwise the reason it wasn't
TargetCommandResult setTargets(uint32_t targetMask, bool present);

#endif
