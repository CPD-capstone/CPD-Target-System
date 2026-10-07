const drillStatus = document.getElementById('drillStatus');
const targetFilters = document.querySelectorAll('.target-filter');
const targetGrid = document.getElementById('targetGrid');
const targetStatusStorageKey = 'cpd-target-status';
const drillLibraryStorageKey = 'cpd-drill-library';
const activeDemoDrillStorageKey = 'cpd-active-demo-drill';
const pausedDemoDrillStorageKey = 'cpd-paused-demo-drill';
const defaultDrillLimit = 5;
let targetAssignmentDrills = {};
let activeDemoDrillId = localStorage.getItem(activeDemoDrillStorageKey) || '';
let activeDemoDrillPaused = localStorage.getItem(pausedDemoDrillStorageKey) === 'true';

const filterDefaultDrillEntries = (drills) => Object.fromEntries(
    Object.entries(drills || {}).filter(([drillId]) => {
        const match = String(drillId).match(/^database-drill-(\d+)$/);
        return !match || Number(match[1]) < defaultDrillLimit;
    })
);

const getSavedDrillLibrary = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(drillLibraryStorageKey) || '{}');
        return stored && typeof stored === 'object' && !Array.isArray(stored)
            ? filterDefaultDrillEntries(stored)
            : {};
    } catch (error) {
        return {};
    }
};

const getTargetDrillLibrary = (databaseDrills = []) => {
    const defaults = (Array.isArray(databaseDrills) ? databaseDrills : [])
        .slice(0, defaultDrillLimit)
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
    drillStatus.classList.toggle('bg-danger', hasRedTarget !== null);
    drillStatus.classList.toggle('bg-primary', hasRedTarget === null);
    const startDrillButton = document.getElementById('startDrillButton');
    const startDrillLabel = document.getElementById('startDrillLabel');
    const pauseDrillButton = document.getElementById('pauseDrillButton');
    const drillSelect = document.getElementById('drillSelect');

    if (hasRedTarget) {
        const drill = targetAssignmentDrills[activeDemoDrillId];
        const drillName = drill ? drill.name || drill.drillName : 'Drill';
        drillStatus.textContent = activeDemoDrillPaused
            ? `${drillName} Paused`
            : `${drillName} in Progress`;
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
        drillStatus.textContent = 'There are no active drills';
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
        const options = Object.entries(targetAssignmentDrills)
            .filter(([, drill]) => drill && typeof (drill.name || drill.drillName) === 'string')
            .map(([drillId, drill]) => {
                const drillName = drill.name || drill.drillName;
                const option = document.createElement('option');
                option.value = drillId;
                option.textContent = drillName;
                return option;
            });
        drillSelect.replaceChildren(new Option('Select a drill', ''), ...options);
        if (activeDemoDrillId && targetAssignmentDrills[activeDemoDrillId]) {
            drillSelect.value = activeDemoDrillId;
        } else if (activeDemoDrillId) {
            activeDemoDrillId = '';
            activeDemoDrillPaused = false;
            localStorage.removeItem(activeDemoDrillStorageKey);
            localStorage.removeItem(pausedDemoDrillStorageKey);
        }
        startDrillButton.disabled = !drillSelect.value || Boolean(activeDemoDrillId && !activeDemoDrillPaused);
        if (activeDemoDrillPaused) {
            startDrillLabel.textContent = 'Resume drill';
        }
        drillSelect.disabled = Boolean(activeDemoDrillId);
        pauseDrillButton.disabled = !activeDemoDrillId || activeDemoDrillPaused;

        drillSelect.addEventListener('change', () => {
            startDrillButton.disabled = !drillSelect.value || Boolean(activeDemoDrillId && !activeDemoDrillPaused);
            drillLaunchMessage.hidden = true;
            drillLaunchMessage.textContent = '';
        });

        startDrillButton.addEventListener('click', () => {
            const drillId = drillSelect.value;
            const drill = targetAssignmentDrills[drillId];
            if (!drill) return;

            if (activeDemoDrillPaused && activeDemoDrillId === drillId) {
                activeDemoDrillPaused = false;
                localStorage.removeItem(pausedDemoDrillStorageKey);
                drillLaunchMessage.hidden = true;
                drillLaunchMessage.textContent = '';
                updateDrillStatus();
                return;
            }
            if (activeDemoDrillId) return;

            const drillName = drill.name || drill.drillName;

            const assignedTargets = Array.isArray(drill.targets)
                ? [...new Set(drill.targets.map(Number).filter((targetNumber) => Number.isInteger(targetNumber) && targetNumber >= 1 && targetNumber <= 20))]
                : [];
            const defectiveTargets = new Set(getDefectiveTargetNumbers());
            const availableTargets = assignedTargets.filter((targetNumber) => (
                !defectiveTargets.has(targetNumber) &&
                !unavailableTargets.has(targetNumber) &&
                targetGrid.querySelector(`[data-target-number="${targetNumber}"] .target-card`)
            ));

            if (!assignedTargets.length || !availableTargets.length) {
                drillLaunchMessage.textContent = assignedTargets.length
                    ? 'All targets assigned to this drill are defective or unavailable.'
                    : 'This drill has no targets assigned.';
                drillLaunchMessage.hidden = false;
                return;
            }

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
                startDrillButton.disabled = !drillSelect.value || Boolean(activeDemoDrillId && !activeDemoDrillPaused);
            }
        });

        pauseDrillButton.addEventListener('click', () => {
            if (!activeDemoDrillId || activeDemoDrillPaused || !targetGrid.querySelector('.target-card.is-red')) return;
            activeDemoDrillPaused = true;
            localStorage.setItem(pausedDemoDrillStorageKey, 'true');
            updateDrillStatus();
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

    const applyTargetFilter = (filter) => {
        activeFilter = filter;
        let visibleNumbers;
        const defectiveNumbers = new Set([...getDefectiveTargetNumbers(), ...unavailableTargets]);

        if (filter === 'odd') {
            visibleNumbers = targetColumns
                .map((column) => Number(column.dataset.targetNumber))
                .filter((number) => number % 2 !== 0 && !defectiveNumbers.has(number));
        } else if (filter === 'even') {
            visibleNumbers = targetColumns
                .map((column) => Number(column.dataset.targetNumber))
                .filter((number) => number % 2 === 0 && !defectiveNumbers.has(number));
        } else if (filter === 'random') {
            visibleNumbers = targetColumns
                .map((column) => Number(column.dataset.targetNumber))
                .filter((number) => !defectiveNumbers.has(number))
                .sort(() => Math.random() - 0.5)
                .slice(0, 3);
        } else {
            visibleNumbers = targetColumns.map((column) => Number(column.dataset.targetNumber));
        }

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

        const isRed = !targetCard.classList.contains('is-red');
        const targetNumber = targetColumn.dataset.targetNumber;
        targetCard.classList.toggle('is-red', isRed);
        targetCard.setAttribute('aria-pressed', String(isRed));
        targetCard.setAttribute('aria-label', isRed
            ? `Return target ${targetNumber} to green`
            : `Mark target ${targetNumber} red`);
        targetColumn.querySelector('.target-defect-toggle').disabled = isRed;
        saveTargetCardStatus(targetCard);
        updateDrillStatus();
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
            },
            {
                input: document.getElementById(isEditForm ? 'editDrillDuration' : 'drillDuration'),
                label: 'Duration in seconds',
                valid: () => {
                    const seconds = Number(form.querySelector(`#${isEditForm ? 'editDrillDuration' : 'drillDuration'}`)?.value);
                    return Number.isSafeInteger(seconds) && seconds > 0;
                }
            },
            { input: document.getElementById(isEditForm ? 'editDrillOwner' : 'drillOwner'), label: 'Owner' }
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
            .slice(0, defaultDrillLimit)
            .map((drill, index) => [`database-drill-${index}`, {
                name: drill.drillName.trim(),
                sequence: Array.isArray(drill.sequence) ? drill.sequence : [],
                duration: getDrillDuration(drill),
                status: 'available'
            }]));
    };

    const getDrillDuration = (drill) => {
        const totalMilliseconds = (drill?.sequence || []).reduce((total, step) => (
            total + (Number(step?.timeMs) || 0)
        ), 0);

        return Math.round(totalMilliseconds / 1000);
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

    const formatDuration = (seconds) => {
        const totalSeconds = Number(seconds) || 0;
        return `${totalSeconds} ${totalSeconds === 1 ? 'second' : 'seconds'}`;
    };

    const parseDuration = (value) => {
        const seconds = Number(String(value || '').trim());
        return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 0;
    };

    const getOwners = (drill) => {
        if (Array.isArray(drill?.owners) && drill.owners.length > 0) {
            return drill.owners.join(', ');
        }

        return 'Unassigned';
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
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? filterDefaultDrillEntries(parsed)
                : {};
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
        document.getElementById('editDrillDuration').value = drill.duration ? String(drill.duration) : '';
        document.getElementById('editDrillOwner').value = Array.isArray(drill.owners) && drill.owners.length ? drill.owners[0] : '';

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

    const renderDrills = (drills) => {
        const entries = Object.entries(drills || {});

        if (!entries.length) {
            drillList.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info mb-0">No drills have been added yet.</div>
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
                        <div><dt>Duration</dt><dd>${formatDuration(drill?.duration)}</dd></div>
                        <div><dt>Owner</dt><dd>${getOwners(drill).replace(/</g, '&lt;')}</dd></div>
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
            databaseDrills = Array.isArray(payload?.drills) ? payload.drills.slice(0, defaultDrillLimit) : [];

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
        const durationValue = String(formData.get('drillDuration') || '').trim();
        const owner = String(formData.get('drillOwner') || '').trim();

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
            owners: owner ? [owner] : [],
            targets: targetNumbers,
            duration: parseDuration(durationValue),
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
        const durationValue = String(formData.get('editDrillDuration') || '').trim();
        const owner = String(formData.get('editDrillOwner') || '').trim();

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
            owners: owner ? [owner] : [],
            targets: targetNumbers,
            duration: parseDuration(durationValue),
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

    loadDrills();
}
