#ifndef DATABASE_H
#define DATABASE_H

#include <LittleFS.h>
#include <ArduinoJson.h>

/// @brief This function starts the little file system, which allows persistence of data.
void startLFS();

// AI-assisted (Claude): declarations for the CRUD functions in database.cpp. Every function
// loads /database.json, applies the change, and writes it back atomically.

/// @brief Loads the whole of /database.json, restoring it from /database.tmp if a save was
///        interrupted. Prefer the get* functions below when only one section is needed.
/// @param doc document to fill; cleared on failure
/// @return true if the database was read and parsed
bool loadDatabase(JsonDocument& doc);

// AI-assisted (Claude): read functions for the web API. Each loads only the section it needs and
// makes the requested data the root of `out`, ready for serializeJson(out, ...). `out` is
// cleared when they return false.

/// @brief Reads the targets array: [ { "id", "working" }, ... ].
/// @param out document to fill
/// @return true if the targets section exists and was copied
bool getTargets(JsonDocument& out);

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

/// @brief Reads the Officers array, including each officer's score lists.
/// @param out document to fill
/// @return true if the Officers section exists and was copied
bool getOfficers(JsonDocument& out);

/// @brief Reads one officer: { "Name", "BadgeNum", "pistolQualScores", ... }.
/// @param badgeNum badge number of the officer
/// @param out document to fill
/// @return true if the officer exists and was copied
bool getOfficer(int badgeNum, JsonDocument& out);

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

/// @brief Reads the drills array: [ { "drillName", "sequence" }, ... ].
/// @param out document to fill
/// @return true if the drills section exists and was copied
bool getDrills(JsonDocument& out);

/// @brief Reads one drill: { "drillName", "sequence" }. Nested drills are not expanded.
/// @param drillName name of the drill
/// @param out document to fill
/// @return true if the drill exists and was copied
bool getDrill(const char* drillName, JsonDocument& out);

/// @brief Adds a drill. Each step's action must be present/hide/pause/delay (delay needs a
///        positive timeMs) or the name of another existing drill, without forming a loop.
/// @param drillName unique, non-empty drill name other than present/hide/pause/delay
/// @param sequence array of { "step", "action", "timeMs"? } objects
/// @return true if the drill is valid and was saved
bool addDrill(const char* drillName, JsonArrayConst sequence);

/// @brief Replaces a drill's sequence, validated the same way as addDrill().
/// @param drillName name of the drill to edit
/// @param newSequence replacement sequence
/// @return true if the drill exists, the sequence is valid, and the change was saved
bool editDrill(const char* drillName, JsonArrayConst newSequence);

/// @brief Checks whether a name is reserved for a step action (present/hide/pause/delay) and so
///        can't be used as a drill name.
/// @param drillName name to check
/// @return true if the name is reserved
bool isReservedDrillName(const char* drillName);

/// @brief Renames a drill and updates every step in other drills that includes it by name.
/// @param oldName current name of the drill
/// @param newName new name; must be non-empty, unused, and not present/hide/pause/delay
/// @return true if the drill exists, the new name is valid, and the change was saved
bool renameDrill(const char* oldName, const char* newName);

/// @brief Deletes a drill, refusing while another drill still includes it as a step.
/// @param drillName name of the drill to delete
/// @return true if the drill was removed and the change was saved
bool deleteDrill(const char* drillName);

#endif
