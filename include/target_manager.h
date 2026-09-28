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
// hal_init() must have been called first, or executeDrill() returns false.

enum class DrillState : uint8_t {
    Idle,     // no drill running
    Running,  // executing steps
    Paused    // waiting at a "pause" step for resumeDrill()
};

/// @brief This function executes the drill that is passed into its arg by finding it in the json drills list and converting it to the FreeRTOS cmd queue
/// @param drillName drillName of the drill in database.json to execute
/// @param targetMask targets to use (bit 0 = target 1, see targetBit() in hal.h); 0 = all targets.
///                   Targets marked "working": false in database.json are always excluded.
/// @return true if the drill was found, is valid, and has started; false if not found, invalid,
///         no working targets were selected, the HAL isn't initialized, or a drill is already running
bool executeDrill(const String& drillName, uint32_t targetMask = 0);

/// @brief continues a drill that is waiting at a "pause" step
/// @return true if a paused drill was resumed, false if no drill is paused
bool resumeDrill();

/// @brief aborts the running drill and hides its targets
/// @return true if a drill was running and has been told to stop, false if no drill was running
bool stopDrill();

/// @brief current state of the drill runner, for status display
DrillState getDrillState();

#endif
