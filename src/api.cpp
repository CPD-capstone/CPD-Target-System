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