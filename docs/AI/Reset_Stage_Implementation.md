<!-- Implementation notes for the stage reset feature, developed with Codex assistance. -->
# Reset stage

This feature was developed with assistance from OpenAI Codex (GPT-6). The changes cover
`src/target_manager.cpp`, `include/target_manager.h`, `src/api.cpp`, `include/api.h`,
`data/targets.html`, `data/script.js`, `data/controller-test.js`, `tests/stage_reset/`, and this note.

Each direct child drill is a distinct stage occurrence, including its nested content.
Reset rewinds the current stage, or the completed stage at a top-level pause. The runner
hides its targets, waits `MECHANICAL_BUFFER + 100` ms, verifies output state, and stays
paused until Resume. Failure uses existing drill cleanup. Physical travel still needs measurement.
Failure feedback asks staff to check target positions rather than claiming a hide succeeded.

`POST /api/drill/reset-stage` accepts asynchronously; status supplies the destination,
eligibility, pending/ready state, and occurrence number. The first accepted Reset/Resume
wins; Stop overrides both. Pending duplicates conflict, ready retries are idempotent,
and stage reset never releases a hold. Earlier progress, selected targets and programmed
pauses remain intact; random steps select again on replay.

Paused controls use one state: waiting, Resume pending, Reset pending, or ready to replay.
Status flags are derived from that state under the runner lock.

The webpage keeps Pause available while running, highlights available stage resets,
and closes the target picker before starting. Fresh drill status clears stale manual-mode
preferences that would otherwise lock Reset and Resume after a page reload.

Temporary browser testing is enabled only on localhost with `?test=1`. The separate
`controller-test.js` adapter keeps test records in the tab and does not send API requests
to a controller. Its code and loader are marked with uppercase removal comments.

See [checks and device validation](../../tests/stage_reset/README.md).
