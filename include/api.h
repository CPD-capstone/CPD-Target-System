#ifndef API_H
#define API_H

#include <ESPAsyncWebServer.h>

// AI-assisted (Claude): REST API between the web UI (data/) and the backend
// (database + target_manager). Routes, all JSON:
//
// REST API between UI and backend
//   GET    /api/drills                     -> drills array
//   POST   /api/drills                     {drillName, sequence}  -> addDrill
//   PUT    /api/drills?name=<drillName>    {sequence}             -> editDrill
//   DELETE /api/drills?name=<drillName>                           -> deleteDrill
//   GET    /api/targets                    -> targets array
//   PUT    /api/targets?id=<n>             {working}              -> editTarget
//   GET    /api/officers                   -> Officers array
//   POST   /api/officers                   {BadgeNum, Name}       -> addOfficer
//   POST   /api/officers/scores            {BadgeNum, qualType, score, date} -> addQualScore
//   DELETE /api/officers?badge=<n>                                -> deleteOfficer

void registerApiRoutes(AsyncWebServer& server);

#endif