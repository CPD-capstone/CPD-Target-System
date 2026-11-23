#include "hal.h"
#include "database.h"
#include "wifi_manager.h"
#include "web_server.h"
#include "target_manager.h"

void setup(){
    Serial.begin(115200);

    // set up core designations
    hal_init();
    loadDrillSettings(); // AI-generated (Claude): saved target flip delay

    // start database
    startLFS();

    // start WiFi & webserver
    initWiFi();
    initWebserver();
}

void loop(){
    processDNS();
}