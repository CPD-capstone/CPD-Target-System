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
//
// AI-assisted (Claude): drill and target control (target_manager). "targets" is an array of
// target numbers; missing or [] means all targets. Non-working targets are always skipped.
//   POST   /api/stop                                    -> stopDrill: EMERGENCY STOP, freezes every
//                                                          target where it is and latches (always allowed)
//   POST   /api/reset                                   -> resetTargets: clears the stop, hides all targets
//   POST   /api/drill/start      {drillName, targets?}  -> executeDrill
//   POST   /api/drill/pause                             -> pauseDrill (freezes the drill clock)
//   POST   /api/drill/resume                            -> resumeDrill (after a pause or pause step)
//   GET    /api/drill/status     -> {state, drillName, step, stepCount, stepAction, targets,
//                                    lastOutcome, stopped, hardwareReady}
//   POST   /api/targets/present  {targets?}             -> setTargets(.., true)  (refused mid-drill/stopped)
//   POST   /api/targets/hide     {targets?}             -> setTargets(.., false) (refused mid-drill/stopped)
//   GET    /api/targets/state    -> {facing: [n, ...]}
//
// Errors reply {"error": message} with 400 (bad input), 404 (not found), 409 (conflict, e.g. a
// drill is already running), 422 (drill is invalid), 500, or 503 (target hardware not ready).

/// @brief registers every /api route on server. Call before server.serveStatic().
/// @param server the web server to add the routes to
void registerApiRoutes(AsyncWebServer& server);

#endif