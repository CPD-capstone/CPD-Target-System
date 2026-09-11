#include "webserver.h"
#include "hal.h"
#include "database.h"
#include "wifi_manager.h"

void setup() {
    Serial.begin(115200);

    // set up core designations
    hal_init();

    // start database
    

    // start WiFi & webserver
    initWiFi();
    initWebserver();
}

void loop(){

}