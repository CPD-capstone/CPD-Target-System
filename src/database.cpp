#include "database.h"
#include "hal.h"

/*
 * AI-assisted (Claude): the CRUD functions below were migrated from an older object-keyed
 * schema to the one in data/database.json, which is authoritative. It uses top-level ARRAYS:
 *
 *   "Officers": [ { "Name": str, "BadgeNum": int,
 *                   "pistolQualScores": [[score, "YYYY-MM-DD"], ...],   // newest first
 *                   "rifleQualScores":  [...], "swatQualScores": [...] } ]
 *   "drills":   [ { "drillName": str,
 *                   "sequence": [ { "step": int, "action": str, "timeMs"?: int } ] } ]
 *                 action is "present" | "hide" | "pause" | "delay" (delay requires timeMs),
 *                 OR the drillName of another drill (the "... Full Drill" entries compose stages)
 *   "targets":  [ { "id": 1..20, "working": bool } ]
 *
 * Records are found with findIndex() (below), edited through arr[i], deleted with
 * arr.remove(i), and appended with arr.add<JsonObject>().
 */

void startLFS(){
    if (!LittleFS.begin(true)){
        Serial.println("LittleFS mount failed");
        return;
    }
}

static const char* DB_PATH = "/database.json";
static const char* TMP_PATH = "/database.tmp";

//Parses the file at path into doc; false if it is missing or not valid JSON
static bool readJsonFile(const char* path, JsonDocument& doc) {
    File readFile = LittleFS.open(path, "r");
    if (!readFile) return false;

    DeserializationError error = deserializeJson(doc, readFile);
    readFile.close();

    if (error) {
        Serial.printf("Failed to parse %s: %s\r\n", path, error.c_str());
        return false;
    }
    return true;
}

//Helper function for loading the data
// AI-modified (Claude): if power was lost after a save's temp file was fully written but
// before it replaced database.json, the temp file is the newest good copy -- restore it.
bool loadDatabase(JsonDocument& doc) {
    if (readJsonFile(DB_PATH, doc)) return true;

    if (LittleFS.exists(TMP_PATH) && readJsonFile(TMP_PATH, doc)) {
        Serial.println("Recovering database.json from database.tmp");
        LittleFS.remove(DB_PATH);
        LittleFS.rename(TMP_PATH, DB_PATH);
        return true;
    }

    Serial.println("database.json missing or unreadable");
    doc.clear();
    return false;
}

//Helper function for writing new data
bool saveDatabase(JsonDocument& doc) {
    const char* tmpPath = TMP_PATH;

    File writeFile = LittleFS.open(tmpPath, "w");
    if (!writeFile) {
        Serial.println("Failed to open temp file for writing");
        return false;
    }

    size_t written = serializeJson(doc, writeFile);
    writeFile.close();

    if (written == 0) {
        Serial.println("serializeJson wrote 0 bytes");
        LittleFS.remove(tmpPath);
        return false;
    }

    // AI-modified (Claude): LittleFS rename replaces an existing file atomically, so there is
    // always a complete database.json. The remove-then-rename fallback is only for a VFS layer
    // that refuses to overwrite; loadDatabase() recovers from the tmp file if power drops there.
    if (!LittleFS.rename(tmpPath, DB_PATH)) {
        LittleFS.remove(DB_PATH);
        if (!LittleFS.rename(tmpPath, DB_PATH)) {
            Serial.println("Failed to rename temp file");
            return false;
        }
    }
    return true;
}

// ---- AI-assisted (Claude): lookup and validation helpers ----------------------------------

//Returns the index of the element whose [key] == value, or -1 (targets.id, Officers.BadgeNum)
static int findIndex(JsonArrayConst arr, const char* key, int value) {
    for (size_t i = 0; i < arr.size(); i++) {
        JsonVariantConst field = arr[i][key];
        if (field.is<int>() && field.as<int>() == value) return (int)i;
    }
    return -1;
}

//Returns the index of the element whose [key] == value, or -1 (drills.drillName)
static int findIndex(JsonArrayConst arr, const char* key, const char* value) {
    for (size_t i = 0; i < arr.size(); i++) {
        const char* field = arr[i][key];
        if (field && strcmp(field, value) == 0) return (int)i;
    }
    return -1;
}

static bool isBasicAction(const char* action) {
    return strcmp(action, "present") == 0 || strcmp(action, "hide") == 0 ||
           strcmp(action, "pause") == 0 || strcmp(action, "delay") == 0;
}

//True if drill `fromName` includes drill `targetName` as a step, directly or through nested drills.
//depth caps the walk so a cycle already in the file can't recurse forever.
static bool drillReferences(JsonArrayConst drills, const char* fromName, const char* targetName, uint8_t depth = 0) {
    if (depth > 8) return true;
    int i = findIndex(drills, "drillName", fromName);
    if (i < 0) return false;

    for (JsonObjectConst step : drills[i]["sequence"].as<JsonArrayConst>()) {
        const char* action = step["action"];
        if (!action || isBasicAction(action)) continue;
        if (strcmp(action, targetName) == 0) return true;
        if (drillReferences(drills, action, targetName, depth + 1)) return true;
    }
    return false;
}

//Checks every step of a sequence for drill `drillName`: action must be present/hide/pause/delay
//(delay needs a positive timeMs) or the name of another existing drill that doesn't lead back here.
static bool validateSequence(JsonArrayConst drills, const char* drillName, JsonArrayConst sequence) {
    if (sequence.isNull() || sequence.size() == 0) {
        Serial.printf("Drill %s has an empty sequence\r\n", drillName);
        return false;
    }

    for (JsonVariantConst v : sequence) {
        JsonObjectConst step = v.as<JsonObjectConst>();
        const char* action = step["action"];
        if (step.isNull() || !action) {
            Serial.printf("Drill %s has a step with no action\r\n", drillName);
            return false;
        }

        if (strcmp(action, "delay") == 0) {
            if (!step["timeMs"].is<int>() || step["timeMs"].as<int>() <= 0) {
                Serial.printf("Drill %s has a delay step without a positive timeMs\r\n", drillName);
                return false;
            }
        } else if (!isBasicAction(action)) {
            //Not a basic action, so it must name another drill (composite "Full Drill" entry)
            if (strcmp(action, drillName) == 0 || findIndex(drills, "drillName", action) < 0) {
                Serial.printf("Drill %s: unknown action or drill '%s'\r\n", drillName, action);
                return false;
            }
            if (drillReferences(drills, action, drillName)) {
                Serial.printf("Drill %s: including '%s' would create a loop\r\n", drillName, action);
                return false;
            }
        }
    }
    return true;
}

// ---- Targets -------------------------------------------------------------------------------

// AI-modified (Claude): targets are an array of { id, working }
void readTargets() {
    JsonDocument doc;
    if (!loadDatabase(doc)) return;

    JsonArray targets = doc["targets"];
    if (targets.isNull()) {
        Serial.println("No targets found");
        return;
    }

    for (JsonObject t : targets) {
        int id = t["id"];
        bool working = t["working"] | false;
        Serial.printf("Target %d | Working: %s\r\n", id, working ? "yes" : "no");
    }
}

// AI-modified (Claude): the range has a fixed set of NUM_TARGETS, so only ids 1..NUM_TARGETS
// that aren't already present can be added
bool addTarget(int id, bool working) {
    if (id < 1 || id > NUM_TARGETS) {
        Serial.printf("Target id %d out of range 1..%d\r\n", id, NUM_TARGETS);
        return false;
    }

    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray targets = doc["targets"];
    //Check if targets exist, if not create an array to hold targets
    if (targets.isNull()) {
        targets = doc["targets"].to<JsonArray>();
    }

    //Check if a target already has this ID, if so return to prevent an overwrite
    if (findIndex(targets, "id", id) >= 0) {
        Serial.printf("Target %d already exists\r\n", id);
        return false;
    }

    JsonObject target = targets.add<JsonObject>();
    target["id"] = id;
    target["working"] = working;

    return saveDatabase(doc);
}

// AI-modified (Claude): this is how a broken target gets marked out of service
bool editTarget(int id, bool working) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray targets = doc["targets"];
    int i = findIndex(targets, "id", id);
    if (i < 0) {
        Serial.printf("No target found: %d\r\n", id);
        return false;
    }

    targets[i]["working"] = working;
    return saveDatabase(doc);
}

// AI-modified (Claude): the hardware always has NUM_TARGETS, so "deleting" a target marks it
// working=false instead of removing its entry
bool deleteTarget(int id) {
    return editTarget(id, false);
}

// ---- Officers ------------------------------------------------------------------------------

// AI-modified (Claude): officers are identified by BadgeNum and start with empty score lists
bool addOfficer(int badgeNum, const char* name) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray officers = doc["Officers"];
    if (officers.isNull()) {
        officers = doc["Officers"].to<JsonArray>();
    }

    if (findIndex(officers, "BadgeNum", badgeNum) >= 0) {
        Serial.printf("Officer with badge %d already exists\r\n", badgeNum);
        return false;
    }

    JsonObject officer = officers.add<JsonObject>();
    officer["Name"] = name;
    officer["BadgeNum"] = badgeNum;
    officer["pistolQualScores"].to<JsonArray>();
    officer["rifleQualScores"].to<JsonArray>();
    officer["swatQualScores"].to<JsonArray>();

    return saveDatabase(doc);
}

// AI-modified (Claude): scores are edited separately with addQualScore()
bool editOfficer(int badgeNum, const char* name) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray officers = doc["Officers"];
    int i = findIndex(officers, "BadgeNum", badgeNum);
    if (i < 0) {
        Serial.printf("No officer found with badge %d\r\n", badgeNum);
        return false;
    }

    officers[i]["Name"] = name;
    return saveDatabase(doc);
}

// AI-modified (Claude): replaces editUserPerformance. Scores are stored newest-first, and
// ArduinoJson has no insert-at-index, so the old list is copied aside and re-added after the new entry.
bool addQualScore(int badgeNum, const char* qualType, int score, const char* date) {
    if (strcmp(qualType, "pistol") != 0 && strcmp(qualType, "rifle") != 0 && strcmp(qualType, "swat") != 0) {
        Serial.printf("Unknown qualification type: %s\r\n", qualType);
        return false;
    }
    //Expect "YYYY-MM-DD"
    if (!date || strlen(date) != 10 || date[4] != '-' || date[7] != '-') {
        Serial.printf("Date must be YYYY-MM-DD: %s\r\n", date ? date : "(null)");
        return false;
    }

    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray officers = doc["Officers"];
    int i = findIndex(officers, "BadgeNum", badgeNum);
    if (i < 0) {
        Serial.printf("No officer found with badge %d\r\n", badgeNum);
        return false;
    }

    char key[24];
    snprintf(key, sizeof(key), "%sQualScores", qualType);

    JsonDocument oldScores;
    oldScores.set(officers[i][key]);

    //to<JsonArray>() empties the field, then the new entry goes in first
    JsonArray scores = officers[i][key].to<JsonArray>();
    JsonArray entry = scores.add<JsonArray>();
    entry.add(score);
    entry.add(date);
    for (JsonVariantConst old : oldScores.as<JsonArrayConst>()) {
        scores.add(old);
    }

    return saveDatabase(doc);
}

// AI-modified (Claude)
bool deleteOfficer(int badgeNum) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray officers = doc["Officers"];
    int i = findIndex(officers, "BadgeNum", badgeNum);
    if (i < 0) {
        Serial.printf("No officer found with badge %d\r\n", badgeNum);
        return false;
    }

    officers.remove(i);
    return saveDatabase(doc);
}

// ---- Drills --------------------------------------------------------------------------------

// AI-modified (Claude): drills are just "drillName" + a validated "sequence"
bool addDrill(const char* drillName, JsonArrayConst sequence) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray drills = doc["drills"];
    if (drills.isNull()) {
        drills = doc["drills"].to<JsonArray>();
    }

    if (findIndex(drills, "drillName", drillName) >= 0) {
        Serial.printf("Drill %s already exists\r\n", drillName);
        return false;
    }
    if (!validateSequence(drills, drillName, sequence)) return false;

    JsonObject drill = drills.add<JsonObject>();
    drill["drillName"] = drillName;
    drill["sequence"] = sequence;

    return saveDatabase(doc);
}

// AI-modified (Claude): replaces the sequence only; renaming isn't supported, so Full Drills
// that reference this drill by name stay valid
bool editDrill(const char* drillName, JsonArrayConst newSequence) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray drills = doc["drills"];
    int i = findIndex(drills, "drillName", drillName);
    if (i < 0) {
        Serial.printf("No drill found: %s\r\n", drillName);
        return false;
    }
    if (!validateSequence(drills, drillName, newSequence)) return false;

    drills[i]["sequence"] = newSequence;
    return saveDatabase(doc);
}

// AI-modified (Claude): refuses while another drill still includes this one as a step
bool deleteDrill(const char* drillName) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray drills = doc["drills"];
    int i = findIndex(drills, "drillName", drillName);
    if (i < 0) {
        Serial.printf("No drill found: %s\r\n", drillName);
        return false;
    }

    for (JsonObjectConst drill : drills) {
        for (JsonObjectConst step : drill["sequence"].as<JsonArrayConst>()) {
            const char* action = step["action"];
            if (action && strcmp(action, drillName) == 0) {
                Serial.printf("Drill %s is still used by %s\r\n", drillName, (const char*)drill["drillName"]);
                return false;
            }
        }
    }

    drills.remove(i);
    return saveDatabase(doc);
}
