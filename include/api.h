#ifndef API_H
#define API_H

#include <ESPAsyncWebServer.h>

// AI-assisted (Claude): REST API between the web UI (data/) and the backend
// (database + target_manager). Routes, all JSON:
//
// REST API between UI and backend
//   GET    /api/drills                     -> drills array
//   POST   /api/drills                     {drillName, sequence}  -> addDrill
//   PUT    /api/drills?name=<drillName>    {sequence?, drillName?} -> editDrill / renameDrill
//   DELETE /api/drills?name=<drillName>                           -> deleteDrill
//   AI-generated (Claude): a present/hide step may carry "targets": [n, ...] (only those
//   targets, of the ones the drill was started on); without it the step moves all of them.
//   A present step may instead carry "random": n to present n of those targets picked at random.
//   GET    /api/targets                    -> targets array
//   PUT    /api/targets?id=<n>             {working}              -> editTarget
//   GET    /api/officers?today=YYYY-MM-DD[&badge=<n>]            -> Officers array (or one officer)
//                                          with pistolStats/rifleStats/swatStats {attempts, average,
//                                          top} over the past 12 months
//                                          (the client supplies today; the ESP32 has no clock)
//   POST   /api/officers                   {BadgeNum, Name}       -> addOfficer
//   PUT    /api/officers?badge=<n>         {Name}                 -> editOfficer (AI-generated, Claude)
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
//   POST   /api/drill/reset-stage                       -> resetDrillStage (paused full drills; AI-assisted with Codex)
//   GET    /api/drill/status     -> {state, drillName, step, stepCount, stepAction, targets,
//                                    lastOutcome, stopped, hardwareReady, facing,
//                                    delayMs, delayRemainingMs}  (delay step length / time left)
//   Stage status fields (AI-assisted with Codex): stageName, stageIndex, betweenStages, canResetStage, stageResetPending,
//   stageRestartReady (see DrillStatus). Reset accepts asynchronously; hardware failure ends the drill.
//   AI-generated (Claude): finalStageComplete = a full drill's last stage finished and the drill is
//   paused (targets hidden) so it can be redone; reset-stage replays it, resume ends the drill.
//   POST   /api/targets/present  {targets?}             -> setTargets(.., true)  (refused mid-drill/stopped)
//   POST   /api/targets/hide     {targets?}             -> setTargets(.., false) (refused mid-drill/stopped)
//   GET    /api/targets/state    -> {facing: [n, ...]}
//
// AI-generated (Claude): WiFi settings (wifi_manager)
//   POST   /api/wifi/password    {currentPassword, newPassword}  -> replies, then restarts the
//                                    access point with the new password ~1 s later (403 if the
//                                    current password is wrong)
//
// Errors reply {"error": message} with 400 (bad input), 403 (wrong password), 404 (not found), 409 (conflict, e.g. a
// drill is already running), 422 (drill is invalid), 500, or 503 (target hardware not ready).

/// @brief registers every /api route on server. Call before server.serveStatic().
/// @param server the web server to add the routes to
void registerApiRoutes(AsyncWebServer& server);

#endif