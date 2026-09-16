#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>
#include <Preferences.h>

/// @brief initialize the WiFi network's password; calls start AP
void initWiFi();

/// @brief updates the WiFi password to the argument
/// @param newPassword the new password
/// @return returns true if successfully updated, false if failed.
bool updateWiFiPassword(String& newPassword);

#endif