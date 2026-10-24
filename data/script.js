// ============================================================================
// TEMPORARY CONTROLLER BYPASS FOR WEBPAGE TESTING (AI-ASSISTED WITH CODEX).
// ENABLE ON LOCALHOST WITH ?test=1. REMOVE THIS BLOCK AND controller-test.js
// AFTER TESTING; REPLACE controllerFetch CALLS BELOW WITH fetch.
// ============================================================================
const controllerTestMode = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    && new URLSearchParams(location.search).get('test') === '1';
const controllerTest = controllerTestMode
    ? import('./controller-test.js').then((module) => module.createControllerTest())
    : null;
const controllerFetch = async (...args) => controllerTest
    ? (await controllerTest)(...args)
    : fetch(...args);
// END TEMPORARY CONTROLLER BYPASS.

const drillStatus = document.getElementById('drillStatus');
// AI-generated (Claude): the text inside the status bar.
const drillStatusText = document.getElementById('drillStatusText') || drillStatus;

// AI-modified (Claude): the status banner is static text now (it used to scroll).
const setDrillStatusText = (text) => {
    drillStatusText.textContent = text;
};

// AI-generated (Claude): All / Odd / Even / Clear buttons above a target checkbox list
// (Create/Edit Drill forms, and the target picker for drills with no targets). Sets the
// selection to exactly that group.
document.addEventListener('click', (event) => {
    const button = event.target.closest('.target-quick-select [data-select]');
    if (!button) return;
    const list = document.getElementById(button.closest('.target-quick-select').dataset.targetList);
    if (!list) return;
    const choice = button.dataset.select;
    list.querySelectorAll('input[type="checkbox"]').forEach((box) => {
        const targetNumber = Number(box.value);
        box.checked = choice === 'all'
            || (choice === 'odd' && targetNumber % 2 === 1)
            || (choice === 'even' && targetNumber % 2 === 0);
    });
    list.classList.remove('is-invalid');
});

const targetViewButtons = document.querySelectorAll('.target-view-button');
const targetGrid = document.getElementById('targetGrid');
const targetStatusStorageKey = 'cpd-target-status';
const targetViewStorageKey = 'cpd-target-view';
// AI-generated (Claude): manual mode unlocks tapping targets to raise/hide them. Saved so the
// status bar on other pages shows it too.
const manualModeStorageKey = 'cpd-manual-mode';
let manualMode = localStorage.getItem(manualModeStorageKey) === 'true';

// AI-generated (Claude): status bar colors: blue = idle, red = drill running, amber = manual.
const setStatusBarStyle = (state) => {
    drillStatus.classList.toggle('bg-primary', state === 'idle');
    drillStatus.classList.toggle('bg-danger', state === 'active');
    drillStatus.classList.toggle('bg-warning', state === 'manual');
    drillStatus.classList.toggle('text-white', state !== 'manual');
    drillStatus.classList.toggle('text-dark', state === 'manual');
};
let targetAssignmentDrills = {};

// AI-generated (Claude): the controller is the source of truth for drills and targets. Every
// page with the status bar polls GET /api/drill/status (fast while a drill is running or
// paused, slow when idle) and redraws from the reply. Deliberately no WebSocket: one phone at a
// time, and captive-portal browsers drop connections, which polling survives.
// controllerStatus = last reply ({state, drillName, step, stepCount, stepAction, targets,
// lastOutcome, stopped, hardwareReady, facing}), or null if the controller can't be reached.
let controllerStatus = null;
// Keep this phone's Reset and Resume requests in order; leave Stop available (AI-assisted with Codex).
let stageControlRequestPending = false;
const controllerStatusListeners = [];
let drillStatusTimer = null;

const pollDrillStatus = async () => {
    clearTimeout(drillStatusTimer);
    try {
        const response = await controllerFetch('/api/drill/status', { cache: 'no-store' });
        controllerStatus = response.ok ? await response.json() : null;
    } catch {
        controllerStatus = null;
    }
    // An active drill takes precedence over a saved manual-mode preference (AI-assisted with Codex).
    if (manualMode && ['running', 'paused'].includes(controllerStatus?.state)) {
        manualMode = false;
        localStorage.removeItem(manualModeStorageKey);
    }
    controllerStatusListeners.forEach((listener) => listener(controllerStatus));
    const drillActive = controllerStatus && controllerStatus.state !== 'idle';
    drillStatusTimer = setTimeout(pollDrillStatus, drillActive ? 500 : 3000);
};

// AI-generated (Claude): POSTs (or PUTs, via method) to the controller and throws an Error with
// the controller's message if it refuses. Never pass an empty "targets" list: the API reads []
// as ALL targets.
const postToController = async (path, body, method = 'POST') => {
    let response;
    try {
        response = await controllerFetch(path, body === undefined
            ? { method }
            : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch {
        throw new Error('Could not reach the target controller. Check that you are on the CPD Range Control WiFi.');
    }
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'The target controller did not accept the command.');
    }
};

// AI-generated (Claude): today's date on this phone as YYYY-MM-DD (local time, not UTC). The
// ESP32 has no clock, so APIs that need "today" (officer stats) are given this.
const localDateString = (date = new Date()) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
].join('-');

// AI-generated (Claude): drill start delay (Settings page), saved on this phone. A countdown
// runs after Start drill / Resume before the command is sent. mode is 'instant', 'fixed'
// (seconds, 1-30, default 3) or 'random' (1-5 s).
const startDelayStorageKey = 'cpd-start-delay';

const getStartDelaySetting = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(startDelayStorageKey) || 'null');
        if (saved && ['instant', 'fixed', 'random'].includes(saved.mode)) {
            return { mode: saved.mode, seconds: Math.min(30, Math.max(1, Math.round(Number(saved.seconds)) || 3)) };
        }
    } catch {
        // unreadable setting: use the default
    }
    return { mode: 'fixed', seconds: 3 };
};

const pickStartDelayMs = () => {
    const setting = getStartDelaySetting();
    if (setting.mode === 'instant') return 0;
    if (setting.mode === 'random') return 1000 + Math.random() * 4000;
    return setting.seconds * 1000;
};

// AI-modified (Claude): shows the countdown beside the Stop button (targets.html
// #startCountdown, seconds to 2 decimals) and resolves true when it reaches zero, or false if it
// is cancelled (Stop, Escape, or the page being hidden, e.g. the phone locking). Nothing is sent
// to the controller during it. While it runs, Stop is enabled and Start is disabled.
let cancelStartCountdown = null;

const startCountdown = (label) => new Promise((resolve) => {
    const countdown = document.getElementById('startCountdown');
    const delayMs = pickStartDelayMs();
    if (!countdown || delayMs <= 0) {
        resolve(true);
        return;
    }
    const number = document.getElementById('startCountdownNumber');
    countdown.setAttribute('aria-label', label);
    countdown.title = label;
    const endsAt = Date.now() + delayMs;
    let timer;

    const finish = (go) => {
        clearInterval(timer);
        countdown.hidden = true;
        document.removeEventListener('keydown', onKey);
        cancelStartCountdown = null;
        resolve(go);
    };
    const onKey = (event) => {
        if (event.key === 'Escape') finish(false);
    };
    const tick = () => {
        const remaining = endsAt - Date.now();
        if (remaining <= 0) {
            finish(true);
            return;
        }
        number.textContent = (remaining / 1000).toFixed(2);
    };

    cancelStartCountdown = () => finish(false);
    document.addEventListener('keydown', onKey);
    countdown.hidden = false;
    tick();
    timer = setInterval(tick, 20);
    updateDrillStatus(); // enable Stop (it cancels the countdown), lock Start
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cancelStartCountdown?.();
});

// AI-generated (Claude): a "full drill" is a composite whose sequence runs other drills by
// name (e.g. "Pistol Qual Full Drill"); everything else is a single stage.
const basicDrillActions = new Set(['present', 'hide', 'pause', 'delay']);
const isFullDrill = (drill) => (Array.isArray(drill?.sequence) ? drill.sequence : [])
    .some((step) => typeof step?.action === 'string' && !basicDrillActions.has(step.action));

// AI-modified (Claude): 'full' = runs other drills; 'stages' = a built-in single drill (tagged
// "builtIn": true in data/database.json); 'custom' = any other drill (made on the Drills page).
const getDrillCategory = (drillId, drill) => {
    if (isFullDrill(drill)) return 'full';
    return drill?.builtIn === true ? 'stages' : 'custom';
};

// AI-modified (Claude): drills come only from the controller (database.json); the phone-only
// drill library in localStorage is gone. Every drill is listed (no five-drill limit).
const getTargetDrillLibrary = (databaseDrills = []) => {
    const defaults = (Array.isArray(databaseDrills) ? databaseDrills : [])
        .filter((drill) => drill && typeof drill.drillName === 'string' && drill.drillName.trim())
        .map((drill, index) => [`database-drill-${index}`, {
            name: drill.drillName.trim(),
            sequence: Array.isArray(drill.sequence) ? drill.sequence : [],
            builtIn: drill.builtIn === true
        }]);
    return Object.fromEntries(defaults);
};

// AI-assisted target availability workflow; include this change in the PR's AI-use disclosure.
const getSavedTargetStatus = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(targetStatusStorageKey) || '{}');
        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    } catch (error) {
        return {};
    }
};

const saveTargetStatus = (status) => {
    localStorage.setItem(targetStatusStorageKey, JSON.stringify(status));
};

const saveTargetCardStatus = (targetCard) => {
    const targetNumber = targetCard.closest('[data-target-number]')?.dataset.targetNumber;
    if (!targetNumber) return;

    const status = getSavedTargetStatus();
    const savedState = status[targetNumber] && typeof status[targetNumber] === 'object' && !Array.isArray(status[targetNumber])
        ? status[targetNumber]
        : {};
    // AI-modified (Claude): "defective" is no longer saved here; it is the controller's
    // working flag (Settings page).
    status[targetNumber] = {
        ...savedState,
        red: targetCard.classList.contains('is-red')
    };
    saveTargetStatus(status);
};

const maxDrillNesting = 4; // MAX_NESTING_DEPTH in target_manager.cpp

// Keep the existing stage description shape, using controller status (AI-assisted with Codex).
const describeDrillStage = (drillName, step) => {
    const status = controllerStatus;
    if (!status?.stageName || status.drillName !== drillName || status.step !== step) return null;
    return { stage: status.stageName, between: status.betweenStages };
};

// AI-modified (Claude): draws the status bar (every page) and, on the Targets page, the drill
// buttons, from the controller's last status reply instead of the old frontend-only demo
// state. Card colors are set by the Targets page's own status listener (initializeTargetPage).
const updateDrillStatus = () => {
    if (!drillStatus) return;

    const status = controllerStatus;
    const state = status?.state || 'idle';
    const drillActive = state !== 'idle';
    const stopped = Boolean(status?.stopped);
    const drillName = status?.drillName || 'Drill';

    // Status bar colors: blue = idle, red = drill running / stopped / fault, amber = manual.
    if (!status) {
        setStatusBarStyle('idle');
        setDrillStatusText('Target controller not connected');
    } else if (!status.hardwareReady) {
        setStatusBarStyle('active');
        setDrillStatusText('Target hardware not ready');
    } else if (stopped) {
        setStatusBarStyle('active');
        setDrillStatusText('Stopped: targets frozen. Press Reset to hide them');
    } else if (state === 'paused') {
        // Use the running drill's stage name, including after refresh (AI-assisted with Codex).
        const stageInfo = describeDrillStage(status.drillName, status.step);
        setStatusBarStyle('active');
        const stage = stageInfo ? `${drillName}: ${stageInfo.stage}` : drillName;
        let message = `${stage} paused. Press Resume`;
        if (status.stageResetPending) message = `${stage} resetting. Hiding targets`;
        else if (status.stageRestartReady) message = `${stage} reset. Press Resume to replay`;
        else if (stageInfo?.between) message = `${stage} complete. Resume continues; Reset stage replays it`;
        setDrillStatusText(message);
    } else if (state === 'running') {
        const stageInfo = describeDrillStage(status.drillName, status.step);
        setStatusBarStyle('active');
        setDrillStatusText(stageInfo && !stageInfo.between
            ? `${drillName}: ${stageInfo.stage} in progress`
            : `${drillName} in progress`);
    } else if (manualMode) {
        setStatusBarStyle('manual');
        setDrillStatusText('Manual mode');
    } else {
        setStatusBarStyle('idle');
        setDrillStatusText('No drill in progress');
    }

    if (!targetGrid) return;

    const startDrillButton = document.getElementById('startDrillButton');
    const startDrillLabel = document.getElementById('startDrillLabel');
    const pauseDrillButton = document.getElementById('pauseDrillButton');
    const stopDrillButton = document.getElementById('stopDrillButton');
    const resetTargetsButton = document.getElementById('resetTargetsButton');
    const resetStageButton = document.getElementById('resetStageButton');
    const drillSelect = document.getElementById('drillSelect');

    // AI-generated (Claude): manual mode button, and target taps unlocked only in manual mode.
    const manualModeButton = document.getElementById('manualModeButton');
    if (manualModeButton) {
        manualModeButton.classList.toggle('btn-warning', manualMode);
        manualModeButton.classList.toggle('btn-outline-dark', !manualMode);
        manualModeButton.setAttribute('aria-pressed', String(manualMode));
        document.getElementById('manualModeLabel').textContent = manualMode ? 'Exit manual mode' : 'Turn on manual mode';
    }
    const manualModeHintText = document.getElementById('manualModeHintText');
    if (manualModeHintText) {
        manualModeHintText.textContent = manualMode
            ? 'Unlocked: tap a target or use the toggle buttons.'
            : 'Locked: turn on manual mode to toggle targets.';
        document.getElementById('manualModeHintIcon').className = manualMode ? 'bi bi-unlock-fill' : 'bi bi-lock-fill';
    }
    document.body.classList.toggle('is-manual-mode', manualMode);
    document.querySelectorAll('.target-toggle').forEach((button) => { button.disabled = !manualMode; });

    // Start doubles as Resume while the controller is paused (operator pause or a "pause" step).
    if (startDrillLabel) startDrillLabel.textContent = state === 'paused' ? 'Resume drill' : 'Start drill';
    const countingDown = Boolean(cancelStartCountdown);
    // Lock Reset and Resume together without blocking Stop (AI-assisted with Codex).
    const stageControlsLocked = !status?.hardwareReady || manualMode || stopped || countingDown
        || stageControlRequestPending || Boolean(status?.stageResetPending);
    if (startDrillButton) {
        startDrillButton.disabled = stageControlsLocked
            || (state === 'paused' ? false : drillActive || !drillSelect?.value);
    }
    // Keep Pause available for a running drill and make available controls distinct (AI-assisted with Codex).
    if (pauseDrillButton) {
        pauseDrillButton.disabled = state !== 'running' || stopped;
        pauseDrillButton.classList.toggle('btn-primary', !pauseDrillButton.disabled);
        pauseDrillButton.classList.toggle('btn-outline-secondary', pauseDrillButton.disabled);
    }
    if (stopDrillButton) stopDrillButton.disabled = !(drillActive || countingDown) || stopped;
    if (resetTargetsButton) resetTargetsButton.hidden = !stopped;
    if (resetStageButton) {
        resetStageButton.disabled = stageControlsLocked || !status?.canResetStage;
        resetStageButton.classList.toggle('btn-warning', !resetStageButton.disabled);
        resetStageButton.classList.toggle('btn-outline-secondary', resetStageButton.disabled);
    }
    const resetStageHint = document.getElementById('resetStageHint');
    if (resetStageHint) {
        resetStageHint.hidden = !status?.stageName || state !== 'paused' || stopped || !status.hardwareReady;
        resetStageHint.textContent = status?.stageResetPending
            ? 'Hiding targets. Wait for Resume to become available.'
            : status?.stageRestartReady
                ? 'Stage is ready to replay. Press Resume.'
                : `Reset ${status?.stageName} (stage ${status?.stageIndex}), hide the drill targets, and wait for Resume.`;
    }
    if (drillSelect) drillSelect.disabled = manualMode || drillActive || stopped || countingDown;
};

if (drillStatus) {
    controllerStatusListeners.push(updateDrillStatus);
    pollDrillStatus();
    // Captive-portal browsers suspend the page; refresh as soon as it is visible again.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pollDrillStatus();
    });
}

// AI-generated (Claude): drill timer (Targets page, Run a drill). Shows the time left in the
// delay step being run. Each status poll resyncs it (delayRemainingMs) and it counts down
// locally in between, so it moves smoothly although the controller is asked twice a second.
const drillTimer = document.getElementById('drillTimer');
if (drillTimer) {
    const timerLabel = document.getElementById('drillTimerLabel');
    const timerValue = document.getElementById('drillTimerValue');
    const timerIcon = document.getElementById('drillTimerIcon');
    const timerValueDisplay = timerValue.parentElement;
    let timerSync = null;   // {remainingMs, at} from the last poll, while a delay step runs
    let timerTicker = null;

    const renderDrillTimer = () => {
        const status = controllerStatus;
        const active = Boolean(status) && status.state !== 'idle' && !status.stopped;
        drillTimer.hidden = !active;
        if (!active) return;

        const paused = status.state === 'paused';
        drillTimer.classList.toggle('is-paused', paused);
        timerIcon.hidden = !paused;
        const drillTargets = new Set((status.targets || []).map(Number));
        const targetsUp = (status.facing || []).some((number) => drillTargets.has(Number(number)));
        if (timerSync) {
            timerValueDisplay.hidden = false;
            const left = paused
                ? timerSync.remainingMs
                : Math.max(0, timerSync.remainingMs - (performance.now() - timerSync.at));
            timerValue.textContent = (left / 1000).toFixed(2);
            timerLabel.textContent = paused ? 'Paused at' : `Targets ${targetsUp ? 'up' : 'down'}`;
        } else {
            timerValue.textContent = '--';
            timerValueDisplay.hidden = paused;
            timerLabel.textContent = paused
                ? 'Paused · waiting for Resume'
                : status.stepAction === 'present' ? 'Targets turning' : 'Next step';
        }
    };

    controllerStatusListeners.push((status) => {
        timerSync = status && status.delayMs > 0
            ? { remainingMs: status.delayRemainingMs, at: performance.now() }
            : null;
        renderDrillTimer();
        const counting = Boolean(timerSync) && status.state === 'running';
        if (counting && !timerTicker) timerTicker = setInterval(renderDrillTimer, 30);
        if (!counting && timerTicker) {
            clearInterval(timerTicker);
            timerTicker = null;
        }
    });
}

const renderTargets = (targetIds) => {
    if (!targetGrid) return;

    targetGrid.innerHTML = targetIds.map((targetNumber) => `
        <div class="col d-flex justify-content-center" data-target-number="${targetNumber}">
            <button class="target-card" type="button" aria-pressed="false" aria-label="Mark target ${targetNumber} red">
                <span class="target-number" aria-hidden="true">${targetNumber}</span>
                <!-- AI-modified (Claude): one image per state; style.css shows the one that matches
                     the card (green = hidden, red = raised, grey = defective). -->
                <span class="target-face" aria-hidden="true">
                    <img class="face-hidden" src="uspsa_target_green.svg" width="150" height="180" alt="">
                    <img class="face-raised" src="uspsa_target_red.svg" width="150" height="180" alt="">
                    <img class="face-defective" src="uspsa_target_grey.svg" width="150" height="180" alt="">
                </span>
                <span class="target-list-label">Target ${targetNumber}</span>
            </button>
        </div>
    `).join('');
};

const initializeTargetPage = (targetIds, unavailableTargetIds = []) => {
    renderTargets(targetIds);

    const targetCards = document.querySelectorAll('.target-card');
    const targetColumns = Array.from(targetCards, (targetCard) => targetCard.closest('[data-target-number]'));
    // AI-modified (Claude): defective targets = marked not working on the controller
    // (Settings page). Drills and manual moves skip them, and the cards show them grey.
    const unavailableTargets = new Set(unavailableTargetIds);
    const drillSelect = document.getElementById('drillSelect');
    const startDrillButton = document.getElementById('startDrillButton');
    const drillLaunchMessage = document.getElementById('drillLaunchMessage');
    const bootstrapModal = typeof bootstrap === 'undefined' ? null : bootstrap.Modal;

    if (drillSelect) {
        // AI-modified (Claude): options are grouped into full drills, stages and custom drills.
        const drillEntries = Object.entries(targetAssignmentDrills)
            .filter(([, drill]) => drill && typeof (drill.name || drill.drillName) === 'string');
        const drillGroups = [
            { label: 'Full drills', category: 'full' },
            { label: 'Custom', category: 'custom' },
            { label: 'Stages', category: 'stages' }
        ]
            .map(({ label, category }) => ({
                label,
                entries: drillEntries.filter(([drillId, drill]) => getDrillCategory(drillId, drill) === category)
            }))
            .filter(({ entries }) => entries.length)
            .map(({ label, entries }) => {
                const group = document.createElement('optgroup');
                group.label = label;
                group.append(...entries.map(([drillId, drill]) => new Option(drill.name || drill.drillName, drillId)));
                return group;
            });
        drillSelect.replaceChildren(new Option('Select a drill', ''), ...drillGroups);

        // AI-modified (Claude): drills now run on the controller (this was a frontend-only demo).
        // The buttons only send commands; the status bar, buttons and cards are redrawn from what
        // the controller reports back through pollDrillStatus().
        const pauseDrillButton = document.getElementById('pauseDrillButton');

        const showLaunchMessage = (text) => {
            drillLaunchMessage.textContent = text;
            drillLaunchMessage.hidden = false;
        };

        // Send paused drill commands through one request path (AI-assisted with Codex).
        const sendPausedDrillCommand = async (path, countdownLabel) => {
            if (stageControlRequestPending || cancelStartCountdown || manualMode
                || controllerStatus?.state !== 'paused' || controllerStatus.stopped) return;
            stageControlRequestPending = true;
            updateDrillStatus();
            try {
                if (countdownLabel && !(await startCountdown(countdownLabel))) return;
                await postToController(path);
                drillLaunchMessage.hidden = true;
            } catch (error) {
                showLaunchMessage(error.message);
            } finally {
                await pollDrillStatus();
                stageControlRequestPending = false;
                updateDrillStatus();
            }
        };

        drillSelect.addEventListener('change', () => {
            drillLaunchMessage.hidden = true;
            drillLaunchMessage.textContent = '';
            updateDrillStatus();
        });

        startDrillButton.addEventListener('click', async () => {
            if (manualMode || stageControlRequestPending || controllerStatus?.stageResetPending) return;
            // While the controller is paused (operator pause or a "pause" step) this is Resume.
            if (controllerStatus?.state === 'paused') {
                return sendPausedDrillCommand('/api/drill/resume', `Resuming ${controllerStatus.drillName || 'drill'}`);
            }

            const drillId = drillSelect.value;
            const drill = targetAssignmentDrills[drillId];
            if (!drill) return;
            // AI-modified (Claude): targets belong to each step. If every present/hide step (stages
            // of a full drill included) lists its own targets, run on those right away. If any
            // step is "All targets", ask which targets are in use (all working ones pre-checked).
            const { usesAllTargets, targets } = getDrillStepTargets(drill);
            if (usesAllTargets) {
                openDrillTargetPicker(drillId);
                return;
            }
            const runTargets = [...targets]
                .filter((targetNumber) => !unavailableTargets.has(targetNumber))
                .sort((first, second) => first - second);
            if (!runTargets.length) {
                showLaunchMessage(targets.size
                    ? "All of this drill's targets are marked defective."
                    : 'This drill has no present or hide steps, so there is nothing to run.');
                return;
            }
            runDrillOnTargets(drillId, runTargets);
        });

        // AI-generated (Claude): walks a drill's steps, following stages of full drills by name,
        // the same way the controller flattens it. usesAllTargets = some present/hide step has no
        // targets list; targets = every target named by the steps that do.
        const getDrillStepTargets = (drill, depth = 1, found = { usesAllTargets: false, targets: new Set() }) => {
            if (!drill || depth > maxDrillNesting) return found;
            (Array.isArray(drill.sequence) ? drill.sequence : []).forEach((step) => {
                const action = step?.action;
                if (action === 'present' || action === 'hide') {
                    // AI-modified (Claude): a random present picks from the run's targets, so like
                    // "All targets" it needs to know which targets are in use
                    const list = Array.isArray(step.targets) ? step.targets.map(Number) : [];
                    if (list.length && !step.random) list.forEach((targetNumber) => found.targets.add(targetNumber));
                    else found.usesAllTargets = true;
                } else if (!basicDrillActions.has(action)) {
                    const stage = Object.values(targetAssignmentDrills)
                        .find((candidate) => (candidate.name || candidate.drillName) === action);
                    getDrillStepTargets(stage, depth + 1, found);
                }
            });
            return found;
        };

        // AI-modified (Claude): starts the drill on the controller. availableTargets is never
        // empty here (callers check), which matters because the API reads [] as all targets.
        const runDrillOnTargets = async (drillId, availableTargets) => {
            const drill = targetAssignmentDrills[drillId];
            startDrillButton.disabled = true;
            // AI-modified (Claude): start delay countdown first; Cancel sends nothing
            if (!(await startCountdown(`Starting ${drill.name || drill.drillName}`))) {
                updateDrillStatus();
                return;
            }
            try {
                await postToController('/api/drill/start', {
                    drillName: drill.name || drill.drillName,
                    targets: availableTargets
                });
                drillLaunchMessage.hidden = true;
                drillLaunchMessage.textContent = '';
            } catch (error) {
                showLaunchMessage(error.message);
            }
            pollDrillStatus();
        };

        // AI-generated (Claude): picker for drills that have no targets assigned. Lists every
        // target that isn't defective or unavailable; the choice applies to this run only and
        // isn't saved to the drill.
        const pickerModalElement = document.getElementById('drillTargetPickerModal');
        const pickerList = document.getElementById('drillTargetPickerList');
        const pickerError = document.getElementById('drillTargetPickerError');
        let pickerDrillId = '';

        const openDrillTargetPicker = (drillId) => {
            if (!pickerModalElement || !bootstrapModal) return;
            pickerDrillId = drillId;
            const drill = targetAssignmentDrills[drillId];
            document.getElementById('drillTargetPickerDrillName').textContent = drill.name || drill.drillName;
            pickerError.hidden = true;

            const pickableTargets = targetColumns
                .map((column) => Number(column.dataset.targetNumber))
                .filter((targetNumber) => !unavailableTargets.has(targetNumber));

            if (!pickableTargets.length) {
                pickerList.textContent = 'No targets are currently available.';
            } else {
                pickerList.replaceChildren(...pickableTargets.map((targetNumber) => {
                    const wrapper = document.createElement('label');
                    wrapper.className = 'target-option';
                    const input = document.createElement('input');
                    input.className = 'form-check-input';
                    input.type = 'checkbox';
                    input.checked = true; // AI-modified (Claude): start with every working target
                    input.value = String(targetNumber);
                    const text = document.createElement('span');
                    text.textContent = `Target ${targetNumber}`;
                    wrapper.append(input, text);
                    return wrapper;
                }));
            }
            bootstrapModal.getOrCreateInstance(pickerModalElement).show();
        };

        const pickerStartButton = document.getElementById('drillTargetPickerStart');
        pickerStartButton?.addEventListener('click', () => {
            const selectedTargets = Array.from(
                pickerList.querySelectorAll('input[type="checkbox"]:checked'),
                (box) => Number(box.value)
            );
            if (!selectedTargets.length) {
                pickerError.textContent = 'Select at least one target.';
                pickerError.hidden = false;
                return;
            }
            // Close the picker fully before starting so its backdrop cannot block Pause (AI-assisted with Codex).
            pickerStartButton.disabled = true;
            const hidePicker = () => bootstrapModal.getInstance(pickerModalElement)?.hide();
            pickerModalElement.addEventListener('shown.bs.modal', hidePicker, { once: true });
            pickerModalElement.addEventListener('hidden.bs.modal', () => {
                pickerModalElement.removeEventListener('shown.bs.modal', hidePicker);
                pickerStartButton.disabled = false;
                if (pickerDrillId && !manualMode) {
                    runDrillOnTargets(pickerDrillId, selectedTargets);
                }
            }, { once: true });
            hidePicker();
        });

        pauseDrillButton.addEventListener('click', async () => {
            // Cancel a pending Start/Resume before pausing an already running drill (AI-assisted with Codex).
            cancelStartCountdown?.();
            try {
                await postToController('/api/drill/pause');
            } catch (error) {
                showLaunchMessage(error.message);
            }
            pollDrillStatus();
        });

        // Polling reports when the stage is ready to replay (AI-assisted with Codex).
        document.getElementById('resetStageButton')?.addEventListener('click', () =>
            sendPausedDrillCommand('/api/drill/reset-stage'));

        // AI-generated (Claude): turns every raised (red) target back to green.
        const hideAllTargets = () => {
            const status = getSavedTargetStatus();
            targetGrid.querySelectorAll('.target-card.is-red').forEach((targetCard) => {
                const targetColumn = targetCard.closest('[data-target-number]');
                const targetNumber = targetColumn.dataset.targetNumber;
                targetCard.classList.remove('is-red');
                targetCard.setAttribute('aria-pressed', 'false');
                targetCard.setAttribute('aria-label', `Mark target ${targetNumber} red`);
                status[targetNumber] = { ...(status[targetNumber] || {}), red: false };
            });
            saveTargetStatus(status);
        };

        // AI-generated (Claude): ends a paused drill (stop, then reset: hides its targets). Run
        // after the operator confirms in the "End drill?" dialog.
        const endDrillModalElement = document.getElementById('endDrillConfirmModal');
        const endPausedDrill = async (drillName) => {
            try {
                await postToController('/api/stop');
                await postToController('/api/reset');
                showLaunchMessage(`${drillName} ended. Targets hidden.`);
            } catch (error) {
                showLaunchMessage(`${error.message} If targets are still up, press Reset.`);
            }
            pollDrillStatus();
        };
        document.getElementById('confirmEndDrillButton')?.addEventListener('click', () => {
            bootstrapModal.getInstance(endDrillModalElement)?.hide();
            endPausedDrill(document.getElementById('endDrillName').textContent || 'The drill');
        });

        // AI-modified (Claude): Stop. While a drill runs it is the controller's emergency stop: it
        // freezes every target where it is (the controller never moves a target on Stop) and
        // latches until Reset, which hides them all. While the drill is paused there is nothing
        // to freeze, so Stop ends the drill instead: stop, then reset (hides its targets).
        document.getElementById('stopDrillButton')?.addEventListener('click', async () => {
            if (cancelStartCountdown) {
                cancelStartCountdown();
                if (!controllerStatus || controllerStatus.state === 'idle') {
                    showLaunchMessage('Start cancelled.');
                    return;
                }
            }
            if (controllerStatus?.state === 'paused') {
                // AI-modified (Claude): ask first; confirmEndDrillButton does the ending
                const drillName = controllerStatus.drillName || 'The drill';
                if (endDrillModalElement && bootstrapModal) {
                    document.getElementById('endDrillName').textContent = drillName;
                    bootstrapModal.getOrCreateInstance(endDrillModalElement).show();
                } else if (window.confirm(`End ${drillName}? Its targets will be hidden.`)) {
                    endPausedDrill(drillName);
                }
                return;
            }
            try {
                await postToController('/api/stop');
                showLaunchMessage('Drill stopped. Targets are frozen where they are; press Reset to hide them.');
            } catch (error) {
                showLaunchMessage(`${error.message} The stop was not confirmed, so treat the targets as unsafe.`);
            }
            pollDrillStatus();
        });

        // AI-generated (Claude): clears the emergency stop and hides every target.
        document.getElementById('resetTargetsButton')?.addEventListener('click', async () => {
            try {
                await postToController('/api/reset');
                drillLaunchMessage.hidden = true;
            } catch (error) {
                showLaunchMessage(error.message);
            }
            pollDrillStatus();
        });

        // AI-generated (Claude): manual mode. Entering it while a drill is running asks first,
        // then ends the drill; leaving it hides every target that was raised by hand.
        const manualModeModalElement = document.getElementById('manualModeConfirmModal');

        const enterManualMode = () => {
            manualMode = true;
            localStorage.setItem(manualModeStorageKey, 'true');
            drillLaunchMessage.hidden = true;
            updateDrillStatus();
        };

        document.getElementById('manualModeButton')?.addEventListener('click', () => {
            if (manualMode) {
                // AI-modified (Claude): hide every target on the controller first, and leave
                // manual mode only once it has accepted, so the cards never claim targets are
                // hidden while a relay is still on.
                const allTargets = targetColumns.map((column) => Number(column.dataset.targetNumber));
                sendTargetCommand(false, allTargets).then(() => {
                    hideAllTargets();
                    manualMode = false;
                    localStorage.removeItem(manualModeStorageKey);
                    drillLaunchMessage.hidden = true;
                    updateDrillStatus();
                }).catch((error) => {
                    showLaunchMessage(`${error.message} Targets may still be raised, so manual mode is still on.`);
                });
                return;
            }
            if (controllerStatus && controllerStatus.state !== 'idle' && manualModeModalElement && bootstrapModal) {
                document.getElementById('manualModeDrillName').textContent = controllerStatus.drillName || 'the current drill';
                bootstrapModal.getOrCreateInstance(manualModeModalElement).show();
                return;
            }
            enterManualMode();
        });

        // AI-modified (Claude): ending a drill to switch to manual mode stops it on the controller
        // and then resets (hides every target), because the operator confirmed ending it.
        document.getElementById('confirmManualModeButton')?.addEventListener('click', async () => {
            bootstrapModal.getInstance(manualModeModalElement)?.hide();
            const drillName = controllerStatus?.drillName || 'The drill';
            try {
                await postToController('/api/stop');
                await postToController('/api/reset');
            } catch (error) {
                showLaunchMessage(`${error.message} Manual mode was not turned on.`);
                pollDrillStatus();
                return;
            }
            enterManualMode();
            showLaunchMessage(`${drillName} ended. Tap a target to raise or hide it.`);
            pollDrillStatus();
        });
    }

    targetCards.forEach((targetCard) => {
        const targetNumber = targetCard.closest('[data-target-number]').dataset.targetNumber;
        const savedState = getSavedTargetStatus()[targetNumber] || {};
        const isDefective = unavailableTargets.has(Number(targetNumber));
        const isRed = Boolean(savedState.red) && !isDefective;

        targetCard.classList.toggle('is-defective', isDefective);
        targetCard.classList.toggle('is-red', isRed);
        targetCard.setAttribute('aria-pressed', String(isRed));
        targetCard.setAttribute('aria-label', isDefective
            ? `Target ${targetNumber} is defective`
            : isRed
                ? `Return target ${targetNumber} to green`
                : `Mark target ${targetNumber} red`);
    });

    // AI-modified (Claude): the All/Odd/Even filter was removed; the only view filter left is
    // the "Hide defective" switch.
    const hideDefectiveSwitch = document.getElementById('hideDefectiveTargets');
    const applyDefectiveFilter = () => {
        const hideDefective = Boolean(hideDefectiveSwitch?.checked);
        targetColumns.forEach((column) => {
            column.classList.toggle('d-none', hideDefective && unavailableTargets.has(Number(column.dataset.targetNumber)));
        });
    };
    hideDefectiveSwitch?.addEventListener('change', applyDefectiveFilter);

    // AI-assisted target display preference; include this change in the PR's AI-use disclosure.
    const applyTargetView = (view) => {
        const isListView = view === 'list';
        targetGrid.classList.toggle('is-list-view', isListView);
        targetViewButtons.forEach((button) => {
            const isActive = button.dataset.view === (isListView ? 'list' : 'grid');
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
        localStorage.setItem(targetViewStorageKey, isListView ? 'list' : 'grid');
    };

    targetViewButtons.forEach((button) => {
        button.addEventListener('click', () => applyTargetView(button.dataset.view));
    });
    applyTargetView(localStorage.getItem(targetViewStorageKey) || 'grid');

    targetGrid.addEventListener('click', (event) => {
        const targetColumn = event.target.closest('[data-target-number]');
        if (!targetColumn) return;
        const targetCard = targetColumn.querySelector('.target-card');
        // AI-modified (Claude): in list view a tap anywhere on the row (number badge included)
        // counts as tapping that target; in grid view only the target image does.
        if (!event.target.closest('.target-card') && !targetGrid.classList.contains('is-list-view')) return;
        if (targetCard.classList.contains('is-defective') || unavailableTargets.has(Number(targetColumn.dataset.targetNumber))) return;
        // AI-generated (Claude): tapping a target only flips it in manual mode.
        if (!manualMode) {
            drillLaunchMessage.textContent = 'Targets are locked. Turn on Manual mode to raise or hide a target by tapping it.';
            drillLaunchMessage.hidden = false;
            return;
        }

        // AI-modified (Claude): the card only changes once the controller accepts the command.
        applyManualTargets([[targetColumn, !targetCard.classList.contains('is-red')]]).then(updateDrillStatus);
    });

    // AI-modified (Claude): raise (red) or hide (green) one target; was inline in the click
    // handler, now shared with the Toggle targets buttons.
    const setTargetRaised = (targetColumn, isRed) => {
        const targetCard = targetColumn.querySelector('.target-card');
        const targetNumber = targetColumn.dataset.targetNumber;
        targetCard.classList.toggle('is-red', isRed);
        targetCard.setAttribute('aria-pressed', String(isRed));
        targetCard.setAttribute('aria-label', isRed
            ? `Return target ${targetNumber} to green`
            : `Mark target ${targetNumber} red`);
        saveTargetCardStatus(targetCard);
    };

    // AI-generated (Claude): sends one manual raise/hide to the controller. Never sends an empty
    // list: the API treats a missing or empty "targets" as ALL targets.
    const sendTargetCommand = async (present, targetNumbers) => {
        if (targetNumbers.length === 0) return;
        await postToController(present ? '/api/targets/present' : '/api/targets/hide', { targets: targetNumbers });
    };

    // AI-generated (Claude): moves targets on the controller, then updates the cards to match.
    // changes is a list of [targetColumn, raise] pairs; targets already in that state are skipped.
    // Hides go first so Random never has more targets up than it asked for. Returns false (and
    // shows why) if the controller refused, leaving the cards showing what really happened.
    const applyManualTargets = async (changes) => {
        const pending = changes.filter(([column, raise]) => (
            column.querySelector('.target-card').classList.contains('is-red') !== raise
        ));
        try {
            for (const raise of [false, true]) {
                const columns = pending.filter(([, r]) => r === raise).map(([column]) => column);
                await sendTargetCommand(raise, columns.map((column) => Number(column.dataset.targetNumber)));
                columns.forEach((column) => setTargetRaised(column, raise));
            }
        } catch (error) {
            drillLaunchMessage.textContent = error.message;
            drillLaunchMessage.hidden = false;
            pollDrillStatus();
            return false;
        }
        pollDrillStatus(); // confirm against what the relays actually did
        return true;
    };

    // AI-modified (Claude): on every status poll, set the cards to the targets the controller
    // reports as facing (during drills and manual mode alike), keep the drill picker on the
    // drill that is running, and say how a drill ended when it finishes on its own.
    let lastDrillState = null;
    controllerStatusListeners.push((status) => {
        if (!status) return;
        if (Array.isArray(status.facing)) {
            const facingTargets = new Set(status.facing.map(Number));
            targetColumns.forEach((column) => {
                const isFacing = facingTargets.has(Number(column.dataset.targetNumber));
                if (column.querySelector('.target-card').classList.contains('is-red') !== isFacing) {
                    setTargetRaised(column, isFacing);
                }
            });
        }
        if (drillSelect && status.state !== 'idle') {
            const runningOption = Array.from(drillSelect.options).find((option) => option.text === status.drillName);
            if (runningOption) drillSelect.value = runningOption.value;
        }
        if (lastDrillState && lastDrillState !== 'idle' && status.state === 'idle' && drillLaunchMessage) {
            if (status.lastOutcome === 'completed') {
                drillLaunchMessage.textContent = `${status.drillName} complete.`;
                drillLaunchMessage.hidden = false;
            } else if (status.lastOutcome === 'failed') {
                // A failed run may also have failed to hide its targets (AI-assisted with Codex).
                drillLaunchMessage.textContent = `${status.drillName} failed. Check target positions before continuing.`;
                drillLaunchMessage.hidden = false;
            }
        }
        lastDrillState = status.state;
    });
    pollDrillStatus();

    // AI-generated (Claude): Toggle targets (manual mode only). All / Odd / Even raise every
    // usable target in the group, or hide them if they are all already raised. Random hides
    // everything, then raises randomTargetCount usable targets at random.
    const randomTargetCount = 3;
    document.querySelectorAll('.target-toggle').forEach((button) => {
        button.addEventListener('click', () => {
            if (!manualMode) return;
            const set = button.dataset.toggleSet;
            const usableColumns = targetColumns.filter((column) => (
                !column.querySelector('.target-card').classList.contains('is-defective')
                && !unavailableTargets.has(Number(column.dataset.targetNumber))
            ));

            // AI-modified (Claude): builds the wanted state and sends it to the controller in one go
            // (one hide request, then one present request) instead of only recoloring the cards.
            let changes;
            if (set === 'random') {
                const chosen = new Set([...usableColumns]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, randomTargetCount));
                changes = usableColumns.map((column) => [column, chosen.has(column)]);
            } else {
                const groupColumns = usableColumns.filter((column) => {
                    const targetNumber = Number(column.dataset.targetNumber);
                    return set === 'all' || (set === 'odd') === (targetNumber % 2 === 1);
                });
                const allRaised = groupColumns.every((column) => column.querySelector('.target-card').classList.contains('is-red'));
                changes = groupColumns.map((column) => [column, !allRaised]);
            }
            drillLaunchMessage.hidden = true;
            applyManualTargets(changes).then(updateDrillStatus);
        });
    });

    updateDrillStatus();
};

if (targetGrid) {
    controllerFetch('database.json', { cache: 'no-store' })
        .then((response) => response.json())
        .then((payload) => {
            const targets = Array.isArray(payload?.targets) ? payload.targets : [];
            targetAssignmentDrills = getTargetDrillLibrary(payload?.drills);
            const targetIds = targets
                .map((target) => Number(target?.id))
                .filter((id) => Number.isInteger(id) && id >= 1 && id <= 20)
                .sort((first, second) => first - second);
            const unavailableTargetIds = targets
                .filter((target) => target?.working === false)
                .map((target) => Number(target.id));
            initializeTargetPage(
                targetIds.length ? targetIds : Array.from({ length: 20 }, (_, index) => index + 1),
                unavailableTargetIds
            );
        })
        .catch(() => {
            targetAssignmentDrills = getTargetDrillLibrary();
            initializeTargetPage(Array.from({ length: 20 }, (_, index) => index + 1));
        });
}

// Performance dashboard reads qualification histories from the device database.
if (document.getElementById('performanceRows')) {
    const qualificationFilters = document.querySelectorAll('input[name="qualification"]');
    const performanceSearch = document.getElementById('performanceSearch');
    const performanceRows = document.getElementById('performanceRows');
    const performanceMessage = document.getElementById('performanceMessage');
    const sortSelect = document.getElementById('sortSelect');
    let sortMode = sortSelect.value || 'newest';
    let performanceOfficers = [];

    // Preserve YYYY-MM-DD calendar dates instead of shifting them through UTC.
    const parseScoreDate = (value) => {
        const dateText = String(value);
        const dateParts = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (dateParts) {
            return new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]));
        }

        const parsedDate = new Date(dateText);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    };

    // Normalize stored score/date pairs and discard malformed records.
    const qualificationNames = {
        pistolQualScores: 'Pistol',
        rifleQualScores: 'Rifle',
        swatQualScores: 'SWAT'
    };

    // Flatten officer histories so every control acts on one consistent result set.
    const getQualificationRecords = () => performanceOfficers.flatMap((officer) => (
        Object.entries(qualificationNames).flatMap(([key, name]) => {
            if (!Array.from(qualificationFilters).some((filter) => filter.checked && filter.value === key)) {
                return [];
            }

            const history = Array.isArray(officer?.[key]) ? officer[key] : [];
            return history
                .filter((entry) => Array.isArray(entry) && Number.isFinite(Number(entry[0])) && parseScoreDate(entry[1]) !== null)
                .map(([score, date]) => ({
                    name: String(officer?.Name || 'Unknown officer'),
                    badge: officer?.BadgeNum === undefined ? '—' : String(officer.BadgeNum),
                    qualification: name,
                    score: Number(score),
                    date: parseScoreDate(date)
                }));
        })
    ));

    // Apply search and optional score/date bounds after choosing qualifications.
    const getVisibleRecords = () => {
        const query = performanceSearch.value.trim().toLocaleLowerCase();
        const minimumScore = Number(document.getElementById('minimumScore').value);
        const maximumScore = Number(document.getElementById('maximumScore').value);
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        return getQualificationRecords().filter((record) => {
            const matchesSearch = !query || `${record.name} ${record.badge}`.toLocaleLowerCase().includes(query);
            const matchesMinimum = !document.getElementById('minimumScore').value || record.score >= minimumScore;
            const matchesMaximum = !document.getElementById('maximumScore').value || record.score <= maximumScore;
            const recordDate = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, '0')}-${String(record.date.getDate()).padStart(2, '0')}`;
            const matchesStart = !startDate || recordDate >= startDate;
            const matchesEnd = !endDate || recordDate <= endDate;
            return matchesSearch && matchesMinimum && matchesMaximum && matchesStart && matchesEnd;
        });
    };

    const formatScoreDate = (date) => new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);

    const renderPerformanceSummary = (records) => {
        const averageScore = records.length
            ? records.reduce((total, record) => total + record.score, 0) / records.length
            : null;
        const topRecord = records.reduce((best, record) => !best || record.score > best.score ? record : best, null);
        const officerCount = new Set(records.map((record) => record.name)).size;

        document.getElementById('averageScore').textContent = averageScore === null ? '--' : averageScore.toFixed(1);
        document.getElementById('averageNote').textContent = records.length
            ? `Across ${records.length} recorded ${records.length === 1 ? 'attempt' : 'attempts'}`
            : 'No matching score records';
        document.getElementById('topScore').textContent = topRecord ? String(topRecord.score) : '--';
        document.getElementById('topScoreNote').textContent = topRecord
            ? `${topRecord.name} · ${formatScoreDate(topRecord.date)}`
            : 'No matching score records';
        document.getElementById('attemptCount').textContent = String(records.length);
        document.getElementById('officerCount').textContent = `${officerCount} ${officerCount === 1 ? 'officer' : 'officers'} represented`;
        document.getElementById('recordCount').textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
    };

    // Scores use text nodes and DOM elements so officer data is never treated as markup.
    const renderPerformanceTable = (records) => {
        const sorters = {
            newest: (first, second) => second.date - first.date,
            oldest: (first, second) => first.date - second.date,
            'score-high': (first, second) => second.score - first.score || second.date - first.date,
            'score-low': (first, second) => first.score - second.score || second.date - first.date
        };
        const sortedRecords = [...records].sort(sorters[sortMode]);
        performanceRows.replaceChildren();

        if (!sortedRecords.length) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 6;
            emptyCell.className = 'table-empty';
            emptyCell.textContent = 'No qualification records match these filters.';
            emptyRow.append(emptyCell);
            performanceRows.append(emptyRow);
            return;
        }

        sortedRecords.forEach((record) => {
            const row = document.createElement('tr');
            const cells = [record.name, record.badge, record.qualification, formatScoreDate(record.date)];

            cells.forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.append(cell);
            });

            const scoreCell = document.createElement('td');
            scoreCell.className = 'text-end score-value';
            scoreCell.textContent = String(record.score);
            row.append(scoreCell);

            const standingCell = document.createElement('td');
            const standing = document.createElement('span');
            standing.className = `score-standing${record.score < 80 ? ' is-developing' : ''}`;
            standing.textContent = record.score >= 90 ? 'Excellent' : record.score >= 80 ? 'Qualified' : 'Developing';
            standingCell.append(standing);
            row.append(standingCell);
            performanceRows.append(row);
        });
    };

    // AI-generated (Claude): Officer standing table. The numbers are the controller's 12-month
    // stats (pistolStats / rifleStats / swatStats from GET /api/officers?today=...), so every
    // phone shows the same figures; only the name/badge search narrows the list.
    const renderOfficerStanding = () => {
        const standingRows = document.getElementById('standingRows');
        const query = performanceSearch.value.trim().toLocaleLowerCase();
        const officers = performanceOfficers.filter((officer) => (
            !query || `${officer?.Name || ''} ${officer?.BadgeNum ?? ''}`.toLocaleLowerCase().includes(query)
        ));
        document.getElementById('standingCount').textContent = `${officers.length} ${officers.length === 1 ? 'officer' : 'officers'}`;
        standingRows.replaceChildren();
        if (!officers.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 5;
            cell.className = 'table-empty';
            cell.textContent = 'No officers match.';
            row.append(cell);
            standingRows.append(row);
            return;
        }
        officers.forEach((officer) => {
            const row = document.createElement('tr');
            [officer.Name || 'Unknown officer', String(officer.BadgeNum ?? '—')].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.append(cell);
            });
            ['pistolStats', 'rifleStats', 'swatStats'].forEach((key) => {
                const stats = officer[key];
                const cell = document.createElement('td');
                cell.className = 'standing-cell';
                if (!stats || !stats.attempts) {
                    cell.textContent = '—';
                } else {
                    const average = document.createElement('span');
                    average.className = 'standing-average';
                    average.textContent = Number(stats.average).toFixed(1);
                    const detail = document.createElement('span');
                    detail.className = 'standing-detail';
                    detail.textContent = `top ${stats.top} · ${stats.attempts} ${stats.attempts === 1 ? 'attempt' : 'attempts'}`;
                    cell.append(average, detail);
                }
                row.append(cell);
            });
            standingRows.append(row);
        });
    };

    const renderPerformance = () => {
        const visibleRecords = getVisibleRecords();
        renderPerformanceSummary(visibleRecords);
        renderPerformanceTable(visibleRecords);
        renderOfficerStanding();

        const selectedQualifications = Array.from(qualificationFilters).filter((filter) => filter.checked).length;
        const hasOptionalFilters = Boolean(
            document.getElementById('minimumScore').value
            || document.getElementById('maximumScore').value
            || document.getElementById('startDate').value
            || document.getElementById('endDate').value
        );
        const activeFilterCount = (qualificationFilters.length - selectedQualifications) + Number(hasOptionalFilters);
        const filterCount = document.getElementById('filterCount');
        filterCount.hidden = activeFilterCount === 0;
        filterCount.textContent = String(activeFilterCount);
    };

    // Search updates immediately; filter fields update when changed or edited.
    performanceSearch.addEventListener('input', renderPerformance);
    qualificationFilters.forEach((filter) => filter.addEventListener('change', renderPerformance));
    ['minimumScore', 'maximumScore', 'startDate', 'endDate'].forEach((id) => {
        document.getElementById(id).addEventListener('input', renderPerformance);
        document.getElementById(id).addEventListener('change', renderPerformance);
    });

    document.getElementById('clearFiltersButton').addEventListener('click', () => {
        qualificationFilters.forEach((filter) => { filter.checked = true; });
        ['minimumScore', 'maximumScore', 'startDate', 'endDate'].forEach((id) => {
            document.getElementById(id).value = '';
        });
        renderPerformance();
    });

    // Apply the selected table order directly instead of cycling through options.
    sortSelect.addEventListener('change', () => {
        sortMode = sortSelect.value;
        renderPerformance();
    });

    // Browser print supports Save as PDF without a separate PDF-generation dependency.
    document.getElementById('exportPdfButton').addEventListener('click', () => window.print());

    // Add scores dialog: ported from Oviya's oviyaTest branch. AI-modified (Claude): scores are
    // saved on the controller (POST /api/officers/scores, one per score) instead of localStorage,
    // and the officer data is reloaded afterwards so they show up in Results.
    const addScoresToggle = document.getElementById('addScoresToggle');
    const addScoresDialog = document.getElementById('addScoresDialog');
    const addScoresForm = document.getElementById('addScoresForm');
    const addScoresError = document.getElementById('addScoresError');
    const scoreOfficerSelect = document.getElementById('scoreOfficer');
    const scoreEntries = document.getElementById('scoreEntries');
    const saveScoresButton = document.getElementById('saveScoresButton');

    const getTodayDate = () => {
        const today = new Date();
        return [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0')
        ].join('-');
    };
    scoreEntries.querySelector('.score-entry-date').value = getTodayDate();

    const showAddScoresError = (text) => {
        addScoresError.textContent = text;
        addScoresError.hidden = !text;
    };

    addScoresToggle.addEventListener('click', () => {
        showAddScoresError('');
        addScoresDialog.showModal();
        addScoresToggle.setAttribute('aria-expanded', 'true');
    });
    document.getElementById('closeScoresDialog').addEventListener('click', () => addScoresDialog.close());
    addScoresDialog.addEventListener('close', () => addScoresToggle.setAttribute('aria-expanded', 'false'));

    const updateScoreEntryLabels = () => {
        const entries = scoreEntries.querySelectorAll('.score-entry');
        entries.forEach((entry, index) => {
            const scoreNumber = index + 1;
            const scoreInput = entry.querySelector('.score-entry-value');
            const dateInput = entry.querySelector('.score-entry-date');
            const scoreLabel = entry.querySelector('.score-entry-label');
            scoreInput.id = `scoreValue${scoreNumber}`;
            scoreInput.setAttribute('aria-label', `Score ${scoreNumber}`);
            scoreLabel.htmlFor = scoreInput.id;
            scoreLabel.textContent = `Score ${scoreNumber}`;
            dateInput.id = `scoreDate${scoreNumber}`;
            dateInput.setAttribute('aria-label', `Date for score ${scoreNumber}`);
            const dateLabel = entry.querySelector('.visually-hidden');
            dateLabel.htmlFor = dateInput.id;
            dateLabel.textContent = `Date for score ${scoreNumber}`;
            const removeButton = entry.querySelector('.remove-score-entry');
            removeButton.disabled = entries.length === 1;
            removeButton.setAttribute('aria-label', `Remove score ${scoreNumber}`);
        });
    };
    updateScoreEntryLabels();

    document.getElementById('addScoreEntry').addEventListener('click', () => {
        const entry = scoreEntries.querySelector('.score-entry').cloneNode(true);
        entry.querySelector('.score-entry-value').value = '';
        entry.querySelector('.score-entry-date').value = getTodayDate();
        scoreEntries.append(entry);
        updateScoreEntryLabels();
        entry.querySelector('.score-entry-value').focus();
    });

    scoreEntries.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.remove-score-entry');
        const entry = removeButton?.closest('.score-entry');
        const entries = scoreEntries.querySelectorAll('.score-entry');
        if (!entry || entries.length <= 1) return;
        entry.remove();
        updateScoreEntryLabels();
    });

    const resetAddScoresForm = () => {
        addScoresForm.reset();
        scoreOfficerSelect.value = '';
        scoreEntries.querySelectorAll('.score-entry:not(:first-child)').forEach((entry) => entry.remove());
        scoreEntries.querySelector('.score-entry-date').value = getTodayDate();
        updateScoreEntryLabels();
        showAddScoresError('');
    };

    addScoresForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const badgeNum = Number(scoreOfficerSelect.value);
        const officer = performanceOfficers.find((candidate) => Number(candidate?.BadgeNum) === badgeNum);
        if (!scoreOfficerSelect.value || !officer) {
            showAddScoresError('Select an officer.');
            return;
        }
        const qualType = document.getElementById('scoreQualification').value;
        const scores = Array.from(scoreEntries.querySelectorAll('.score-entry'), (entry) => ({
            score: entry.querySelector('.score-entry-value').value.trim(),
            date: entry.querySelector('.score-entry-date').value
        }));
        const badRow = scores.findIndex(({ score, date }) => (
            !/^\d+$/.test(score) || !/^\d{4}-\d{2}-\d{2}$/.test(date)
        ));
        if (badRow !== -1) {
            showAddScoresError(`Score ${badRow + 1} needs a whole-number score and a date.`);
            return;
        }

        saveScoresButton.disabled = true;
        showAddScoresError('');
        let saved = 0;
        try {
            // One at a time, so a refusal tells us exactly which ones were stored
            for (const { score, date } of scores) {
                await postToController('/api/officers/scores', { BadgeNum: badgeNum, qualType, score: Number(score), date });
                saved += 1;
            }
        } catch (error) {
            showAddScoresError(saved
                ? `${saved} of ${scores.length} scores were saved; score ${saved + 1} was not: ${error.message} Remove the saved rows before trying again.`
                : error.message);
            saveScoresButton.disabled = false;
            loadPerformanceData();
            return;
        }

        const officerName = officer.Name || 'the officer';
        resetAddScoresForm();
        addScoresDialog.close();
        await loadPerformanceData();
        performanceMessage.hidden = false;
        performanceMessage.classList.remove('is-error');
        performanceMessage.textContent = `${saved} ${saved === 1 ? 'score' : 'scores'} saved for ${officerName}.`;
    });

    // AI-modified (Claude): loading is a function so it can run again after scores are added.
    // Also fills the Add scores officer list (value = badge number). Officers come from the
    // controller's API (GET /api/officers?today=...), which adds Isaac's 12-month stats; the ESP32
    // has no clock, so this phone supplies today's date.
    const loadPerformanceData = () => controllerFetch(`/api/officers?today=${localDateString()}`, { cache: 'no-store' })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Unable to load qualification records.');
            }
            return response.json();
        })
        .then((payload) => {
            performanceOfficers = Array.isArray(payload) ? payload : [];

            if (!performanceOfficers.length) {
                performanceMessage.hidden = false;
                performanceMessage.textContent = 'No officer records were found in the database.';
            }
            const selectedBadge = scoreOfficerSelect.value;
            scoreOfficerSelect.replaceChildren(
                new Option('Select an officer', ''),
                ...performanceOfficers
                    .filter((officer) => Number.isInteger(Number(officer?.BadgeNum)))
                    .map((officer) => new Option(
                        `${officer?.Name || 'Unknown officer'} · Badge ${officer.BadgeNum}`,
                        String(officer.BadgeNum)
                    ))
            );
            scoreOfficerSelect.value = selectedBadge;
            saveScoresButton.disabled = !performanceOfficers.length;
            renderPerformance();
        })
        .catch(() => {
            performanceMessage.hidden = false;
            performanceMessage.classList.add('is-error');
            performanceMessage.textContent = 'Qualification data could not be loaded. Check the connection and try again.';
            renderPerformance();
        });

    loadPerformanceData();
}

// Drills live on the controller (database.json in
// flash, so they survive a power cycle) and are read and changed through /api/drills. New and
// edited drills are built with the drag-and-drop sequence builder: Present / Delay / Hide /
// Pause / Run drill blocks. A Present or Hide step moves "All targets" (every target chosen when the drill is
// started) or a custom list; a Delay is in seconds (decimals allowed, stored as whole ms).
// Run drill blocks reference saved drills by name, including repeated uses of the same drill.
if (document.getElementById('drillList')) {
    const drillList = document.getElementById('drillList');
    const drillListMessage = document.getElementById('drillListMessage');
    const editorModalElement = document.getElementById('drillEditorModal');
    const editorModal = bootstrap.Modal.getOrCreateInstance(editorModalElement);
    const editorForm = document.getElementById('drillEditorForm');
    const editorTitle = document.getElementById('drillEditorTitle');
    const editorError = document.getElementById('drillEditorError');
    const nameInput = document.getElementById('drillEditorName');
    const palette = document.getElementById('blockPalette');
    const sequenceList = document.getElementById('sequenceList');
    const sequenceSummary = document.getElementById('sequenceSummary');
    const saveButton = document.getElementById('drillEditorSave');
    const deleteModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteDrillModal'));
    const deleteDrillName = document.getElementById('deleteDrillName');
    const targetCount = 20; // NUM_TARGETS in hal.h
    let drills = [];              // [{drillName, sequence}] as stored on the controller
    let editingName = null;       // name of the drill being edited; null while creating one
    let pendingDeleteName = null;
    let activeDrillFilter = 'all';
    let blockCounter = 0;         // makes each block's input ids unique

    const blockInfo = {
        present: { title: 'Present', icon: 'bi-eye-fill' },
        delay: { title: 'Delay', icon: 'bi-stopwatch' },
        hide: { title: 'Hide', icon: 'bi-eye-slash-fill' },
        pause: { title: 'Pause', icon: 'bi-pause-circle' }
    };

    const showListMessage = (text, kind = 'warning') => {
        drillListMessage.className = `alert alert-${kind} mb-4`;
        drillListMessage.textContent = text;
        drillListMessage.hidden = !text;
    };

    const showEditorError = (text) => {
        editorError.textContent = text;
        editorError.hidden = !text;
    };

    // ------------------------------------------------------------------ building blocks
    const targetPickerHtml = (uid, selected) => `
        <div class="target-quick-select" data-target-list="${uid}-targets" role="group" aria-label="Quick select targets">
            <button type="button" class="btn btn-sm btn-outline-primary" data-select="all">All</button>
            <button type="button" class="btn btn-sm btn-outline-primary" data-select="odd">Odd</button>
            <button type="button" class="btn btn-sm btn-outline-primary" data-select="even">Even</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-select="none">Clear</button>
        </div>
        <div class="target-options seq-target-options" id="${uid}-targets" role="group" aria-label="Targets for this step">
            ${Array.from({ length: targetCount }, (_, index) => `
                <label class="target-option">
                    <input class="form-check-input" type="checkbox" value="${index + 1}"${selected.has(index + 1) ? ' checked' : ''}>
                    <span>${index + 1}</span>
                </label>`).join('')}
        </div>`;

    // One <li> per step. step is a database step ({action, timeMs?, targets?}).
    const createBlock = (step) => {
        const action = String(step?.action || '');
        const isBasic = Object.hasOwn(blockInfo, action);
        const info = isBasic ? blockInfo[action] : { title: 'Run drill', icon: 'bi-collection' };
        const uid = `seq${blockCounter += 1}`;
        const block = document.createElement('li');
        block.className = `seq-block seq-block--${isBasic ? action : 'drill'}`;
        block.dataset.action = action;

        block.innerHTML = `
            <div class="seq-block-head">
                <span class="seq-handle" title="Drag to reorder" aria-hidden="true"><i class="bi bi-grip-vertical"></i></span>
                <span class="seq-step-number"></span>
                <i class="bi ${info.icon} seq-block-icon" aria-hidden="true"></i>
                <span class="seq-block-title"></span>
                <span class="seq-block-tools">
                    <button type="button" class="btn btn-sm btn-light seq-move" data-move="up"><i class="bi bi-arrow-up" aria-hidden="true"></i></button>
                    <button type="button" class="btn btn-sm btn-light seq-move" data-move="down"><i class="bi bi-arrow-down" aria-hidden="true"></i></button>
                    <button type="button" class="btn btn-sm btn-light seq-remove"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
                </span>
            </div>
            <div class="seq-block-body"></div>`;
        block.querySelector('.seq-block-title').textContent = info.title;
        const body = block.querySelector('.seq-block-body');

        if (action === 'present' || action === 'hide') {
            // Present also offers Random: that many targets, picked by the
            // controller each time the step runs ("random": n)
            const chosen = new Set((Array.isArray(step.targets) ? step.targets : []).map(Number));
            const randomCount = action === 'present' && Number(step.random) > 0 ? Number(step.random) : 0;
            const mode = randomCount ? 'random' : chosen.size > 0 ? 'custom' : 'all';
            const modeOption = (value, label) => `
                    <label class="form-check form-check-inline mb-0">
                        <input class="form-check-input" type="radio" name="${uid}-mode" value="${value}"${mode === value ? ' checked' : ''}>
                        <span class="form-check-label">${label}</span>
                    </label>`;
            body.innerHTML = `
                <div class="seq-target-mode">
                    ${modeOption('all', 'All targets')}
                    ${modeOption('custom', 'Custom')}
                    ${action === 'present' ? modeOption('random', 'Random') : ''}
                </div>
                <div class="seq-custom-targets"${mode === 'custom' ? '' : ' hidden'}>${targetPickerHtml(uid, chosen)}</div>
                ${action === 'present' ? `
                <div class="seq-random"${mode === 'random' ? '' : ' hidden'}>
                    <label class="form-label small mb-1" for="${uid}-random">How many random targets</label>
                    <div class="input-group input-group-sm seq-random-count">
                        <input class="form-control seq-random-input" type="number" id="${uid}-random" min="1" max="${targetCount}" step="1" inputmode="numeric" value="${randomCount || 3}">
                        <span class="input-group-text">targets</span>
                    </div>
                    <p class="seq-block-note mt-1">Picked from the targets the drill is started on, fresh each time this step runs.</p>
                </div>` : ''}`;
            body.addEventListener('change', (event) => {
                if (event.target.name === `${uid}-mode`) {
                    body.querySelector('.seq-custom-targets').hidden = event.target.value !== 'custom';
                    const random = body.querySelector('.seq-random');
                    if (random) random.hidden = event.target.value !== 'random';
                }
            });
        } else if (action === 'delay') {
            const seconds = Number(step.timeMs) > 0 ? Number(step.timeMs) / 1000 : 3;
            body.innerHTML = `
                <div class="input-group input-group-sm seq-delay">
                    <input class="form-control seq-delay-input" type="number" id="${uid}-seconds" min="0.01" max="3600" step="0.01" inputmode="decimal" value="${seconds}" aria-label="Delay in seconds">
                    <span class="input-group-text">seconds</span>
                </div>`;
        } else if (action === 'pause') {
            body.innerHTML = '<p class="seq-block-note">Waits until the operator presses Resume.</p>';
        } else {
            body.innerHTML = `
                <label class="form-label small mb-1" for="${uid}-drill">Saved drill</label>
                <select class="form-select form-select-sm seq-drill-select" id="${uid}-drill"></select>
                <p class="seq-block-note mt-2">Runs the saved drill each time this step is reached. Changes to that drill also apply here.</p>`;
            const select = body.querySelector('.seq-drill-select');
            const choices = drills.filter((drill) => drill.drillName !== editingName);
            select.append(new Option(choices.length ? 'Select a saved drill' : 'No other saved drills', ''));
            choices.forEach((drill) => select.append(new Option(drill.drillName, drill.drillName)));
            // Preserve a broken reference so Save reports it rather than silently replacing it.
            if (action && !choices.some((drill) => drill.drillName === action)) {
                const unavailable = new Option(`Unavailable drill: ${action}`, action);
                unavailable.disabled = true;
                select.append(unavailable);
            }
            select.value = action;
            select.addEventListener('change', () => { block.dataset.action = select.value; });
        }
        return block;
    };

    const defaultStep = (type) => type === 'run-drill'
        ? { action: '' }
        : type === 'delay' ? { action: 'delay', timeMs: 3000 } : { action: type };

    // Check references using the pending sequence, including saved parents that reuse this drill.
    const validateRunDrills = (name, steps) => {
        const savedName = editingName ?? name;
        const sequences = new Map(drills.map((drill) => [drill.drillName, drill.sequence]));
        sequences.set(savedName, steps);
        const affected = new Set([savedName]);
        for (const child of affected) {
            for (const [parent, sequence] of sequences) {
                if (sequence?.some((step) => step.action === child)) affected.add(parent);
            }
        }
        const check = (drillName, path = []) => {
            if (path.includes(drillName)) {
                return `Run drill blocks cannot create a loop: ${[...path, drillName].join(' → ')}.`;
            }
            if (path.length >= maxDrillNesting) {
                return `Including "${drillName}" would exceed the ${maxDrillNesting}-level drill nesting limit.`;
            }
            const sequence = sequences.get(drillName);
            if (!sequence?.length) return `Saved drill "${drillName}" is missing or empty.`;
            for (const step of sequence) {
                if (basicDrillActions.has(step.action)) continue;
                const error = check(step.action, [...path, drillName]);
                if (error) return error;
            }
            return '';
        };
        for (const drillName of affected) {
            const error = check(drillName);
            if (error) return error;
        }
        return '';
    };

    // Step numbers, move-button state, and the summary line under the sequence.
    const refreshSequence = () => {
        const blocks = Array.from(sequenceList.querySelectorAll(':scope > .seq-block'));
        let delaySeconds = 0;
        blocks.forEach((block, index) => {
            const title = block.querySelector('.seq-block-title').textContent;
            block.querySelector('.seq-step-number').textContent = String(index + 1);
            const [up, down] = block.querySelectorAll('.seq-move');
            up.disabled = index === 0;
            down.disabled = index === blocks.length - 1;
            up.setAttribute('aria-label', `Move step ${index + 1} (${title}) up`);
            down.setAttribute('aria-label', `Move step ${index + 1} (${title}) down`);
            block.querySelector('.seq-remove').setAttribute('aria-label', `Remove step ${index + 1} (${title})`);
            const seconds = Number(block.querySelector('.seq-delay-input')?.value);
            if (seconds > 0) delaySeconds += seconds;
        });
        sequenceSummary.textContent = blocks.length
            ? `${blocks.length} ${blocks.length === 1 ? 'step' : 'steps'} · ${Number(delaySeconds.toFixed(2))} s of delay`
            : '';
    };

    const addBlock = (type) => {
        const block = createBlock(defaultStep(type));
        sequenceList.append(block);
        refreshSequence();
        block.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    // Turns the blocks back into database steps, or reports the first problem.
    const readSequence = () => {
        const blocks = Array.from(sequenceList.querySelectorAll(':scope > .seq-block'));
        if (!blocks.length) return { error: 'Add at least one block to the sequence.' };
        const steps = [];
        for (const [index, block] of blocks.entries()) {
            const action = block.querySelector('.seq-drill-select')?.value ?? block.dataset.action;
            const label = `Step ${index + 1} (${block.querySelector('.seq-block-title').textContent})`;
            const step = { step: index + 1, action };
            if (action === 'present' || action === 'hide') {
                const mode = block.querySelector('input[type="radio"]:checked')?.value;
                if (mode === 'random') {
                    // Whole number from 1 to the number of targets
                    const count = Number(block.querySelector('.seq-random-input').value);
                    if (!Number.isInteger(count) || count < 1 || count > targetCount) {
                        return { error: `${label}: enter how many random targets, from 1 to ${targetCount}.`, block };
                    }
                    step.random = count;
                } else if (mode === 'custom') {
                    const targets = Array.from(
                        block.querySelectorAll('.seq-target-options input:checked'),
                        (box) => Number(box.value)
                    );
                    if (!targets.length) {
                        return { error: `${label}: check at least one target, or choose All targets.`, block };
                    }
                    step.targets = targets;
                }
            } else if (action === 'delay') {
                const seconds = Number(block.querySelector('.seq-delay-input').value);
                const timeMs = Math.round(seconds * 1000);
                if (!Number.isFinite(seconds) || timeMs < 1 || seconds > 3600) {
                    return { error: `${label}: enter a time between 0.01 and 3600 seconds.`, block };
                }
                step.timeMs = timeMs;
            } else if (!basicDrillActions.has(action)) {
                if (!action || !drills.some((drill) => drill.drillName === action)) {
                    return { error: `${label}: select an existing saved drill.`, block };
                }
            }
            steps.push(step);
        }
        return { steps };
    };

    // ------------------------------------------------------------------ editor wiring
    palette.addEventListener('click', (event) => {
        const paletteBlock = event.target.closest('[data-block]');
        if (paletteBlock) addBlock(paletteBlock.dataset.block);
    });

    sequenceList.addEventListener('click', (event) => {
        const block = event.target.closest('.seq-block');
        if (!block) return;
        const move = event.target.closest('.seq-move');
        if (move) {
            const sibling = move.dataset.move === 'up' ? block.previousElementSibling : block.nextElementSibling;
            if (sibling) {
                if (move.dataset.move === 'up') sibling.before(block);
                else sibling.after(block);
                refreshSequence();
                move.focus();
            }
            return;
        }
        if (event.target.closest('.seq-remove')) {
            block.remove();
            refreshSequence();
        }
    });

    sequenceList.addEventListener('input', (event) => {
        event.target.closest('.seq-block')?.classList.remove('is-invalid');
        refreshSequence();
    });
    sequenceList.addEventListener('change', (event) => {
        event.target.closest('.seq-block')?.classList.remove('is-invalid');
    });
    // The shared All/Odd/Even/Clear handler changes boxes without a change event
    sequenceList.addEventListener('click', (event) => {
        if (event.target.closest('.target-quick-select')) {
            event.target.closest('.seq-block')?.classList.remove('is-invalid');
        }
    });

    // Drag from the palette (copies a block) and drag to reorder (by the grip handle). The
    // palette waits briefly on touch so a quick tap still counts as "add to the end".
    if (typeof Sortable !== 'undefined') {
        Sortable.create(palette, {
            group: { name: 'drill-steps', pull: 'clone', put: false },
            sort: false,
            animation: 150,
            // Keep palette copies draggable in embedded browsers and on touchscreens.
            forceFallback: true,
            fallbackOnBody: true,
            fallbackTolerance: 4,
            delay: 150,
            delayOnTouchOnly: true,
            draggable: '[data-block]'
        });
        Sortable.create(sequenceList, {
            group: { name: 'drill-steps', pull: false, put: true },
            handle: '.seq-handle',
            draggable: '.seq-block',
            animation: 150,
            onAdd: (event) => {
                // The dropped palette button becomes a real block
                const block = createBlock(defaultStep(event.item.dataset.block));
                event.item.replaceWith(block);
                refreshSequence();
            },
            onSort: refreshSequence
        });
    }

    const openEditor = (drill) => {
        editingName = drill ? drill.drillName : null;
        editorTitle.textContent = drill ? `Edit ${drill.drillName}` : 'New drill';
        nameInput.value = drill ? drill.drillName : '';
        sequenceList.replaceChildren(...(Array.isArray(drill?.sequence) ? drill.sequence : []).map(createBlock));
        showEditorError('');
        refreshSequence();
        editorModal.show();
    };

    document.getElementById('createDrillButton').addEventListener('click', () => openEditor(null));
    editorModalElement.addEventListener('shown.bs.modal', () => {
        if (!editingName) nameInput.focus();
    });

    editorForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();
        if (!name) {
            showEditorError('Enter a name for the drill.');
            nameInput.focus();
            return;
        }
        if (basicDrillActions.has(name)) {
            showEditorError(`"${name}" is a step name and can't be used as a drill name.`);
            return;
        }
        if (drills.some((drill) => drill.drillName === name && drill.drillName !== editingName)) {
            showEditorError(`A drill named "${name}" already exists.`);
            return;
        }
        const { steps, error, block } = readSequence();
        if (error) {
            showEditorError(error);
            block?.classList.add('is-invalid');
            block?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return;
        }

        const nestingError = validateRunDrills(name, steps);
        if (nestingError) {
            showEditorError(nestingError);
            editorError.scrollIntoView({ block: 'nearest' });
            return;
        }

        saveButton.disabled = true;
        try {
            if (editingName === null) {
                await postToController('/api/drills', { drillName: name, sequence: steps });
            } else {
                // Isaac's rename: a new drillName also updates full drills that include this one
                await postToController(`/api/drills?name=${encodeURIComponent(editingName)}`, { drillName: name, sequence: steps }, 'PUT');
            }
            editorModal.hide();
            showListMessage(`${name} saved.`, 'success');
            await loadDrills();
        } catch (saveError) {
            showEditorError(saveError.message);
        }
        saveButton.disabled = false;
    });

    // ------------------------------------------------------------------ drill list
    const describeDrill = (drill) => {
        const sequence = Array.isArray(drill.sequence) ? drill.sequence : [];
        const stages = sequence.filter((step) => !basicDrillActions.has(step?.action)).length;
        const delayMs = sequence
            .filter((step) => step?.action === 'delay')
            .reduce((total, step) => total + (Number(step.timeMs) || 0), 0);
        return { steps: sequence.length, stages, delaySeconds: Number((delayMs / 1000).toFixed(2)) };
    };

    const renderDrills = () => {
        const visible = drills.filter((drill) => (
            activeDrillFilter === 'all' || getDrillCategory(null, drill) === activeDrillFilter
        ));
        if (!visible.length) {
            const column = document.createElement('div');
            column.className = 'col-12';
            column.innerHTML = '<div class="alert alert-info mb-0"></div>';
            column.firstChild.textContent = drills.length ? 'No drills match this filter.' : 'No drills yet. Tap Create Drill to build one.';
            drillList.replaceChildren(column);
            return;
        }
        drillList.replaceChildren(...visible.map((drill) => {
            const { steps, stages, delaySeconds } = describeDrill(drill);
            const full = isFullDrill(drill);
            const category = getDrillCategory(null, drill);
            const column = document.createElement('div');
            column.className = 'col';
            column.innerHTML = `
                <article class="drill-ticket h-100">
                    <div class="drill-ticket-heading">
                        <span class="drill-ticket-label">${{ full: 'Full drill', custom: 'Custom', stages: 'Stage' }[category]}</span>
                        <i class="bi ${full ? 'bi-collection' : 'bi-crosshair'} text-primary" aria-hidden="true"></i>
                    </div>
                    <h2 class="h4 mb-4 drill-ticket-name"></h2>
                    <dl class="drill-details">
                        <div><dt>${full ? 'Stages' : 'Steps'}</dt><dd>${full ? stages : steps}</dd></div>
                        <div><dt>Delay time</dt><dd>${full ? 'set by its stages' : `${delaySeconds} s`}</dd></div>
                    </dl>
                    <div class="drill-actions">
                        <button class="btn btn-secondary" type="button" data-drill-action="edit"><i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit</button>
                        <button class="btn btn-danger" type="button" data-drill-action="delete"><i class="bi bi-trash3 me-1" aria-hidden="true"></i>Delete</button>
                    </div>
                </article>`;
            column.querySelector('.drill-ticket-name').textContent = drill.drillName;
            column.querySelector('[data-drill-action="edit"]').addEventListener('click', () => openEditor(drill));
            column.querySelector('[data-drill-action="delete"]').addEventListener('click', () => {
                // The controller refuses to delete a stage a full drill still uses; say which one
                const usedBy = drills
                    .filter((other) => (Array.isArray(other.sequence) ? other.sequence : []).some((step) => step?.action === drill.drillName))
                    .map((other) => other.drillName);
                if (usedBy.length) {
                    showListMessage(`${drill.drillName} is part of ${usedBy.join(', ')}. Remove it from there first.`);
                    return;
                }
                pendingDeleteName = drill.drillName;
                deleteDrillName.textContent = drill.drillName;
                deleteModal.show();
            });
            return column;
        }));
    };

    const loadDrills = async () => {
        try {
            const response = await controllerFetch('/api/drills', { cache: 'no-store' });
            if (!response.ok) throw new Error('bad response');
            const payload = await response.json();
            drills = (Array.isArray(payload) ? payload : [])
                .filter((drill) => typeof drill?.drillName === 'string' && drill.drillName.trim());
        } catch {
            drills = [];
            showListMessage('Could not load drills from the controller. Check that you are on the CPD Range Control WiFi.', 'danger');
        }
        renderDrills();
    };

    document.getElementById('confirmDeleteDrillButton').addEventListener('click', async () => {
        const name = pendingDeleteName;
        deleteModal.hide();
        if (!name) return;
        try {
            await postToController(`/api/drills?name=${encodeURIComponent(name)}`, undefined, 'DELETE');
            showListMessage(`${name} deleted.`, 'success');
        } catch (error) {
            showListMessage(error.message, 'danger');
        }
        pendingDeleteName = null;
        loadDrills();
    });

    // All / Full drills / Custom / Stages filter buttons
    document.querySelectorAll('.drill-filter').forEach((button) => {
        button.addEventListener('click', () => {
            activeDrillFilter = button.dataset.drillFilter;
            document.querySelectorAll('.drill-filter').forEach((other) => {
                const isActive = other === button;
                other.classList.toggle('active', isActive);
                other.setAttribute('aria-pressed', String(isActive));
            });
            renderDrills();
        });
    });

    loadDrills();
}

// AI-generated (Claude): Settings page (settings.html).
// Drill start delay: saved on this phone as soon as it changes.
const startDelayForm = document.getElementById('startDelayForm');
if (startDelayForm) {
    const secondsInput = document.getElementById('startDelaySeconds');
    const savedNote = document.getElementById('startDelaySaved');
    const setting = getStartDelaySetting();
    startDelayForm.querySelector(`input[name="startDelayMode"][value="${setting.mode}"]`).checked = true;
    secondsInput.value = setting.seconds;
    let savedNoteTimer;

    const saveStartDelay = () => {
        const mode = startDelayForm.querySelector('input[name="startDelayMode"]:checked')?.value || 'fixed';
        const seconds = Math.min(30, Math.max(1, Math.round(Number(secondsInput.value)) || 3));
        secondsInput.value = seconds;
        try {
            localStorage.setItem(startDelayStorageKey, JSON.stringify({ mode, seconds }));
        } catch {
            return; // storage blocked: nothing was saved, so don't say it was
        }
        savedNote.hidden = false;
        clearTimeout(savedNoteTimer);
        savedNoteTimer = setTimeout(() => { savedNote.hidden = true; }, 2000);
    };

    // Typing a number picks "Set time".
    secondsInput.addEventListener('focus', () => { document.getElementById('startDelayFixed').checked = true; });
    startDelayForm.addEventListener('change', saveStartDelay);
    startDelayForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Enter in the seconds box
        saveStartDelay();
    });
}

// WiFi password: sent to the controller, which restarts the access point about a second later.
const wifiPasswordForm = document.getElementById('wifiPasswordForm');
if (wifiPasswordForm) {
    const currentInput = document.getElementById('wifiCurrentPassword');
    const newInput = document.getElementById('wifiNewPassword');
    const confirmInput = document.getElementById('wifiConfirmPassword');
    const showPasswords = document.getElementById('wifiShowPasswords');
    const message = document.getElementById('wifiPasswordMessage');
    const submitButton = document.getElementById('wifiPasswordSubmit');
    const passwordInputs = [currentInput, newInput, confirmInput];

    const showWifiMessage = (text, kind) => {
        message.textContent = text;
        message.className = `alert py-2 alert-${kind}`;
        message.hidden = false;
    };

    showPasswords.addEventListener('change', () => {
        passwordInputs.forEach((input) => { input.type = showPasswords.checked ? 'text' : 'password'; });
    });

    wifiPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newPassword = newInput.value;
        if (!currentInput.value) {
            showWifiMessage('Enter the current password.', 'danger');
            return;
        }
        if (newPassword.length < 8 || newPassword.length > 63) {
            showWifiMessage('The new password must be 8 to 63 characters.', 'danger');
            return;
        }
        if (!/^[\x20-\x7E]+$/.test(newPassword)) {
            showWifiMessage('Use only letters, numbers, spaces and standard symbols (no accents or emoji).', 'danger');
            return;
        }
        if (newPassword !== confirmInput.value) {
            showWifiMessage('The new passwords do not match.', 'danger');
            return;
        }

        submitButton.disabled = true;
        try {
            await postToController('/api/wifi/password', { currentPassword: currentInput.value, newPassword });
            wifiPasswordForm.reset();
            passwordInputs.forEach((input) => { input.type = 'password'; });
            showWifiMessage('Password changed. The WiFi restarts in a moment: rejoin "CPD Range Control" with the new password.', 'success');
        } catch (error) {
            showWifiMessage(error.message, 'danger');
        }
        submitButton.disabled = false;
    });
}

// AI-generated (Claude): Settings > Defective targets. Each box is the controller's "working"
// flag (checked = defective) in database.json, so it applies to every phone; drills and manual
// control skip defective targets and the Targets page shows them grey. Saved on every change.
const defectiveTargetList = document.getElementById('defectiveTargetList');
if (defectiveTargetList) {
    const defectMessage = document.getElementById('defectiveTargetsMessage');
    const showDefectMessage = (text, ok) => {
        defectMessage.textContent = text;
        defectMessage.className = `small mt-3 mb-0 ${ok ? 'text-success' : 'text-danger'}`;
        defectMessage.hidden = false;
    };

    const loadDefectiveTargets = async () => {
        try {
            const response = await controllerFetch('/api/targets', { cache: 'no-store' });
            if (!response.ok) throw new Error('bad response');
            const targets = (await response.json() || [])
                .filter((target) => Number.isInteger(Number(target?.id)))
                .sort((first, second) => Number(first.id) - Number(second.id));
            if (!targets.length) {
                defectiveTargetList.textContent = 'No targets found on the controller.';
                return;
            }
            defectiveTargetList.replaceChildren(...targets.map((target) => {
                const wrapper = document.createElement('label');
                wrapper.className = 'target-option';
                const input = document.createElement('input');
                input.className = 'form-check-input';
                input.type = 'checkbox';
                input.value = String(target.id);
                input.checked = target.working === false;
                const text = document.createElement('span');
                text.textContent = `Target ${target.id}`;
                wrapper.append(input, text);
                return wrapper;
            }));
        } catch {
            defectiveTargetList.textContent = 'Could not load targets from the controller. Check that you are on the CPD Range Control WiFi.';
        }
    };

    defectiveTargetList.addEventListener('change', async (event) => {
        const box = event.target.closest('input[type="checkbox"]');
        if (!box) return;
        box.disabled = true;
        try {
            await postToController(`/api/targets?id=${box.value}`, { working: !box.checked }, 'PUT');
            showDefectMessage(`Target ${box.value} marked ${box.checked ? 'defective' : 'working'}.`, true);
        } catch (error) {
            box.checked = !box.checked; // the controller didn't save it, so show what it still has
            showDefectMessage(error.message, false);
        }
        box.disabled = false;
    });

    loadDefectiveTargets();
}

// AI-generated (Claude): Settings > Officers. Add, rename and delete officers on the controller
// (POST / PUT / DELETE /api/officers). Deleting also deletes the officer's scores, so it asks.
const officerList = document.getElementById('officerList');
if (officerList) {
    const officersMessage = document.getElementById('officersMessage');
    const addOfficerForm = document.getElementById('addOfficerForm');
    const nameInput = document.getElementById('newOfficerName');
    const badgeInput = document.getElementById('newOfficerBadge');
    const deleteModalElement = document.getElementById('deleteOfficerModal');
    const deleteModal = typeof bootstrap === 'undefined' ? null : bootstrap.Modal.getOrCreateInstance(deleteModalElement);
    let pendingDeleteBadge = null;

    const showOfficersMessage = (text, ok) => {
        officersMessage.textContent = text;
        officersMessage.className = `small mt-3 mb-0 ${ok ? 'text-success' : 'text-danger'}`;
        officersMessage.hidden = false;
    };

    const button = (label, className, icon) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = `btn btn-sm ${className}`;
        element.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i> `;
        element.append(label);
        return element;
    };

    // One row per officer; Rename swaps the name for an input with Save / Cancel.
    const renderOfficerRow = (officer) => {
        const row = document.createElement('li');
        row.className = 'officer-row';
        const name = document.createElement('span');
        name.className = 'officer-row-name';
        name.textContent = officer.Name || 'Unnamed officer';
        const badge = document.createElement('span');
        badge.className = 'officer-row-badge';
        badge.textContent = `Badge ${officer.BadgeNum}`;
        const renameButton = button('Rename', 'btn-outline-secondary', 'bi-pencil');
        const deleteButton = button('Delete', 'btn-outline-danger', 'bi-trash3');
        renameButton.setAttribute('aria-label', `Rename ${officer.Name}`);
        deleteButton.setAttribute('aria-label', `Delete ${officer.Name}`);
        row.append(name, badge, renameButton, deleteButton);

        renameButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.className = 'form-control form-control-sm';
            input.value = officer.Name || '';
            input.maxLength = 60;
            input.setAttribute('aria-label', `New name for badge ${officer.BadgeNum}`);
            const saveButton = button('Save', 'btn-primary', 'bi-check-lg');
            const cancelButton = button('Cancel', 'btn-outline-secondary', 'bi-x-lg');
            row.replaceChildren(input, badge, saveButton, cancelButton);
            input.focus();

            const save = async () => {
                const newName = input.value.trim();
                if (!newName) {
                    showOfficersMessage('Enter a name.', false);
                    return;
                }
                saveButton.disabled = true;
                try {
                    await postToController(`/api/officers?badge=${officer.BadgeNum}`, { Name: newName }, 'PUT');
                    showOfficersMessage(`Renamed to ${newName}.`, true);
                    loadOfficers();
                } catch (error) {
                    showOfficersMessage(error.message, false);
                    saveButton.disabled = false;
                }
            };
            saveButton.addEventListener('click', save);
            cancelButton.addEventListener('click', () => loadOfficers());
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') save();
                if (event.key === 'Escape') loadOfficers();
            });
        });

        deleteButton.addEventListener('click', () => {
            pendingDeleteBadge = officer.BadgeNum;
            document.getElementById('deleteOfficerName').textContent = `${officer.Name} (badge ${officer.BadgeNum})`;
            deleteModal?.show();
        });
        return row;
    };

    const loadOfficers = async () => {
        try {
            const response = await controllerFetch(`/api/officers?today=${localDateString()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('bad response');
            const officers = (await response.json() || [])
                .filter((officer) => Number.isInteger(Number(officer?.BadgeNum)))
                .sort((first, second) => String(first.Name).localeCompare(String(second.Name)));
            if (!officers.length) {
                const empty = document.createElement('li');
                empty.className = 'small text-secondary';
                empty.textContent = 'No officers yet. Add one below.';
                officerList.replaceChildren(empty);
                return;
            }
            officerList.replaceChildren(...officers.map(renderOfficerRow));
        } catch {
            const failed = document.createElement('li');
            failed.className = 'small text-danger';
            failed.textContent = 'Could not load officers from the controller. Check that you are on the CPD Range Control WiFi.';
            officerList.replaceChildren(failed);
        }
    };

    document.getElementById('confirmDeleteOfficerButton').addEventListener('click', async () => {
        const badge = pendingDeleteBadge;
        deleteModal?.hide();
        if (badge === null) return;
        try {
            await postToController(`/api/officers?badge=${badge}`, undefined, 'DELETE');
            showOfficersMessage(`Officer with badge ${badge} deleted.`, true);
        } catch (error) {
            showOfficersMessage(error.message, false);
        }
        pendingDeleteBadge = null;
        loadOfficers();
    });

    addOfficerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();
        const badge = Number(badgeInput.value);
        if (!name || !Number.isInteger(badge) || badge < 1) {
            showOfficersMessage('Enter a name and a whole-number badge number.', false);
            return;
        }
        try {
            await postToController('/api/officers', { Name: name, BadgeNum: badge });
            showOfficersMessage(`${name} added.`, true);
            addOfficerForm.reset();
            nameInput.focus();
            loadOfficers();
        } catch (error) {
            showOfficersMessage(error.message, false);
        }
    });

    loadOfficers();
}

// Shared, offline help for the four controller pages.
if (drillStatus && typeof bootstrap !== 'undefined') {
    const help = document.createElement('div');
    help.innerHTML = `
        <button type="button" class="btn btn-light border rounded-circle shadow-sm help-button"
            data-bs-toggle="modal" data-bs-target="#helpModal" aria-controls="helpModal"
            aria-haspopup="dialog" aria-label="Help and Q&A" title="Help and Q&A">
            <span aria-hidden="true">?</span>
        </button>
        <div class="modal fade" id="helpModal" tabindex="-1" aria-labelledby="helpModalTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title fs-5" id="helpModalTitle">Help &amp; Q&amp;A</h2>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close help"></button>
                    </div>
                    <div class="modal-body">
                        <h3 class="h6">How do I start a drill?</h3>
                        <p>On Targets, exit manual mode, select a drill, and press Start drill. Choose the targets if asked, then wait for the start countdown.</p>
                        <h3 class="h6">How do Pause and Reset stage work?</h3>
                        <p>Pause holds the drill until Resume. In a full drill, Pause then Reset stage hides the drill targets and rewinds the current stage. Press Resume to replay it. Reset stage is unavailable for standalone drills.</p>
                        <h3 class="h6">How do I build a sequence?</h3>
                        <p>On Drills, choose Create Drill or Edit. Drag blocks into the sequence, or tap to add them at the end. Use Run drill to include a saved drill as many times as needed. Use the grip or arrow buttons to reorder steps, then Save drill.</p>
                        <h3 class="h6">How do I mark a defective target?</h3>
                        <p>Open Settings and mark the target defective. It becomes unavailable for drills and manual target selection.</p>
                        <h3 class="h6">Why are the controls unavailable?</h3>
                        <p class="mb-0">Check the status banner and your connection to the range WiFi. Exit manual mode before starting a drill. After Stop, use Reset to hide the targets and unlock the controls.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.append(help);
    document.body.classList.add('has-help');
}
