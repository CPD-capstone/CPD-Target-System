const loginForm = document.getElementById('loginForm');

if (loginForm) {
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username !== 'CPD Range Control' || password !== 'admin1234') {
            loginError.hidden = false;
            return;
        }

        loginError.hidden = true;
        window.location.href = 'targets.html';
    });
}

const drillStatus = document.getElementById('drillStatus');
const targetCards = document.querySelectorAll('.target-card');
const targetFilters = document.querySelectorAll('.target-filter');

if (targetCards.length && targetFilters.length) {
    const targetColumns = Array.from(targetCards, (targetCard) => targetCard.closest('[data-target-number]'));

    const applyTargetFilter = (filter) => {
        let visibleNumbers;

        if (filter === 'odd') {
            visibleNumbers = targetColumns
                .map((column) => Number(column.dataset.targetNumber))
                .filter((number) => number % 2 !== 0);
        } else if (filter === 'even') {
            visibleNumbers = targetColumns
                .map((column) => Number(column.dataset.targetNumber))
                .filter((number) => number % 2 === 0);
        } else if (filter === 'random') {
            visibleNumbers = targetColumns
                .map((column) => Number(column.dataset.targetNumber))
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
}

if (targetCards.length && drillStatus) {
    const updateDrillStatus = () => {
        const hasRedTarget = document.querySelector('.target-card.is-red');
        drillStatus.classList.toggle('bg-danger', hasRedTarget !== null);
        drillStatus.classList.toggle('bg-primary', hasRedTarget === null);
        drillStatus.textContent = hasRedTarget !== null
            ? 'Pistol Drill in Progress'
            : 'There are no active drills';
    };

    targetCards.forEach((targetCard) => {
        targetCard.addEventListener('click', () => {
            const isRed = targetCard.classList.toggle('is-red');
            targetCard.setAttribute('aria-pressed', isRed);
            const targetNumber = targetCard.closest('[data-target-number]')?.dataset.targetNumber;
            targetCard.setAttribute('aria-label', isRed
                ? `Return target ${targetNumber} to green`
                : `Mark target ${targetNumber} red`);
            updateDrillStatus();
        });
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

    const normalizeDrillMap = (source = {}) => {
        if (!source || typeof source !== 'object') {
            return {};
        }

        return Object.fromEntries(
            Object.entries(source).filter(([, value]) => value && typeof value === 'object')
        );
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

    const getDrills = () => {
        const stored = localStorage.getItem(storageKey);
        if (!stored) {
            return {};
        }

        try {
            return JSON.parse(stored);
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
        document.getElementById('editTargetNumber').value = Array.isArray(drill.targets) && drill.targets.length ? drill.targets[0] : '';
        document.getElementById('editDrillDuration').value = formatDuration(drill.duration);
        document.getElementById('editDrillOwner').value = Array.isArray(drill.owners) && drill.owners.length ? drill.owners[0] : '';

        const editModal = new bootstrap.Modal(document.getElementById('editDrillModal'));
        editModal.show();
    };

    const deleteDrill = (drillId) => {
        const drills = getDrills();
        delete drills[drillId];
        saveDrills(drills);
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
                        <div><dt>Target Number</dt><dd>${getTargets(drill)}</dd></div>
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

            saveDrills(mergedDrills);
            renderDrills(mergedDrills);
        } catch (error) {
            renderDrills(savedDrills || {});
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

        clearFormError(drillForm);

        const currentDrills = getDrills();
        const nextDrillId = `drill-${Date.now()}`;

        currentDrills[nextDrillId] = {
            name,
            owners: owner ? [owner] : [],
            targets: targetNumber ? [Number(targetNumber)] : [],
            duration: parseDuration(durationValue),
            status: 'available'
        };

        saveDrills(currentDrills);
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

        clearFormError(editDrillForm);

        const currentDrills = getDrills();
        currentDrills[drillId] = {
            ...currentDrills[drillId],
            name,
            owners: owner ? [owner] : [],
            targets: targetNumber ? [Number(targetNumber)] : [],
            duration: parseDuration(durationValue),
            status: 'available'
        };

        saveDrills(currentDrills);
        renderDrills(currentDrills);

        const modal = bootstrap.Modal.getInstance(document.getElementById('editDrillModal'));
        if (modal) {
            modal.hide();
        }

        editDrillForm.reset();
    });

    loadDrills();
}
