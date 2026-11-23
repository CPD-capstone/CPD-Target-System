#ifndef DATABASE_H
#define DATABASE_H

#include <LittleFS.h>
#include <ArduinoJson.h>

// AI-generated (Codex): shared software database/recovery contract.
constexpr int DATABASE_SCHEMA_VERSION = 1;
constexpr size_t DATABASE_MAX_BYTES = 262144;

/// @brief Parses bounded strict JSON before schema validation; rejects duplicate decoded keys.
/// @param payload exact UTF-8 JSON bytes; a terminator is not required
/// @param length byte count, at most DATABASE_MAX_BYTES
/// @param doc parsed output, cleared on failure; no schema migration occurs
/// @param reason parse/size/depth error on failure
/// @return true for one complete JSON value with at most ten nested containers
bool parseDatabaseJson(const char* payload, size_t length, JsonDocument& doc, String& reason);

/// @brief Parses a bounded JSON file using a fixed streaming cache; no schema mutation occurs.
/// @param path LittleFS source path
/// @param doc destination, with owned strings copied from the stream
/// @param reason parse/read error on failure
/// @return true for complete strict JSON within the supported byte/depth limits
bool parseDatabaseFile(const char* path, JsonDocument& doc, String& reason);

/// @brief Validates a complete database and optionally migrates absent legacy metadata in memory.
/// @param doc candidate; optional historical score arrays may remain absent
/// @param reason empty on success, otherwise the validation error
/// @param allowLegacy whether absent schemaVersion/catalog can be migrated
/// @return true for a supported, complete database
bool validateDatabase(JsonDocument& doc, String& reason, bool allowLegacy = true);

/// @brief Writes and verifies a candidate before replacing live data; retains a validated backup.
/// @param doc candidate database, migrated in memory if necessary
/// @return true only after replacement succeeds
bool saveDatabase(JsonDocument& doc);

/// @brief Validates and saves an explicit restore using the same persistence transaction.
/// @param doc uploaded candidate
/// @param reason validation or storage error on failure
/// @return true when the restore persisted
bool restoreDatabase(JsonDocument& doc, String& reason);

/// @brief Exports the currently validated live database for an operator backup.
/// @param out destination document, cleared on failure
/// @return true if a valid database is available
bool getDatabaseBackup(JsonDocument& out);

/// @brief Reports cached readiness/migration/recovery from startup and the last database operation.
///        Polling does not read files or allocate a database document.
/// @param out destination diagnostics object
void getDatabaseDiagnostics(JsonDocument& out);

/// @brief This function starts the little file system, which allows persistence of data.
void startLFS();

// AI-assisted (Claude): declarations for the CRUD functions in database.cpp. Every function
// loads /database.json, applies the change, and writes it back atomically.

/// @brief Loads and validates live data, recovering from a validated temporary file or backup.
/// @param doc document to fill; cleared on failure
/// @return true only when a supported database exists at the live path
bool loadDatabase(JsonDocument& doc);

// AI-modified (Codex): read functions use the exact SHA256 of a fully validated file before
// parsing the requested section or record directly into the result, and
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

// AI-modified (Claude): the officer getters also report qualification stats. Each officer gets
// "pistolStats", "rifleStats" and "swatStats", each { "attempts", "average", "top" }, plus
// "qualificationStats" { name: {...} } for each custom qualification in its "qualificationScores"
// (AI-modified, Claude). The ESP32
// has no clock (offline AP, no NTP/RTC), so the caller supplies today's date. Only scores dated
// within the past 12 months (same date last year through today, inclusive) count. The average is
// rounded to one decimal place; average and top are null when attempts is 0.

/// @brief Checks a Gregorian calendar date in YYYY-MM-DD form, years 0001..9999.
/// @param date string to check; may be null
/// @return true if the format is valid
bool isDateString(const char* date);

/// @brief Reads the Officers array, including each officer's score lists, with
///        "pistolStats", "rifleStats" and "swatStats" added to every officer.
/// @param today current date, "YYYY-MM-DD"; the stats cover the 12 months ending today
/// @param out document to fill
/// @return true if today is valid, the Officers section exists, and the result was copied
bool getOfficers(const char* today, JsonDocument& out);

/// @brief Reads one officer: { "Name", "BadgeNum", "pistolQualScores", ..., "pistolStats",
///        "rifleStats", "swatStats" }.
/// @param badgeNum badge number of the officer
/// @param today current date, "YYYY-MM-DD"; the stats cover the 12 months ending today
/// @param out document to fill
/// @return true if today is valid, the officer exists, and the result was copied
bool getOfficer(int badgeNum, const char* today, JsonDocument& out);

/// @brief Adds an officer with empty pistol/rifle/swat score lists.
/// @param badgeNum badge number; must not already exist
/// @param name officer's name
/// @return true if the officer was added and saved
bool addOfficer(int badgeNum, const char* name);

/// AI-generated (Claude): why editOfficer() did or didn't save
enum class OfficerEditResult : uint8_t { Saved, NotFound, BadgeTaken, SaveFailed };

/// @brief Renames an officer and/or changes their badge number. Scores stay with the officer.
///        AI-modified (Claude): the badge number can now be changed too.
/// @param badgeNum badge number of the officer to edit
/// @param name new name, or nullptr to keep the current one
/// @param newBadgeNum new badge number, or 0 to keep the current one; must not belong to
///        another officer
/// @return Saved, or why the change was refused
OfficerEditResult editOfficer(int badgeNum, const char* name, int newBadgeNum = 0);

/// @brief Records a qualification score as the newest entry of that officer's score list.
/// @param badgeNum badge number of the officer
/// @param qualType registered qualification name; legacy pistol/rifle/swat aliases remain valid
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

/// @brief Adds a drill. Each step's action must be present/hide/yield/delay (delay needs a
///        positive timeMs) or the name of another existing drill, without forming a loop.
/// @param drillName unique, non-empty drill name other than present/hide/yield/delay
/// @param sequence array of { "step", "action", "timeMs"? } objects
/// @param qualifications optional registered qualification names; omitted preserves legacy behavior
/// @param description AI-generated (Claude): optional text shown to the range instructor before the
///        drill and at its pauses; nullptr or "" stores none
/// @return true if the drill is valid and was saved
bool addDrill(const char* drillName, JsonArrayConst sequence, JsonArrayConst qualifications = JsonArrayConst(),
              const char* description = nullptr);

/// @brief Replaces a drill's sequence, validated the same way as addDrill().
/// @param drillName name of the drill to edit
/// @param newSequence replacement sequence
/// @param qualifications optional registered qualification names; omitted preserves existing assignments
/// @param description AI-generated (Claude): nullptr keeps the current description, "" removes it,
///        anything else replaces it
/// @return true if the drill exists, the sequence is valid, and the change was saved
bool editDrill(const char* drillName, JsonArrayConst newSequence, JsonArrayConst qualifications = JsonArrayConst(),
               const char* description = nullptr);

/// @brief AI-generated (Codex): edits and optionally renames a drill and its references in one save.
/// @param oldName existing drill name
/// @param newName replacement name, or nullptr to keep it
/// @param sequence replacement sequence, or null to keep it
/// @param qualifications replacement assignments, or null to keep them
/// @param description replacement description; nullptr keeps it, empty removes it
/// @param reason validation or storage error on failure
/// @return true only when the complete transaction persisted
bool editDrillTransaction(const char* oldName, const char* newName, JsonArrayConst sequence,
                          JsonArrayConst qualifications, const char* description, String& reason);

/// AI-generated (Claude): why deleteQualification() did or didn't delete
enum class QualificationDeleteResult : uint8_t { Deleted, NotFound, BuiltIn, HasScores, SaveFailed };

/// @brief AI-generated (Claude): deletes a custom qualification and removes it from every drill
///        tagged with it. Refused for Pistol / Rifle / SWAT, and while any officer has a score
///        recorded under it, so no score history is ever lost.
/// @param name qualification name (case-insensitive)
/// @param scoreCount set to the number of recorded scores when the result is HasScores, else 0
/// @return Deleted, or why it wasn't
QualificationDeleteResult deleteQualification(const char* name, int& scoreCount);

/// @brief Reads qualification names, including defaults for older databases.
/// @param out document to fill with the names array
/// @return true if the database could be read
bool getQualifications(JsonDocument& out);

/// @brief Saves a unique qualification name on the controller.
/// @param name non-empty name of at most 32 bytes
/// @return true if the name is valid, unique, and saved
bool addQualification(const char* name);

/// @brief Checks whether a name is reserved for a step action (present/hide/yield/delay) and so
///        can't be used as a drill name.
/// @param drillName name to check
/// @return true if the name is reserved
bool isReservedDrillName(const char* drillName);

/// @brief Renames a drill and updates every step in other drills that includes it by name.
/// @param oldName current name of the drill
/// @param newName new name; must be non-empty, unused, and not present/hide/yield/delay
/// @return true if the drill exists, the new name is valid, and the change was saved
bool renameDrill(const char* oldName, const char* newName);

/// @brief Deletes a drill, refusing while another drill still includes it as a step.
/// @param drillName name of the drill to delete
/// @return true if the drill was removed and the change was saved
bool deleteDrill(const char* drillName);

#endif
