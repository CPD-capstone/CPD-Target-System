#include "web_server.h"
#include "api.h"

AsyncWebServer server(HTTP_PORT); //port 80 for https
DNSServer dnsServer; // for autocapture

void initWebserver(){
    // Start up DNS server and route user directly to ESP32's IP
    dnsServer.start(53, "*", WiFi.softAPIP());
    // Root route defaults to HTTP_GET automatically
    server.on("/", [](AsyncWebServerRequest *request){
        if (LittleFS.exists("/targets.html")) {
            request->send(LittleFS, "/targets.html", "text/html");
        }else{
            request->send(404, "text/plain", "Error: targets.html not found in LittleFS");
        }
    });

    // AI-modified (Claude): answer each OS's "is there internet?" probe with the reply it expects
    // for an online network. Otherwise the phone opens its captive-portal mini-browser, which has
    // a fixed OS header and wipes the page's saved settings when closed. Staff open the page from
    // a Home Screen icon instead (see manifest.json); every other URL still lands on the UI.
    // Apple (iOS/macOS): any page with the title "Success"
    server.on("/hotspot-detect.html", [](AsyncWebServerRequest *request){
        request->send(200, "text/html", "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>");
    });
    server.on("/library/test/success.html", [](AsyncWebServerRequest *request){
        request->send(200, "text/html", "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>");
    });
    // Android / ChromeOS: an empty 204
    server.on("/generate_204", [](AsyncWebServerRequest *request){
        request->send(204);
    });
    server.on("/gen_204", [](AsyncWebServerRequest *request){
        request->send(204);
    });
    // Windows
    server.on("/connecttest.txt", [](AsyncWebServerRequest *request){
        request->send(200, "text/plain", "Microsoft Connect Test");
    });
    server.on("/ncsi.txt", [](AsyncWebServerRequest *request){
        request->send(200, "text/plain", "Microsoft NCSI");
    });

    server.on("/redirect", [](AsyncWebServerRequest *request){
        request->send(LittleFS, "/targets.html", "text/html");
    });

    // REST API (see api.h). AI-modified (Claude): must be registered before serveStatic
    registerApiRoutes(server);

    // AI-modified (Codex): these vendor filenames can be replaced during a filesystem upgrade.
    // Revalidate them too; immutable caching is only appropriate for content-hashed paths.
    server.serveStatic("/vendor/", LittleFS, "/vendor/").setCacheControl("no-cache");

    // Serve static assets (CSS, JS, images)
    server.serveStatic("/", LittleFS, "/").setCacheControl("no-cache");

    // Fallback handler
    server.onNotFound([](AsyncWebServerRequest *request){
        // AI-generated (Codex): missing assets/methods are errors, not a successful HTML reply.
        // registerApiRoutes already installs its own JSON /api catchall before static serving.
        String path = request->url();
        bool navigation = request->method() == HTTP_GET && !path.startsWith("/api")
            && (path.lastIndexOf('.') < 0 || path.endsWith(".html"))
            && request->hasHeader("Accept")
            && request->getHeader("Accept")->value().indexOf("text/html") >= 0;
        if (navigation) request->redirect("/targets.html");
        else request->send(404, "text/plain", "Requested file not found");
    });

    // Start listening
    server.begin();
    Serial.println("Webserver initialized on port 80.");
}

void processCaptivePortalDNS(){
    dnsServer.processNextRequest();
}
