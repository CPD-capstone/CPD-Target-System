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
    const finishDrillButton = document.getElementById('finishDrillButton');
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
            pauseDrillButton.classList.toggle('btn-secondary', activeDemoDrillPaused);
            pauseDrillButton.classList.toggle('btn-outline-secondary', !activeDemoDrillPaused);
            pauseDrillButton.setAttribute('aria-pressed', String(activeDemoDrillPaused));
        }
        if (finishDrillButton) {
            finishDrillButton.disabled = !activeDemoDrillId;
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
            pauseDrillButton.classList.remove('btn-secondary');
            pauseDrillButton.classList.add('btn-outline-secondary');
            pauseDrillButton.setAttribute('aria-pressed', 'false');
        }
        if (finishDrillButton) {
            finishDrillButton.disabled = true;
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
                <span class="target-list-label">Target ${targetNumber}</span>
            </button>
            <div class="target-actions">
                <button class="target-defect-toggle" type="button" aria-label="Mark target ${targetNumber} defective" title="Mark target ${targetNumber} defective">
                    <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                    <span>Defect</span>
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
    const drillSelect = document.getElementById('drillSelect');
    const startDrillButton = document.getElementById('startDrillButton');
    const startDrillLabel = document.getElementById('startDrillLabel');
    const drillLaunchMessage = document.getElementById('drillLaunchMessage');
    const pauseDrillButton = document.getElementById('pauseDrillButton');
    const finishDrillButton = document.getElementById('finishDrillButton');
    let activeFilter = 'all';

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
        finishDrillButton.disabled = !activeDemoDrillId;

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

        // AI-assisted demo control: finish only this drill's targets without changing other targets.
        finishDrillButton.addEventListener('click', () => {
            if (!activeDemoDrillId) return;

            const finishedDrillId = activeDemoDrillId;
            const status = getSavedTargetStatus();
            Object.entries(status).forEach(([targetNumber, savedState]) => {
                const state = savedState && typeof savedState === 'object' && !Array.isArray(savedState)
                    ? savedState
                    : {};
                const activeDrillIds = Array.isArray(state.activeDrillIds) ? state.activeDrillIds.map(String) : [];
                if (!activeDrillIds.includes(finishedDrillId)) return;

                status[targetNumber] = {
                    ...state,
                    red: false,
                    activeDrillIds: activeDrillIds.filter((drillId) => drillId !== finishedDrillId)
                };
                const targetColumn = targetGrid.querySelector(`[data-target-number="${targetNumber}"]`);
                const targetCard = targetColumn?.querySelector('.target-card');
                if (targetCard) {
                    targetCard.classList.remove('is-red');
                    targetCard.setAttribute('aria-pressed', 'false');
                    targetCard.setAttribute('aria-label', `Mark target ${targetNumber} red`);
                    targetColumn.querySelector('.target-defect-toggle').disabled = unavailableTargets.has(Number(targetNumber));
                }
            });

            saveTargetStatus(status);
            activeDemoDrillId = '';
            activeDemoDrillPaused = false;
            localStorage.removeItem(activeDemoDrillStorageKey);
            localStorage.removeItem(pausedDemoDrillStorageKey);
            updateDrillStatus();
        });
    }

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
        const unavailable = unavailableTargets.has(Number(targetNumber));
        defectButton.setAttribute('aria-label', isUnavailable
            ? `Target ${targetNumber} is unavailable`
            : isDefective
                ? `Mark target ${targetNumber} usable`
                : `Mark target ${targetNumber} defective`);
        defectButton.disabled = isRed || isUnavailable;
        defectButton.classList.toggle('is-active', Boolean(savedState.defective));
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

    // AI-assisted target view preference; include this change in the PR's AI-use disclosure.
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
        const defectButton = event.target.closest('.target-defect-toggle');

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
