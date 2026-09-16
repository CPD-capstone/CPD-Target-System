#include "web_server.h"

AsyncWebServer server(HTTP_PORT); //port 80 for https
DNSServer dnsServer; // for autocapture

void initWebserver(){
    // Root route defaults to HTTP_GET automatically
    server.on("/", [](AsyncWebServerRequest *request){
        if (LittleFS.exists("/index.html")) {
            request->send(LittleFS, "/index.html", "text/html");
        }else{
            request->send(404, "text/plain", "Error: index.html not found in LittleFS");
        }
    });

    // Captive Portal OS probe redirects (omitting method defaults to GET)
    server.on("/generate_204", [](AsyncWebServerRequest *request){
        request->send(LittleFS, "/index.html", "text/html");
    });

    server.on("/redirect", [](AsyncWebServerRequest *request){
        request->send(LittleFS, "/index.html", "text/html");
    });

    // Serve static assets (CSS, JS, images)
    server.serveStatic("/", LittleFS, "/");

    // Fallback handler
    server.onNotFound([](AsyncWebServerRequest *request){
        request->send(404, "text/plain", "404: Not Found");
    });

    // Start listening
    server.begin();
    Serial.println("Webserver initialized on port 80.");
}