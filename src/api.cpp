#include "api.h"
#include "database.h"
#include "target_manager.h"
#include "hal.h"
#include <AsyncJson.h>


// AI-assisted (Claude): REST handlers for the web UI. Each handler validates its input, calls
// one database / target_manager / hal function, and replies with JSON. Request bodies must be
// sent with "Content-Type: application/json" or AsyncCallbackJsonWebHandler ignores them.

// Helpers ---------------------------------------------------------------------------------------------

// Serializes doc and sends it with status code
static void sendJson(AsyncWebServerRequest* request, int code, const JsonDocument& doc) {
    String body;
    serializeJson(doc, body);
    request->send(code, "application/json", body);
}

// Sends in format: {"error", message}
static void sendError(AsyncWebServerRequest* request, int code, const char* message) {
    JsonDocument doc;
    doc["error"] = message;
    sendJson(request, code, doc);
}

// Sends in format {"ok: true"}
static void sendOk(AsyncWebServerRequest* request) {
    JsonDocument doc;
    doc["ok"] = true;
    sendJson(request, 200, doc);
}

// Reads a query parameter as a string and returns false if it is missing
static bool getQueryString(AsyncWebServerRequest* request, const char* name, String& out) {
    if (!request->hasParam(name)) return false;
    out = request->getParam(name)->value();
    return out.length() > 0;
}

// Reads a query parameter as an int and returns false if it is missing or not a number
static bool getQueryInt(AsyncWebServerRequest* request, const char* name, int& out) {
    String value;
    if (!getQueryString(request, name, value)) return false;
    for (char c : value) {
        if (!isDigit(c)) return false;
    }
    out = value.toInt();
    return true;
}

// Registers a handler for a JSON request body on uri for the given method
static void onJsonBody(AsyncWebServer& server, const char* uri, WebRequestMethod method,
                       ArJsonRequestHandlerFunction handler) {
    auto* jsonHandler = new AsyncCallbackJsonWebHandler(uri, handler);
    jsonHandler->setMethod(method);
    server.addHandler(jsonHandler);
}

// Drills ---------------------------------------------------------------------------------------------

// GET /api/drills            -> all drills
// GET /api/drills?name=<n>   -> one drill
static void handleGetDrills(AsyncWebServerRequest* request) {
    JsonDocument out;
    String name;
    if (getQueryString(request, "name", name)) {
        if (!getDrill(name.c_str(), out)) return sendError(request, 404, "Drill not found");
    } else if (!getDrills(out)) {
        return sendError(request, 500, "Could not read drills");
    }
    sendJson(request, 200, out);
}

// POST /api/drills  {drillName, sequence}
static void handleAddDrill(AsyncWebServerRequest* request, JsonVariant& json) {
    const char* name = json["drillName"] | "";
    JsonArrayConst sequence = json["sequence"].as<JsonArrayConst>();
    if (!*name || sequence.isNull()) {
        return sendError(request, 400, "drillName and sequence are required");
    }
    if (!addDrill(name, sequence)) {
        return sendError(request, 400, "Drill rejected: name taken or invalid sequence");
    }
    sendOk(request);
}

// PUT /api/drills?name=<n>  {sequence}
static void handleEditDrill(AsyncWebServerRequest* request, JsonVariant& json) {
    String name;
    if (!getQueryString(request, "name", name)) return sendError(request, 400, "name is required");
    JsonArrayConst sequence = json["sequence"].as<JsonArrayConst>();
    if (sequence.isNull()) return sendError(request, 400, "sequence is required");
    if (!editDrill(name.c_str(), sequence)) {
        return sendError(request, 400, "Edit rejected: drill not found or invalid sequence");
    }
    sendOk(request);
}

// DELETE /api/drills?name=<n>
static void handleDeleteDrill(AsyncWebServerRequest* request) {
    String name;
    if (!getQueryString(request, "name", name)) return sendError(request, 400, "name is required");
    if (!deleteDrill(name.c_str())) {
        return sendError(request, 409, "Delete rejected: drill not found or used by another drill");
    }
    sendOk(request);
}

// Targets ---------------------------------------------------------------------------------------------

// GET /api/targets
static void handleGetTargets(AsyncWebServerRequest* request) {
    JsonDocument out;
    if (!getTargets(out)) return sendError(request, 500, "Could not read targets");
    sendJson(request, 200, out);
}

// PUT /api/targets?id=<n>  {working}
static void handleEditTarget(AsyncWebServerRequest* request, JsonVariant& json) {
    int id;
    if (!getQueryInt(request, "id", id)) return sendError(request, 400, "id is required");
    if (!json["working"].is<bool>()) return sendError(request, 400, "working field required");
    if (!editTarget(id, json["working"].as<bool>())) return sendError(request, 404, "Target not found");
    sendOk(request);
}

// Officers ----------------------------------------------------------------------------------------------

// GET /api/officers             -> all officers
// GET /api/officers?badge=<n>   -> one officer
static void handleGetOfficers(AsyncWebServerRequest* request) {
    JsonDocument out;
    int badge;
    if (request->hasParam("badge")) {
        if (!getQueryInt(request, "badge", badge)) return sendError(request, 400, "badge must be a number");
        if (!getOfficer(badge, out)) return sendError(request, 404, "Officer not found");
    } else if (!getOfficers(out)) {
        return sendError(request, 500, "Could not read officers");
    }
    sendJson(request, 200, out);
}

// POST /api/officers  {BadgeNum, Name}
static void handleAddOfficer(AsyncWebServerRequest* request, JsonVariant& json) {
    const char* name = json["Name"] | "";
    if (!json["BadgeNum"].is<int>() || !*name) {
        return sendError(request, 400, "Badge and Name are required");
    }
    if (!addOfficer(json["BadgeNum"].as<int>(), name)) {
        return sendError(request, 409, "An officer with that badge number already exists");
    }
    sendOk(request);
}

// POST /api/officers/scores  {BadgeNum, qualType, score, date}
static void handleAddQualScore(AsyncWebServerRequest* request, JsonVariant& json) {
    const char* qualType = json["qualType"] | "";
    const char* date = json["date"] | "";
    if (!json["BadgeNum"].is<int>() || !json["score"].is<int>() || !*qualType || !*date) {
        return sendError(request, 400, "BadgeNum, qualType, score and date are required");
    }
    if (!addQualScore(json["BadgeNum"].as<int>(), qualType, json["score"].as<int>(), date)) {
        return sendError(request, 400, "Score rejected: unknown officer, qualType, or bad date");
    }
    sendOk(request);
}

// DELETE /api/officers?badge=<n>
static void handleDeleteOfficer(AsyncWebServerRequest* request) {
    int badge;
    if (!getQueryInt(request, "badge", badge)) return sendError(request, 400, "Badge is required");
    if (!deleteOfficer(badge)) return sendError(request, 404, "Officer not found");
    sendOk(request);
}

// AI-assisted (Claude): drill control and manual target control, backed by target_manager.
// Targets are sent and returned as arrays of target numbers (1..NUM_TARGETS), not bit masks.

// Target helpers --------------------------------------------------------------------------------------

// Converts an optional "targets": [1, 4, 7] field to a mask. Missing, null or [] gives 0,
// which target_manager treats as "all targets". False if it isn't an array of valid numbers.
static bool parseTargetList(JsonVariantConst targets, uint32_t& mask) {
    mask = 0;
    if (targets.isNull()) return true;
    if (!targets.is<JsonArrayConst>()) return false;
    for (JsonVariantConst id : targets.as<JsonArrayConst>()) {
        if (!id.is<int>()) return false;
        int n = id.as<int>();
        if (n < 1 || n > NUM_TARGETS) return false;
        mask |= targetBit(n);
    }
    return true;
}

// Writes the target numbers set in mask into arr, e.g. 0x13 -> [1, 2, 5]
static void addTargetList(JsonArray arr, uint32_t mask) {
    for (uint8_t n = 1; n <= NUM_TARGETS; n++) {
        if (mask & targetBit(n)) arr.add(n);
    }
}

static const char* drillStateName(DrillState state) {
    switch (state) {
        case DrillState::Idle:    return "idle";
        case DrillState::Running: return "running";
        case DrillState::Paused:  return "paused";
    }
    return "unknown";
}

static const char* drillOutcomeName(DrillOutcome outcome) {
    switch (outcome) {
        case DrillOutcome::None:      return "none";
        case DrillOutcome::Completed: return "completed";
        case DrillOutcome::Stopped:   return "stopped";
        case DrillOutcome::Failed:    return "failed";
    }
    return "unknown";
}

// Drill control ------------------------------------------------------------------------------------

// POST /api/drill/start  {drillName, targets?: [n, ...]}   (targets missing or [] = all)
static void handleStartDrill(AsyncWebServerRequest* request, JsonVariant& json) {
    const char* name = json["drillName"] | "";
    if (!*name) return sendError(request, 400, "drillName is required");
    uint32_t mask;
    if (!parseTargetList(json["targets"], mask)) {
        return sendError(request, 400, "targets must be an array of target numbers 1-20");
    }

    switch (executeDrill(name, mask)) {
        case DrillStartResult::Started:          return sendOk(request);
        case DrillStartResult::HalNotReady:      return sendError(request, 503, "Target hardware is not ready");
        case DrillStartResult::Busy:             return sendError(request, 409, "A drill is already running");
        case DrillStartResult::Stopped:          return sendError(request, 409, "Targets are stopped; press Reset first");
        case DrillStartResult::DatabaseError:    return sendError(request, 500, "Could not read the database");
        case DrillStartResult::NotFound:         return sendError(request, 404, "Drill not found");
        case DrillStartResult::InvalidDrill:     return sendError(request, 422, "Drill has an invalid or missing step");
        case DrillStartResult::NoWorkingTargets: return sendError(request, 409, "None of the selected targets are working");
        case DrillStartResult::TaskFailed:       return sendError(request, 500, "Could not start the drill runner");
    }
    sendError(request, 500, "Unknown error");
}

// POST /api/drill/pause   freezes the drill clock; targets stay where they are
static void handlePauseDrill(AsyncWebServerRequest* request) {
    if (!pauseDrill()) return sendError(request, 409, "No drill is running");
    sendOk(request);
}

// POST /api/drill/resume
static void handleResumeDrill(AsyncWebServerRequest* request) {
    if (!resumeDrill()) return sendError(request, 409, "No drill is paused");
    sendOk(request);
}

// POST /api/stop   EMERGENCY STOP: freeze every target where it is. Always allowed, with or
// without a drill running. 500 means the freeze could not be confirmed -- treat as unsafe.
static void handleStop(AsyncWebServerRequest* request) {
    if (!stopDrill()) return sendError(request, 500, "Stop could not be confirmed by the target hardware");
    sendOk(request);
}

// POST /api/reset   clear the stop and hide every target
static void handleReset(AsyncWebServerRequest* request) {
    switch (resetTargets()) {
        case TargetCommandResult::Sent:         return sendOk(request);
        case TargetCommandResult::HalNotReady:  return sendError(request, 503, "Target hardware is not ready");
        case TargetCommandResult::DrillRunning: return sendError(request, 409, "Stop the running drill first");
        case TargetCommandResult::QueueFull:    return sendError(request, 503, "Target hardware is busy, try again");
        default: break; // other results aren't returned by resetTargets()
    }
    sendError(request, 500, "Unknown error");
}

// GET /api/drill/status
//   -> {state, drillName, step, stepCount, stepAction, targets: [n, ...], lastOutcome, stopped,
//       hardwareReady}
// While idle, drillName/stepCount/targets describe the last drill run (step is 0).
// stopped = emergency stop is latched; only /api/reset moves targets until it is cleared.
static void handleDrillStatus(AsyncWebServerRequest* request) {
    DrillStatus status = getDrillStatus();
    JsonDocument doc;
    doc["state"] = drillStateName(status.state);
    doc["drillName"] = status.drillName;
    doc["step"] = status.step;
    doc["stepCount"] = status.stepCount;
    doc["stepAction"] = status.stepAction;
    addTargetList(doc["targets"].to<JsonArray>(), status.targetMask);
    doc["lastOutcome"] = drillOutcomeName(status.lastOutcome);
    doc["stopped"] = status.stopped;
    doc["hardwareReady"] = hal_isReady(); // false: expanders missing/failed or HAL not started
    sendJson(request, 200, doc);
}

// Manual target control ------------------------------------------------------------------------------

// Shared by /present and /hide: {targets?: [n, ...]}   (targets missing or [] = all)
static void handleMoveTargets(AsyncWebServerRequest* request, JsonVariant& json, bool present) {
    uint32_t mask;
    if (!parseTargetList(json["targets"], mask)) {
        return sendError(request, 400, "targets must be an array of target numbers 1-20");
    }

    switch (setTargets(mask, present)) {
        case TargetCommandResult::Sent:             return sendOk(request);
        case TargetCommandResult::HalNotReady:      return sendError(request, 503, "Target hardware is not ready");
        case TargetCommandResult::DrillRunning:     return sendError(request, 409, "Stop the running drill first");
        case TargetCommandResult::Stopped:          return sendError(request, 409, "Targets are stopped; press Reset first");
        case TargetCommandResult::DatabaseError:    return sendError(request, 500, "Could not read the database");
        case TargetCommandResult::NoWorkingTargets: return sendError(request, 409, "None of the selected targets are working");
        case TargetCommandResult::QueueFull:        return sendError(request, 503, "Target hardware is busy, try again");
    }
    sendError(request, 500, "Unknown error");
}

// GET /api/targets/state  -> {facing: [n, ...]}  targets currently facing the shooter
static void handleTargetState(AsyncWebServerRequest* request) {
    JsonDocument doc;
    addTargetList(doc["facing"].to<JsonArray>(), hal_getTargetStates());
    sendJson(request, 200, doc);
}

// Registration ------------------------------------------------------------------------------------

// ESPAsyncWebServer matches handlers in the order they are added, and a handler for "/a" also
// matches "/a/b". So every sub-path (/api/officers/scores, /api/targets/state, ...) must be
// registered before its parent, and this must run before serveStatic("/") in initWebserver().
void registerApiRoutes(AsyncWebServer& server) {
    // Emergency stop / reset (not drill-specific: they apply to every target)
    server.on("/api/stop", HTTP_POST, handleStop);
    server.on("/api/reset", HTTP_POST, handleReset);

    // Drill control
    onJsonBody(server, "/api/drill/start", HTTP_POST, handleStartDrill);
    server.on("/api/drill/pause", HTTP_POST, handlePauseDrill);
    server.on("/api/drill/resume", HTTP_POST, handleResumeDrill);
    server.on("/api/drill/status", HTTP_GET, handleDrillStatus);

    // Manual target control (before /api/targets)
    onJsonBody(server, "/api/targets/present", HTTP_POST,
               [](AsyncWebServerRequest* request, JsonVariant& json) { handleMoveTargets(request, json, true); });
    onJsonBody(server, "/api/targets/hide", HTTP_POST,
               [](AsyncWebServerRequest* request, JsonVariant& json) { handleMoveTargets(request, json, false); });
    server.on("/api/targets/state", HTTP_GET, handleTargetState);

    // Drills
    server.on("/api/drills", HTTP_GET, handleGetDrills);
    onJsonBody(server, "/api/drills", HTTP_POST, handleAddDrill);
    onJsonBody(server, "/api/drills", HTTP_PUT, handleEditDrill);
    server.on("/api/drills", HTTP_DELETE, handleDeleteDrill);

    // Targets
    server.on("/api/targets", HTTP_GET, handleGetTargets);
    onJsonBody(server, "/api/targets", HTTP_PUT, handleEditTarget);

    // Officers (/scores before /api/officers)
    onJsonBody(server, "/api/officers/scores", HTTP_POST, handleAddQualScore);
    server.on("/api/officers", HTTP_GET, handleGetOfficers);
    onJsonBody(server, "/api/officers", HTTP_POST, handleAddOfficer);
    server.on("/api/officers", HTTP_DELETE, handleDeleteOfficer);

    // Anything else under /api gets a JSON 404 instead of falling through to onNotFound (which
    // serves targets.html). This also catches JSON routes called without the JSON Content-Type.
    server.on("/api", HTTP_ANY, [](AsyncWebServerRequest* request) {
        sendError(request, 404, "Unknown API route, or body not sent as application/json");
    });
}