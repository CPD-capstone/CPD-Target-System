#include "database.h"

void startLFS(){
    if (!LittleFS.begin(true)){
        Serial.println("LittleFS mount failed");
        return;
    }
}