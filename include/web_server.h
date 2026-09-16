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

// WebServer and WebSocket instances
extern AsyncWebServer server;
extern AsyncWebSocket ws;

void initWebserver();

// Call in loop() to handle Captive Portal DNS queries
void webserver_loop();

#endif