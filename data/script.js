const drillStatus = document.getElementById('drillStatus');
const targetFilters = document.querySelectorAll('.target-filter');
const targetGrid = document.getElementById('targetGrid');

const renderTargets = (targetIds) => {
    if (!targetGrid) return;

    targetGrid.innerHTML = targetIds.map((targetNumber) => `
        <div class="col d-flex justify-content-center" data-target-number="${targetNumber}">
            <button class="target-card" type="button" aria-pressed="false" aria-label="Mark target ${targetNumber} red">
                <span class="target-number" aria-hidden="true">${targetNumber}</span>
                <img src="uspsa-target.svg" width="150" height="180" alt="USPSA target">
            </button>
        </div>
    `).join('');

};

const initializeTargetPage = (targetIds) => {
    renderTargets(targetIds);

    const targetCards = document.querySelectorAll('.target-card');
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
};

if (targetGrid) {
    fetch('database.json', { cache: 'no-store' })
        .then((response) => response.json())
        .then((payload) => {
            const targetIds = (Array.isArray(payload?.targets) ? payload.targets : [])
                .map((target) => Number(target?.id))
                .filter((id) => Number.isInteger(id) && id >= 1 && id <= 20)
                .sort((first, second) => first - second);
            initializeTargetPage(targetIds.length ? targetIds : Array.from({ length: 20 }, (_, index) => index + 1));
        })
        .catch(() => initializeTargetPage(Array.from({ length: 20 }, (_, index) => index + 1)));
}

if (drillStatus && targetGrid) {
    const updateDrillStatus = () => {
        const hasRedTarget = document.querySelector('.target-card.is-red');
        drillStatus.classList.toggle('bg-danger', hasRedTarget !== null);
        drillStatus.classList.toggle('bg-primary', hasRedTarget === null);
        drillStatus.textContent = hasRedTarget !== null
            ? 'Pistol Drill in Progress'
            : 'There are no active drills';
    };

    targetGrid.addEventListener('click', (event) => {
        const targetCard = event.target.closest('.target-card');
        if (!targetCard) return;

        const isRed = targetCard.classList.toggle('is-red');
        targetCard.setAttribute('aria-pressed', isRed);
        const targetNumber = targetCard.closest('[data-target-number]')?.dataset.targetNumber;
        targetCard.setAttribute('aria-label', isRed
            ? `Return target ${targetNumber} to green`
            : `Mark target ${targetNumber} red`);
        updateDrillStatus();
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
    const drillNameSelect = document.getElementById('drillName');
    const editDrillNameSelect = document.getElementById('editDrillName');
    const targetNumberSelect = document.getElementById('targetNumber');
    const editTargetNumberSelect = document.getElementById('editTargetNumber');
    const drillDurationSelect = document.getElementById('drillDuration');
    const editDrillDurationSelect = document.getElementById('editDrillDuration');
    const drillOwnerSelect = document.getElementById('drillOwner');
    const editDrillOwnerSelect = document.getElementById('editDrillOwner');
    let pendingDeleteDrillId = null;
    let databaseDrills = [];

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
    };

    const validateDrillFields = (form) => {
        const isEditForm = form.id === 'editDrillForm';
        const targetFieldName = isEditForm ? 'editTargetNumber' : 'targetNumber';
        const fields = [
            { input: document.getElementById(isEditForm ? 'editDrillName' : 'drillName'), label: 'Name' },
            {
                input: document.getElementById(targetFieldName),
                label: 'Target number',
                valid: () => form.querySelector(`input[name="${targetFieldName}"]:checked`) !== null
            },
            { input: document.getElementById(isEditForm ? 'editDrillDuration' : 'drillDuration'), label: 'Duration' },
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

    const normalizeDrillMap = (source = []) => {
        if (!Array.isArray(source)) {
            return {};
        }

        return Object.fromEntries(source
            .filter((drill) => drill && typeof drill.drillName === 'string' && drill.drillName.trim())
            .map((drill, index) => [`database-drill-${index}`, {
                name: drill.drillName.trim(),
                sequence: Array.isArray(drill.sequence) ? drill.sequence : [],
                duration: getDrillDuration(drill),
                status: 'available'
            }]));
    };

    const populateDrillSelects = (drills) => {
        const selectedNames = [...new Set(Object.values(drills)
            .map((drill) => drill?.name)
            .filter(Boolean))];

        [drillNameSelect, editDrillNameSelect].forEach((select) => {
            if (!select) return;

            select.replaceChildren(new Option('Select a drill', ''));
            selectedNames.forEach((name) => select.add(new Option(name, name)));
        });
    };

    const getDrillDuration = (drill) => {
        const totalMilliseconds = (drill?.sequence || []).reduce((total, step) => (
            total + (Number(step?.timeMs) || 0)
        ), 0);

        return Math.round(totalMilliseconds / 1000);
    };

    const populateSelect = (select, placeholder, options) => {
        if (!select) return;

        select.replaceChildren(new Option(placeholder, ''));
        options.forEach(({ label, value }) => select.add(new Option(label, value)));
    };

    const populateDatabaseFields = (payload) => {
        const targets = (Array.isArray(payload?.targets) ? payload.targets : [])
            .map((target) => Number(target?.id))
            .filter((id) => Number.isInteger(id) && id >= 1 && id <= 20)
            .sort((first, second) => first - second);
        const owners = (Array.isArray(payload?.Officers) ? payload.Officers : [])
            .map((officer) => String(officer?.Name || '').trim())
            .filter(Boolean);
        const durations = [...new Set(databaseDrills
            .map(getDrillDuration)
            .filter((duration) => duration > 0))]
            .sort((first, second) => first - second)
            .map((duration) => ({ label: formatDuration(duration), value: String(duration) }));

        const targetOptions = targets.map((target) => ({ label: `Target ${target}`, value: String(target) }));
        const ownerOptions = [...new Set(owners)].map((owner) => ({ label: owner, value: owner }));
        [
            { container: targetNumberSelect, name: 'targetNumber' },
            { container: editTargetNumberSelect, name: 'editTargetNumber' }
        ].forEach(({ container, name }) => {
            if (!container) return;

            container.replaceChildren();
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
        [drillOwnerSelect, editDrillOwnerSelect].forEach((select) => populateSelect(select, 'Select an owner', ownerOptions));
        [drillDurationSelect, editDrillDurationSelect].forEach((select) => populateSelect(select, 'Select a duration', durations));
    };

    const setSelectedValues = (select, values) => {
        if (!select) return;
        const selectedValues = new Set(values.map((value) => String(value)));
        select.querySelectorAll('input[type="checkbox"]').forEach((input) => {
            input.checked = selectedValues.has(input.value);
        });
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
            databaseDrills = Array.isArray(payload?.drills) ? payload.drills : [];

            saveDrills(mergedDrills);
            populateDrillSelects(fileDrills);
            populateDatabaseFields(payload);
            renderDrills(mergedDrills);
        } catch (error) {
            populateDrillSelects(savedDrills || {});
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
        renderDrills(currentDrills);

        const modal = bootstrap.Modal.getInstance(document.getElementById('editDrillModal'));
        if (modal) {
            modal.hide();
        }

        editDrillForm.reset();
    });

    loadDrills();
}
