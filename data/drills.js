if (document.getElementById('drillList')) {
    const drillList = document.getElementById('drillList');
    const drillForm = document.getElementById('newDrillForm');
    const editDrillForm = document.getElementById('editDrillForm');
    const editDrillSaved = document.getElementById('editDrillSaved');
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

        editDrillSaved.hidden = true;
        document.getElementById('editDrillId').value = drillId;
        document.getElementById('editDrillName').value = drill.name || '';
        setSelectedValues(editTargetNumberSelect, Array.isArray(drill.targets) ? drill.targets : []);
        document.getElementById('editDrillDuration').value = drill.duration ? String(drill.duration) : '';
        document.getElementById('editDrillOwner').value = Array.isArray(drill.owners) && drill.owners.length ? drill.owners[0] : '';

        const editModal = new bootstrap.Modal(document.getElementById('editDrillModal'));
        editModal.show();
    };

    editDrillForm?.addEventListener('input', () => {
        editDrillSaved.hidden = true;
    });
    editDrillForm?.addEventListener('change', () => {
        editDrillSaved.hidden = true;
    });

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
        editDrillSaved.hidden = false;
    });

    loadDrills();
}
