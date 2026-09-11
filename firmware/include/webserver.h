#ifndef WEBSERVER_H
#define WEBSERVER_H

#include <WiFi.h>
#include <ESPAsyncWebServer.h>

#define HTTP_PORT 80

static AsyncWebServer server(HTTP_PORT);

void initWebserver();

/// @brief gets total connected clients
/// @return returns number of connected clients
uint8_t getTotalConnected();

#endif