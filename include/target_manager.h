#ifndef TARGET_MANAGER_H
#define TARGET_MANAGER_H

/// @brief This function executes the drill that is passed into its arg by finding it in the json drills list and converting it to the FreeRTOS cmd queue
/// @param drillName string of the drill json object to execute
/// @return returns true if drill is found, false if not found
bool executeDrill(String drillName);

#endif