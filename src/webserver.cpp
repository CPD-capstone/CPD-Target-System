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

    // Serve static assets (CSS, JS, images)
    server.serveStatic("/", LittleFS, "/");

    // Fallback handler
    server.onNotFound([](AsyncWebServerRequest *request){
        request->send(LittleFS, "/targets.html", "text/html");
    });

    // Start listening
    server.begin();
    Serial.println("Webserver initialized on port 80.");
}

void processCaptivePortalDNS(){
    dnsServer.processNextRequest();
}