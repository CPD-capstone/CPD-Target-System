#include "webserver.h"

void initWebserver(){
    // register WebSocket handler
    server->addHandler(&ws);

    // clean up memory from disconnected clients occasionally
    ws.onEvent([](AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
        if (type == WS_EVT_DISCONNECT) {
            Serial.printf("WS: Client %u disconnected\n", client->id());
        }
    });

    server->addMiddleware(&ensureURL);

    startBackend(server);
    startFileServer(server);

    server->begin();
}