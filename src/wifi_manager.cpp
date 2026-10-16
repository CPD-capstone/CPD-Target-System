#include "wifi_manager.h"

namespace{ // namespace is private to wifi_manager.cpp; this is to protect the password
    constexpr const char* SSID = "CPD Range Control";
    constexpr const char* DEFAULT_PASSWORD = "admin1234";

    String currentPassword = "";
    Preferences prefs;

    void startAP(){
        WiFi.mode(WIFI_AP);
        
        // eval passwordPTR to null or password depending on length (prevents softAP failure)
        const char* passwordPTR = (currentPassword.length() >= 8) ? currentPassword.c_str() : nullptr;
    
        WiFi.softAP(SSID, passwordPTR);
    }
}

void initWiFi(){
    // read saved password from non volatile memory
    prefs.begin("wifi_config", true); // open namespace in read only
    currentPassword = prefs.getString("ap_pass", DEFAULT_PASSWORD); // grab saved password
    prefs.end();

    startAP();
}

// AI-generated (Claude): WPA2 passphrases are 8-63 printable ASCII characters
static bool isValidWiFiPassword(const String& password){
    if(password.length() < 8 || password.length() > 63){
        return false;
    }
    for(size_t i = 0; i < password.length(); i++){
        if(password[i] < 32 || password[i] > 126){
            return false;
        }
    }
    return true;
}

bool updateWiFiPassword(const String& newPassword){
    // AI-modified (Claude): was only the 8-character minimum; now the full WPA2 rule
    if(!isValidWiFiPassword(newPassword)){
        return false;
    }

    currentPassword = newPassword;

    // Save updated AP password to NVS
    prefs.begin("wifi_config", false); // open namespace in rw mode
    prefs.putString("ap_pass", currentPassword); // put new password in storage
    prefs.end();

    // Restart the Access Point with new security credentials
    WiFi.softAPdisconnect(true);
    startAP();
    
    return true;
}

// AI-generated (Claude) ------------------------------------------------------------------------

bool checkWiFiPassword(const String& password){
    return password == currentPassword;
}

namespace{
    volatile bool passwordChangePending = false;

    // Waits so the HTTP reply can go out, then applies the change and ends itself
    void passwordChangeTask(void* param){
        String* newPassword = static_cast<String*>(param);
        vTaskDelay(pdMS_TO_TICKS(1000));
        updateWiFiPassword(*newPassword);
        delete newPassword;
        passwordChangePending = false;
        vTaskDelete(NULL);
    }
}

bool scheduleWiFiPasswordChange(const String& newPassword){
    if(passwordChangePending || !isValidWiFiPassword(newPassword)){
        return false;
    }
    passwordChangePending = true;
    String* copy = new String(newPassword);
    if(xTaskCreate(passwordChangeTask, "WiFiPassword", 4096, copy, 1, NULL) != pdPASS){
        delete copy;
        passwordChangePending = false;
        return false;
    }
    return true;
}
