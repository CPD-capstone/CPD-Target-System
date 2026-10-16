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
const drillLibraryStorageKey = 'cpd-drill-library';
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
const controllerStatusListeners = [];
let drillStatusTimer = null;

const pollDrillStatus = async () => {
    clearTimeout(drillStatusTimer);
    try {
        const response = await fetch('/api/drill/status', { cache: 'no-store' });
        controllerStatus = response.ok ? await response.json() : null;
    } catch {
        controllerStatus = null;
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
        response = await fetch(path, body === undefined
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

// AI-generated (Claude): 'custom' = created with the New Drill form (database drills have ids
// like "database-drill-3"); otherwise 'full' or 'stages'.
const getDrillCategory = (drillId, drill) => {
    if (!String(drillId).startsWith('database-drill-')) return 'custom';
    return isFullDrill(drill) ? 'full' : 'stages';
};

// AI-modified (Claude): removed the five-drill limit so every database drill is listed.
const getSavedDrillLibrary = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(drillLibraryStorageKey) || '{}');
        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    } catch (error) {
        return {};
    }
};

const getTargetDrillLibrary = (databaseDrills = []) => {
    const defaults = (Array.isArray(databaseDrills) ? databaseDrills : [])
        .filter((drill) => drill && typeof drill.drillName === 'string' && drill.drillName.trim())
        .map((drill, index) => [`database-drill-${index}`, {
            name: drill.drillName.trim(),
            sequence: Array.isArray(drill.sequence) ? drill.sequence : []
        }]);
    return { ...Object.fromEntries(defaults), ...getSavedDrillLibrary() };
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

const syncDrillTargetsToTargetStatus = (drillId, targetNumbers) => {
    const assignedTargets = new Set(targetNumbers.map(String));
    const status = getSavedTargetStatus();

    Object.entries(status).forEach(([targetNumber, targetState]) => {
        const savedState = targetState && typeof targetState === 'object' && !Array.isArray(targetState)
            ? targetState
            : {};
        const activeDrillIds = new Set(
            (Array.isArray(savedState.activeDrillIds) ? savedState.activeDrillIds : []).map(String)
        );
        if (assignedTargets.has(targetNumber)) {
            activeDrillIds.add(String(drillId));
        } else {
            activeDrillIds.delete(String(drillId));
        }
        status[targetNumber] = { ...savedState, activeDrillIds: Array.from(activeDrillIds) };
    });

    assignedTargets.forEach((targetNumber) => {
        const targetState = status[targetNumber] && typeof status[targetNumber] === 'object' && !Array.isArray(status[targetNumber])
            ? status[targetNumber]
            : {};
        const activeDrillIds = new Set(
            (Array.isArray(targetState.activeDrillIds) ? targetState.activeDrillIds : []).map(String)
        );
        activeDrillIds.add(String(drillId));
        status[targetNumber] = { ...targetState, activeDrillIds: Array.from(activeDrillIds) };
    });

    saveTargetStatus(status);
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

// AI-generated (Claude): names the stage of a full drill for the status bar. The controller
// flattens a drill into steps (expandDrill() in target_manager.cpp): each present/hide/pause/
// delay is one step and a step naming another drill is expanded in place, up to 4 drills deep.
// This mirrors that on database.json, so step N of a full drill maps back to the stage (the
// drill named at the top level) it belongs to.
let statusDrills = null; // drills array from database.json, once loaded
const maxDrillNesting = 4; // MAX_NESTING_DEPTH in target_manager.cpp

const findStatusDrill = (name) => statusDrills?.find((drill) => drill?.drillName === name);

const countDrillSteps = (name, depth) => {
    const drill = findStatusDrill(name);
    if (!drill || depth > maxDrillNesting) return 0;
    return (Array.isArray(drill.sequence) ? drill.sequence : []).reduce((count, step) => (
        count + (basicDrillActions.has(step?.action) ? 1 : countDrillSteps(step?.action, depth + 1))
    ), 0);
};

// Returns {stage, between} for step (1-based) of drillName, or null for a single-stage drill.
// between = the step sits between stages (e.g. the pause before the next one); stage is then
// the stage that comes next.
const describeDrillStage = (drillName, step) => {
    const drill = findStatusDrill(drillName);
    if (!drill || !step) return null;
    const stages = [];
    let nextStep = 1;
    (Array.isArray(drill.sequence) ? drill.sequence : []).forEach((entry) => {
        if (basicDrillActions.has(entry?.action)) {
            nextStep += 1;
            return;
        }
        const count = countDrillSteps(entry?.action, 2);
        stages.push({ name: entry.action, first: nextStep, last: nextStep + count - 1 });
        nextStep += count;
    });
    if (!stages.length) return null;
    const current = stages.find((stage) => step >= stage.first && step <= stage.last);
    if (current) return { stage: current.name, between: false };
    const upcoming = stages.find((stage) => stage.first > step);
    return upcoming ? { stage: upcoming.name, between: true } : null;
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
        // AI-modified (Claude): name the stage (full drills) instead of a step number
        const stageInfo = describeDrillStage(status.drillName, status.step);
        setStatusBarStyle('active');
        setDrillStatusText(!stageInfo
            ? `${drillName} paused. Press Resume`
            : stageInfo.between
                ? `${drillName} paused before ${stageInfo.stage}. Press Resume`
                : `${drillName}: ${stageInfo.stage} paused. Press Resume`);
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
    if (startDrillButton) {
        startDrillButton.disabled = !status || manualMode || stopped || countingDown
            || (state === 'paused' ? false : drillActive || !drillSelect?.value);
    }
    if (pauseDrillButton) pauseDrillButton.disabled = state !== 'running' || countingDown;
    if (stopDrillButton) stopDrillButton.disabled = !(drillActive || countingDown) || stopped;
    if (resetTargetsButton) resetTargetsButton.hidden = !stopped;
    if (drillSelect) drillSelect.disabled = manualMode || drillActive || stopped || countingDown;
};

if (drillStatus) {
    controllerStatusListeners.push(updateDrillStatus);
    pollDrillStatus();
    // AI-generated (Claude): drill list for stage names in the status bar
    fetch('database.json', { cache: 'no-store' })
        .then((response) => response.json())
        .then((payload) => {
            statusDrills = Array.isArray(payload?.drills) ? payload.drills : [];
            updateDrillStatus();
        })
        .catch(() => {
            // not on the controller: the bar just shows the drill name
        });
    // Captive-portal browsers suspend the page; refresh as soon as it is visible again.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pollDrillStatus();
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
            { label: 'Stages', category: 'stages' },
            { label: 'Custom', category: 'custom' }
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

        drillSelect.addEventListener('change', () => {
            drillLaunchMessage.hidden = true;
            drillLaunchMessage.textContent = '';
            updateDrillStatus();
        });

        startDrillButton.addEventListener('click', async () => {
            if (manualMode) return;
            // While the controller is paused (operator pause or a "pause" step) this is Resume.
            if (controllerStatus?.state === 'paused') {
                // AI-modified (Claude): start delay countdown before resuming (cancellable)
                startDrillButton.disabled = true;
                if (!(await startCountdown(`Resuming ${controllerStatus.drillName || 'drill'}`))) {
                    updateDrillStatus();
                    return;
                }
                try {
                    await postToController('/api/drill/resume');
                    drillLaunchMessage.hidden = true;
                } catch (error) {
                    showLaunchMessage(error.message);
                }
                pollDrillStatus();
                return;
            }

            const drillId = drillSelect.value;
            const drill = targetAssignmentDrills[drillId];
            if (!drill) return;
            if (getDrillCategory(drillId, drill) === 'custom') {
                showLaunchMessage('Custom drills are saved on this phone only, so the controller cannot run them yet.');
                return;
            }

            const assignedTargets = Array.isArray(drill.targets)
                ? [...new Set(drill.targets.map(Number).filter((targetNumber) => Number.isInteger(targetNumber) && targetNumber >= 1 && targetNumber <= 20))]
                : [];
            const availableTargets = assignedTargets.filter((targetNumber) => (
                !unavailableTargets.has(targetNumber) &&
                targetGrid.querySelector(`[data-target-number="${targetNumber}"] .target-card`)
            ));

            // AI-modified (Claude): a drill with no assigned targets asks which targets to run.
            if (!assignedTargets.length) {
                openDrillTargetPicker(drillId);
                return;
            }
            if (!availableTargets.length) {
                showLaunchMessage('All targets assigned to this drill are defective or unavailable.');
                return;
            }

            runDrillOnTargets(drillId, availableTargets);
        });

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
                    input.value = String(targetNumber);
                    const text = document.createElement('span');
                    text.textContent = `Target ${targetNumber}`;
                    wrapper.append(input, text);
                    return wrapper;
                }));
            }
            bootstrapModal.getOrCreateInstance(pickerModalElement).show();
        };

        document.getElementById('drillTargetPickerStart')?.addEventListener('click', () => {
            const selectedTargets = Array.from(
                pickerList.querySelectorAll('input[type="checkbox"]:checked'),
                (box) => Number(box.value)
            );
            if (!selectedTargets.length) {
                pickerError.textContent = 'Select at least one target.';
                pickerError.hidden = false;
                return;
            }
            bootstrapModal.getInstance(pickerModalElement)?.hide();
            if (pickerDrillId && !manualMode) {
                runDrillOnTargets(pickerDrillId, selectedTargets);
            }
        });

        pauseDrillButton.addEventListener('click', async () => {
            try {
                await postToController('/api/drill/pause');
            } catch (error) {
                showLaunchMessage(error.message);
            }
            pollDrillStatus();
        });

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
                const drillName = controllerStatus.drillName || 'The drill';
                try {
                    await postToController('/api/stop');
                    await postToController('/api/reset');
                    showLaunchMessage(`${drillName} ended. Targets hidden.`);
                } catch (error) {
                    showLaunchMessage(`${error.message} If targets are still up, press Reset.`);
                }
                pollDrillStatus();
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
                drillLaunchMessage.textContent = `${status.drillName} failed; its targets were hidden.`;
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
    fetch('database.json', { cache: 'no-store' })
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

    const renderPerformance = () => {
        const visibleRecords = getVisibleRecords();
        renderPerformanceSummary(visibleRecords);
        renderPerformanceTable(visibleRecords);

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

    // Populate officer choices from the same payload as the score history.
    fetch('database.json', { cache: 'no-store' })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Unable to load qualification records.');
            }
            return response.json();
        })
        .then((payload) => {
            performanceOfficers = Array.isArray(payload?.Officers) ? payload.Officers : [];

            if (!performanceOfficers.length) {
                performanceMessage.hidden = false;
                performanceMessage.textContent = 'No officer records were found in the database.';
            }
            renderPerformance();
        })
        .catch(() => {
            performanceMessage.hidden = false;
            performanceMessage.classList.add('is-error');
            performanceMessage.textContent = 'Qualification data could not be loaded. Check the connection and try again.';
            renderPerformance();
        });
}

if (document.getElementById('drillList')) {
    const drillList = document.getElementById('drillList');
    const drillForm = document.getElementById('newDrillForm');
    const editDrillForm = document.getElementById('editDrillForm');
    const storageKey = 'cpd-drill-library';
    const deleteDrillModalElement = document.getElementById('deleteDrillModal');
    const deleteDrillModal = deleteDrillModalElement ? new bootstrap.Modal(deleteDrillModalElement) : null;
    const deleteDrillName = document.getElementById('deleteDrillName');
    const confirmDeleteDrillButton = document.getElementById('confirmDeleteDrillButton');
    const targetNumberSelect = document.getElementById('targetNumber');
    const editTargetNumberSelect = document.getElementById('editTargetNumber');
    let pendingDeleteDrillId = null;
    let activeDrillFilter = 'all';
    let databaseDrills = [];
    let databaseUnavailableTargets = new Set();

    const showFormError = (form, message, invalidInputs) => {
        const errorMessage = document.getElementById(form.id === 'newDrillForm' ? 'newDrillError' : 'editDrillError');

        errorMessage.textContent = message;
        errorMessage.hidden = false;
        invalidInputs.forEach((input) => input.classList.add('is-invalid'));
        invalidInputs[0]?.focus();
    };

    const clearFormError = (form) => {
        const errorMessage = document.getElementById(form.id === 'newDrillForm' ? 'newDrillError' : 'editDrillError');

        errorMessage.hidden = true;
        errorMessage.textContent = '';
        form.querySelectorAll('input:not([type="hidden"]), select').forEach((input) => input.classList.remove('is-invalid'));
        form.querySelectorAll('.target-options').forEach((group) => group.classList.remove('is-invalid'));
    };

    const validateDrillFields = (form) => {
        const isEditForm = form.id === 'editDrillForm';
        const targetFieldName = isEditForm ? 'editTargetNumber' : 'targetNumber';
        const fields = [
            { input: document.getElementById(isEditForm ? 'editDrillName' : 'drillName'), label: 'Name' },
            {
                input: document.getElementById(targetFieldName),
                label: 'Target numbers',
                valid: () => form.querySelector(`input[name="${targetFieldName}"]:checked`) !== null
            }
        ];
        const missingFields = fields.filter(({ input, valid }) => valid ? !valid() : !input?.value.trim());

        if (!missingFields.length) {
            return { valid: true };
        }

        return {
            valid: false,
            message: `Please complete: ${missingFields.map(({ label }) => label).join(', ')}.`,
            invalidInputs: missingFields.map(({ input }) => input)
        };
    };

    const getUnavailableTargetInputs = (form, fieldName) => {
        const unavailableTargets = databaseUnavailableTargets;
        return Array.from(form.querySelectorAll(`input[name="${fieldName}"]:checked`))
            .filter((input) => unavailableTargets.has(Number(input.value)));
    };

    const normalizeDrillMap = (source = []) => {
        if (!Array.isArray(source)) {
            return {};
        }

        return Object.fromEntries(source
            .filter((drill) => drill && typeof drill.drillName === 'string' && drill.drillName.trim())
            .map((drill, index) => [`database-drill-${index}`, {
                name: drill.drillName.trim(),
                sequence: Array.isArray(drill.sequence) ? drill.sequence : [],
                status: 'available'
            }]));
    };

    const populateDatabaseFields = (payload) => {
        const databaseTargets = Array.isArray(payload?.targets) ? payload.targets : [];
        databaseUnavailableTargets = new Set(databaseTargets
            .filter((target) => target?.working === false)
            .map((target) => Number(target?.id)));
        const targets = databaseTargets
            .filter((target) => target?.working !== false)
            .map((target) => Number(target?.id))
            .filter((id) => Number.isInteger(id) && id >= 1 && id <= 20)
            .sort((first, second) => first - second);
        const targetOptions = targets.map((target) => ({ label: `Target ${target}`, value: String(target) }));

        [
            { container: targetNumberSelect, name: 'targetNumber' },
            { container: editTargetNumberSelect, name: 'editTargetNumber' }
        ].forEach(({ container, name }) => {
            if (!container) return;

            container.replaceChildren();
            if (!targetOptions.length) {
                container.textContent = 'No targets are currently available.';
                return;
            }

            targetOptions.forEach(({ label, value }) => {
                const wrapper = document.createElement('label');
                wrapper.className = 'target-option';

                const input = document.createElement('input');
                input.className = 'form-check-input';
                input.type = 'checkbox';
                input.name = name;
                input.value = value;

                const text = document.createElement('span');
                text.textContent = label;

                wrapper.append(input, text);
                container.append(wrapper);
            });
        });
    };

    const setSelectedValues = (container, values) => {
        if (!container) return;
        const selectedValues = new Set(values.map((value) => String(value)));
        container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
            input.checked = selectedValues.has(input.value);
        });
    };

    // AI-generated (Claude): one-line summary of a drill's sequence for its card.
    const getSequenceSummary = (drill) => {
        const steps = Array.isArray(drill?.sequence) ? drill.sequence.length : 0;
        return steps ? `${steps} ${steps === 1 ? 'step' : 'steps'}` : 'Not built yet';
    };

    const getTargets = (drill) => {
        if (Array.isArray(drill?.targets) && drill.targets.length > 0) {
            return drill.targets.join(', ');
        }

        return '—';
    };

    const getDrills = () => {
        const stored = localStorage.getItem(storageKey);
        if (!stored) {
            return {};
        }

        try {
            const parsed = JSON.parse(stored);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (error) {
            return {};
        }
    };

    const saveDrills = (drills) => {
        localStorage.setItem(storageKey, JSON.stringify(drills));
    };

    const openEditModal = (drillId) => {
        const drills = getDrills();
        const drill = drills[drillId];

        if (!drill) {
            return;
        }

        document.getElementById('editDrillId').value = drillId;
        document.getElementById('editDrillName').value = drill.name || '';
        setSelectedValues(editTargetNumberSelect, Array.isArray(drill.targets) ? drill.targets : []);

        const editModal = new bootstrap.Modal(document.getElementById('editDrillModal'));
        editModal.show();
    };

    const deleteDrill = (drillId) => {
        const drills = getDrills();
        delete drills[drillId];
        saveDrills(drills);
        syncDrillTargetsToTargetStatus(drillId, []);
        renderDrills(drills);
    };

    // AI-modified (Claude): the list is narrowed by the All / Full drills / Stages / Custom filter.
    const renderDrills = (drills) => {
        const allEntries = Object.entries(drills || {});
        const entries = allEntries.filter(([drillId, drill]) => (
            activeDrillFilter === 'all' || getDrillCategory(drillId, drill) === activeDrillFilter
        ));

        if (!entries.length) {
            drillList.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info mb-0">${allEntries.length ? 'No drills match this filter.' : 'No drills have been added yet.'}</div>
                </div>
            `;
            return;
        }

        drillList.innerHTML = entries.map(([drillId, drill], index) => `
            <div class="col">
                <article class="drill-ticket h-100">
                    <div class="drill-ticket-heading">
                        <span class="drill-ticket-label">Drill ${String(index + 1).padStart(2, '0')}</span>
                        <i class="bi bi-crosshair text-primary" aria-hidden="true"></i>
                    </div>
                    <h2 class="h4 mb-4">${(drill?.name || 'Untitled Drill').replace(/</g, '&lt;')}</h2>
                    <dl class="drill-details">
                        <div><dt>Name</dt><dd>${(drill?.name || 'Untitled Drill').replace(/</g, '&lt;')}</dd></div>
                        <div><dt>Target Numbers</dt><dd>${getTargets(drill)}</dd></div>
                        <div><dt>Sequence</dt><dd>${getSequenceSummary(drill)}</dd></div>
                    </dl>
                    <div class="drill-actions">
                        <button class="btn btn-secondary edit-drill-btn" type="button" data-drill-id="${drillId}"><i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit</button>
                        <button class="btn btn-danger delete-drill-btn" type="button" data-drill-id="${drillId}"><i class="bi bi-trash3 me-1" aria-hidden="true"></i>Delete</button>
                    </div>
                </article>
            </div>
        `).join('');

        document.querySelectorAll('.edit-drill-btn').forEach((button) => {
            button.addEventListener('click', () => openEditModal(button.dataset.drillId));
        });

        document.querySelectorAll('.delete-drill-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const drillId = button.dataset.drillId;
                const drills = getDrills();
                const drillName = drills[drillId]?.name || 'this drill';

                pendingDeleteDrillId = drillId;
                deleteDrillName.textContent = drillName;
                deleteDrillModal?.show();
            });
        });
    };

    confirmDeleteDrillButton?.addEventListener('click', () => {
        if (!pendingDeleteDrillId) {
            return;
        }

        deleteDrill(pendingDeleteDrillId);
        pendingDeleteDrillId = null;
        deleteDrillModal?.hide();
    });

    deleteDrillModalElement?.addEventListener('hidden.bs.modal', () => {
        pendingDeleteDrillId = null;
        deleteDrillName.textContent = '';
    });

    const loadDrills = async () => {
        const savedDrills = getDrills();

        try {
            const response = await fetch('database.json', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('Unable to load database.json');
            }

            const payload = await response.json();
            const fileDrills = normalizeDrillMap(payload?.drills);
            const mergedDrills = { ...fileDrills, ...savedDrills };
            databaseDrills = Array.isArray(payload?.drills) ? payload.drills : [];

            saveDrills(mergedDrills);
            populateDatabaseFields(payload);
            renderDrills(mergedDrills);
        } catch (error) {
            renderDrills(savedDrills || {});
        }
    };

    drillForm?.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(drillForm);
        const name = String(formData.get('drillName') || '').trim();
        const targetNumbers = formData.getAll('targetNumber').map((value) => Number(value));

        const validation = validateDrillFields(drillForm);
        if (!validation.valid) {
            showFormError(drillForm, validation.message, validation.invalidInputs);
            return;
        }

        const unavailableInputs = getUnavailableTargetInputs(drillForm, 'targetNumber');
        if (unavailableInputs.length) {
            const targetNumber = unavailableInputs[0].value;
            showFormError(drillForm, `Target ${targetNumber} is defective or unavailable and cannot be assigned to a drill.`, unavailableInputs);
            return;
        }

        clearFormError(drillForm);

        const currentDrills = getDrills();
        const nextDrillId = `drill-${Date.now()}`;

        currentDrills[nextDrillId] = {
            name,
            sequence: databaseDrills.find((drill) => drill.drillName === name)?.sequence || [],
            targets: targetNumbers,
            status: 'available'
        };

        saveDrills(currentDrills);
        syncDrillTargetsToTargetStatus(nextDrillId, targetNumbers);
        renderDrills(currentDrills);

        const modal = bootstrap.Modal.getInstance(document.getElementById('newDrillModal'));
        if (modal) {
            modal.hide();
        }

        drillForm.reset();
    });

    editDrillForm?.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(editDrillForm);
        const drillId = String(formData.get('editDrillId') || '').trim();
        const name = String(formData.get('editDrillName') || '').trim();
        const targetNumbers = formData.getAll('editTargetNumber').map((value) => Number(value));

        const validation = validateDrillFields(editDrillForm);
        if (!drillId || !validation.valid) {
            showFormError(
                editDrillForm,
                !drillId ? 'This drill could not be identified. Please close and reopen the editor.' : validation.message,
                validation.invalidInputs || []
            );
            return;
        }

        const unavailableInputs = getUnavailableTargetInputs(editDrillForm, 'editTargetNumber');
        if (unavailableInputs.length) {
            const targetNumber = unavailableInputs[0].value;
            showFormError(editDrillForm, `Target ${targetNumber} is defective or unavailable and cannot be assigned to a drill.`, unavailableInputs);
            return;
        }

        clearFormError(editDrillForm);

        const currentDrills = getDrills();
        currentDrills[drillId] = {
            ...currentDrills[drillId],
            name,
            targets: targetNumbers,
            status: 'available'
        };

        saveDrills(currentDrills);
        syncDrillTargetsToTargetStatus(drillId, targetNumbers);
        renderDrills(currentDrills);

        const modal = bootstrap.Modal.getInstance(document.getElementById('editDrillModal'));
        if (modal) {
            modal.hide();
        }

        editDrillForm.reset();
    });

    // AI-generated (Claude): All / Full drills / Stages filter buttons.
    document.querySelectorAll('.drill-filter').forEach((button) => {
        button.addEventListener('click', () => {
            activeDrillFilter = button.dataset.drillFilter;
            document.querySelectorAll('.drill-filter').forEach((other) => {
                const isActive = other === button;
                other.classList.toggle('active', isActive);
                other.setAttribute('aria-pressed', String(isActive));
            });
            renderDrills(getDrills());
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
            const response = await fetch('/api/targets', { cache: 'no-store' });
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
