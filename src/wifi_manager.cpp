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

bool updateWiFiPassword(const String& newPassword){
    // WPA2 requires at least 8 characters
    if(newPassword.length() < 8){
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