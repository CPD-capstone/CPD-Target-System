#ifndef TARGET_MANAGER_H
#define TARGET_MANAGER_H

#include <Arduino.h>

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
