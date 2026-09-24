#ifndef DATABASE_H
#define DATABASE_H

#include <LittleFS.h>
#include <ArduinoJson.h>

/// @brief This function starts the little file system, which allows persistence of data.
void startLFS();

// AI-assisted (Claude): declarations for the CRUD functions in database.cpp. Every function
// loads /database.json, applies the change, and writes it back atomically.

/// @brief Prints every target's id and working flag to Serial.
void readTargets();

/// @brief Adds a target entry.
/// @param id target number, 1..NUM_TARGETS; must not already exist
/// @param working whether the target is in service
/// @return true if the entry was added and saved
bool addTarget(int id, bool working);

/// @brief Marks a target as in or out of service.
/// @param id target number
/// @param working new working flag
/// @return true if the target exists and the change was saved
bool editTarget(int id, bool working);

/// @brief Takes a target out of service. The entry is kept (working = false) because the range
///        always has NUM_TARGETS targets.
/// @param id target number
/// @return true if the target exists and the change was saved
bool deleteTarget(int id);

/// @brief Adds an officer with empty pistol/rifle/swat score lists.
/// @param badgeNum badge number; must not already exist
/// @param name officer's name
/// @return true if the officer was added and saved
bool addOfficer(int badgeNum, const char* name);

/// @brief Renames an officer.
/// @param badgeNum badge number of the officer to edit
/// @param name new name
/// @return true if the officer exists and the change was saved
bool editOfficer(int badgeNum, const char* name);

/// @brief Records a qualification score as the newest entry of that officer's score list.
/// @param badgeNum badge number of the officer
/// @param qualType "pistol", "rifle" or "swat"
/// @param score the score
/// @param date date shot, "YYYY-MM-DD"
/// @return true if the inputs are valid, the officer exists, and the change was saved
bool addQualScore(int badgeNum, const char* qualType, int score, const char* date);

/// @brief Removes an officer and all of their scores.
/// @param badgeNum badge number of the officer
/// @return true if the officer existed and the change was saved
bool deleteOfficer(int badgeNum);

/// @brief Adds a drill. Each step's action must be present/hide/pause/delay (delay needs a
///        positive timeMs) or the name of another existing drill, without forming a loop.
/// @param drillName unique drill name
/// @param sequence array of { "step", "action", "timeMs"? } objects
/// @return true if the drill is valid and was saved
bool addDrill(const char* drillName, JsonArrayConst sequence);

/// @brief Replaces a drill's sequence, validated the same way as addDrill().
/// @param drillName name of the drill to edit
/// @param newSequence replacement sequence
/// @return true if the drill exists, the sequence is valid, and the change was saved
bool editDrill(const char* drillName, JsonArrayConst newSequence);

/// @brief Deletes a drill, refusing while another drill still includes it as a step.
/// @param drillName name of the drill to delete
/// @return true if the drill was removed and the change was saved
bool deleteDrill(const char* drillName);

#endif
