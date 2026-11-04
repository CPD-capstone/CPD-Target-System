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

// AI-generated (Claude): connection quality for the web UI's weak-signal banner ---------------------

/// @brief AI-generated (Claude): signals weaker than this (dBm) are reported as weak
// We can adjust this according to our preferences if need be
constexpr int8_t WEAK_SIGNAL_RSSI = -75;

/// @brief AI-generated (Claude): how well the access point hears one joined phone
struct ClientSignal {
    bool found;   // false: the address isn't a phone joined to the access point (or the lookup failed)
    int8_t rssi;  // dBm, as the ESP32 hears the phone (closer to 0 = stronger); 0 when !found
    bool weak;    // rssi < WEAK_SIGNAL_RSSI
};

/// @brief AI-generated (Claude): looks up the signal strength of the phone that sent a request
/// @param clientIP the request's remote address (request->client()->remoteIP())
/// @return the phone's signal, or found = false if it isn't joined to the access point
ClientSignal getClientSignal(const IPAddress& clientIP);

#endif