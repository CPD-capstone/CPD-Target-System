#include "hal.h"
#include "database.h"
#include "wifi_manager.h"
#include "web_server.h"

void setup() {
    Serial.begin(115200);

    // set up core designations
    hal_init();

    // start database
    startLFS();

    // start WiFi & webserver
    initWiFi();
    initWebserver();
}

void loop(){

}