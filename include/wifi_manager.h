#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>
#include <Preferences.h>

/// @brief initialize the WiFi network's password; calls start AP
void initWiFi();

/// @brief updates the WiFi password to the argument
/// @param newPassword the new password
/// @return returns true if successfully updated, false if failed.
bool updateWiFiPassword(const String& newPassword);

/// @brief AI-generated (Claude): checks a password against the one the access point is using
/// @param password the password to check
/// @return true if it matches
bool checkWiFiPassword(const String& password);

/// @brief AI-generated (Claude): validates a new password, then applies it about a second later
///        (saved to NVS, access point restarted) so the HTTP reply confirming the change reaches
///        the phone before the WiFi drops
/// @param newPassword 8-63 printable ASCII characters (the WPA2 passphrase rules)
/// @return false if the password is invalid or a change is already pending (nothing changes)
bool scheduleWiFiPasswordChange(const String& newPassword);

#endif