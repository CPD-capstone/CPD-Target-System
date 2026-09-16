const drillStatus = document.getElementById('drillStatus');
const targetCards = document.querySelectorAll('.target-card');

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
            targetCard.setAttribute('aria-label', isRed ? 'Return target to green' : 'Mark target red');
            updateDrillStatus();
        });
    });
}

if (document.getElementById('drillList')) {
    const drillList = document.getElementById('drillList');
    const drillForm = document.getElementById('newDrillForm');
    const storageKey = 'cpd-drill-library';

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
                        <div><dt>Owner</dt><dd>${(getOwners(drill)).replace(/</g, '&lt;')}</dd></div>
                    </dl>
                    <div class="drill-actions">
                        <button class="btn btn-secondary" type="button"><i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit</button>
                        <button class="btn btn-danger" type="button"><i class="bi bi-trash3 me-1" aria-hidden="true"></i>Delete</button>
                    </div>
                </article>
            </div>
        `).join('');
    };

    const loadDrills = async () => {
        const saved = localStorage.getItem(storageKey);
        const savedDrills = saved ? JSON.parse(saved) : {};

        try {
            const response = await fetch('database.json', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('Unable to load database.json');
            }

            const payload = await response.json();
            const fileDrills = normalizeDrillMap(payload?.drills);
            const mergedDrills = { ...fileDrills, ...savedDrills };

            localStorage.setItem(storageKey, JSON.stringify(mergedDrills));
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

        if (!name) {
            alert('Please enter a drill name.');
            return;
        }

        const existing = localStorage.getItem(storageKey);
        const currentDrills = existing ? JSON.parse(existing) : {};
        const nextDrillId = `drill-${Date.now()}`;

        currentDrills[nextDrillId] = {
            name,
            owners: owner ? [owner] : [],
            targets: targetNumber ? [Number(targetNumber)] : [],
            duration: parseDuration(durationValue),
            status: 'available'
        };

        localStorage.setItem(storageKey, JSON.stringify(currentDrills));
        renderDrills(currentDrills);

        const modal = bootstrap.Modal.getInstance(document.getElementById('newDrillModal'));
        if (modal) {
            modal.hide();
        }

        drillForm.reset();
    });

    loadDrills();
}
