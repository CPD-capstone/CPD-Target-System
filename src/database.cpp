#include "database.h"

/*
 * AI-assisted (Claude) review notes -- comments only, no code changed.
 *
 * data/database.json is the authoritative schema, and the functions below were written
 * against an older one (top-level OBJECTS keyed by ID: "targets", "users", "drills").
 * The real file uses top-level ARRAYS:
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
 * Because these are arrays, doc["targets"].as<JsonObject>() / containsKey(id) will always
 * come back null/false on the real file. Suggested shared change: add a lookup helper, e.g.
 *
 *   // returns index of the element whose [key] == value, or -1
 *   int findIndex(JsonArray arr, const char* key, int value);          // targets.id, Officers.BadgeNum
 *   int findIndex(JsonArray arr, const char* key, const char* value);  // drills.drillName
 *
 * and use arr[i] to edit, arr.remove(i) to delete, arr.add<JsonObject>() to append.
 */

void startLFS(){
    if (!LittleFS.begin(true)){
        Serial.println("LittleFS mount failed");
        return;
    }
}

//Helper function for loading the data
bool loadDatabase(JsonDocument& doc) {
    File readFile = LittleFS.open("/database.json", "r");
    if (!readFile) {
        Serial.println("database.json not found");
        return false;
    }

    DeserializationError error = deserializeJson(doc, readFile);
    readFile.close();

    if (error) {
        Serial.printf("Failed to parse database.json: %s\r\n", error.c_str());
        return false;
    }
    return true;
}

//Helper function for writing new data
bool saveDatabase(JsonDocument& doc) {
    const char* tmpPath = "/database.tmp";

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

    LittleFS.remove("/database.json");
    if (!LittleFS.rename(tmpPath, "/database.json")) {
        Serial.println("Failed to rename temp file");
        return false;
    }
    return true;
}

// SUGGESTED CHANGE: iterate `for (JsonObject t : doc["targets"].as<JsonArray>())` and print
// t["id"] and t["working"]; targetNumber/status/usedBy/currentDrill don't exist in the schema.
void readTargets() {
    JsonDocument doc;
    if (!loadDatabase(doc)) return;

    JsonObject targets = doc["targets"];
    if (targets.isNull()) {
        Serial.println("No targets found");
        return;
    }

    //Loop through each key value pair inside of targets
    for (JsonPair kv : targets) {
        const char* targetId = kv.key().c_str();
        //Access individual attributes within a target
        JsonObject target = kv.value().as<JsonObject>();

        int targetNumber = target["targetNumber"];
        const char* status = target["status"] | "unknown";
        const char* usedBy = target["usedBy"] | "none";
        const char* currentDrill = target["currentDrill"] | "none";

        Serial.printf("Target %s | Number: %d | Status: %s | UsedBy: %s | Drill: %s\r\n", 
        targetId, targetNumber, status, usedBy, currentDrill);
    }
}

// SUGGESTED CHANGE: the range has a fixed set of 20 targets (NUM_TARGETS in hal.h), so this
// may not be needed. If kept: addTarget(int id, bool working), reject id outside 1..20 or an
// id already present (findIndex), then targets.add<JsonObject>() with "id" and "working".
bool addTarget(const char* targetId, int targetNumber, const char* status, const char* usedBy, const char* currentDrill) {
    JsonDocument doc;
    if (!loadDatabase(doc)) {
        doc.clear();
    }

    JsonObject targets = doc["targets"];
    //Check if targets exist, if not create an object to hold targets
    if (targets.isNull()) {
        targets = doc["targets"].to<JsonObject>();
    }

    //Check if a target already has this ID, if so return to prevent an overwrite
    if (targets.containsKey(targetId)) {
        Serial.printf("Target %s already exists\r\n", targetId);
        return false;
    }

    //Create a new target object
    JsonObject target = targets[targetId].to<JsonObject>();
    target["targetNumber"] = targetNumber;
    target["status"] = status;

    if (usedBy) target["usedBy"] = usedBy;
    else target["usedBy"] = nullptr;

    if (currentDrill) target["currentDrill"] = currentDrill;
    else target["currentDrill"] = nullptr;

    return saveDatabase(doc);
}

// SUGGESTED CHANGE: editTarget(int id, bool working) -- findIndex(targets, "id", id) and set
// targets[i]["working"]. This is how a broken target gets marked out of service.
bool editTarget(const char* targetId, const char* status, const char* usedBy, const char* currentDrill) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    //Look for the specified target via ID
    JsonObject targets = doc["targets"];
    if (targets.isNull() || !targets.containsKey(targetId)) {
        Serial.printf("No target found: %s\r\n", targetId);
        return false;
    }

    //Update the following fields
    JsonObject target = targets[targetId];
    target["status"] = status;
    target["usedBy"] = usedBy;             
    target["currentDrill"] = currentDrill; 

    return saveDatabase(doc);
}

// SUGGESTED CHANGE: deleteTarget(int id) -- findIndex by "id", then targets.remove(i).
// Probably better to set working=false than delete, since the hardware always has 20.
bool deleteTarget(const char* targetID) {
    JsonDocument doc;
    if(!loadDatabase(doc)) return false;

    //Loop through the targets to find the target we want to delete
    JsonObject targets = doc["targets"];
    if (targets.isNull() || !targets.containsKey(targetID)) {
        Serial.printf("No target found: %s\r\n", targetID);
        return false;
    }

    targets.remove(targetID);
    return saveDatabase(doc);
}

// SUGGESTED CHANGE: users live in "Officers" (array), identified by BadgeNum.
// addOfficer(int badgeNum, const char* name): reject duplicate BadgeNum (note: both example
// officers in database.json currently share 888), then append { "Name", "BadgeNum",
// "pistolQualScores": [], "rifleQualScores": [], "swatQualScores": [] }. No email/performance.
bool addUser(const char* userId, const char* email, const char* name) {
    JsonDocument doc;
    if (!loadDatabase(doc)) {
        doc.clear();
    }

    JsonObject users = doc["users"];
    if (users.isNull()) {
        users = doc["users"].to<JsonObject>();
    }

    if (users.containsKey(userId)) {
        Serial.printf("User %s already exists\r\n", userId);
        return false;
    }

    JsonObject user = users[userId].to<JsonObject>();
    user["email"] = email;
    user["name"] = name;

    //Creates another object inside of user for performance
    JsonObject perf = user["performance"].to<JsonObject>();
    perf["totalDrillsCompleted"] = 0;
    perf["totalTrainingTime"] = 0;
    perf["averageHitsPerMinute"] = 0;
    perf["averageAccuracy"] = 0;

    return saveDatabase(doc);
}

//This function does not touch performance, instead that is left up to a seperate function
// SUGGESTED CHANGE: editOfficer(int badgeNum, const char* name) -- findIndex(officers,
// "BadgeNum", badgeNum) and update "Name". There is no email field in the schema.
bool editUser(const char* userId, const char* email, const char* name) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonObject users = doc["users"];
    if (users.isNull() || !users.containsKey(userId)) {
        Serial.printf("No user found: %s\r\n", userId);
        return false;
    }

    JsonObject user = users[userId];
    user["email"] = email;
    user["name"] = name;

    return saveDatabase(doc);
}

//Seperate function for editig the performance of a user
// SUGGESTED CHANGE: replace with addQualScore(int badgeNum, const char* qualType, int score,
// const char* date) where qualType is "pistol" | "rifle" | "swat" -> "<type>QualScores".
// Scores are stored newest-first as [score, "YYYY-MM-DD"], so insert at the front (ArduinoJson
// has no insert-at-index: build a new array with the new entry first, then copy the old ones).
bool editUserPerformance(const char* userId, int drillsCompleted, int trainingTime, float hitsPerMinute, float accuracy) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonObject users = doc["users"];
    if (users.isNull() || !users.containsKey(userId)) {
        Serial.printf("No user found: %s\r\n", userId);
        return false;
    }

    JsonObject perf = users[userId]["performance"];
    perf["totalDrillsCompleted"] = drillsCompleted;
    perf["totalTrainingTime"] = trainingTime;
    perf["averageHitsPerMinute"] = hitsPerMinute;
    perf["averageAccuracy"] = accuracy;

    return saveDatabase(doc);
}

// SUGGESTED CHANGE: deleteOfficer(int badgeNum) -- findIndex by "BadgeNum", officers.remove(i).
bool deleteUser(const char* userId) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    //Loop through users to find the right one
    JsonObject users = doc["users"];
    if (users.isNull() || !users.containsKey(userId)) {
        Serial.printf("No user found: %s\r\n", userId);
        return false;
    }

    users.remove(userId);
    return saveDatabase(doc);
}

// SUGGESTED CHANGE: addDrill(const char* drillName, JsonArrayConst sequence). Drills have no
// id/owners/targets/duration/status -- just "drillName" + "sequence". Reject a duplicate
// drillName, and validate each step: action is present/hide/pause/delay (delay needs timeMs)
// or the name of an existing drill (for composite "Full Drill" entries).
bool addDrill(const char* drillId, const char* name, const char* owners[], size_t ownerCount, const int targets[], size_t targetCount, int duration) {
    JsonDocument doc;
    if (!loadDatabase(doc)) {
        doc.clear();
    }

    JsonObject drills = doc["drills"];
    if (drills.isNull()) {
        drills = doc["drills"].to<JsonObject>();
    }

    if (drills.containsKey(drillId)) {
        Serial.printf("Drill %s already exists\r\n", drillId);
        return false;
    }

    JsonObject drill = drills[drillId].to<JsonObject>();
    drill["name"] = name;
    drill["duration"] = duration;
    drill["status"] = "available";

    //Creates a nested array for owners
    JsonArray ownersArr = drill["owners"].to<JsonArray>();
    for (size_t i = 0; i < ownerCount; i++) {
        ownersArr.add(owners[i]);
    }

    //Creates a nested array for targets
    JsonArray targetsArr = drill["targets"].to<JsonArray>();
    for (size_t i = 0; i < targetCount; i++) {
        targetsArr.add(targets[i]);
    }

    return saveDatabase(doc);
}

//Does not touch owners or targets
// SUGGESTED CHANGE: editDrill(const char* drillName, JsonArrayConst newSequence) -- findIndex
// by "drillName" and replace "sequence" (same validation as addDrill). If renaming is allowed,
// also update any Full Drill whose steps reference the old name.
bool editDrill(const char* drillId, const char* name, int duration, const char* status) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonObject drills = doc["drills"];
    if (drills.isNull() || !drills.containsKey(drillId)) {
        Serial.printf("No drill found: %s\r\n", drillId);
        return false;
    }

    JsonObject drill = drills[drillId];
    drill["name"] = name;
    drill["duration"] = duration;
    drill["status"] = status;

    return saveDatabase(doc);
}

//Seperate function that adds a userID to drill owners to keep from having duplicates
// SUGGESTED CHANGE: drills have no "owners" in the schema -- this can likely be removed.
bool addDrillOwner(const char* drillId, const char* userId) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonObject drills = doc["drills"];
    if (drills.isNull() || !drills.containsKey(drillId)) {
        Serial.printf("No drill found: %s\r\n", drillId);
        return false;
    }

    //Iterate through drill owners to prevent adding a duplicate ID
    JsonArray owners = drills[drillId]["owners"];
    for (const char* owner : owners) {
        if (strcmp(owner, userId) == 0) {
            return true; 
        }
    }
    owners.add(userId);

    return saveDatabase(doc);
}

// SUGGESTED CHANGE: deleteDrill(const char* drillName) -- findIndex by "drillName",
// drills.remove(i). Consider refusing if a Full Drill still references it as a step.
bool deleteDrill(const char* drillId) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonObject drills = doc["drills"];
    if (drills.isNull() || !drills.containsKey(drillId)) {
        Serial.printf("No drill found: %s\r\n", drillId);
        return false;
    }

    drills.remove(drillId);
    return saveDatabase(doc);
}
    
