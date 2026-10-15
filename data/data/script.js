const drillStatus = document.getElementById('drillStatus');
const liveDrillName = document.getElementById('liveDrillName');
const liveDrillStatus = document.getElementById('liveDrillStatus');
const liveDrillStep = document.getElementById('liveDrillStep');
const liveTargetActivity = document.getElementById('liveTargetActivity');
const liveDrillProgress = document.getElementById('liveDrillProgress');
const liveDrillStatusBadge = document.getElementById('liveDrillStatusBadge');
const liveDrillStatusCard = document.getElementById('liveDrillStatusCard');
const targetCards = document.querySelectorAll('.target-card');
const targetFilters = document.querySelectorAll('.target-filter');
const targetStatusStorageKey = 'cpd-target-status';
const drillLibraryStorageKey = 'cpd-drill-library';
const deletedDrillStorageKey = 'cpd-deleted-drills';
let databaseDrills = {};

const getCustomDrills = () => {
    const stored = localStorage.getItem(drillLibraryStorageKey);
    if (!stored) {
        return {};
    }

    try {
        const parsed = JSON.parse(stored);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
};

const saveCustomDrills = (drills) => {
    localStorage.setItem(drillLibraryStorageKey, JSON.stringify(drills || {}));
};

const getDeletedDrillIds = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(deletedDrillStorageKey) || '[]');
        return new Set(Array.isArray(stored) ? stored.map(String) : []);
    } catch (error) {
        return new Set();
    }
};

const saveDeletedDrillIds = (ids) => {
    localStorage.setItem(deletedDrillStorageKey, JSON.stringify(Array.from(ids)));
};

const normalizeDrillMap = (source = {}) => {
    if (!source || typeof source !== 'object') {
        return {};
    }

    const entries = Array.isArray(source) ? source.map((drill, index) => [String(index), drill]) : Object.entries(source);
    return Object.fromEntries(entries.filter(([, value]) => value && typeof value === 'object'));
};

const getDrills = () => getCustomDrills();
const getAllDrills = () => {
    const merged = { ...databaseDrills, ...getCustomDrills() };
    const deletedDrillIds = getDeletedDrillIds();
    return Object.fromEntries(
        Object.entries(merged).filter(([drillId, drill]) =>
            drill && typeof drill === 'object' && !deletedDrillIds.has(String(drillId))
        )
    );
};
const getDisplayDrills = () => getAllDrills();
const getDrillName = (drill) => drill?.name || drill?.drillName || 'Unnamed drill';

const getAssignedDrillIdsForTarget = (targetNumber) => {
    const status = getTargetStatus();
    const targetState = status[String(targetNumber)] || {};
    const drillIds = Array.isArray(targetState.activeDrillIds) ? targetState.activeDrillIds : [];
    return drillIds.filter((id) => typeof id === 'string' || typeof id === 'number');
};

const getAssignedDrillsForTarget = (targetNumber) => {
    const drillIds = getAssignedDrillIdsForTarget(targetNumber);
    const allDrills = getAllDrills();

    return drillIds
        .map((drillId) => allDrills[drillId])
        .filter(Boolean);
};

const getActiveTargetCards = () => Array.from(document.querySelectorAll('.target-card.is-red'));

const updateLiveDrillStatusDisplay = () => {
    const activeTargets = getActiveTargetCards();

    if (!activeTargets.length) {
        if (liveDrillName) {
            liveDrillName.textContent = 'No active drill';
        }
        if (liveDrillStatus) {
            liveDrillStatus.textContent = 'Idle';
        }
        if (liveDrillStep) {
            liveDrillStep.textContent = '—';
        }
        if (liveTargetActivity) {
            liveTargetActivity.textContent = 'All targets idle';
        }
        if (liveDrillProgress) {
                liveDrillProgress.textContent = '—';
        }
        if (liveDrillStatusBadge) {
            liveDrillStatusBadge.textContent = 'Idle';
            liveDrillStatusBadge.className = 'badge rounded-pill bg-secondary-subtle text-secondary-emphasis';
        }
        if (liveDrillStatusCard) {
            liveDrillStatusCard.classList.remove('border-danger');
            liveDrillStatusCard.classList.add('border-0');
        }
        return;
    }

    const assignedDrills = new Map();
    activeTargets.forEach((targetCard) => {
        const targetNumber = getTargetNumber(targetCard);
        const drillIds = getAssignedDrillIdsForTarget(targetNumber);
        const drills = getAllDrills();

        if (drillIds.length > 0) {
            drillIds.forEach((drillId) => {
                const drill = drills[drillId];
                if (drill) {
                    assignedDrills.set(String(drillId), drill);
                }
            });
        } else {
            assignedDrills.set(`target-${targetNumber}`, {
                name: `Target ${targetNumber} active`,
                sequence: []
            });
        }
    });

    const activeDrills = Array.from(assignedDrills.values());
    const drillNames = activeDrills.map((drill) => getDrillName(drill));
    const combinedDrillName = drillNames.length > 1 ? `${drillNames[0]} + ${drillNames.length - 1} more` : drillNames[0] || 'Target active';
    const statusText = activeDrills.length > 1 ? 'Multiple target groups active' : 'Targets active';
    const activeTargetNumbers = activeTargets.map(getTargetNumber).filter(Boolean);
    const targetActivity = `Target${activeTargetNumbers.length > 1 ? 's' : ''} ${activeTargetNumbers.join(', ')} active`;

    if (liveDrillName) {
        liveDrillName.textContent = combinedDrillName;
    }
    if (liveDrillStatus) {
        liveDrillStatus.textContent = statusText;
    }
    if (liveDrillStep) {
        liveDrillStep.textContent = 'Not tracked';
    }
    if (liveTargetActivity) {
        liveTargetActivity.textContent = targetActivity;
    }
    if (liveDrillProgress) {
        liveDrillProgress.textContent = 'Not tracked';
    }
    if (liveDrillStatusBadge) {
        liveDrillStatusBadge.textContent = activeDrills.length > 1 ? 'Multi' : 'Active';
        liveDrillStatusBadge.className = 'badge rounded-pill bg-danger-subtle text-danger-emphasis';
    }
    if (liveDrillStatusCard) {
        liveDrillStatusCard.classList.add('border-danger');
        liveDrillStatusCard.classList.remove('border-0');
    }
};

const getTargetStatus = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(targetStatusStorageKey) || '{}');
        return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
        return {};
    }
};

const saveTargetStatus = (status) => {
    localStorage.setItem(targetStatusStorageKey, JSON.stringify(status));
};

const getTargetNumber = (targetCard) => targetCard.closest('[data-target-number]')?.dataset.targetNumber;

const getDefectiveTargetNumbers = () => Array.from(document.querySelectorAll('.target-card.is-defective'))
    .map((card) => Number(getTargetNumber(card)))
    .filter((number) => Number.isFinite(number));

const updateDefectButtonState = (targetCard) => {
    const defectButton = targetCard.querySelector('.target-defect-toggle');
    if (!defectButton) {
        return;
    }

    const isRed = targetCard.classList.contains('is-red');
    const isDefective = targetCard.classList.contains('is-defective');
    const disabled = isRed && !isDefective;

    defectButton.disabled = disabled;
    defectButton.classList.toggle('is-disabled', disabled);
    defectButton.classList.toggle('is-active', isDefective);
    defectButton.setAttribute('aria-disabled', String(disabled));
    defectButton.setAttribute('title', disabled
        ? `Clear target ${getTargetNumber(targetCard)} from active drill before marking defective`
        : isDefective
            ? `Target ${getTargetNumber(targetCard)} is defective`
            : `Mark target ${getTargetNumber(targetCard)} defective`);
};

const updateSavedTargetStatus = (targetCard) => {
    const status = getTargetStatus();
    const targetNumber = getTargetNumber(targetCard);

    if (!targetNumber) {
        return;
    }

    const numericTarget = Number(targetNumber);
    if (!Number.isFinite(numericTarget)) {
        return;
    }

    const isDefective = targetCard.classList.contains('is-defective');
    const isRed = targetCard.classList.contains('is-red');
    const assignedDrillIds = isRed ? getAssignedDrillIdsForTarget(numericTarget) : [];

    status[String(numericTarget)] = {
        defective: isDefective,
        red: isRed,
        activeDrillIds: assignedDrillIds
    };
    saveTargetStatus(status);
};

const hydrateTargetCardState = (targetCard) => {
    const targetNumber = getTargetNumber(targetCard);
    const status = getTargetStatus();
    const targetState = status[targetNumber];

    if (!targetState || typeof targetState !== 'object') {
        return;
    }

    if (targetState.defective) {
        setTargetDefectiveState(targetCard, true, false);
    }

    if (targetState.red && !targetState.defective) {
        setTargetRedState(targetCard, true, false);
    }
};

const setTargetDefectiveState = (targetCard, isDefective, persist = true) => {
    targetCard.classList.toggle('is-defective', isDefective);

    if (isDefective) {
        targetCard.classList.remove('is-red');
        targetCard.setAttribute('aria-pressed', 'false');
    }

    const targetNumber = getTargetNumber(targetCard);
    const defectButton = targetCard.querySelector('.target-defect-toggle');

    if (defectButton) {
        const nextLabel = isDefective ? `Mark target ${targetNumber} usable` : `Mark target ${targetNumber} defective`;
        defectButton.setAttribute('aria-label', nextLabel);
        defectButton.setAttribute('title', isDefective ? `Target ${targetNumber} is defective` : `Mark target ${targetNumber} defective`);
    }

    if (isDefective) {
        targetCard.setAttribute('aria-label', `Target ${targetNumber} is defective`);
    } else {
        const hasRedTarget = targetCard.classList.contains('is-red');
        targetCard.setAttribute('aria-label', hasRedTarget
            ? `Return target ${targetNumber} to green`
            : `Mark target ${targetNumber} red`);
    }

    if (persist) {
        updateSavedTargetStatus(targetCard);
    }
    updateDefectButtonState(targetCard);
};

const setTargetRedState = (targetCard, isRed, persist = true) => {
    targetCard.classList.toggle('is-red', isRed);

    if (isRed) {
        targetCard.classList.remove('is-defective');
        targetCard.setAttribute('aria-pressed', 'true');
    } else {
        targetCard.setAttribute('aria-pressed', 'false');
        const targetNumber = getTargetNumber(targetCard);
        const status = getTargetStatus();
        if (targetNumber && status[String(targetNumber)]) {
            status[String(targetNumber)].activeDrillIds = [];
            saveTargetStatus(status);
        }
    }

    const targetNumber = getTargetNumber(targetCard);
    targetCard.setAttribute('aria-label', isRed
        ? `Return target ${targetNumber} to green`
        : `Mark target ${targetNumber} red`);

    if (persist) {
        updateSavedTargetStatus(targetCard);
    }
    updateDefectButtonState(targetCard);
};

if (targetCards.length && targetFilters.length) {
    const targetColumns = Array.from(targetCards, (targetCard) => targetCard.closest('[data-target-number]'));

    const applyTargetFilter = (filter) => {
        let visibleNumbers;
        const defectiveNumbers = new Set(getDefectiveTargetNumbers());

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
                .slice(0, 5);
        } else {
            visibleNumbers = targetColumns
                .map((column) => Number(column.dataset.targetNumber));
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
}

if (targetCards.length && drillStatus) {
    const assignmentModal = document.getElementById('drillAssignmentModal');
    const assignmentList = document.getElementById('drillAssignmentList');
    const assignmentTargetLabel = document.getElementById('drillAssignmentTargetLabel');
    const saveAssignmentButton = document.getElementById('saveDrillAssignments');
    let activeTargetForAssignment = null;

    const getVisibleDrillEntries = (drills) => Object.entries(drills || {});

    const renderDrillAssignments = (targetCard) => {
        const targetNumber = getTargetNumber(targetCard);
        const drillIds = getAssignedDrillIdsForTarget(targetNumber);
        const drills = getAllDrills();
        const visibleEntries = getVisibleDrillEntries(drills);
        const activeIds = new Set(drillIds.map(String));
        const defaultCheckedDrillIds = visibleEntries.slice(0, 5).map(([drillId]) => String(drillId));

        if (!assignmentList || !assignmentTargetLabel) {
            return;
        }

        assignmentTargetLabel.textContent = `Target ${targetNumber}`;
        const entries = visibleEntries.map(([drillId, drill]) => {
            const isDefaultChecked = defaultCheckedDrillIds.includes(String(drillId)) && !activeIds.has(String(drillId));
            const checked = activeIds.has(String(drillId)) || isDefaultChecked ? 'checked' : '';
            const name = getDrillName(drill);
            return `
                <label class="form-check-label d-flex align-items-center gap-2 p-2 border rounded bg-light">
                    <input class="form-check-input mt-0" type="checkbox" value="${drillId}" ${checked}>
                    <span>${name}</span>
                </label>
            `;
        });

        assignmentList.innerHTML = entries.length
            ? entries.join('')
            : '<div class="alert alert-info mb-0">No drills are available yet. Add one from the Drills page.</div>';
    };

    const openDrillAssignmentModal = (targetCard) => {
        if (!assignmentModal) {
            return;
        }

        activeTargetForAssignment = targetCard;
        renderDrillAssignments(targetCard);
        const modal = bootstrap.Modal.getOrCreateInstance(assignmentModal);
        modal.show();
    };

    saveAssignmentButton?.addEventListener('click', () => {
        if (!activeTargetForAssignment) {
            return;
        }

        const selectedIds = Array.from(
            assignmentList?.querySelectorAll('input[type="checkbox"]:checked') || []
        ).map((checkbox) => checkbox.value);

        const targetNumber = getTargetNumber(activeTargetForAssignment);
        const status = getTargetStatus();
        const existingTargetStatus = status[String(targetNumber)] || {};

        status[String(targetNumber)] = {
            ...existingTargetStatus,
            red: true,
            defective: activeTargetForAssignment.classList.contains('is-defective'),
            activeDrillIds: selectedIds
        };

        saveTargetStatus(status);
        updateSavedTargetStatus(activeTargetForAssignment);
        updateDrillStatus();

        const modal = bootstrap.Modal.getInstance(assignmentModal);
        modal?.hide();
    });

    const updateDrillStatus = () => {
        const activeTargets = getActiveTargetCards();
        const activeDrillNames = activeTargets.flatMap((targetCard) => {
            const targetNumber = getTargetNumber(targetCard);
            const assignedDrills = getAssignedDrillsForTarget(targetNumber);
            if (assignedDrills.length > 0) {
                return assignedDrills.map((drill) => getDrillName(drill));
            }
            return [`Target ${targetNumber} active`];
        });

        drillStatus.classList.toggle('bg-danger', activeTargets.length > 0);
        drillStatus.classList.toggle('bg-primary', activeTargets.length === 0);

        if (activeTargets.length === 0) {
            drillStatus.textContent = 'There are no active drills';
            updateLiveDrillStatusDisplay();
            return;
        }

        const uniqueLabels = Array.from(new Set(activeDrillNames));
        drillStatus.textContent = uniqueLabels.length > 1 ? uniqueLabels.join(', ') : uniqueLabels[0] || 'Drill in Progress';
        updateLiveDrillStatusDisplay();
    };

    targetCards.forEach((targetCard) => {
        hydrateTargetCardState(targetCard);
        updateDefectButtonState(targetCard);

        const defectButton = targetCard.querySelector('.target-defect-toggle');

        defectButton?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (targetCard.classList.contains('is-red')) {
                return;
            }

            const isDefective = !targetCard.classList.contains('is-defective');
            setTargetDefectiveState(targetCard, isDefective);
            updateDrillStatus();
        });

        targetCard.addEventListener('click', () => {
            if (targetCard.classList.contains('is-defective')) {
                setTargetDefectiveState(targetCard, false);
                updateDrillStatus();
                return;
            }

            const isRed = !targetCard.classList.contains('is-red');
            setTargetRedState(targetCard, isRed, false);
            if (isRed) {
                openDrillAssignmentModal(targetCard);
            }
            updateSavedTargetStatus(targetCard);
            updateDrillStatus();
        });

        targetCard.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }

            event.preventDefault();
            if (targetCard.classList.contains('is-defective')) {
                setTargetDefectiveState(targetCard, false);
                updateDrillStatus();
                return;
            }

            const isRed = !targetCard.classList.contains('is-red');
            setTargetRedState(targetCard, isRed, false);
            if (isRed) {
                openDrillAssignmentModal(targetCard);
            }
            updateSavedTargetStatus(targetCard);
            updateDrillStatus();
        });
    });

    updateDrillStatus();
    fetch('database.json', { cache: 'no-store' })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load database.json')))
        .then((payload) => {
            databaseDrills = normalizeDrillMap(payload?.drills);
            updateDrillStatus();
        })
        .catch(() => {});
}

if (document.getElementById('drillList')) {
    const drillList = document.getElementById('drillList');
    const drillForm = document.getElementById('newDrillForm');
    const editDrillForm = document.getElementById('editDrillForm');
    const storageKey = drillLibraryStorageKey;
    const deleteDrillModalElement = document.getElementById('deleteDrillModal');
    const bootstrapModal = typeof bootstrap === 'undefined' ? null : bootstrap.Modal;
    const deleteDrillModal = deleteDrillModalElement && bootstrapModal ? new bootstrapModal(deleteDrillModalElement) : null;
    const deleteDrillName = document.getElementById('deleteDrillName');
    const confirmDeleteDrillButton = document.getElementById('confirmDeleteDrillButton');
    let pendingDeleteDrillId = null;

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
        form.querySelectorAll('input:not([type="hidden"])').forEach((input) => input.classList.remove('is-invalid'));
    };

    const validateDrillFields = (form) => {
        const isEditForm = form.id === 'editDrillForm';
        const fields = [
            { input: document.getElementById(isEditForm ? 'editDrillName' : 'drillName'), label: 'Name' },
            { input: document.getElementById(isEditForm ? 'editTargetNumber' : 'targetNumber'), label: 'Target number' },
            { input: document.getElementById(isEditForm ? 'editDrillDuration' : 'drillDuration'), label: 'Duration' },
            { input: document.getElementById(isEditForm ? 'editDrillOwner' : 'drillOwner'), label: 'Owner' }
        ];
        const missingFields = fields.filter(({ input }) => !input?.value.trim());

        if (!missingFields.length) {
            return { valid: true };
        }

        return {
            valid: false,
            message: `Please complete: ${missingFields.map(({ label }) => label).join(', ')}.`,
            invalidInputs: missingFields.map(({ input }) => input)
        };
    };

    const formatDuration = (seconds) => {
        const totalSeconds = Number(seconds) || 0;
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const parseDuration = (value) => {
        if (!value) return 0;

        const trimmed = String(value).trim();
        const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);

        if (colonMatch) {
            return Number(colonMatch[1]) * 60 + Number(colonMatch[2]);
        }

        const numericValue = Number(trimmed);
        return Number.isFinite(numericValue) ? Math.max(0, Math.round(numericValue)) : 0;
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

    const saveDrills = (drills) => {
        saveCustomDrills(drills);
    };

    const openEditModal = (drillId) => {
        const drills = getAllDrills();
        const drill = drills[drillId];

        if (!drill) {
            return;
        }

        document.getElementById('editDrillId').value = drillId;
        document.getElementById('editDrillName').value = drill.name || '';
        document.getElementById('editTargetNumber').value = Array.isArray(drill.targets) && drill.targets.length ? drill.targets[0] : '';
        document.getElementById('editDrillDuration').value = formatDuration(drill.duration);
        document.getElementById('editDrillOwner').value = Array.isArray(drill.owners) && drill.owners.length ? drill.owners[0] : '';

        const editModal = new bootstrap.Modal(document.getElementById('editDrillModal'));
        editModal.show();
    };

    const removeDeletedDrillReferences = (drillId) => {
        const status = getTargetStatus();

        Object.keys(status).forEach((targetKey) => {
            const targetState = status[targetKey];
            if (!targetState || !Array.isArray(targetState.activeDrillIds)) {
                return;
            }

            targetState.activeDrillIds = targetState.activeDrillIds.filter((id) => String(id) !== String(drillId));
        });

        saveTargetStatus(status);
    };

    const deleteDrill = (drillId) => {
        const savedDrills = getCustomDrills();

        if (!Object.prototype.hasOwnProperty.call(getAllDrills(), drillId)) {
            return;
        }

        delete savedDrills[drillId];
        saveCustomDrills(savedDrills);
        const deletedDrillIds = getDeletedDrillIds();
        deletedDrillIds.add(String(drillId));
        saveDeletedDrillIds(deletedDrillIds);
        removeDeletedDrillReferences(drillId);
        renderDrills(getAllDrills());
    };

    const renderDrills = (drills = getAllDrills()) => {
        const entries = Object.entries(drills || {});
        if (!entries.length) {
            drillList.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info mb-0">No drills have been added yet.</div>
                </div>
            `;
            return;
        }

        drillList.innerHTML = entries
            .map(([drillId, drill], index) => {
                const drillName = getDrillName(drill);
                const deleteButtonMarkup = `<button class="btn btn-danger delete-drill-btn" type="button" data-drill-id="${drillId}"><i class="bi bi-trash3 me-1" aria-hidden="true"></i>Delete</button>`;

                return `
            <div class="col">
                <article class="drill-ticket h-100">
                    <div class="drill-ticket-heading">
                        <span class="drill-ticket-label">Drill ${String(index + 1).padStart(2, '0')}</span>
                        <i class="bi bi-crosshair text-primary" aria-hidden="true"></i>
                    </div>
                    <h2 class="h4 mb-4">${drillName.replace(/</g, '&lt;')}</h2>
                    <dl class="drill-details">
                        <div><dt>Name</dt><dd>${drillName.replace(/</g, '&lt;')}</dd></div>
                        <div><dt>Target Number</dt><dd>${getTargets(drill)}</dd></div>
                        <div><dt>Duration</dt><dd>${formatDuration(drill?.duration)}</dd></div>
                        <div><dt>Owner</dt><dd>${getOwners(drill).replace(/</g, '&lt;')}</dd></div>
                    </dl>
                    <div class="drill-actions">
                        <button class="btn btn-secondary edit-drill-btn" type="button" data-drill-id="${drillId}"><i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit</button>
                        ${deleteButtonMarkup}
                    </div>
                </article>
            </div>
        `;
            })
            .join('');

        document.querySelectorAll('.edit-drill-btn').forEach((button) => {
            button.addEventListener('click', () => openEditModal(button.dataset.drillId));
        });

        document.querySelectorAll('.delete-drill-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const drillId = button.dataset.drillId;
                const drills = getAllDrills();
                const drillName = getDrillName(drills[drillId]);

                if (deleteDrillModal) {
                    pendingDeleteDrillId = drillId;
                    deleteDrillName.textContent = drillName;
                    deleteDrillModal.show();
                } else if (window.confirm(`Delete ${drillName}? This cannot be undone.`)) {
                    deleteDrill(drillId);
                }
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
        const savedDrills = getCustomDrills();

        try {
            const response = await fetch('database.json', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('Unable to load database.json');
            }

            const payload = await response.json();
            databaseDrills = normalizeDrillMap(payload?.drills);
            const mergedDrills = getAllDrills();

            renderDrills(mergedDrills);
        } catch (error) {
            databaseDrills = {};
            renderDrills(getAllDrills());
        }
    };

    drillForm?.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(drillForm);
        const name = String(formData.get('drillName') || '').trim();
        const targetNumber = String(formData.get('targetNumber') || '').trim();
        const durationValue = String(formData.get('drillDuration') || '').trim();
        const owner = String(formData.get('drillOwner') || '').trim();

        const validation = validateDrillFields(drillForm);
        if (!validation.valid) {
            showFormError(drillForm, validation.message, validation.invalidInputs);
            return;
        }

        const targetedNumber = Number(targetNumber);
        const defectiveTargets = getDefectiveTargetNumbers();
        if (Number.isFinite(targetedNumber) && defectiveTargets.includes(targetedNumber)) {
            const targetInput = document.getElementById('targetNumber');
            showFormError(drillForm, `Target ${targetNumber} is marked defective and unavailable for drills.`, [targetInput]);
            return;
        }

        clearFormError(drillForm);

        const currentDrills = getDrills();
        const nextDrillId = `drill-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        currentDrills[nextDrillId] = {
            name,
            owners: owner ? [owner] : [],
            targets: targetNumber ? [Number(targetNumber)] : [],
            duration: parseDuration(durationValue),
            status: 'available'
        };

        saveDrills(currentDrills);
        renderDrills(getDisplayDrills());

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
        const targetNumber = String(formData.get('editTargetNumber') || '').trim();
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

        const targetedNumber = Number(targetNumber);
        const defectiveTargets = getDefectiveTargetNumbers();
        if (Number.isFinite(targetedNumber) && defectiveTargets.includes(targetedNumber)) {
            const targetInput = document.getElementById('editTargetNumber');
            showFormError(editDrillForm, `Target ${targetNumber} is marked defective and unavailable for drills.`, [targetInput]);
            return;
        }

        clearFormError(editDrillForm);

        const currentDrills = getDrills();
        currentDrills[drillId] = {
            ...(databaseDrills[drillId] || currentDrills[drillId] || {}),
            name,
            owners: owner ? [owner] : [],
            targets: targetNumber ? [Number(targetNumber)] : [],
            duration: parseDuration(durationValue),
            status: 'available'
        };

        saveDrills(currentDrills);
        renderDrills(getDisplayDrills());

        const modal = bootstrap.Modal.getInstance(document.getElementById('editDrillModal'));
        if (modal) {
            modal.hide();
        }

        editDrillForm.reset();
    });

    loadDrills();
}
