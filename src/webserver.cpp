#include "web_server.h"

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

    // Captive Portal OS probe redirects (omitting method defaults to GET)
    server.on("/generate_204", [](AsyncWebServerRequest *request){
        request->send(LittleFS, "/targets.html", "text/html");
    });

    server.on("/redirect", [](AsyncWebServerRequest *request){
        request->send(LittleFS, "/targets.html", "text/html");
    });

    // Serve static assets (CSS, JS, images)
    server.serveStatic("/", LittleFS, "/");

    // Fallback handler
    // TODO: /index.html no longer exists in data/ (it was the old name of the landing
    // page, likely renamed to targets.html). Update this to the current landing page,
    // otherwise unknown URLs will fail instead of redirecting.
    server.onNotFound([](AsyncWebServerRequest *request){
        request->send(LittleFS, "/index.html", "text/html");
    });

    // Start listening
    server.begin();
    Serial.println("Webserver initialized on port 80.");
}

void processCaptivePortalDNS(){
    dnsServer.processNextRequest();
}