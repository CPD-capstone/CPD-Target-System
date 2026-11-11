#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>

#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include "hal.h"
#include "database.h"

#define HTTP_PORT 80
#define DNS_PORT 53

// WebServer instance
// AI-modified (Claude): removed the unused WebSocket (ws) and webserver_loop() declarations.
// With one client at a time, the UI polls GET /api/drill/status instead of using a WebSocket.
extern AsyncWebServer server;

/// @brief starts webserver
void initWebserver();

/// @brief to be called in loop() to handle DNS queries
void processCaptivePortalDNS();

#endif