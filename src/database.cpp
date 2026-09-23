#include "database.h"

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
    
