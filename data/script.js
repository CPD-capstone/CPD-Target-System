const drillStatus = document.getElementById('drillStatus');
// AI-generated (Claude): the scrolling text inside the status bar.
const drillStatusText = document.getElementById('drillStatusText') || drillStatus;

// AI-generated (Claude): continuous scrolling banners (.drill-status-bar on every page).
// Fills the track with enough copies of the text to cover the bar twice, so sliding it left
// by half its width (see style.css) loops with no empty gap. Speed stays constant however
// long the text is.
const bannerSpeedPxPerSecond = 110;

const fillScrollingBanner = (bar, force = false) => {
    const source = bar.querySelector('.drill-status-text');
    if (!source) return;
    const text = source.textContent.trim();

    let track = bar.querySelector('.banner-track');
    if (!track) {
        track = document.createElement('div');
        track.className = 'banner-track';
        track.setAttribute('aria-hidden', 'true');
        bar.append(track);
    }
    if (!force && track.dataset.text === text) return;
    track.dataset.text = text;

    const makeCopy = () => {
        const item = document.createElement('span');
        item.textContent = text;
        const separator = document.createElement('span');
        separator.className = 'banner-sep';
        return [item, separator];
    };

    track.style.animation = 'none';
    track.replaceChildren(...makeCopy());
    const copyWidth = track.getBoundingClientRect().width;
    if (!copyWidth) return; // track hidden (reduced motion or print): static text shows instead

    const copiesPerHalf = Math.max(1, Math.ceil(bar.clientWidth / copyWidth));
    for (let index = 1; index < copiesPerHalf * 2; index += 1) {
        track.append(...makeCopy());
    }
    void track.offsetWidth; // restart the animation from the start
    track.style.animation = '';
    track.style.animationDuration = `${(copiesPerHalf * copyWidth) / bannerSpeedPxPerSecond}s`;
};

const refreshScrollingBanners = () => {
    document.querySelectorAll('.drill-status-bar').forEach((bar) => fillScrollingBanner(bar, true));
};

const setDrillStatusText = (text) => {
    drillStatusText.textContent = text;
    if (drillStatus) fillScrollingBanner(drillStatus);
};

refreshScrollingBanners();
document.fonts?.ready.then(refreshScrollingBanners);
let bannerResizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(bannerResizeTimer);
    bannerResizeTimer = setTimeout(refreshScrollingBanners, 150);
});
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

const targetFilters = document.querySelectorAll('.target-filter');
const targetGrid = document.getElementById('targetGrid');
const targetStatusStorageKey = 'cpd-target-status';
const drillLibraryStorageKey = 'cpd-drill-library';
const activeDemoDrillStorageKey = 'cpd-active-demo-drill';
const pausedDemoDrillStorageKey = 'cpd-paused-demo-drill';
// AI-generated (Claude): name of the running drill, so the status bar on the Drills and
// Performance pages can show it without loading the drill library.
const activeDemoDrillNameStorageKey = 'cpd-active-demo-drill-name';
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
let activeDemoDrillId = localStorage.getItem(activeDemoDrillStorageKey) || '';
let activeDemoDrillPaused = localStorage.getItem(pausedDemoDrillStorageKey) === 'true';

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

const getDefectiveTargetNumbers = () => Object.entries(getSavedTargetStatus())
    .filter(([, state]) => state?.defective)
    .map(([targetNumber]) => Number(targetNumber))
    .filter((targetNumber) => Number.isInteger(targetNumber));

const saveTargetCardStatus = (targetCard) => {
    const targetNumber = targetCard.closest('[data-target-number]')?.dataset.targetNumber;
    if (!targetNumber) return;

    const status = getSavedTargetStatus();
    const savedState = status[targetNumber] && typeof status[targetNumber] === 'object' && !Array.isArray(status[targetNumber])
        ? status[targetNumber]
        : {};
    status[targetNumber] = {
        ...savedState,
        defective: targetCard.classList.contains('is-defective'),
        red: targetCard.classList.contains('is-red'),
        activeDrillIds: targetCard.classList.contains('is-defective')
            ? []
            : (Array.isArray(savedState.activeDrillIds) ? savedState.activeDrillIds : [])
    };
    saveTargetStatus(status);
};

const updateDrillStatus = () => {
    if (!drillStatus || !targetGrid) return;

    const hasRedTarget = targetGrid.querySelector('.target-card.is-red');
    const startDrillButton = document.getElementById('startDrillButton');
    const startDrillLabel = document.getElementById('startDrillLabel');
    const pauseDrillButton = document.getElementById('pauseDrillButton');
    const stopDrillButton = document.getElementById('stopDrillButton');
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

    // AI-generated (Claude): in manual mode no drill runs, so every drill control is locked.
    if (manualMode) {
        setStatusBarStyle('manual');
        setDrillStatusText('Manual mode');
        localStorage.removeItem(activeDemoDrillNameStorageKey);
        if (startDrillLabel) startDrillLabel.textContent = 'Start drill';
        [startDrillButton, pauseDrillButton, stopDrillButton, drillSelect].forEach((control) => {
            if (control) control.disabled = true;
        });
        return;
    }
    setStatusBarStyle(hasRedTarget ? 'active' : 'idle');

    // AI-generated (Claude): Stop is available whenever a drill is running or paused.
    if (stopDrillButton) {
        stopDrillButton.disabled = !(hasRedTarget && activeDemoDrillId);
    }

    if (hasRedTarget) {
        const drill = targetAssignmentDrills[activeDemoDrillId];
        const drillName = drill ? drill.name || drill.drillName : 'Drill';
        if (drill) {
            localStorage.setItem(activeDemoDrillNameStorageKey, drillName);
        }
        setDrillStatusText(activeDemoDrillPaused
            ? `${drillName} Paused`
            : `${drillName} in Progress`);
        if (startDrillLabel) {
            startDrillLabel.textContent = activeDemoDrillPaused ? 'Resume drill' : 'Start drill';
        }
        if (startDrillButton) {
            startDrillButton.disabled = !activeDemoDrillPaused;
        }
        if (pauseDrillButton) {
            pauseDrillButton.disabled = !activeDemoDrillId || activeDemoDrillPaused;
        }
        if (drillSelect) {
            drillSelect.disabled = Boolean(activeDemoDrillId);
        }
    } else {
        activeDemoDrillId = '';
        activeDemoDrillPaused = false;
        localStorage.removeItem(activeDemoDrillStorageKey);
        localStorage.removeItem(pausedDemoDrillStorageKey);
        localStorage.removeItem(activeDemoDrillNameStorageKey);
        setDrillStatusText('No drill in progress');
        if (startDrillLabel) {
            startDrillLabel.textContent = 'Start drill';
        }
        if (startDrillButton) {
            startDrillButton.disabled = !drillSelect?.value;
        }
        if (pauseDrillButton) {
            pauseDrillButton.disabled = true;
        }
        if (drillSelect) {
            drillSelect.disabled = false;
        }
    }
};

// AI-generated (Claude): status bar on pages without the target grid (Drills, Performance).
// Reads the drill state the Targets page saves, using the same rule as updateDrillStatus:
// any target still red means a drill is in progress. Also refreshes if another tab changes it.
const showSavedDrillStatus = () => {
    if (!drillStatus || targetGrid) return;

    const hasRedTarget = Object.values(getSavedTargetStatus()).some((state) => state?.red && !state?.defective);
    const drillName = localStorage.getItem(activeDemoDrillNameStorageKey) || 'Drill';
    const isPaused = localStorage.getItem(pausedDemoDrillStorageKey) === 'true';
    if (localStorage.getItem(manualModeStorageKey) === 'true') {
        setStatusBarStyle('manual');
        setDrillStatusText('Manual mode');
        return;
    }
    setStatusBarStyle(hasRedTarget ? 'active' : 'idle');
    setDrillStatusText(hasRedTarget
        ? `${drillName} ${isPaused ? 'Paused' : 'in Progress'}`
        : 'No drill in progress');
};

showSavedDrillStatus();
window.addEventListener('storage', showSavedDrillStatus);

const renderTargets = (targetIds) => {
    if (!targetGrid) return;

    targetGrid.innerHTML = targetIds.map((targetNumber) => `
        <div class="col d-flex justify-content-center" data-target-number="${targetNumber}">
            <button class="target-card" type="button" aria-pressed="false" aria-label="Mark target ${targetNumber} red">
                <span class="target-number" aria-hidden="true">${targetNumber}</span>
                <img src="uspsa-target.svg" width="150" height="180" alt="USPSA target">
            </button>
            <div class="target-actions">
                <button class="target-defect-toggle" type="button" aria-label="Mark target ${targetNumber} defective" title="Mark target ${targetNumber} defective">
                    <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                    <span>Defect</span>
                </button>
                <button class="target-drill-assign" type="button" aria-label="Assign drills to target ${targetNumber}" title="Assign drills">
                    <i class="bi bi-list-check" aria-hidden="true"></i>
                </button>
            </div>
        </div>
    `).join('');
};

const initializeTargetPage = (targetIds, unavailableTargetIds = []) => {
    renderTargets(targetIds);

    const targetCards = document.querySelectorAll('.target-card');
    const targetColumns = Array.from(targetCards, (targetCard) => targetCard.closest('[data-target-number]'));
    const unavailableTargets = new Set(unavailableTargetIds);
    const assignmentModalElement = document.getElementById('drillAssignmentModal');
    const assignmentList = document.getElementById('drillAssignmentList');
    const assignmentTargetLabel = document.getElementById('drillAssignmentTargetLabel');
    const saveAssignmentButton = document.getElementById('saveDrillAssignments');
    const drillSelect = document.getElementById('drillSelect');
    const startDrillButton = document.getElementById('startDrillButton');
    const drillLaunchMessage = document.getElementById('drillLaunchMessage');
    const bootstrapModal = typeof bootstrap === 'undefined' ? null : bootstrap.Modal;
    let activeFilter = 'all';
    let activeTargetNumber = null;

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
        if (activeDemoDrillId && targetAssignmentDrills[activeDemoDrillId]) {
            drillSelect.value = activeDemoDrillId;
        } else if (activeDemoDrillId) {
            activeDemoDrillId = '';
            activeDemoDrillPaused = false;
            localStorage.removeItem(activeDemoDrillStorageKey);
            localStorage.removeItem(pausedDemoDrillStorageKey);
        }
        startDrillButton.disabled = manualMode || !drillSelect.value || Boolean(activeDemoDrillId && !activeDemoDrillPaused);
        if (activeDemoDrillPaused) {
            startDrillLabel.textContent = 'Resume drill';
        }
        drillSelect.disabled = Boolean(activeDemoDrillId);
        pauseDrillButton.disabled = !activeDemoDrillId || activeDemoDrillPaused;

        drillSelect.addEventListener('change', () => {
            startDrillButton.disabled = manualMode || !drillSelect.value || Boolean(activeDemoDrillId && !activeDemoDrillPaused);
            drillLaunchMessage.hidden = true;
            drillLaunchMessage.textContent = '';
        });

        startDrillButton.addEventListener('click', () => {
            const drillId = drillSelect.value;
            const drill = targetAssignmentDrills[drillId];
            if (!drill || manualMode) return;

            if (activeDemoDrillPaused && activeDemoDrillId === drillId) {
                activeDemoDrillPaused = false;
                localStorage.removeItem(pausedDemoDrillStorageKey);
                drillLaunchMessage.hidden = true;
                drillLaunchMessage.textContent = '';
                updateDrillStatus();
                return;
            }
            if (activeDemoDrillId) return;

            const assignedTargets = Array.isArray(drill.targets)
                ? [...new Set(drill.targets.map(Number).filter((targetNumber) => Number.isInteger(targetNumber) && targetNumber >= 1 && targetNumber <= 20))]
                : [];
            const defectiveTargets = new Set(getDefectiveTargetNumbers());
            const availableTargets = assignedTargets.filter((targetNumber) => (
                !defectiveTargets.has(targetNumber) &&
                !unavailableTargets.has(targetNumber) &&
                targetGrid.querySelector(`[data-target-number="${targetNumber}"] .target-card`)
            ));

            // AI-modified (Claude): a drill with no assigned targets asks which targets to run.
            if (!assignedTargets.length) {
                openDrillTargetPicker(drillId);
                return;
            }
            if (!availableTargets.length) {
                drillLaunchMessage.textContent = 'All targets assigned to this drill are defective or unavailable.';
                drillLaunchMessage.hidden = false;
                return;
            }

            runDrillOnTargets(drillId, availableTargets);
        });

        // AI-modified (Claude): moved out of the Start click handler so the target picker can
        // start a drill too. Body is unchanged.
        const runDrillOnTargets = (drillId, availableTargets) => {
            const drill = targetAssignmentDrills[drillId];
            const drillName = drill.name || drill.drillName;

            startDrillButton.disabled = true;
            try {
                /* ESP32 API call disabled for frontend-only demo mode:
                const response = await fetch('/api/drill/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ drillName, targets: availableTargets })
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || 'The controller could not start this drill.');
                }
                */

                const status = getSavedTargetStatus();
                availableTargets.forEach((targetNumber) => {
                    const targetKey = String(targetNumber);
                    const savedState = status[targetKey] && typeof status[targetKey] === 'object' && !Array.isArray(status[targetKey])
                        ? status[targetKey]
                        : {};
                    const activeDrillIds = new Set(
                        (Array.isArray(savedState.activeDrillIds) ? savedState.activeDrillIds : []).map(String)
                    );
                    activeDrillIds.add(drillId);
                    status[targetKey] = { ...savedState, red: true, activeDrillIds: Array.from(activeDrillIds) };

                    const targetColumn = targetGrid.querySelector(`[data-target-number="${targetNumber}"]`);
                    const targetCard = targetColumn.querySelector('.target-card');
                    targetCard.classList.add('is-red');
                    targetCard.setAttribute('aria-pressed', 'true');
                    targetCard.setAttribute('aria-label', `Return target ${targetNumber} to green`);
                    targetColumn.querySelector('.target-defect-toggle').disabled = true;
                });

                saveTargetStatus(status);
                activeDemoDrillId = drillId;
                activeDemoDrillPaused = false;
                localStorage.setItem(activeDemoDrillStorageKey, activeDemoDrillId);
                localStorage.removeItem(pausedDemoDrillStorageKey);
                drillLaunchMessage.hidden = true;
                drillLaunchMessage.textContent = '';
                updateDrillStatus();
            } catch (error) {
                drillLaunchMessage.textContent = error.message || 'Could not update the demo target state.';
                drillLaunchMessage.hidden = false;
            } finally {
                startDrillButton.disabled = manualMode || !drillSelect.value || Boolean(activeDemoDrillId && !activeDemoDrillPaused);
            }
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

            const defectiveTargets = new Set(getDefectiveTargetNumbers());
            const pickableTargets = targetColumns
                .map((column) => Number(column.dataset.targetNumber))
                .filter((targetNumber) => !defectiveTargets.has(targetNumber) && !unavailableTargets.has(targetNumber));

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
            if (pickerDrillId && !activeDemoDrillId && !manualMode) {
                runDrillOnTargets(pickerDrillId, selectedTargets);
            }
        });

        pauseDrillButton.addEventListener('click', () => {
            if (!activeDemoDrillId || activeDemoDrillPaused || !targetGrid.querySelector('.target-card.is-red')) return;
            activeDemoDrillPaused = true;
            localStorage.setItem(pausedDemoDrillStorageKey, 'true');
            updateDrillStatus();
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
                targetColumn.querySelector('.target-defect-toggle').disabled = false;
                status[targetNumber] = { ...(status[targetNumber] || {}), red: false };
            });
            saveTargetStatus(status);
        };

        // AI-generated (Claude): ends the running or paused drill and returns its targets to green.
        // On the real controller, /api/stop freezes the targets where they are and a separate
        // Reset hides them; demo mode does both in one step. Returns the drill's name, or ''
        // if no drill was running.
        const stopActiveDrill = () => {
            if (!activeDemoDrillId) return '';

            /* ESP32 API call disabled for frontend-only demo mode:
            await fetch('/api/stop', { method: 'POST' });
            await fetch('/api/reset', { method: 'POST' });
            */

            const drill = targetAssignmentDrills[activeDemoDrillId];
            const drillName = drill ? drill.name || drill.drillName : 'Drill';
            hideAllTargets();
            activeDemoDrillId = '';
            activeDemoDrillPaused = false;
            localStorage.removeItem(activeDemoDrillStorageKey);
            localStorage.removeItem(pausedDemoDrillStorageKey);
            return drillName;
        };

        document.getElementById('stopDrillButton')?.addEventListener('click', () => {
            const drillName = stopActiveDrill();
            if (!drillName) return;
            drillLaunchMessage.textContent = `${drillName} stopped.`;
            drillLaunchMessage.hidden = false;
            updateDrillStatus();
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
                hideAllTargets();
                manualMode = false;
                localStorage.removeItem(manualModeStorageKey);
                drillLaunchMessage.hidden = true;
                updateDrillStatus();
                return;
            }
            if (activeDemoDrillId && manualModeModalElement && bootstrapModal) {
                const drill = targetAssignmentDrills[activeDemoDrillId];
                document.getElementById('manualModeDrillName').textContent = drill ? drill.name || drill.drillName : 'the current drill';
                bootstrapModal.getOrCreateInstance(manualModeModalElement).show();
                return;
            }
            enterManualMode();
        });

        document.getElementById('confirmManualModeButton')?.addEventListener('click', () => {
            const drillName = stopActiveDrill();
            bootstrapModal.getInstance(manualModeModalElement)?.hide();
            enterManualMode();
            if (drillName) {
                drillLaunchMessage.textContent = `${drillName} ended. Tap a target to raise or hide it.`;
                drillLaunchMessage.hidden = false;
            }
        });
    }

    const renderDrillAssignments = (targetNumber) => {
        if (!assignmentList || !assignmentTargetLabel) return;

        assignmentTargetLabel.textContent = `Target ${targetNumber}`;
        const storedIds = getSavedTargetStatus()[String(targetNumber)]?.activeDrillIds;
        const selectedIds = new Set((Array.isArray(storedIds) ? storedIds : []).map(String));
        const drillEntries = Object.entries(targetAssignmentDrills)
            .filter(([, drill]) => drill && typeof (drill.name || drill.drillName) === 'string');

        if (!drillEntries.length) {
            assignmentList.textContent = 'No drills are available.';
            return;
        }

        assignmentList.replaceChildren(...drillEntries.map(([drillId, drill]) => {
            const label = document.createElement('label');
            label.className = 'form-check-label d-flex align-items-center gap-2 p-2 border rounded bg-light';

            const checkbox = document.createElement('input');
            checkbox.className = 'form-check-input mt-0';
            checkbox.type = 'checkbox';
            checkbox.value = drillId;
            checkbox.checked = selectedIds.has(String(drillId));

            const name = document.createElement('span');
            name.textContent = drill.name || drill.drillName;
            label.append(checkbox, name);
            return label;
        }));
    };

    const openDrillAssignments = (targetNumber) => {
        if (!assignmentModalElement || !bootstrapModal) return;
        activeTargetNumber = String(targetNumber);
        renderDrillAssignments(activeTargetNumber);
        bootstrapModal.getOrCreateInstance(assignmentModalElement).show();
    };

    saveAssignmentButton?.addEventListener('click', () => {
        if (!activeTargetNumber) return;

        const status = getSavedTargetStatus();
        const targetState = status[activeTargetNumber] && typeof status[activeTargetNumber] === 'object' && !Array.isArray(status[activeTargetNumber])
            ? status[activeTargetNumber]
            : {};
        if (targetState.defective || unavailableTargets.has(Number(activeTargetNumber))) return;

        const previousDrillIds = Array.isArray(targetState.activeDrillIds) ? targetState.activeDrillIds : [];
        const nextDrillIds = Array.from(
            assignmentList.querySelectorAll('input[type="checkbox"]:checked'),
            (checkbox) => checkbox.value
        );
        updateDrillTargetsForTarget(activeTargetNumber, previousDrillIds, nextDrillIds);
        status[activeTargetNumber] = {
            ...targetState,
            activeDrillIds: nextDrillIds
        };
        saveTargetStatus(status);
        bootstrapModal.getInstance(assignmentModalElement)?.hide();
    });

    targetCards.forEach((targetCard) => {
        const targetNumber = targetCard.closest('[data-target-number]').dataset.targetNumber;
        const savedState = getSavedTargetStatus()[targetNumber] || {};
        const isUnavailable = unavailableTargets.has(Number(targetNumber));
        const isDefective = Boolean(savedState.defective) || isUnavailable;
        const isRed = Boolean(savedState.red) && !isDefective;

        targetCard.classList.toggle('is-defective', isDefective);
        targetCard.classList.toggle('is-red', isRed);
        targetCard.setAttribute('aria-pressed', String(isRed));
        targetCard.setAttribute('aria-label', isUnavailable
            ? `Target ${targetNumber} is unavailable`
            : isDefective
                ? `Target ${targetNumber} is defective`
                : isRed
                    ? `Return target ${targetNumber} to green`
                    : `Mark target ${targetNumber} red`);

        const defectButton = targetCard.closest('[data-target-number]').querySelector('.target-defect-toggle');
        const assignmentButton = targetCard.closest('[data-target-number]').querySelector('.target-drill-assign');
        const unavailable = unavailableTargets.has(Number(targetNumber));
        defectButton.setAttribute('aria-label', isUnavailable
            ? `Target ${targetNumber} is unavailable`
            : isDefective
                ? `Mark target ${targetNumber} usable`
                : `Mark target ${targetNumber} defective`);
        defectButton.disabled = isRed || isUnavailable;
        defectButton.classList.toggle('is-active', Boolean(savedState.defective));
        assignmentButton.disabled = isDefective || isUnavailable;
        assignmentButton.title = isUnavailable
                ? `Target ${targetNumber} is unavailable`
                : isDefective
                    ? `Target ${targetNumber} is defective`
                    : `Assign drills to target ${targetNumber}`;
    });

    // AI-modified (Claude): defective/unavailable targets are hidden only by the "Hide
    // defective" switch, so it works the same with All, Odd and Even.
    const hideDefectiveSwitch = document.getElementById('hideDefectiveTargets');
    const applyTargetFilter = (filter) => {
        activeFilter = filter;
        let visibleNumbers;
        const defectiveNumbers = new Set([...getDefectiveTargetNumbers(), ...unavailableTargets]);
        const hideDefective = Boolean(hideDefectiveSwitch?.checked);

        visibleNumbers = targetColumns
            .map((column) => Number(column.dataset.targetNumber))
            .filter((number) => (
                (filter === 'all' || (filter === 'odd') === (number % 2 !== 0))
                && !(hideDefective && defectiveNumbers.has(number))
            ));

        targetColumns.forEach((column) => {
            const isVisible = visibleNumbers.includes(Number(column.dataset.targetNumber));
            column.classList.toggle('d-none', !isVisible);
        });

        targetFilters.forEach((button) => {
            const isActive = button.dataset.filter === filter;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive);
        });
    };

    targetFilters.forEach((button) => {
        button.addEventListener('click', () => applyTargetFilter(button.dataset.filter));
    });
    hideDefectiveSwitch?.addEventListener('change', () => applyTargetFilter(activeFilter));

    targetGrid.addEventListener('click', (event) => {
        const targetColumn = event.target.closest('[data-target-number]');
        if (!targetColumn) return;
        const targetCard = targetColumn.querySelector('.target-card');
        const defectButton = event.target.closest('.target-defect-toggle');
        const assignmentButton = event.target.closest('.target-drill-assign');
        if (assignmentButton) {
            event.preventDefault();
            if (!targetCard.classList.contains('is-defective') && !unavailableTargets.has(Number(targetColumn.dataset.targetNumber))) {
                openDrillAssignments(targetColumn.dataset.targetNumber);
            }
            return;
        }

        if (defectButton) {
            event.preventDefault();
            event.stopPropagation();
            if (targetCard.classList.contains('is-red') || unavailableTargets.has(Number(targetColumn.dataset.targetNumber))) return;

            const isDefective = !targetCard.classList.contains('is-defective');
            targetCard.classList.toggle('is-defective', isDefective);
            if (isDefective) {
                targetCard.classList.remove('is-red');
                targetCard.setAttribute('aria-pressed', 'false');
            }
            const targetNumber = targetColumn.dataset.targetNumber;
            if (isDefective) {
                const previousDrillIds = getSavedTargetStatus()[targetNumber]?.activeDrillIds || [];
                updateDrillTargetsForTarget(targetNumber, previousDrillIds, []);
            }
            defectButton.classList.toggle('is-active', isDefective);
            defectButton.setAttribute('aria-label', isDefective
                ? `Mark target ${targetNumber} usable`
                : `Mark target ${targetNumber} defective`);
            defectButton.setAttribute('title', isDefective
                ? `Target ${targetNumber} is defective`
                : `Mark target ${targetNumber} defective`);
            targetCard.setAttribute('aria-label', isDefective
                ? `Target ${targetNumber} is defective`
                : `Mark target ${targetNumber} red`);
            saveTargetCardStatus(targetCard);
            targetColumn.querySelector('.target-drill-assign').disabled = isDefective || unavailableTargets.has(Number(targetNumber));
            applyTargetFilter(activeFilter);
            updateDrillStatus();
            return;
        }

        if (!event.target.closest('.target-card')) return;
        if (targetCard.classList.contains('is-defective') || unavailableTargets.has(Number(targetColumn.dataset.targetNumber))) return;
        // AI-generated (Claude): tapping a target only flips it in manual mode.
        if (!manualMode) {
            drillLaunchMessage.textContent = 'Targets are locked. Turn on Manual mode to raise or hide a target by tapping it.';
            drillLaunchMessage.hidden = false;
            return;
        }

        setTargetRaised(targetColumn, !targetCard.classList.contains('is-red'));
        updateDrillStatus();
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
        targetColumn.querySelector('.target-defect-toggle').disabled = isRed;
        saveTargetCardStatus(targetCard);
    };

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

            if (set === 'random') {
                usableColumns.forEach((column) => setTargetRaised(column, false));
                [...usableColumns]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, randomTargetCount)
                    .forEach((column) => setTargetRaised(column, true));
            } else {
                const groupColumns = usableColumns.filter((column) => {
                    const targetNumber = Number(column.dataset.targetNumber);
                    return set === 'all' || (set === 'odd') === (targetNumber % 2 === 1);
                });
                const allRaised = groupColumns.every((column) => column.querySelector('.target-card').classList.contains('is-red'));
                groupColumns.forEach((column) => setTargetRaised(column, !allRaised));
            }
            drillLaunchMessage.hidden = true;
            updateDrillStatus();
        });
    });

    const updateDrillTargetsForTarget = (targetNumber, previousDrillIds, nextDrillIds) => {
        const previousIds = new Set((Array.isArray(previousDrillIds) ? previousDrillIds : []).map(String));
        const nextIds = new Set((Array.isArray(nextDrillIds) ? nextDrillIds : []).map(String));

        new Set([...previousIds, ...nextIds]).forEach((drillId) => {
            const drill = targetAssignmentDrills[drillId];
            if (!drill) return;

            const targets = new Set((Array.isArray(drill.targets) ? drill.targets : []).map(String));
            if (nextIds.has(drillId)) {
                targets.add(String(targetNumber));
            } else {
                targets.delete(String(targetNumber));
            }
            drill.targets = Array.from(targets, Number).filter(Number.isInteger);
        });

        localStorage.setItem(drillLibraryStorageKey, JSON.stringify(targetAssignmentDrills));
    };

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
        const unavailableTargets = new Set([
            ...getDefectiveTargetNumbers(),
            ...databaseUnavailableTargets
        ]);
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
        const defectiveTargets = new Set(getDefectiveTargetNumbers());
        const targets = databaseTargets
            .filter((target) => target?.working !== false && !defectiveTargets.has(Number(target?.id)))
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
