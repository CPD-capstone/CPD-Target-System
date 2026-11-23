// AI-generated (Claude): shared Q&A help button and modal, available from every page.
const faqGroups = [
    {
        title: 'Getting started',
        questions: [
            {
                question: 'How do I access the system?',
                answer: 'Open the system through its designated web interface on a supported device connected to the system’s network. Follow your administrator’s instructions for access.'
            },
            {
                question: 'Do I need special training to use it?',
                answer: 'Users should receive an introduction to the system’s controls, target operations, and safety procedures before operating it independently.'
            },
            {
                question: 'Where can I find the main features?',
                answer: 'Use the menu button to move between Range Control, Drills, Performance, and Settings.'
            }
        ]
    },
    {
        title: 'Target control and drills',
        questions: [
            {
                question: 'How do I start a training drill?',
                answer: 'On Range Control, choose a drill from the Run a drill selector. If the drill asks which targets to use, check them and press Confirm targets; the targets are listed under the drill buttons (tap Change to pick again). Press Start drill when the instructor confirms the range is ready. Follow all range safety procedures.'
            },
            {
                question: 'Can I pause or stop a drill?',
                answer: 'Use Pause to pause a running drill and Resume to continue. Stop ends the drill and freezes targets where they are. After a stop, use Reset only when it is safe to hide all targets.'
            },
            {
                question: 'Can I go back, redo, or skip a stage?',
                answer: 'Yes. While a drill is running or paused, a stage control appears under the drill buttons: the arrows go back or skip a stage, Redo restarts the current stage, and the numbered Part buttons jump to a part of it. Tap the stage name for a list of every stage and part to jump straight to any of them. Back, Redo, and Skip hide the targets and wait at the start of that stage or part until you press Resume. The targets hide and the drill waits at the start of that stage until you press Resume. Drills without stages move by part instead (a part is the steps between two yields). The status bar shows the stage and part you are on.'
            },
            {
                question: 'What is a qualification?',
                answer: 'A qualification (Pistol, Rifle, SWAT, or one you add) groups its drills on the Drills and Range Control pages and the scores officers earn on the Performance page. Use the chips on the Drills page to show one qualification\u2019s drills, and Manage qualifications to add one or delete a custom one (only while no scores are recorded under it). Put a drill in a qualification by checking it in the drill editor.'
            },
            {
                question: 'How do I create a drill?',
                answer: 'Open Drills and select Create Drill. Enter a name, then tap or drag Present, Delay, Hide, or Yield blocks into the sequence. Configure each block, arrange the steps, and select Save drill.'
            },
            {
                question: 'How do I change the order or remove a drill step?',
                answer: 'In the drill editor, drag steps to reorder them or use the up and down arrow controls. Use the X control on a step to remove it, then save the drill.'
            },
            {
                question: 'Can I add a description to a drill?',
                answer: 'Yes. In the drill editor, type a Description. It appears on the Range Control page when the drill is selected and while it is paused, so the instructor can brief the shooter. The qualification stages come with the descriptions from the department qualification sheets, with each timed section labelled Part 1, Part 2 and so on. A full drill\u2019s own description (such as a qualification\u2019s ammunition, target and scoring rules) shows on its card on the Drills page; Targets shows its stages.'
            },
            {
                question: 'Can I customize a drill?',
                answer: 'Yes. In the drill editor, Present and Hide steps can use all targets or a custom target selection; Present also supports choosing a random number of targets. Delay sets the wait time, and Yield hands control back to the operator until they press Start to continue.'
            },
            {
                question: 'How do I edit or delete a drill?',
                answer: 'Open Drills and use the controls on the drill’s card to edit or delete it. Built-in stages used by a full drill are protected; make a custom drill if you need a variation.'
            },
            {
                question: 'How do I control targets manually?',
                answer: 'On Range Control, turn on Manual mode, then use the target controls. Manual controls are locked while manual mode is off. Follow range procedures before moving targets.'
            },
            {
                question: 'Can I disable a malfunctioning target?',
                answer: 'Authorized personnel can open Settings, find Defective targets, and check the target that is unavailable. It will be excluded from drills and manual commands and shown as unavailable on Range Control. Clear the mark only after it has been checked and approved for use.'
            },
            {
                question: 'Can I see which targets are available?',
                answer: 'The Range Control page shows target status. Unavailable targets are marked visually; use Hide defective in the View controls to hide them from the grid without changing their status.'
            },
            {
                question: 'How do I switch between grid and list view?',
                answer: 'On Range Control, tap View to open the View section, then use the Grid view and List view buttons. Your display choice is saved on that device. Filter targets in the same section shows only the target numbers you enter, such as 1, 3, 5-8.'
            },
            {
                question: 'What is the target flip delay?',
                answer: 'It is how long a target takes to turn and face the shooter. Drill timers start counting after it, so the shooter gets the full time once the target is facing. Set it in Settings under Target flip delay after timing a real target; it is saved on the controller for every phone.'
            },
            {
                question: 'Can I change how the pages look?',
                answer: 'Yes. Open Settings and choose a Theme: Normal (light, blue) or Tactical (dark, olive green and coyote tan). The choice is saved on that phone only.'
            },
            {
                question: 'How do I change the delay before a drill starts?',
                answer: 'Open Settings and choose Instant, Set time, or Random under Drill start delay. A fixed delay can be set from 1 to 30 seconds; the setting is saved on that phone. The Range Control page shows the current setting under the drill buttons; tap Change there to jump to it.'
            }
        ]
    },
    {
        title: 'Performance and reports',
        questions: [
            {
                question: 'Does the system track officer performance?',
                answer: 'Qualification scores are associated with an officer and qualification type so authorized instructors can review recorded performance over time.'
            },
            {
                question: 'Can I view previous training sessions?',
                answer: 'The Performance page lists recorded qualification attempts. It does not provide a separate log of every drill session.'
            },
            {
                question: 'Can I search for a specific officer or session?',
                answer: 'On Performance, search by officer name or badge number. Use Filter to narrow qualification, score, or date, and Sort by to order results.'
            },
            {
                question: 'Can I export reports?',
                answer: 'On Performance, select Export PDF and use the browser’s print dialog to print or save the displayed report as a PDF.'
            },
            {
                question: 'How do I add an officer?',
                answer: 'Open Settings and find Officers. Enter the officer’s name and badge number, then select Add officer. The officer is saved on the controller and becomes available for score entry.'
            },
            {
                question: 'How do I change an officer’s name or badge number?',
                answer: 'Open Settings, find the officer under Officers, and select Edit. Change the name or badge number and select Save. Their recorded scores stay with them. Officers added from the department roster start with placeholder badge numbers (90001 and up) until their real numbers are entered.'
            },
            {
                question: 'How do I record qualification scores?',
                answer: 'Open Performance and select Add scores. Choose the officer and qualification, enter a score and date for each row, and select Save scores. Use Add another score to enter multiple attempts in one batch.'
            }
        ]
    },
    {
        title: 'Troubleshooting and safety',
        questions: [
            {
                question: 'What should I do if a target does not respond?',
                answer: 'Stop the drill if necessary, check the target’s displayed status, and notify the designated technical or range personnel. Do not attempt electrical or pneumatic repairs unless authorized.'
            },
            {
                question: 'What if the website loses connection?',
                answer: 'Do not assume that commands have been received. Stop the operation according to range procedures and have authorized personnel check the system connection before continuing.'
            },
            {
                question: 'What does a target unavailable status mean?',
                answer: 'It means a target was marked unavailable in Settings. It should not be selected or used until authorized personnel have addressed the issue and cleared its status.'
            },
            {
                question: 'Does the system replace range safety procedures?',
                answer: 'No. The system is an operational aid and does not replace instructor supervision, established range safety rules, or required safety checks.'
            },
            {
                question: 'Who should I contact if I need help?',
                answer: 'Contact the designated range administrator or authorized technical support personnel for assistance with system operation, hardware issues, or access.'
            }
        ]
    }
];

const faqButton = document.createElement('button');
faqButton.type = 'button';
faqButton.className = 'btn btn-primary faq-help-button';
faqButton.setAttribute('aria-label', 'Open questions and answers');
faqButton.setAttribute('aria-haspopup', 'dialog');
faqButton.setAttribute('aria-controls', 'faqModal');
faqButton.textContent = '?';

const faqModal = document.createElement('div');
faqModal.className = 'modal fade';
faqModal.id = 'faqModal';
faqModal.tabIndex = -1;
faqModal.setAttribute('aria-labelledby', 'faqModalTitle');
faqModal.setAttribute('aria-hidden', 'true');

const faqDialog = document.createElement('div');
faqDialog.className = 'modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg';
const faqContent = document.createElement('div');
faqContent.className = 'modal-content faq-modal-content';
const faqHeader = document.createElement('div');
faqHeader.className = 'modal-header';
const faqTitle = document.createElement('h2');
faqTitle.className = 'modal-title h5';
faqTitle.id = 'faqModalTitle';
faqTitle.textContent = 'Questions & answers';
const faqClose = document.createElement('button');
faqClose.type = 'button';
faqClose.className = 'btn-close';
faqClose.dataset.bsDismiss = 'modal';
faqClose.setAttribute('aria-label', 'Close');
faqHeader.append(faqTitle, faqClose);

const faqBody = document.createElement('div');
faqBody.className = 'modal-body';
faqGroups.forEach(({ title, questions }) => {
    const group = document.createElement('section');
    group.className = 'faq-group';
    const heading = document.createElement('h3');
    heading.className = 'h6 faq-group-title';
    heading.textContent = title;
    group.append(heading);

    questions.forEach(({ question, answer }) => {
        const item = document.createElement('details');
        item.className = 'faq-item';
        const summary = document.createElement('summary');
        summary.textContent = question;
        const response = document.createElement('p');
        response.textContent = answer;
        item.append(summary, response);
        group.append(item);
    });

    faqBody.append(group);
});

faqContent.append(faqHeader, faqBody);
faqDialog.append(faqContent);
faqModal.append(faqDialog);
document.body.append(faqButton, faqModal);
faqButton.addEventListener('click', () => {
    bootstrap.Modal.getOrCreateInstance(faqModal).show();
});
// AI-modified (Codex): deployed pages always contact the controller; tests inject their own adapter.
const uiAssetVersion = document.querySelector('meta[name="cpd-ui-version"]')?.content || '1.0.0';
const controllerFetch = (...args) => fetch(...args);
const controllerClient = ControllerClient.createControllerClient(controllerFetch);
const drillStatus = document.getElementById('drillStatus');
// AI-generated (Claude): the text inside the status bar.
const drillStatusText = document.getElementById('drillStatusText') || drillStatus;

// AI-modified (Claude): the status banner is static text now (it used to scroll).
// AI-modified (Claude): two lines: the drill name small on top (omitted when there is no drill)
// and a short state line in large type, so the pinned bar stays short.
const drillStatusName = document.createElement('span');
drillStatusName.className = 'drill-status-name';
const drillStatusState = document.createElement('span');
drillStatusState.className = 'drill-status-state';
drillStatusState.textContent = drillStatusText.textContent.trim(); // shown until the first poll
drillStatusName.hidden = true;
drillStatusText.replaceChildren(drillStatusName, drillStatusState);
const setDrillStatusText = (text, name = '') => {
    drillStatusName.textContent = name;
    drillStatusName.hidden = !name;
    drillStatusState.textContent = text;
};

// AI-generated (Claude): shared degraded-connection indicator. Backend integration should call
// window.setConnectionStatus('poor', rssi) or window.setConnectionStatus('none'); call it with
// null to hide the indicator.
const connectionAlert = document.createElement('button');
connectionAlert.type = 'button';
connectionAlert.className = 'connection-alert';
connectionAlert.hidden = true;
connectionAlert.setAttribute('aria-live', 'polite');
// AI-generated (Claude): the banner's current state (null, 'poor' or 'none') and the state the
// operator dismissed. A dismissal lasts until the state changes, not just until the next poll.
let connectionState = null;
let dismissedConnectionState = null;
connectionAlert.addEventListener('click', () => {
    dismissedConnectionState = connectionState;
    connectionAlert.hidden = true;
});
drillStatus.insertAdjacentElement('afterend', connectionAlert);

const setConnectionStatus = (state, rssi = null) => {
    const isPoor = state === 'poor';
    const isNone = state === 'none';
    // AI-generated (Claude): a new state clears an earlier dismissal so the banner shows again
    connectionState = isPoor || isNone ? state : null;
    if (connectionState !== dismissedConnectionState) dismissedConnectionState = null;
    const lastBanner = drillStatus;
    lastBanner.insertAdjacentElement('afterend', connectionAlert);
    connectionAlert.hidden = !connectionState || connectionState === dismissedConnectionState;
    connectionAlert.classList.toggle('connection-alert-poor', isPoor);
    connectionAlert.classList.toggle('connection-alert-none', isNone);
    connectionAlert.replaceChildren();
    const icon = document.createElement('span');
    icon.className = `connection-icon connection-icon-${isPoor ? 'poor' : 'none'}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = isPoor
        ? '<i class="bi bi-wifi"></i><b>!</b>'
        : '<i class="bi bi-wifi-off"></i>';
    const label = document.createElement('span');
    label.textContent = isPoor ? 'Poor connection' : 'No connection';
    connectionAlert.append(icon, label);
    const accessibleLabel = isPoor ? 'Poor connection. Tap to dismiss.' : 'No connection. Tap to dismiss.';
    connectionAlert.setAttribute('aria-label', accessibleLabel);
    connectionAlert.title = accessibleLabel;
};

window.setConnectionStatus = setConnectionStatus;
const fetchController = async (...args) => {
    try {
        // AI-generated (Codex): retain the existing read-call shape while bounding the body wait.
        const payload = await controllerClient.requestJson(...args);
        return { ok: true, json: async () => payload };
    } catch (error) {
        setConnectionStatus('none');
        throw error;
    }
};

/* TEMPORARILY DISABLED: query-string connection-state overrides used by webpage testing.
const connectionParams = new URLSearchParams(location.search);
const connectionDemoState = connectionParams.get('connection');
const connectionDemoRSSI = Number(connectionParams.get('rssi'));
if (connectionDemoState === 'poor' || connectionDemoState === 'none') {
    setConnectionStatus(connectionDemoState, connectionDemoRSSI);
}
*/

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
// AI-generated (Codex): failed availability reads never unlock default targets.
let targetAvailabilityReady = !targetGrid;
const targetStatusStorageKey = 'cpd-target-status';
const targetViewStorageKey = 'cpd-target-view';
// AI-generated (Claude): manual mode unlocks tapping targets to raise/hide them. Saved so the
// status bar on other pages shows it too.
const manualModeStorageKey = 'cpd-manual-mode';
let manualMode = localStorage.getItem(manualModeStorageKey) === 'true';

// AI-generated (Claude): status bar colors: blue = idle, amber = manual.
// AI-modified (Claude): dark = drill running or paused; red only for a latched Stop or a hardware
// fault, so red always means danger (like the Stop button).
const setStatusBarStyle = (state) => {
    drillStatus.classList.toggle('bg-primary', state === 'idle');
    drillStatus.classList.toggle('bg-dark', state === 'active');
    drillStatus.classList.toggle('bg-danger', state === 'alert');
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

// AI-generated (Claude): out of WiFi range, fetch() usually hangs instead of failing, which froze
// polling and left a stale banner up. Each poll now times out, failed polls retry quickly, and
// only the newest poll may update the page (an older, slower request can't overwrite it).
const STATUS_POLL_TIMEOUT_MS = 3000;
const STATUS_RETRY_MS = 1000;
let drillStatusPollId = 0;

const pollDrillStatus = async () => {
    clearTimeout(drillStatusTimer);
    const pollId = ++drillStatusPollId;
    const abort = new AbortController();
    const abortTimer = setTimeout(() => abort.abort(), STATUS_POLL_TIMEOUT_MS);
    let reached = false; // the controller answered (even with an error status)
    let status = null;
    try {
        status = await controllerClient.requestJson('/api/drill/status', { signal: abort.signal });
        reached = true;
        if (!['idle', 'running', 'paused'].includes(status?.state)
            || typeof status.hardwareReady !== 'boolean' || !Array.isArray(status.facing)) status = null;
    } catch {
        status = null;
    } finally {
        clearTimeout(abortTimer); // kept running until the body is read, so a stalled body times out too
    }
    if (pollId !== drillStatusPollId) return; // a newer poll started; it owns the page and the timer

    controllerStatus = status;
    if (!reached || !status) {
        setConnectionStatus('none');
    } else if (status) {
        // A successful reply means we are connected: only a measured weak signal shows a banner
        // ("unknown" = the controller couldn't look up this phone's signal, not a lost connection)
        setConnectionStatus(status.signal === 'weak' && Number.isFinite(status.rssi) ? 'poor' : null);
    }
    // An active drill takes precedence over a saved manual-mode preference (AI-assisted with Codex).
    if (manualMode && ['running', 'paused'].includes(controllerStatus?.state)) {
        manualMode = false;
        localStorage.removeItem(manualModeStorageKey);
    }
    controllerStatusListeners.forEach((listener) => listener(controllerStatus));
    const drillActive = controllerStatus && controllerStatus.state !== 'idle';
    // AI-modified (Claude): retry sooner while the controller can't be reached
    drillStatusTimer = setTimeout(pollDrillStatus, !reached ? STATUS_RETRY_MS : drillActive ? 500 : 3000);
};

// AI-generated (Claude): POSTs (or PUTs, via method) to the controller and throws an Error with
// the controller's message if it refuses. Never pass an empty "targets" list: the API reads []
// as ALL targets.
const postToController = async (path, body, method = 'POST') => {
    // AI-generated (Codex): preserve Stop availability even when release metadata differs.
    if (path !== '/api/stop') {
        if (window.cpdAssetFailure) throw new Error('A required page file could not load. Reload this page before continuing.');
    }
    return controllerClient.mutation(path, body, method);
};

// AI-generated (Codex): preserve controls' original availability while a form save owns them.
const lockFormControls = (form, extra = []) => {
    const controls = [...form.querySelectorAll('input, select, textarea, button'), ...extra];
    const states = controls.map((control) => [control, control.disabled]);
    controls.forEach((control) => { control.disabled = true; });
    return () => states.forEach(([control, disabled]) => { control.disabled = disabled; });
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

// AI-generated (Claude): plain-language description of the start delay, for the Targets page.
const describeStartDelay = (setting = getStartDelaySetting()) => {
    if (setting.mode === 'instant') return 'Start and Resume: instant, no delay';
    if (setting.mode === 'random') return 'Start and Resume: random 1 to 5 second delay first';
    return `Start and Resume: ${setting.seconds}-second delay first`;
};

const startDelayNoteText = document.getElementById('startDelayNoteText');
if (startDelayNoteText) {
    startDelayNoteText.textContent = describeStartDelay();
    // Another tab (e.g. Settings) changed it
    window.addEventListener('storage', (event) => {
        if (event.key === startDelayStorageKey) startDelayNoteText.textContent = describeStartDelay();
    });
    // Coming back to this page from Settings with the browser's Back button
    window.addEventListener('pageshow', () => { startDelayNoteText.textContent = describeStartDelay(); });
}

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
// AI-modified (Claude): "yield" is the new name of "pause" (kept so older drills still read as steps)
const basicDrillActions = new Set(['present', 'hide', 'yield', 'pause', 'delay']);
const isFullDrill = (drill) => (Array.isArray(drill?.sequence) ? drill.sequence : [])
    .some((step) => typeof step?.action === 'string' && !basicDrillActions.has(step.action));

// AI-modified (Claude): 'full' = runs other drills; 'stages' = a built-in single drill (tagged
// "builtIn": true in data/database.json); 'custom' = any other drill (made on the Drills page).
const getDrillCategory = (drillId, drill) => {
    if (isFullDrill(drill)) return 'full';
    return drill?.builtIn === true ? 'stages' : 'custom';
};

// AI-generated (Claude): a drill's qualifications (lower-case names): its own "qualifications",
// plus those of the stages it runs (a full drill counts under its stages' qualifications). Built-in
// drills on a controller whose database predates explicit tags fall back to their name prefix.
const drillQualificationList = (drill, allDrills, visited = new Set()) => {
    const name = drill?.name || drill?.drillName;
    const found = new Set();
    if (!drill || visited.has(name)) return found;
    visited.add(name);
    if (Array.isArray(drill.qualifications)) {
        drill.qualifications.forEach((qualification) => found.add(String(qualification).toLowerCase()));
    } else if (drill.builtIn === true) {
        const prefix = /^(pistol|rifle|swat) qual\b/i.exec(name || '');
        if (prefix) found.add(prefix[1].toLowerCase());
    }
    (Array.isArray(drill.sequence) ? drill.sequence : []).forEach((step) => {
        if (basicDrillActions.has(step?.action)) return;
        const stage = allDrills.find((other) => (other.name || other.drillName) === step?.action);
        drillQualificationList(stage, allDrills, visited).forEach((qualification) => found.add(qualification));
    });
    return found;
};

// AI-generated (Claude): qualification names for the Targets page's drill groups
let targetPageQualifications = ['Pistol', 'Rifle', 'SWAT'];

// AI-modified (Claude): drills come only from the controller (database.json); the phone-only
// drill library in localStorage is gone. Every drill is listed (no five-drill limit).
const getTargetDrillLibrary = (databaseDrills = []) => {
    const defaults = (Array.isArray(databaseDrills) ? databaseDrills : [])
        .filter((drill) => drill && typeof drill.drillName === 'string' && drill.drillName.trim())
        .map((drill, index) => [`database-drill-${index}`, {
            name: drill.drillName.trim(),
            sequence: Array.isArray(drill.sequence) ? drill.sequence : [],
            builtIn: drill.builtIn === true,
            qualifications: Array.isArray(drill.qualifications) ? drill.qualifications : undefined,
            // AI-generated (Claude): briefing text shown before the drill and at its pauses
            description: typeof drill.description === 'string' ? drill.description.trim() : ''
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

// AI-generated (Claude): stage navigation labels. The controller reports the current stage (or,
// for a drill without stages, the current part: the steps between its yield steps); the other
// stages' names come from the drill's own sequence, the same order the controller flattens it.
// pendingStageJump names the stage a Back / Redo / Skip is moving to while the controller hides
// the targets.
let pendingStageJump = '';

const drillStageNames = (drillName) => {
    const drill = Object.values(targetAssignmentDrills)
        .find((candidate) => (candidate.name || candidate.drillName) === drillName);
    return (Array.isArray(drill?.sequence) ? drill.sequence : [])
        .map((step) => step?.action)
        .filter((action) => typeof action === 'string' && !basicDrillActions.has(action));
};

// "Pistol Qual Full Drill" + "Pistol Qual Stage 2" -> "Stage 2": drop the leading words they share.
const shortStageName = (drillName, stageName) => {
    const drillWords = String(drillName).split(' ');
    const stageWords = String(stageName).split(' ');
    let shared = 0;
    while (shared < drillWords.length - 1 && shared < stageWords.length - 1
        && drillWords[shared].toLowerCase() === stageWords[shared].toLowerCase()) shared++;
    return stageWords.slice(shared).join(' ');
};

// Short name of stage (or part) index (0-based) of the drill in status.
const stageLabel = (status, index) => {
    if (status.stagesAreParts) return `Part ${index + 1}`;
    const name = index === status.stageIndex - 1 && status.stageName
        ? status.stageName
        : drillStageNames(status.drillName)[index];
    return name ? shortStageName(status.drillName, name) : `Stage ${index + 1}`;
};

// Stage label with its place in the drill: "Stage 2 of 5", "Part 2 of 3", "Warm-up (1 of 4)".
const stageLabelWithCount = (status, index) => {
    const label = stageLabel(status, index);
    const count = status.stageCount || 0;
    return /^(Stage|Part) \d+$/.test(label) ? `${label} of ${count}` : `${label} (${index + 1} of ${count})`;
};

// Where the next Back / Redo / Skip would go, mirroring stageJumpTarget() in target_manager.cpp.
const stageJumpTargets = (status) => {
    const current = (status?.stageIndex || 0) - 1;
    return {
        previous: current - 1,
        current,
        next: current + (status?.betweenStages ? 2 : 1)
    };
};

// AI-generated (Claude): parts in a stage drill (its yield steps + 1, nested drills included),
// mirroring how target_manager.cpp splits a stage into parts.
const countDrillPauses = (name, depth = 1) => {
    const drill = findDrillByName(name);
    if (!drill || depth > maxDrillNesting) return 0;
    return (Array.isArray(drill.sequence) ? drill.sequence : []).reduce((total, step) => (
        step?.action === 'yield' || step?.action === 'pause' ? total + 1
            : basicDrillActions.has(step?.action) ? total : total + countDrillPauses(step?.action, depth + 1)
    ), 0);
};
const stagePartCount = (stageName) => countDrillPauses(stageName) + 1;

// AI-generated (Claude): the part of the current stage that runs next (highlighted chip), or 0
// when the stage is finished (between stages).
const nextPartOfStage = (status) => {
    if (!status || status.betweenStages) return 0;
    if (status.state === 'paused' && status.stepAction === 'yield' && !status.stageRestartReady) return status.partIndex + 1;
    return status.partIndex;
};

// The status bar text for a running or paused drill.
// AI-modified (Claude): returns only the state line; the drill name goes on the line above it.
const describeDrillProgress = (status) => {
    const current = (status.stageIndex || 0) - 1;
    const count = status.stageCount || 0;
    const inSection = current >= 0 && count > 1;
    const partOfStage = !status.stagesAreParts && current >= 0 && status.partCount > 1;
    const stageText = inSection ? stageLabelWithCount(status, current) : '';
    let where = stageText;
    if (partOfStage && !status.betweenStages) {
        where += `${where ? ' · ' : ''}Part ${status.partIndex} of ${status.partCount}`;
    }
    const withWhere = (state) => (where ? `${where} · ${state}` : state);

    if (status.stageResetPending) return `Moving to ${pendingStageJump || 'another stage'}…`;
    if (status.state === 'running') return withWhere('Running');
    // The wording matches the Start button's label in each state (see updateDrillStatus)
    if (status.stageRestartReady) {
        // AI-modified (Claude): a part jump can land partway into a stage
        const readyPart = partOfStage && status.partIndex > 1 ? ` · Part ${status.partIndex} of ${status.partCount}` : '';
        return `${stageText}${readyPart}${stageText || readyPart ? ' · ' : ''}Ready`;
    }
    if (status.finalStageComplete) return `${stageLabel(status, current)} done · Press Finish`;
    if (status.betweenStages && current >= 0) {
        return `${stageLabel(status, current)} done · Next: ${stageLabel(status, current + 1)}`;
    }
    if (status.stepAction === 'yield' && partOfStage) {
        return `${stageLabel(status, current)} · Part ${status.partIndex} done · Next: Part ${status.partIndex + 1}`;
    }
    // AI-modified (Claude): at a yield step the drill is waiting for the operator, not paused
    if (status.stepAction === 'yield') return withWhere('Waiting for you');
    return withWhere('Paused');
};

// AI-modified (Claude): draws the status bar (every page) and, on the Targets page, the drill
// buttons, from the controller's last status reply instead of the old frontend-only demo
// state. Card colors are set by the Targets page's own status listener (initializeTargetPage).
const manualTargetsAvailable = () => targetAvailabilityReady && manualMode && controllerStatus?.hardwareReady
    && controllerStatus.state === 'idle' && !controllerStatus.stopped && !cancelStartCountdown;

// AI-generated (Claude): whether the last status reply had a drill running or paused
let lastKnownDrillActive = false;

const updateDrillStatus = () => {
    if (!drillStatus) return;

    const status = controllerStatus;
    const state = status?.state || 'idle';
    const drillActive = state !== 'idle';
    const stopped = Boolean(status?.stopped);
    const drillName = status?.drillName || 'Drill';

    // Status bar colors: blue = idle, dark = drill running / paused, red = stopped / fault, amber = manual.
    if (!status) {
        setStatusBarStyle('idle');
        setDrillStatusText('Target controller not connected');
    } else if (!status.hardwareReady) {
        setStatusBarStyle('alert');
        setDrillStatusText('Target hardware not ready');
    } else if (stopped) {
        setStatusBarStyle('alert');
        setDrillStatusText('Stopped · targets frozen', 'Press Reset to hide them');
    } else if (state === 'paused' || state === 'running') {
        // AI-modified (Claude): names the stage and part, and what Resume will do next.
        setStatusBarStyle('active');
        setDrillStatusText(describeDrillProgress(status), status.drillName || 'Drill');
    } else if (manualMode) {
        setStatusBarStyle('manual');
        setDrillStatusText('Manual mode');
    } else {
        setStatusBarStyle('idle');
        setDrillStatusText('No drill in progress');
    }

    // AI-generated (Claude): pin the bar to the top only while there is a drill to follow (or a
    // latched Stop); otherwise it scrolls away with the page.
    drillStatus.classList.toggle('is-pinned', Boolean(status) && (drillActive || stopped));

    if (!targetGrid) return;

    const startDrillButton = document.getElementById('startDrillButton');
    const startDrillLabel = document.getElementById('startDrillLabel');
    const pauseDrillButton = document.getElementById('pauseDrillButton');
    const stopDrillButton = document.getElementById('stopDrillButton');
    const resetTargetsButton = document.getElementById('resetTargetsButton');
    const resetStageButton = document.getElementById('resetStageButton');
    const previousStageButton = document.getElementById('previousStageButton');
    const nextStageButton = document.getElementById('nextStageButton');
    const drillSelect = document.getElementById('drillSelect');

    // AI-generated (Claude): manual mode button, and target taps unlocked only in manual mode.
    const manualModeButton = document.getElementById('manualModeButton');
    if (manualModeButton) {
        manualModeButton.classList.toggle('btn-warning', manualMode);
        manualModeButton.classList.toggle('btn-outline-dark', !manualMode);
        manualModeButton.setAttribute('aria-pressed', String(manualMode));
        manualModeButton.disabled = !targetAvailabilityReady || !status?.hardwareReady || stopped || Boolean(cancelStartCountdown);
        document.getElementById('manualModeLabel').textContent = manualMode ? 'Exit manual mode' : 'Turn on manual mode';
    }
    const manualModeHintText = document.getElementById('manualModeHintText');
    if (manualModeHintText) {
        manualModeHintText.textContent = !status
            ? 'Connection lost. Manual target controls are locked.'
            : stopped
                ? 'Stopped: press Reset before using manual target controls.'
                : !status.hardwareReady
                    ? 'Target hardware is not ready. Manual target controls are locked.'
                    : manualTargetsAvailable()
                        ? 'Unlocked: tap a target or use the toggle buttons.'
                        : 'Locked: turn on manual mode to toggle targets.';
        document.getElementById('manualModeHintIcon').className = manualTargetsAvailable() ? 'bi bi-unlock-fill' : 'bi bi-lock-fill';
    }
    document.body.classList.toggle('is-manual-mode', Boolean(manualTargetsAvailable()));
    // AI-generated (Claude): the All / Odd / Even / Random buttons only appear once manual mode is on.
    const manualToggleGroup = document.querySelector('.target-filter-group');
    if (manualToggleGroup) manualToggleGroup.hidden = !manualMode;
    document.querySelectorAll('.target-toggle').forEach((button) => {
        button.disabled = !manualTargetsAvailable();
    });
    document.querySelectorAll('.target-card').forEach((button) => {
        button.disabled = !manualTargetsAvailable() || button.classList.contains('is-defective');
    });

    // Start doubles as Resume while the controller is paused (operator pause or a "yield" step).
    // AI-modified (Claude): the label says what Resume starts next.
    const jumpTargets = stageJumpTargets(status);
    if (startDrillLabel) {
        let label = 'Start drill';
        if (state === 'paused' && status) {
            const count = status.stageCount || 0;
            if (status.finalStageComplete) label = 'Finish drill';
            else if (status.stageRestartReady && !status.stagesAreParts && status.partCount > 1 && status.partIndex > 1) {
                label = `Start part ${status.partIndex}`; // AI-generated (Claude): after a part jump
            } else if (status.stageRestartReady && count > 1) label = `Start ${stageLabel(status, jumpTargets.current)}`;
            else if (status.betweenStages && jumpTargets.current + 1 < count) label = `Start ${stageLabel(status, jumpTargets.current + 1)}`;
            else if (status.stepAction === 'yield' && !status.stagesAreParts && status.partCount > 1 && !status.betweenStages) {
                label = `Start part ${status.partIndex + 1}`;
            } else label = status.stepAction === 'yield' ? 'Continue drill' : 'Resume drill';
        }
        startDrillLabel.textContent = label;
    }
    const countingDown = Boolean(cancelStartCountdown);
    // Lock Reset and Resume together without blocking Stop (AI-assisted with Codex).
    const stageControlsLocked = !targetAvailabilityReady || !status?.hardwareReady || manualMode || stopped || countingDown
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
    // Keep Stop reachable when a status poll loses the connection.
    // AI-modified (Claude): Stop and Reset live in the bar pinned to the bottom of the screen,
    // shown only while one of them can act. A lost connection keeps Stop up only if a drill was
    // active when it dropped (so the bar doesn't flash on every page load before the first poll).
    // Not shown in manual mode (by request): targets only move there when tapped, and Exit manual
    // mode hides them all.
    if (status) lastKnownDrillActive = drillActive;
    const stopAvailable = !stopped && (drillActive || countingDown || (!status && lastKnownDrillActive));
    if (stopDrillButton) {
        stopDrillButton.disabled = !stopAvailable;
        stopDrillButton.hidden = !stopAvailable;
    }
    if (resetTargetsButton) resetTargetsButton.hidden = !stopped;
    const drillActionBar = document.getElementById('drillActionBar');
    if (drillActionBar) {
        drillActionBar.hidden = !stopAvailable && !stopped;
        document.body.classList.toggle('has-action-bar', !drillActionBar.hidden);
    }
    // AI-modified (Claude): compact stage control, shown while a drill is running or paused:
    // ‹ / › move a stage (a part, for a drill without stages), the middle button names the current
    // stage and opens the jump list, Redo restarts the stage, and the chips jump to a part of it.
    // Every move hides the targets and waits at the start of that stage or part for Resume.
    const stageCount = status?.stageCount || 0;
    const showStageNav = drillActive && !stopped && stageCount >= 1 && Boolean(status?.hardwareReady);
    const stageControl = document.getElementById('stageControl');
    if (stageControl) stageControl.hidden = !showStageNav;
    if (showStageNav && stageControl) {
        const sections = status.stagesAreParts ? 'part' : 'stage';
        const current = jumpTargets.current;
        document.getElementById('stageCurrentLabel').textContent = current >= 0
            ? stageLabelWithCount(status, current) : status.drillName;
        const setArrow = (button, enabled, label) => {
            button.disabled = stageControlsLocked || !enabled;
            button.setAttribute('aria-label', label);
            button.title = label;
            button.hidden = stageCount < 2; // one stage (or part): nothing to go back or skip to
        };
        setArrow(previousStageButton, status.canGoBack,
            status.canGoBack ? `Back to ${stageLabel(status, jumpTargets.previous)}` : `No earlier ${sections}`);
        setArrow(nextStageButton, status.canSkip,
            status.canSkip ? `Skip to ${stageLabel(status, jumpTargets.next)}` : `No later ${sections}`);
        resetStageButton.disabled = stageControlsLocked || !status.canResetStage;
        document.getElementById('resetStageLabel').textContent = status.stagesAreParts && stageCount === 1 ? 'Restart' : 'Redo';
        resetStageButton.title = current >= 0 ? `Redo ${stageLabel(status, current)}` : `Redo ${sections}`;
        const showChips = !status.stagesAreParts && status.partCount > 1 && current >= 0;
        const listButton = document.getElementById('stageJumpListButton');
        listButton.disabled = stageControlsLocked || (stageCount < 2 && !showChips);

        // Part chips for the current stage: done parts muted, the part that runs next filled
        const chips = document.getElementById('partChips');
        chips.hidden = !showChips;
        if (showChips) {
            const chipBox = document.getElementById('partChipButtons');
            if (chipBox.children.length !== status.partCount) {
                chipBox.replaceChildren(...Array.from({ length: status.partCount }, (_, index) => {
                    const chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'btn btn-sm part-chip';
                    chip.dataset.part = String(index + 1);
                    chip.textContent = String(index + 1);
                    return chip;
                }));
            }
            const next = nextPartOfStage(status);
            Array.from(chipBox.children).forEach((chip) => {
                const part = Number(chip.dataset.part);
                const isNext = part === next;
                const isDone = next ? part < next : true;
                chip.classList.toggle('btn-primary', isNext);
                chip.classList.toggle('btn-outline-secondary', !isNext);
                chip.classList.toggle('is-done', isDone && !isNext);
                chip.disabled = stageControlsLocked || !status.canResetStage;
                chip.setAttribute('aria-current', isNext ? 'step' : 'false');
                chip.setAttribute('aria-label', `Jump to ${stageLabel(status, current)}, part ${part}${isNext ? ' (next)' : isDone ? ' (done)' : ''}`);
            });
        }
    }
    if (drillSelect) drillSelect.disabled = manualMode || drillActive || stopped || countingDown;

    // AI-generated (Claude): the drill buttons appear once a drill is selected (or one is running
    // or counting down).
    const showDrillButtons = (Boolean(drillSelect?.value) && !manualMode) || drillActive || countingDown;
    // AI-modified (Claude): Start / Resume and Pause share one slot: Pause while the drill runs,
    // Start (or Resume) otherwise.
    if (startDrillButton) startDrillButton.hidden = !showDrillButtons || state === 'running';
    if (pauseDrillButton) pauseDrillButton.hidden = !showDrillButtons || state !== 'running';
    renderDrillDescription(status, drillSelect);
    renderDrillTargetSummary();
};

// AI-generated (Claude): the description panel on Targets, for briefing the shooter. Before a drill
// starts it shows the selected drill (and, for a full drill, its first stage); while paused it shows
// the stage that will run next. Hidden while a drill runs, after Stop, and in manual mode.
const findDrillByName = (name) => Object.values(targetAssignmentDrills)
    .find((drill) => (drill.name || drill.drillName) === name);

// AI-generated (Claude): set by the Targets page; redraws the confirmed-targets line.
let renderDrillTargetSummary = () => {};

// AI-generated (Claude): writes a description one line per row and marks the "Part n" line that
// runs next (nextPart, 1-based; 0 = none) so the instructor can see which section is coming up.
const renderDescriptionText = (element, text, nextPart) => {
    element.replaceChildren(...String(text).split('\n').map((line) => {
        const row = document.createElement('span');
        row.className = 'drill-description-line';
        const part = /^Part (\d+)\b/.exec(line);
        if (part && Number(part[1]) === nextPart) {
            row.classList.add('is-next-part');
            const tag = document.createElement('strong');
            tag.className = 'drill-description-next';
            tag.textContent = 'Next';
            row.append(tag, ' ');
        }
        row.append(line);
        return row;
    }));
};

// AI-generated (Claude): whether the description panel is collapsed (per tab)
const drillDescriptionStorageKey = 'cpd-description-collapsed';
const drillDescriptionCollapsed = () => {
    try {
        return sessionStorage.getItem(drillDescriptionStorageKey) === 'true';
    } catch {
        return false;
    }
};
document.getElementById('drillDescriptionToggle')?.addEventListener('click', () => {
    try {
        sessionStorage.setItem(drillDescriptionStorageKey, String(!drillDescriptionCollapsed()));
    } catch {
        // storage unavailable: the panel just stays as it is
    }
    updateDrillStatus();
});

const renderDrillDescription = (status, drillSelect) => {
    const panel = document.getElementById('drillDescription');
    if (!panel) return;
    const state = status?.state || 'idle';
    let drill = null;
    let stageIndex = -1; // stage of a full drill to describe below the drill's own text
    if (state === 'idle' && !manualMode && !status?.stopped && !cancelStartCountdown) {
        drill = targetAssignmentDrills[drillSelect?.value] || null;
        stageIndex = drill && isFullDrill(drill) ? 0 : -1;
    } else if (state === 'paused' && !status.stopped && !status.finalStageComplete) {
        drill = findDrillByName(status.drillName);
        if (drill && !status.stagesAreParts) {
            const current = (status.stageIndex || 0) - 1;
            stageIndex = status.betweenStages && !status.stageRestartReady ? current + 1 : current;
        }
    }
    const name = drill ? (drill.name || drill.drillName) : '';
    const stageName = stageIndex >= 0 ? drillStageNames(name)[stageIndex] : '';
    const stage = stageName ? findDrillByName(stageName) : null;
    // AI-modified (Claude): a full drill's own description holds the qualification's overall rules
    // (ammunition, target, scoring). It stays on the Drills page; Targets shows only the stages.
    const drillText = drill && !isFullDrill(drill) ? drill.description || '' : '';
    const stageText = stage?.description || '';
    panel.hidden = !drillText && !stageText;
    if (panel.hidden) return;

    // AI-generated (Claude): collapsed, only the header line ("Briefing: Stage 2") shows
    const collapsed = drillDescriptionCollapsed();
    const summaryName = stage ? shortStageName(name, stageName) : name;
    document.getElementById('drillDescriptionSummary').textContent = `Briefing: ${summaryName}`;
    document.getElementById('drillDescriptionBody').hidden = collapsed;
    const toggle = document.getElementById('drillDescriptionToggle');
    toggle.textContent = collapsed ? 'Show' : 'Hide';
    toggle.setAttribute('aria-expanded', String(!collapsed));

    const title = document.getElementById('drillDescriptionTitle');
    const text = document.getElementById('drillDescriptionText');
    title.textContent = name;
    // The drill's own parts (a drill without stages): the part Resume runs next
    let drillNextPart = 1;
    if (state === 'paused' && status.stagesAreParts) {
        drillNextPart = (status.stageIndex || 0) + (status.betweenStages && !status.stageRestartReady ? 1 : 0);
    }
    renderDescriptionText(text, drillText, drillNextPart);
    title.hidden = text.hidden = !drillText;
    const stageTitle = document.getElementById('drillStageDescriptionTitle');
    const stageBody = document.getElementById('drillStageDescriptionText');
    // "First up" before the drill, "Next up" when Resume starts a new stage, just the stage name
    // when paused partway through it
    const startsNewStage = state === 'paused'
        && (status.betweenStages || (status.stageRestartReady && !(status.partIndex > 1)));
    const stagePrefix = state === 'idle' ? 'First up: ' : startsNewStage ? 'Next up: ' : '';
    stageTitle.textContent = stage ? `${stagePrefix}${shortStageName(name, stageName)}` : '';
    // A full drill's stage: part 1 when it starts fresh, else the part after a pause inside it
    let stageNextPart = 1;
    if (state === 'paused' && !startsNewStage && status.partIndex) {
        stageNextPart = status.stepAction === 'yield' && !status.stageRestartReady ? status.partIndex + 1 : status.partIndex;
    }
    renderDescriptionText(stageBody, stageText, stageNextPart);
    stageTitle.hidden = stageBody.hidden = !stageText;
    stageTitle.classList.toggle('mt-2', Boolean(drillText));
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
                ? (status.stepAction === 'yield' ? 'Waiting for you to continue' : 'Paused · waiting for Resume')
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
            <button class="target-card" type="button" aria-pressed="false" aria-label="Raise target ${targetNumber}" disabled>
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
        // AI-modified (Claude): options are grouped by qualification (a drill is listed under its
        // first one; drills with none under Other), full drills first in each group.
        const drillEntries = Object.entries(targetAssignmentDrills)
            .filter(([, drill]) => drill && typeof (drill.name || drill.drillName) === 'string');
        const groupOrder = [...targetPageQualifications];
        const byGroup = new Map();
        drillEntries.forEach(([drillId, drill]) => {
            const own = drillQualificationList(drill, Object.values(targetAssignmentDrills));
            const group = groupOrder.find((name) => own.has(name.toLowerCase())) || 'Other';
            if (!byGroup.has(group)) byGroup.set(group, []);
            byGroup.get(group).push([drillId, drill]);
        });
        const drillGroups = [...groupOrder, 'Other']
            .filter((name) => byGroup.has(name))
            .map((name) => {
                const group = document.createElement('optgroup');
                group.label = name;
                const entries = byGroup.get(name)
                    .sort(([, first], [, second]) => Number(isFullDrill(second)) - Number(isFullDrill(first)));
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

        // AI-generated (Claude): targets confirmed in the picker, kept for the selected drill until
        // another drill is chosen. {drillId, targets}
        let confirmedTargets = null;

        // AI-generated (Claude): the selected drill and its confirmed targets survive going to
        // another page and back (e.g. Settings to change the start delay). Kept per tab in
        // sessionStorage, by drill name since option values are list positions.
        const drillSelectionStorageKey = 'cpd-drill-selection';
        const saveDrillSelection = () => {
            const option = drillSelect.selectedOptions[0];
            try {
                sessionStorage.setItem(drillSelectionStorageKey, JSON.stringify({
                    drillName: drillSelect.value ? option.text : '',
                    targets: confirmedTargets?.drillId === drillSelect.value ? confirmedTargets.targets : null
                }));
            } catch {
                // storage unavailable: the selection just won't carry over
            }
        };
        try {
            const saved = JSON.parse(sessionStorage.getItem(drillSelectionStorageKey) || 'null');
            const option = saved?.drillName && Array.from(drillSelect.options).find((item) => item.value && item.text === saved.drillName);
            if (option) {
                drillSelect.value = option.value;
                if (Array.isArray(saved.targets) && saved.targets.length) {
                    confirmedTargets = { drillId: option.value, targets: saved.targets.map(Number).filter(Number.isInteger) };
                }
            }
        } catch {
            // unreadable: start with nothing selected
        }

        // "1, 2, 3, 5, 7, 8" -> "1-3, 5, 7-8"
        const formatTargetList = (numbers) => {
            const sorted = [...numbers].sort((first, second) => first - second);
            const parts = [];
            for (let index = 0; index < sorted.length; index++) {
                const start = sorted[index];
                while (sorted[index + 1] === sorted[index] + 1) index++;
                parts.push(start === sorted[index] ? String(start) : `${start}-${sorted[index]}`);
            }
            return parts.join(', ');
        };

        const drillAsksForTargets = (drillId) => {
            const drill = targetAssignmentDrills[drillId];
            return Boolean(drill) && getDrillStepTargets(drill).usesAllTargets;
        };

        renderDrillTargetSummary = () => {
            const summary = document.getElementById('drillTargetSummary');
            if (!summary) return;
            const drillId = drillSelect.value;
            const idle = !controllerStatus || controllerStatus.state === 'idle';
            summary.hidden = !idle || manualMode || Boolean(controllerStatus?.stopped) || !drillAsksForTargets(drillId);
            if (summary.hidden) return;
            const confirmed = confirmedTargets?.drillId === drillId
                ? confirmedTargets.targets.filter((targetNumber) => !unavailableTargets.has(targetNumber))
                : [];
            document.getElementById('drillTargetSummaryText').textContent = confirmed.length
                ? `${confirmed.length === 1 ? 'Target' : 'Targets'}: ${formatTargetList(confirmed)}${confirmed.length > 1 ? ` (${confirmed.length})` : ''}`
                : 'No targets chosen yet';
            document.getElementById('changeDrillTargets').textContent = confirmed.length ? 'Change' : 'Choose targets';
        };
        document.getElementById('changeDrillTargets')?.addEventListener('click', () => {
            if (drillSelect.value) openDrillTargetPicker(drillSelect.value);
        });

        drillSelect.addEventListener('change', () => {
            drillLaunchMessage.hidden = true;
            drillLaunchMessage.textContent = '';
            // AI-modified (Claude): a drill that asks which targets to use opens the picker as soon
            // as it is selected; Start drill then runs on the confirmed targets.
            confirmedTargets = null;
            saveDrillSelection();
            updateDrillStatus();
            if (drillAsksForTargets(drillSelect.value)) openDrillTargetPicker(drillSelect.value);
        });

        startDrillButton.addEventListener('click', async () => {
            if (manualMode || stageControlRequestPending || controllerStatus?.stageResetPending) return;
            // While the controller is paused (operator pause or a "yield" step) this is Resume.
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
                // AI-modified (Claude): run on the targets confirmed in the picker; ask if none are
                const confirmed = confirmedTargets?.drillId === drillId
                    ? confirmedTargets.targets.filter((targetNumber) => !unavailableTargets.has(targetNumber))
                    : [];
                if (confirmed.length) runDrillOnTargets(drillId, confirmed);
                else openDrillTargetPicker(drillId);
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

            // AI-generated (Claude): start with the targets the last drill ran on. The controller
            // keeps them in RAM (status.targets while idle), so after a power cycle no drill has run
            // (lastOutcome "none") and every working target is checked instead.
            const lastRun = controllerStatus?.state === 'idle' && controllerStatus.lastOutcome !== 'none'
                ? new Set((controllerStatus.targets || []).map(Number).filter((n) => pickableTargets.includes(n)))
                : new Set();
            // AI-modified (Claude): reopening the picker (Change) keeps this drill's confirmed targets
            const confirmed = confirmedTargets?.drillId === drillId
                ? new Set(confirmedTargets.targets.filter((n) => pickableTargets.includes(n)))
                : new Set();
            const defaultTargets = confirmed.size ? confirmed : lastRun.size ? lastRun : new Set(pickableTargets);

            if (!pickableTargets.length) {
                pickerList.textContent = 'No targets are currently available.';
            } else {
                pickerList.replaceChildren(...pickableTargets.map((targetNumber) => {
                    const wrapper = document.createElement('label');
                    wrapper.className = 'target-option';
                    const input = document.createElement('input');
                    input.className = 'form-check-input';
                    input.type = 'checkbox';
                    input.checked = defaultTargets.has(targetNumber); // AI-modified (Claude): see lastRun
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
            // AI-modified (Claude): Confirm only records the targets and returns to the page, where
            // the summary line shows them and Start drill runs the drill.
            confirmedTargets = { drillId: pickerDrillId, targets: selectedTargets };
            saveDrillSelection();
            drillLaunchMessage.hidden = true;
            // Close fully even if the picker is still opening (AI-assisted with Codex).
            const hidePicker = () => bootstrapModal.getInstance(pickerModalElement)?.hide();
            pickerModalElement.addEventListener('shown.bs.modal', hidePicker, { once: true });
            pickerModalElement.addEventListener('hidden.bs.modal', () => {
                pickerModalElement.removeEventListener('shown.bs.modal', hidePicker);
            }, { once: true });
            hidePicker();
            updateDrillStatus();
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

        // AI-modified (Claude): Back / Redo / Skip. Works while running or paused; the controller
        // hides the targets, moves to that stage and waits for Resume. Polling reports when it is
        // ready. A pending Resume countdown is cancelled first.
        // AI-modified (Claude): label names where the move goes, for the status bar meanwhile
        const sendStageJump = async (path, label, body) => {
            if (stageControlRequestPending || manualMode || !controllerStatus
                || controllerStatus.state === 'idle' || controllerStatus.stopped) return;
            cancelStartCountdown?.();
            pendingStageJump = label;
            stageControlRequestPending = true;
            updateDrillStatus();
            try {
                await postToController(path, body);
                drillLaunchMessage.hidden = true;
            } catch (error) {
                showLaunchMessage(error.message);
            } finally {
                await pollDrillStatus();
                stageControlRequestPending = false;
                updateDrillStatus();
            }
        };
        const jumpLabel = (which) => {
            const targets = stageJumpTargets(controllerStatus);
            return stageLabel(controllerStatus, targets[which]);
        };
        document.getElementById('previousStageButton')?.addEventListener('click', () =>
            sendStageJump('/api/drill/previous-stage', jumpLabel('previous')));
        document.getElementById('nextStageButton')?.addEventListener('click', () =>
            sendStageJump('/api/drill/next-stage', jumpLabel('next')));
        document.getElementById('resetStageButton')?.addEventListener('click', () =>
            sendStageJump('/api/drill/reset-stage', jumpLabel('current')));
        // Part chips: jump to that part of the current stage
        document.getElementById('partChipButtons')?.addEventListener('click', (event) => {
            const chip = event.target.closest('.part-chip');
            if (!chip || chip.disabled || !controllerStatus?.stageIndex) return;
            const part = Number(chip.dataset.part);
            sendStageJump('/api/drill/jump', `${jumpLabel('current')} · Part ${part}`,
                { stage: controllerStatus.stageIndex, part });
        });

        // AI-generated (Claude): jump list: every stage of the running drill (or every part, for a
        // drill without stages), each stage with a button per part when it has several
        const stageJumpModalElement = document.getElementById('stageJumpModal');
        document.getElementById('stageJumpListButton')?.addEventListener('click', () => {
            const status = controllerStatus;
            if (!status || status.state === 'idle' || !stageJumpModalElement || !bootstrapModal) return;
            const current = (status.stageIndex || 0) - 1;
            const names = status.stagesAreParts ? [] : drillStageNames(status.drillName);
            const jump = (stage, part, label) => {
                bootstrapModal.getInstance(stageJumpModalElement)?.hide();
                sendStageJump('/api/drill/jump', label, { stage, part });
            };
            document.getElementById('stageJumpList').replaceChildren(...Array.from({ length: status.stageCount || 0 }, (_, index) => {
                const row = document.createElement('li');
                row.className = 'stage-jump-row';
                row.classList.toggle('is-current', index === current);
                const label = stageLabel(status, index);
                const stageButton = document.createElement('button');
                stageButton.type = 'button';
                stageButton.className = `btn btn-sm ${index === current ? 'btn-primary' : 'btn-outline-secondary'} stage-jump-stage`;
                stageButton.textContent = index === current ? `${label} (current)` : label;
                stageButton.addEventListener('click', () => jump(index + 1, 1, label));
                row.append(stageButton);
                const parts = status.stagesAreParts ? 1 : stagePartCount(names[index]);
                for (let part = 2; parts > 1 && part <= parts; part++) {
                    const partButton = document.createElement('button');
                    partButton.type = 'button';
                    partButton.className = 'btn btn-sm btn-outline-secondary';
                    partButton.textContent = `Part ${part}`;
                    partButton.setAttribute('aria-label', `${label}, part ${part}`);
                    partButton.addEventListener('click', () => jump(index + 1, part, `${label} · Part ${part}`));
                    row.append(partButton);
                }
                return row;
            }));
            document.getElementById('stageJumpModalTitle').textContent = `Jump to: ${status.drillName}`;
            bootstrapModal.getOrCreateInstance(stageJumpModalElement).show();
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
                ? `Hide target ${targetNumber}`
                : `Raise target ${targetNumber}`);
    });

    // Number and availability filters affect visibility only, never target commands or assignments.
    const hideDefectiveSwitch = document.getElementById('hideDefectiveTargets');
    const numberFilterButton = document.getElementById('targetNumberFilterButton');
    const numberFilterModal = document.getElementById('targetNumberFilterModal');
    const numberFilterInput = document.getElementById('targetNumbersInput');
    const numberFilterError = document.getElementById('targetNumbersError');
    const numberFilterStatus = document.getElementById('targetNumberFilterStatus');
    const numberFilterSummary = document.getElementById('targetNumberFilterSummary');
    const configuredNumbers = new Set(targetColumns.map((column) => Number(column.dataset.targetNumber)));
    let filteredNumbers = null;
    let numberFilterText = '';

    const applyTargetFilters = () => {
        const hideDefective = Boolean(hideDefectiveSwitch?.checked);
        let visibleCount = 0;
        targetColumns.forEach((column) => {
            const number = Number(column.dataset.targetNumber);
            const hidden = (hideDefective && unavailableTargets.has(number))
                || (filteredNumbers !== null && !filteredNumbers.has(number));
            column.classList.toggle('d-none', hidden);
            if (!hidden) visibleCount++;
        });
        numberFilterButton?.classList.toggle('btn-primary', filteredNumbers !== null);
        numberFilterButton?.classList.toggle('btn-outline-dark', filteredNumbers === null);
        numberFilterButton?.setAttribute('aria-pressed', String(filteredNumbers !== null));
        // AI-generated (Claude): flag active filters on the View heading, visible while collapsed.
        const viewFilterBadge = document.getElementById('viewFilterBadge');
        if (viewFilterBadge) viewFilterBadge.hidden = !hideDefective && filteredNumbers === null;
        if (numberFilterStatus) numberFilterStatus.hidden = filteredNumbers === null;
        if (numberFilterSummary) {
            numberFilterSummary.textContent = `Showing ${visibleCount} of ${targetColumns.length} targets (${numberFilterText}). Drills and the manual group buttons still use hidden targets.`;
        }
        const emptyMessage = document.getElementById('targetFilterEmpty');
        if (emptyMessage) emptyMessage.hidden = visibleCount !== 0;
    };
    hideDefectiveSwitch?.addEventListener('change', applyTargetFilters);

    const clearNumberFilterError = () => {
        numberFilterInput.classList.remove('is-invalid');
        numberFilterInput.removeAttribute('aria-invalid');
        numberFilterError.textContent = '';
    };
    // AI-modified (Claude): the filter is a View control now, usable with manual mode off.
    numberFilterModal?.addEventListener('show.bs.modal', () => {
        numberFilterInput.value = numberFilterText;
        clearNumberFilterError();
    });
    numberFilterModal?.addEventListener('shown.bs.modal', () => {
        numberFilterInput.focus();
        numberFilterInput.select();
    });
    numberFilterInput?.addEventListener('input', clearNumberFilterError);
    document.getElementById('targetNumberFilterForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = numberFilterInput.value.trim();
        const selected = new Set();
        const parts = text.replace(/\s*[-–—]\s*/g, '-').split(/[,\s]+/).filter(Boolean);
        let error = text && !parts.length ? 'Enter a target number or range, such as 1, 3, 5-8.' : '';
        const minimum = Math.min(...configuredNumbers);
        const maximum = Math.max(...configuredNumbers);
        for (const part of parts) {
            const match = /^(\d+)(?:-(\d+))?$/.exec(part);
            if (!match) {
                error = 'Enter numbers or ranges, such as 1, 3, 5-8.';
                break;
            }
            const first = Number(match[1]);
            const last = Number(match[2] ?? match[1]);
            if (!Number.isInteger(first) || !Number.isInteger(last) || first < minimum || last > maximum || first > last) {
                error = `Use target numbers from ${minimum} to ${maximum}, with ranges in ascending order.`;
                break;
            }
            for (let number = first; number <= last; number++) {
                if (!configuredNumbers.has(number)) {
                    error = `Target ${number} is not configured.`;
                    break;
                }
                selected.add(number);
            }
            if (error) break;
        }
        if (error) {
            numberFilterError.textContent = error;
            numberFilterInput.classList.add('is-invalid');
            numberFilterInput.setAttribute('aria-invalid', 'true');
            numberFilterInput.focus();
            return;
        }
        filteredNumbers = text ? selected : null;
        numberFilterText = text;
        clearNumberFilterError();
        applyTargetFilters();
        bootstrapModal?.getInstance(numberFilterModal)?.hide();
    });
    document.getElementById('clearTargetNumberFilter')?.addEventListener('click', () => {
        filteredNumbers = null;
        numberFilterText = '';
        applyTargetFilters();
    });
    applyTargetFilters();

    // AI-generated (Claude): collapsible View card. Collapsed by default; this phone remembers
    // whether it was left open.
    const viewPanelToggle = document.getElementById('viewPanelToggle');
    const viewPanelBody = document.getElementById('viewPanelBody');
    const viewPanelStorageKey = 'cpd-view-panel-open';
    const setViewPanelOpen = (open) => {
        if (!viewPanelToggle || !viewPanelBody) return;
        viewPanelBody.hidden = !open;
        viewPanelToggle.setAttribute('aria-expanded', String(open));
        localStorage.setItem(viewPanelStorageKey, String(open));
    };
    viewPanelToggle?.addEventListener('click', () => setViewPanelOpen(viewPanelBody.hidden));
    setViewPanelOpen(localStorage.getItem(viewPanelStorageKey) === 'true');

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
        if (!manualTargetsAvailable()) {
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
            ? `Hide target ${targetNumber}`
            : `Raise target ${targetNumber}`);
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
        if (!manualTargetsAvailable()) return false;
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
            if (!manualTargetsAvailable()) return;
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
    Promise.all([
        controllerClient.requestJson('/api/targets'),
        controllerClient.requestJson('/api/drills'),
        // AI-generated (Claude): qualification order for the drill groups (best effort)
        fetchController('/api/qualifications', { cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : null)).catch(() => null)
    ])
        .then(async ([targets, drills, qualifications]) => {
            if (Array.isArray(qualifications) && qualifications.every((name) => typeof name === 'string')) {
                targetPageQualifications = qualifications;
            }
            ControllerClient.validateTargets(targets);
            if (!Array.isArray(drills)) throw new Error('The controller did not return the drill library.');
            targetAssignmentDrills = getTargetDrillLibrary(drills);
            const targetIds = targets
                .map((target) => Number(target?.id))
                .filter((id) => Number.isInteger(id) && id >= 1 && id <= 20)
                .sort((first, second) => first - second);
            const unavailableTargetIds = targets
                .filter((target) => target?.working === false)
                .map((target) => Number(target.id));
            targetAvailabilityReady = true;
            initializeTargetPage(
                targetIds.length ? targetIds : Array.from({ length: 20 }, (_, index) => index + 1),
                unavailableTargetIds
            );
        })
        .catch((error) => {
            // AI-generated (Codex): unknown availability remains unknown, with a deliberate reload.
            targetAvailabilityReady = false;
            targetGrid.replaceChildren();
            const warning = document.createElement('div');
            warning.id = 'targetDataWarning';
            warning.className = 'alert alert-warning mx-3';
            warning.setAttribute('role', 'alert');
            const message = document.createElement('p');
            message.textContent = 'Target availability could not be loaded. Target controls are locked. Check the controller connection, then reload.';
            const retry = document.createElement('button');
            retry.className = 'btn btn-outline-secondary';
            retry.type = 'button';
            retry.textContent = 'Reload target data';
            retry.addEventListener('click', () => location.reload());
            warning.append(message, retry);
            targetGrid.insertAdjacentElement('beforebegin', warning);
            updateDrillStatus();
            if (error instanceof TypeError) {
                setConnectionStatus('none');
            }
        });
}

// AI-generated (Claude): Hide / Show buttons on collapsible sections (Performance: Officer standing
// and Results). The button names its section with aria-controls; each phone remembers whether a
// section was left collapsed (localStorage, data-collapse-key). Open by default.
document.querySelectorAll('.section-collapse-toggle').forEach((button) => {
    const body = document.getElementById(button.getAttribute('aria-controls'));
    if (!body) return;
    const key = button.dataset.collapseKey;
    const label = button.getAttribute('aria-label').replace(/^(Hide|Show) /, '');
    const setOpen = (open) => {
        body.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', `${open ? 'Hide' : 'Show'} ${label}`);
        button.querySelector('.section-collapse-label').textContent = open ? 'Hide' : 'Show';
        try { localStorage.setItem(key, String(open)); } catch { /* not remembered */ }
    };
    let saved = null;
    try { saved = localStorage.getItem(key); } catch { /* storage blocked */ }
    setOpen(saved !== 'false');
    button.addEventListener('click', () => setOpen(body.hidden));
});

// Performance dashboard reads qualification histories from the device database.
if (document.getElementById('performanceRows')) {
    let qualificationFilters = [];
    const qualificationFilterGroup = document.getElementById('performanceQualificationFilters');
    const performanceSearch = document.getElementById('performanceSearch');
    const performanceRows = document.getElementById('performanceRows');
    const performanceMessage = document.getElementById('performanceMessage');
    const sortSelect = document.getElementById('sortSelect');
    let sortMode = sortSelect.value || 'newest';
    let performanceOfficers = [];
    let exportSnapshot = null;

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
    let performanceQualifications = [];
    const legacyQualifications = new Map([
        ['pistol', { key: 'pistolQualScores', stats: 'pistolStats' }],
        ['rifle', { key: 'rifleQualScores', stats: 'rifleStats' }],
        ['swat', { key: 'swatQualScores', stats: 'swatStats' }]
    ]);
    const qualificationHistory = (officer, qualification) => qualification.legacy
        ? officer[qualification.key]
        : Object.hasOwn(officer.qualificationScores || {}, qualification.name)
            ? officer.qualificationScores[qualification.name] : [];

    // Both pages use the controller's catalog; legacy histories keep their original fields.
    const renderPerformanceQualifications = (names) => {
        if (!Array.isArray(names) || !names.length || names.some((name) => typeof name !== 'string' || !name.trim())) {
            throw new Error('Could not read qualifications.');
        }
        const selected = new Set(qualificationFilters.filter((input) => input.checked).map((input) => input.value));
        const includeAll = selected.size === qualificationFilters.length;
        performanceQualifications = names.map((name, index) => {
            const legacy = legacyQualifications.get(name.toLowerCase());
            return { name, id: legacy ? name.toLowerCase() : name,
                key: legacy?.key || `custom-${index}`, stats: legacy?.stats, legacy: Boolean(legacy) };
        });
        qualificationFilterGroup.querySelectorAll('label, #qualificationsLoading').forEach((element) => element.remove());
        performanceQualifications.forEach((qualification, index) => {
            const label = document.createElement('label');
            label.className = 'text-break';
            const input = document.createElement('input');
            Object.assign(input, { type: 'checkbox', name: 'qualification', value: qualification.key,
                checked: includeAll || selected.has(qualification.key), id: `performanceQualification${index}` });
            label.append(input, document.createTextNode(` ${qualification.name}`));
            qualificationFilterGroup.append(label);
        });
        qualificationFilters = Array.from(qualificationFilterGroup.querySelectorAll('input'));
        const scoreQualification = document.getElementById('scoreQualification');
        const previous = scoreQualification.value;
        scoreQualification.replaceChildren(...performanceQualifications.map(({ name, id }) => new Option(name, id)));
        if (performanceQualifications.some(({ id }) => id === previous)) scoreQualification.value = previous;
        scoreQualification.disabled = false;
    };

    // Flatten officer histories so every control acts on one consistent result set.
    const getQualificationRecords = (selected = new Set(qualificationFilters.filter((filter) => filter.checked).map((filter) => filter.value))) => performanceOfficers.flatMap((officer) => (
        performanceQualifications.flatMap((qualification) => {
            const { key, name } = qualification;
            if (!selected.has(key)) {
                return [];
            }

            const storedHistory = qualificationHistory(officer, qualification);
            const history = Array.isArray(storedHistory) ? storedHistory : [];
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
        const officerCount = new Set(records.map((record) => record.badge)).size;

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
        const selected = performanceQualifications.filter(({ key }) => qualificationFilters.some((input) => input.value === key && input.checked));
        const header = document.getElementById('standingHeader');
        header.replaceChildren(...['Officer', 'Badge', ...selected.map(({ name }) => name)].map((name) => {
            const cell = document.createElement('th');
            cell.scope = 'col';
            cell.textContent = name;
            return cell;
        }));
        const query = performanceSearch.value.trim().toLocaleLowerCase();
        const officers = performanceOfficers.filter((officer) => (
            !query || `${officer?.Name || ''} ${officer?.BadgeNum ?? ''}`.toLocaleLowerCase().includes(query)
        ));
        document.getElementById('standingCount').textContent = `${officers.length} ${officers.length === 1 ? 'officer' : 'officers'}`;
        standingRows.replaceChildren();
        if (!officers.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 2 + selected.length;
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
            selected.forEach((qualification) => {
                const stats = qualification.legacy ? officer[qualification.stats]
                    : Object.hasOwn(officer.qualificationStats || {}, qualification.name)
                        ? officer.qualificationStats[qualification.name] : null;
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
        exportSnapshot = null;
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
    qualificationFilterGroup.addEventListener('change', renderPerformance);
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

    // Build a dedicated report from records, rather than printing the dashboard and its controls.
    const exportModalElement = document.getElementById('performanceExportModal');
    const exportModal = bootstrap.Modal.getOrCreateInstance(exportModalElement);
    const exportForm = document.getElementById('performanceExportForm');
    const exportOfficer = document.getElementById('exportOfficer');
    const exportQualifications = document.getElementById('exportQualifications');
    const exportFromDate = document.getElementById('exportFromDate');
    const exportToDate = document.getElementById('exportToDate');
    const exportError = document.getElementById('exportResultsError');
    const exportReport = document.getElementById('performanceExportReport');
    let exportPrepared = false;
    let exportAttempt = 0;
    let pendingPdfWindow = null;

    const exportSelection = () => {
        const selected = new Set(Array.from(exportQualifications.querySelectorAll('input:checked'), (input) => input.value));
        const from = exportFromDate.value;
        const to = exportToDate.value;
        const error = !selected.size ? 'Select at least one qualification.'
            : !exportFromDate.validity.valid || !exportToDate.validity.valid ? 'Enter valid dates.'
                : from && to && from > to ? 'From must be on or before To.' : '';
        const records = error ? [] : getQualificationRecords(selected).filter((record) => (
            (!exportOfficer.value || record.badge === exportOfficer.value)
            && (!from || localDateString(record.date) >= from)
            && (!to || localDateString(record.date) <= to)
        ));
        return { selected, from, to, records, error };
    };

    const updateExportCount = () => {
        const { records, error } = exportSelection();
        exportError.hidden = !error;
        exportError.textContent = error;
        document.getElementById('exportResultCount').textContent = error ? ''
            : `${records.length} ${records.length === 1 ? 'result' : 'results'} to export${records.length ? '.' : '. Choose different filters.'}`;
        document.getElementById('printResultsButton').disabled = exportPrepared || Boolean(error) || !records.length;
    };
    exportForm.addEventListener('input', updateExportCount);
    exportForm.addEventListener('change', updateExportCount);
    document.getElementById('exportTodayResults').addEventListener('click', () => {
        exportFromDate.value = localDateString();
        exportToDate.value = exportFromDate.value;
        updateExportCount();
    });

    document.getElementById('exportPdfButton').addEventListener('click', () => {
        document.getElementById('openExportPdf').hidden = true;
        const query = performanceSearch.value.trim().toLocaleLowerCase();
        const matching = performanceOfficers.filter((officer) => query
            && `${officer.Name} ${officer.BadgeNum}`.toLocaleLowerCase().includes(query));
        exportOfficer.replaceChildren(new Option('All officers', ''), ...performanceOfficers.map((officer) => (
            new Option(`${officer.Name} | Badge ${officer.BadgeNum}`, String(officer.BadgeNum))
        )));
        if (matching.length === 1) exportOfficer.value = String(matching[0].BadgeNum);
        exportQualifications.replaceChildren(...performanceQualifications.map(({ name, key }, index) => {
            const label = document.createElement('label');
            label.className = 'form-check d-flex align-items-center gap-2 text-break mb-0';
            const input = document.createElement('input');
            Object.assign(input, { type: 'checkbox', className: 'form-check-input mt-0', value: key,
                id: `exportQualification${index}`, checked: qualificationFilters.some((filter) => filter.value === key && filter.checked) });
            label.append(input, document.createTextNode(name));
            return label;
        }));
        exportFromDate.value = document.getElementById('startDate').value;
        exportToDate.value = document.getElementById('endDate').value || localDateString();
        updateExportCount();
        exportModal.show();
    });

    const buildExportReport = (records, scope) => {
        const element = (tag, text) => {
            const node = document.createElement(tag);
            node.textContent = text;
            return node;
        };
        const average = records.length ? (records.reduce((total, record) => total + record.score, 0) / records.length).toFixed(1) : '—';
        const heading = element('h1', 'Qualification results');
        const generated = element('p', `Cookeville Police Department · Generated ${new Date().toLocaleString()}`);
        const filters = element('p', scope);
        const summary = element('p', `${records.length} results · Average score: ${average}`);
        const table = document.createElement('table');
        const header = table.createTHead().insertRow();
        ['Officer', 'Badge', 'Qualification', 'Date', 'Score'].forEach((title) => {
            const cell = element('th', title);
            cell.scope = 'col';
            header.append(cell);
        });
        const body = table.createTBody();
        [...records].sort((a, b) => b.date - a.date || a.badge.localeCompare(b.badge) || a.qualification.localeCompare(b.qualification))
            .forEach((record) => {
                const row = body.insertRow();
                [record.name, record.badge, record.qualification, formatScoreDate(record.date), String(record.score)]
                    .forEach((text) => row.append(element('td', text)));
            });
        exportReport.replaceChildren(heading, generated, filters, summary, table);
    };

    exportModalElement.addEventListener('hide.bs.modal', () => {
        if (!exportPrepared) return;
        exportAttempt += 1;
        exportPrepared = false;
        pendingPdfWindow?.close();
        pendingPdfWindow = null;
        exportForm.querySelectorAll('input, select, button').forEach((control) => { control.disabled = false; });
        document.getElementById('printResultsButton').textContent = 'Continue to PDF';
        updateExportCount();
    });

    exportForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (exportPrepared) return;
        const { selected, from, to, records, error } = exportSelection();
        updateExportCount();
        if (error || !records.length) return;
        const names = performanceQualifications.filter(({ key }) => selected.has(key)).map(({ name }) => name).join(', ');
        const dates = from && from === to ? from : `${from || 'earliest'} to ${to || 'latest'}`;
        exportSnapshot = {
            records,
            scope: `${exportOfficer.selectedOptions[0].text} · Qualifications: ${names} · Dates: ${from || to ? dates : 'All dates'}`
        };
        buildExportReport(exportSnapshot.records, exportSnapshot.scope);
        exportPrepared = true;
        const attempt = ++exportAttempt;
        const button = document.getElementById('printResultsButton');
        button.disabled = true;
        button.textContent = 'Preparing PDF…';
        exportForm.querySelectorAll('input, select, button').forEach((control) => { control.disabled = true; });
        document.getElementById('openExportPdf').hidden = true;
        // Open within the click gesture, before loading assets, so browsers permit the new tab.
        let pdfWindow = null;
        try { pdfWindow = window.open('', '_blank'); } catch { /* Use the Open PDF link if pop-ups are unavailable. */ }
        pendingPdfWindow = pdfWindow;
        if (pdfWindow) {
            pdfWindow.opener = null;
            pdfWindow.document.title = 'Qualification results';
            pdfWindow.document.body.textContent = 'Preparing PDF…';
        }
        try {
            const { createQualificationPdf } = await import(`./results-pdf.js?v=${encodeURIComponent(uiAssetVersion)}`);
            const pdf = await createQualificationPdf(exportSnapshot);
            if (attempt !== exportAttempt) return;
            const url = URL.createObjectURL(pdf);
            const link = document.getElementById('openExportPdf');
            link.href = url;
            link.hidden = false;
            if (pdfWindow && !pdfWindow.closed) {
                pdfWindow.location.replace(url);
                exportPrepared = false;
                exportModal.hide();
            } else {
                document.getElementById('exportResultCount').textContent = 'Your PDF is ready. Select Open PDF to view it.';
            }
        } catch {
            if (attempt !== exportAttempt) return;
            pdfWindow?.close();
            exportError.hidden = false;
            exportError.textContent = 'Could not create the PDF. Check the controller connection and try again.';
        } finally {
            if (attempt === exportAttempt) {
                exportPrepared = false;
                pendingPdfWindow = null;
                exportForm.querySelectorAll('input, select, button').forEach((control) => { control.disabled = false; });
                button.textContent = 'Continue to PDF';
                // Keep a successful or failed export message visible until the filters change.
                const selection = exportSelection();
                button.disabled = Boolean(selection.error) || !selection.records.length;
            }
        }
    });
    window.addEventListener('beforeprint', () => {
        // Print preview can fire more than once; retain the chosen export instead of using dashboard filters.
        if (exportSnapshot) buildExportReport(exportSnapshot.records, exportSnapshot.scope);
        else buildExportReport(getVisibleRecords(), 'Current Performance search and filters');
    });

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
    // AI-generated (Codex): a closed/reopened dialog belongs to a new editing session.
    let scoreSession = 0;
    let scoresSavePending = false;
    addScoresToggle.addEventListener('click', () => {
        scoreSession++;
        showAddScoresError(scoresSavePending
            ? 'A previous save is still pending. Reload and check the saved scores before entering them again.' : '');
        addScoresDialog.showModal();
        addScoresToggle.setAttribute('aria-expanded', 'true');
    });
    document.getElementById('closeScoresDialog').addEventListener('click', () => addScoresDialog.close());
    addScoresDialog.addEventListener('close', () => {
        scoreSession++;
        addScoresToggle.setAttribute('aria-expanded', 'false');
        if (scoresSavePending) {
            performanceMessage.hidden = false;
            performanceMessage.textContent = 'A score save may still complete. Reload and check the saved scores before entering them again.';
        }
    });
    document.getElementById('addOfficerButton').addEventListener('click', () => {
        addScoresDialog.close();
        window.location.href = 'settings.html';
    });

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
        if (scoresSavePending) return;
        const badgeNum = Number(scoreOfficerSelect.value);
        const officer = performanceOfficers.find((candidate) => Number(candidate?.BadgeNum) === badgeNum);
        if (!scoreOfficerSelect.value || !officer) {
            showAddScoresError('Select an officer.');
            return;
        }
        const qualType = document.getElementById('scoreQualification').value;
        if (!performanceQualifications.some(({ id }) => id === qualType)) {
            showAddScoresError('Select a qualification.');
            return;
        }
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

        scoresSavePending = true;
        const session = scoreSession;
        const restoreControls = lockFormControls(addScoresForm, [saveScoresButton]);
        showAddScoresError('');
        let saved = 0;
        try {
            // One at a time, so a refusal tells us exactly which ones were stored
            for (const { score, date } of scores) {
                if (session !== scoreSession) return;
                await postToController('/api/officers/scores', { BadgeNum: badgeNum, qualType, score: Number(score), date });
                saved += 1;
            }
        } catch (error) {
            if (session !== scoreSession) return;
            showAddScoresError(saved
                ? `${saved} of ${scores.length} scores were saved; score ${saved + 1} was not: ${error.message} Remove the saved rows before trying again.`
                : error.message);
            loadPerformanceData();
            return;
        } finally {
            restoreControls();
            scoresSavePending = false;
        }

        if (session !== scoreSession) return;

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
    const loadPerformanceData = () => Promise.all([
        fetchController(`/api/officers?today=${localDateString()}`, { cache: 'no-store' }),
        fetchController('/api/qualifications', { cache: 'no-store' })
    ])
        .then(async ([officerResponse, qualificationResponse]) => {
            if (!officerResponse.ok || !qualificationResponse.ok) {
                throw new Error('Unable to load qualification records.');
            }
            const [officers, names] = await Promise.all([officerResponse.json(), qualificationResponse.json()]);
            if (!Array.isArray(officers) || !Array.isArray(names)) throw new Error('Invalid qualification records');
            renderPerformanceQualifications(names);
            return officers;
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
            saveScoresButton.disabled = scoresSavePending || !performanceOfficers.length;
            document.getElementById('exportPdfButton').disabled = !performanceOfficers.length;
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
    const clearSequenceButton = document.getElementById('clearDrillSequence');
    const saveButton = document.getElementById('drillEditorSave');
    const deleteModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteDrillModal'));
    const deleteDrillName = document.getElementById('deleteDrillName');
    const targetCount = 20; // NUM_TARGETS in hal.h
    let drills = [];              // [{drillName, sequence}] as stored on the controller
    let editingName = null;       // name of the drill being edited; null while creating one
    let pendingDeleteName = null;
    let drillDeletePending = false; // AI-generated (Codex): preserve a newer confirmation while a delete completes.
    // AI-modified (Claude): one qualification filter (chips): 'all', 'none' (drills with no
    // qualification) or a lower-case qualification name. Kept for the tab.
    const qualificationFilterStorageKey = 'cpd-drill-qualification-filter';
    let activeQualification = (() => {
        try { return sessionStorage.getItem(qualificationFilterStorageKey) || 'all'; } catch { return 'all'; }
    })();
    const qualificationChips = document.getElementById('qualificationChips');
    const qualificationModalElement = document.getElementById('addQualificationModal');
    const qualificationModal = bootstrap.Modal.getOrCreateInstance(qualificationModalElement);
    const qualificationName = document.getElementById('qualificationName');
    const qualificationError = document.getElementById('qualificationNameError');
    let qualificationNames = ['Pistol', 'Rifle', 'SWAT'];

    // Labels use textContent so user-provided qualification names remain plain text.
    const qualificationCheckbox = (name, id, checked, className = '') => {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-check mw-100 text-break';
        const input = document.createElement('input');
        Object.assign(input, { type: 'checkbox', id, value: name.toLowerCase(), checked,
            className: `form-check-input ${className}` });
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = id;
        label.textContent = name;
        wrapper.append(input, label);
        return wrapper;
    };

    // AI-generated (Claude): the chip row: All, each qualification, and No qualification, each with
    // how many drills it holds. Exactly one is selected.
    const renderQualificationChoices = () => {
        const counts = new Map();
        let untagged = 0;
        drills.forEach((drill) => {
            const own = getDrillQualifications(drill);
            if (!own.size) untagged++;
            own.forEach((name) => counts.set(name, (counts.get(name) || 0) + 1));
        });
        const known = new Set(qualificationNames.map((name) => name.toLowerCase()));
        if (activeQualification !== 'all' && activeQualification !== 'none' && !known.has(activeQualification)) {
            activeQualification = 'all';
        }
        const chip = (value, label, count) => {
            const button = document.createElement('button');
            button.type = 'button';
            const active = value === activeQualification;
            button.className = `btn btn-sm ${active ? 'btn-primary' : 'btn-outline-primary'}`;
            button.dataset.qualification = value;
            button.setAttribute('aria-pressed', String(active));
            button.append(label);
            const badge = document.createElement('span');
            badge.className = 'qualification-chip-count';
            badge.textContent = String(count);
            button.append(badge);
            return button;
        };
        qualificationChips.replaceChildren(
            chip('all', 'All', drills.length),
            ...qualificationNames.map((name) => chip(name.toLowerCase(), name, counts.get(name.toLowerCase()) || 0)),
            chip('none', 'No qualification', untagged)
        );
    };
    qualificationChips.addEventListener('click', (event) => {
        const button = event.target.closest('[data-qualification]');
        if (!button) return;
        activeQualification = button.dataset.qualification;
        try { sessionStorage.setItem(qualificationFilterStorageKey, activeQualification); } catch { /* not kept */ }
        renderQualificationChoices();
        renderDrills();
    });

    const loadQualifications = async () => {
        const response = await fetchController('/api/qualifications', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load qualifications. Check the controller connection.');
        const names = await response.json();
        if (!Array.isArray(names) || !names.length || names.some((name) => typeof name !== 'string' || !name.trim())) {
            throw new Error('Could not read qualification names.');
        }
        qualificationNames = names;
        renderQualificationChoices();
    };
    let blockCounter = 0;         // makes each block's input ids unique

    const blockInfo = {
        present: { title: 'Present', icon: 'bi-eye-fill' },
        delay: { title: 'Delay', icon: 'bi-stopwatch' },
        hide: { title: 'Hide', icon: 'bi-eye-slash-fill' },
        yield: { title: 'Yield', icon: 'bi-sign-yield' } // AI-modified (Claude): was Pause
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
        // AI-modified (Claude): an old "pause" step opens (and saves) as a Yield block
        const action = step?.action === 'pause' ? 'yield' : String(step?.action || '');
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
        } else if (action === 'yield') {
            body.innerHTML = '<p class="seq-block-note">Hands control back to the operator: the drill waits here (targets stay as they are) until they press Start to continue. Use it between parts or stages.</p>';
        } else {
            body.innerHTML = `
                <label class="form-label small mb-1" for="${uid}-drill">Saved drill</label>
                <select class="form-select form-select-sm seq-drill-select" id="${uid}-drill"></select>
                <p class="seq-block-note mt-2">Runs the saved drill. Changes to it apply the next time this full drill starts.</p>
                <p class="seq-block-note seq-block-tip mt-1"><i class="bi bi-sign-yield" aria-hidden="true"></i> Add a Yield after this block if the saved drill doesn't end with one. Otherwise the next drill or stage starts right away, without waiting for the operator.</p>`;
            const select = body.querySelector('.seq-drill-select');
            const choices = drills.filter((drill) => drill.drillName !== editingName);
            select.append(new Option(choices.length ? 'Select a saved drill' : 'No other saved drills', ''));
            choices.forEach((drill) => select.append(new Option(drill.drillName, drill.drillName)));
            // Preserve a broken reference so Save reports it rather than silently replacing it.
            if (action && !choices.some((drill) => drill.drillName === action)) {
                const unavailable = document.createElement('option');
                unavailable.value = action;
                unavailable.disabled = true;
                // AI-modified: render the saved drill name as text, not markup.
                unavailable.append(document.createTextNode(`Unavailable drill: ${action}`));
                select.add(unavailable);
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
        clearSequenceButton.disabled = blocks.length === 0;
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
    // Clear the draft sequence; saved stages and referenced drills change only on Save.
    clearSequenceButton.addEventListener('click', () => {
        sequenceList.replaceChildren();
        showEditorError('');
        refreshSequence();
        sequenceSummary.textContent = 'Sequence cleared. Add blocks to start over.';
        palette.querySelector('[data-block]')?.focus({ preventScroll: true });
    });

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

    // AI-generated (Codex): ignore completion from an editor the operator has closed.
    let editorSession = 0;
    let editorSavePending = false;
    let restoreEditorControls = null;
    editorModalElement.addEventListener('hide.bs.modal', () => {
        editorSession++;
        if (editorSavePending) showListMessage('A save may still complete. Check the drill list before saving it again.');
        restoreEditorControls?.();
        restoreEditorControls = null;
        editorSavePending = false;
    });
    const openEditor = (drill) => {
        editorSession++;
        saveButton.disabled = false;
        editingName = drill ? drill.drillName : null;
        editorTitle.textContent = drill ? `Edit ${drill.drillName}` : 'New drill';
        nameInput.value = drill ? drill.drillName : '';
        // AI-generated (Claude): optional description
        document.getElementById('drillEditorDescription').value = typeof drill?.description === 'string' ? drill.description : '';
        const assigned = drill ? getOwnDrillQualifications(drill) : new Set();
        document.getElementById('drillEditorQualifications').replaceChildren(...qualificationNames.map((name, index) => (
            qualificationCheckbox(name, `editorQualification${index}`, assigned.has(name.toLowerCase()))
        )));
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
        if (editorSavePending) return;
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

        editorSavePending = true;
        const session = editorSession;
        restoreEditorControls = lockFormControls(editorForm, [saveButton]);
        try {
            const qualifications = Array.from(document.querySelectorAll('#drillEditorQualifications input:checked'), (input) => input.value);
            // AI-modified (Claude): "" clears a description on an edit
            const description = document.getElementById('drillEditorDescription').value.trim();
            if (editingName === null) {
                await postToController('/api/drills', { drillName: name, sequence: steps, qualifications, description });
            } else {
                // Isaac's rename: a new drillName also updates full drills that include this one
                await postToController(`/api/drills?name=${encodeURIComponent(editingName)}`, { drillName: name, sequence: steps, qualifications, description }, 'PUT');
            }
            if (session !== editorSession) return;
            editorSavePending = false;
            editorModal.hide();
            showListMessage(`${name} saved.`, 'success');
            await loadDrills();
        } catch (saveError) {
            if (session === editorSession) showEditorError(saveError.message);
        } finally {
            if (session === editorSession) {
                restoreEditorControls?.();
                restoreEditorControls = null;
                editorSavePending = false;
            }
        }
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

    // Save only direct assignments; inherited qualifications must follow later stage edits.
    // AI-modified (Claude): the drill's own tags (the editor's checkboxes). Built-in drills on an
    // older database without tags fall back to their name prefix.
    const getOwnDrillQualifications = (drill) => {
        const matches = new Set();
        if (Array.isArray(drill.qualifications)) {
            drill.qualifications.forEach((name) => matches.add(String(name).toLowerCase()));
        } else if (drill.builtIn === true) {
            const prefix = /^(pistol|rifle|swat) qual\b/i.exec(drill.drillName);
            if (prefix) matches.add(prefix[1].toLowerCase());
        }
        return matches;
    };

    // AI-modified (Claude): own tags plus those of the stages a full drill runs
    const getDrillQualifications = (drill) => drillQualificationList(drill, drills);

    // "Pistol · Rifle" for a card's badge, in the qualification list's order
    const qualificationLabel = (drill) => {
        const own = getDrillQualifications(drill);
        return qualificationNames.filter((name) => own.has(name.toLowerCase())).join(' · ');
    };

    const renderDrills = () => {
        // AI-modified (Claude): the one filter is the qualification chip row
        const visible = drills.filter((drill) => {
            if (activeQualification === 'all') return true;
            const own = getDrillQualifications(drill);
            return activeQualification === 'none' ? own.size === 0 : own.has(activeQualification);
        });
        if (!visible.length) {
            const column = document.createElement('div');
            column.className = 'col-12';
            column.innerHTML = '<div class="alert alert-info mb-0"></div>';
            column.firstChild.textContent = drills.length
                ? (activeQualification === 'none' ? 'Every drill has a qualification.' : 'No drills in this qualification yet. Edit a drill and check it under Qualifications.')
                : 'No drills yet. Tap Create Drill to build one.';
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
                        <span class="drill-ticket-label"></span>
                        <i class="bi ${full ? 'bi-collection' : 'bi-crosshair'} text-primary" aria-hidden="true"></i>
                    </div>
                    <h2 class="h4 mb-4 drill-ticket-name"></h2>
                    <p class="drill-ticket-description" hidden></p>
                    <button class="btn btn-link btn-sm p-0 mb-3 align-self-start drill-ticket-description-toggle" type="button" aria-expanded="false" hidden>Show more</button>
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
            // AI-modified (Claude): "PISTOL · FULL DRILL": qualification(s), then the drill's kind
            const kind = { full: 'Full drill', custom: 'Custom', stages: 'Stage' }[category];
            column.querySelector('.drill-ticket-label').textContent = [qualificationLabel(drill), kind].filter(Boolean).join(' · ');
            // AI-generated (Claude): first lines of the description
            const descriptionPreview = column.querySelector('.drill-ticket-description');
            descriptionPreview.textContent = typeof drill.description === 'string' ? drill.description.trim() : '';
            descriptionPreview.hidden = !descriptionPreview.textContent;
            // AI-generated (Claude): Show more / Show less when the preview is cut off
            const descriptionToggle = column.querySelector('.drill-ticket-description-toggle');
            requestAnimationFrame(() => {
                descriptionToggle.hidden = descriptionPreview.hidden
                    || descriptionPreview.scrollHeight <= descriptionPreview.clientHeight + 1;
            });
            descriptionToggle.addEventListener('click', () => {
                const expanded = descriptionPreview.classList.toggle('is-expanded');
                descriptionToggle.textContent = expanded ? 'Show less' : 'Show more';
                descriptionToggle.setAttribute('aria-expanded', String(expanded));
            });
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
            const response = await fetchController('/api/drills', { cache: 'no-store' });
            if (!response.ok) throw new Error('bad response');
            const payload = await response.json();
            if (!Array.isArray(payload)) throw new Error('Invalid drill library');
            drills = payload
                .filter((drill) => typeof drill?.drillName === 'string' && drill.drillName.trim());
        } catch {
            drills = [];
            showListMessage('Could not load drills from the controller. Check that you are on the CPD Range Control WiFi.', 'danger');
        }
        renderQualificationChoices(); // AI-modified (Claude): chip counts follow the drills
        renderDrills();
    };

    document.getElementById('confirmDeleteDrillButton').addEventListener('click', async () => {
        if (drillDeletePending) return;
        const name = pendingDeleteName;
        deleteModal.hide();
        if (!name) return;
        pendingDeleteName = null;
        drillDeletePending = true;
        try {
            await postToController(`/api/drills?name=${encodeURIComponent(name)}`, undefined, 'DELETE');
            showListMessage(`${name} deleted.`, 'success');
        } catch (error) {
            showListMessage(error.message, 'danger');
        }
        drillDeletePending = false;
        loadDrills();
    });

    // AI-generated (Claude): Manage qualifications: every qualification with how many drills use
    // it; custom ones have Delete (asks first; the controller refuses while scores exist)
    const manageList = document.getElementById('qualificationManageList');
    const manageMessage = document.getElementById('qualificationManageMessage');
    const builtInQualifications = new Set(['pistol', 'rifle', 'swat']);
    const showManageMessage = (text, kind) => {
        manageMessage.textContent = text;
        manageMessage.className = `alert py-2 small alert-${kind}`;
        manageMessage.hidden = !text;
    };
    const renderManageList = () => {
        manageList.replaceChildren(...qualificationNames.map((name) => {
            const row = document.createElement('li');
            const label = document.createElement('span');
            label.className = 'qualification-manage-name';
            label.textContent = name;
            const used = drills.filter((drill) => getOwnDrillQualifications(drill).has(name.toLowerCase())).length;
            const meta = document.createElement('span');
            meta.className = 'qualification-manage-meta';
            meta.textContent = `${used} ${used === 1 ? 'drill' : 'drills'}`;
            row.append(label, meta);
            if (builtInQualifications.has(name.toLowerCase())) {
                const builtIn = document.createElement('span');
                builtIn.className = 'badge text-bg-light';
                builtIn.textContent = 'Built in';
                row.append(builtIn);
                return row;
            }
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'btn btn-sm btn-outline-danger';
            deleteButton.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i> Delete';
            deleteButton.setAttribute('aria-label', `Delete ${name}`);
            deleteButton.addEventListener('click', () => {
                // Second step: confirm in place
                const confirm = document.createElement('button');
                confirm.type = 'button';
                confirm.className = 'btn btn-sm btn-danger';
                confirm.textContent = `Delete ${name}`;
                const cancel = document.createElement('button');
                cancel.type = 'button';
                cancel.className = 'btn btn-sm btn-outline-secondary';
                cancel.textContent = 'Cancel';
                cancel.addEventListener('click', renderManageList);
                confirm.addEventListener('click', async () => {
                    confirm.disabled = cancel.disabled = true;
                    try {
                        await postToController(`/api/qualifications?name=${encodeURIComponent(name)}`, undefined, 'DELETE');
                        showManageMessage(used ? `${name} deleted and removed from ${used} ${used === 1 ? 'drill' : 'drills'}.` : `${name} deleted.`, 'success');
                        await loadQualifications();
                        await loadDrills();
                    } catch (error) {
                        showManageMessage(error.message, 'warning');
                    }
                    renderManageList();
                });
                deleteButton.replaceWith(confirm, cancel);
                confirm.focus();
            });
            row.append(deleteButton);
            return row;
        }));
    };

    document.getElementById('manageQualificationsButton').addEventListener('click', () => {
        document.getElementById('addQualificationForm').reset();
        qualificationName.classList.remove('is-invalid');
        qualificationName.removeAttribute('aria-invalid');
        showManageMessage('', 'info');
        renderManageList();
        qualificationModal.show();
    });
    document.getElementById('addQualificationForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = qualificationName.value.trim().replace(/\s+/g, ' ');
        const button = document.getElementById('saveQualificationButton');
        try {
            if (!name) throw new Error('Enter a qualification name.');
            if (new TextEncoder().encode(name).length > 32) throw new Error('This name is too long. Use a shorter qualification name.');
            if (qualificationNames.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
                throw new Error('A qualification with this name already exists.');
            }
            button.disabled = true;
            await postToController('/api/qualifications', { name });
            await loadQualifications();
            renderDrills();
            // AI-modified (Claude): stay in Manage so several can be added or removed
            document.getElementById('addQualificationForm').reset();
            qualificationName.classList.remove('is-invalid');
            renderManageList();
            showManageMessage(`${name} added. Edit a drill and check ${name} under Qualifications to put it there.`, 'success');
        } catch (error) {
            qualificationError.textContent = error.message;
            qualificationName.classList.add('is-invalid');
            qualificationName.setAttribute('aria-invalid', 'true');
            qualificationName.focus();
        } finally {
            button.disabled = false;
        }
    });

    loadQualifications().then(() => {
        document.getElementById('manageQualificationsButton').disabled = false;
    }).catch((error) => showListMessage(error.message, 'warning')).finally(loadDrills);
}

// AI-generated (Claude): Settings cards collapse; all start collapsed. A card opened in this tab
// stays open (sessionStorage), and the card named in the address (e.g. settings.html#startDelay
// from Range Control's "Change" link) opens on its own.
document.querySelectorAll('.settings-card-toggle').forEach((button) => {
    const body = document.getElementById(button.getAttribute('aria-controls'));
    const card = button.closest('section');
    if (!body || !card) return;
    const key = `cpd-settings-open-${body.id}`;
    const setOpen = (open, remember = true) => {
        body.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        if (remember) {
            try { sessionStorage.setItem(key, String(open)); } catch { /* not remembered */ }
        }
    };
    const linked = () => Boolean(card.id) && location.hash === `#${card.id}`;
    let saved = null;
    try { saved = sessionStorage.getItem(key); } catch { /* storage blocked */ }
    setOpen(saved === 'true' || linked(), false);
    if (linked()) card.scrollIntoView({ block: 'start' });
    button.addEventListener('click', () => setOpen(body.hidden));
    window.addEventListener('hashchange', () => {
        if (linked()) {
            setOpen(true);
            card.scrollIntoView({ block: 'start' });
        }
    });
});

// AI-generated (Claude): Theme (Settings): "normal" or "tactical", saved per phone. The page head
// applies it before drawing; this switches it live when the setting changes (including from
// another tab) and keeps the phone's browser bar color in step.
const themeStorageKey = 'cpd-theme';
const applyTheme = (theme) => {
    const tactical = theme === 'tactical';
    document.documentElement.classList.toggle('theme-tactical', tactical);
    if (tactical) document.documentElement.setAttribute('data-bs-theme', 'dark');
    else document.documentElement.removeAttribute('data-bs-theme');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tactical ? '#171914' : '#0057b8');
};
const savedTheme = () => {
    try { return localStorage.getItem(themeStorageKey) === 'tactical' ? 'tactical' : 'normal'; } catch { return 'normal'; }
};
applyTheme(savedTheme());
window.addEventListener('storage', (event) => {
    if (event.key === themeStorageKey) applyTheme(savedTheme());
});
const themeForm = document.getElementById('themeForm');
if (themeForm) {
    themeForm.querySelector(`input[value="${savedTheme()}"]`).checked = true;
    themeForm.addEventListener('change', (event) => {
        const theme = event.target.value === 'tactical' ? 'tactical' : 'normal';
        try { localStorage.setItem(themeStorageKey, theme); } catch { /* not saved */ }
        applyTheme(theme);
    });
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

// AI-generated (Claude): Target flip delay: read from and saved on the controller.
const targetFlipForm = document.getElementById('targetFlipForm');
if (targetFlipForm) {
    const input = document.getElementById('targetFlipMs');
    const saveButton = document.getElementById('targetFlipSave');
    const message = document.getElementById('targetFlipMessage');
    const showFlipMessage = (text, ok) => {
        message.textContent = text;
        message.className = `small mt-2 mb-0 ${ok ? 'text-success' : 'text-danger'}`;
        message.hidden = false;
    };
    fetchController('/api/settings/target-flip', { cache: 'no-store' })
        .then(async (response) => {
            if (!response.ok) throw new Error('bad response');
            const setting = await response.json();
            input.value = String(setting.faceTravelMs);
            input.max = String(setting.maxMs ?? 5000);
            input.disabled = saveButton.disabled = false;
        })
        .catch(() => showFlipMessage('Could not load the target flip delay from the controller. Check that you are on the CPD Range Control WiFi.', false));

    targetFlipForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const ms = Number(input.value);
        const max = Number(input.max) || 5000;
        if (input.value.trim() === '' || !Number.isInteger(ms) || ms < 0 || ms > max) {
            showFlipMessage(`Enter a whole number of milliseconds from 0 to ${max}.`, false);
            input.focus();
            return;
        }
        saveButton.disabled = true;
        try {
            await postToController('/api/settings/target-flip', { faceTravelMs: ms }, 'PUT');
            showFlipMessage(`Saved: ${ms} ms (${(ms / 1000).toFixed(2)} s). Applies from the next time targets turn.`, true);
        } catch (error) {
            showFlipMessage(error.message, false);
        }
        saveButton.disabled = false;
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
            const response = await fetchController('/api/targets', { cache: 'no-store' });
            if (!response.ok) throw new Error('bad response');
            const targets = ControllerClient.validateTargets(await response.json()).slice()
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
    // AI-generated (Codex): in-flight form and load guards keep repeated/stale actions local.
    let officerAddPending = false;
    let officerDeletePending = false;
    let officerLoadAttempt = 0;

    const showOfficersMessage = (text, ok) => {
        officersMessage.textContent = text;
        officersMessage.className = `small mt-3 mb-0 ${ok ? 'text-success' : 'text-danger'}`;
        officersMessage.hidden = false;
    };

    // AI-modified (Claude): the label is in a span so phones can show icon-only buttons
    // (style.css); the buttons that need it carry an aria-label naming the officer.
    const button = (label, className, icon) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = `btn btn-sm ${className}`;
        element.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i> `;
        const text = document.createElement('span');
        text.className = 'officer-button-label';
        text.textContent = label;
        element.append(text);
        return element;
    };

    // One row per officer; Edit swaps the name and badge for inputs with Save / Cancel.
    // AI-modified (Claude): the badge number can be changed too (it was Rename, name only).
    const renderOfficerRow = (officer) => {
        const row = document.createElement('li');
        row.className = 'officer-row';
        const name = document.createElement('span');
        name.className = 'officer-row-name';
        name.textContent = officer.Name || 'Unnamed officer';
        const badge = document.createElement('span');
        badge.className = 'officer-row-badge';
        badge.textContent = `Badge ${officer.BadgeNum}`;
        const renameButton = button('Edit', 'btn-outline-secondary', 'bi-pencil');
        const deleteButton = button('Delete', 'btn-outline-danger', 'bi-trash3');
        renameButton.setAttribute('aria-label', `Edit ${officer.Name}`);
        deleteButton.setAttribute('aria-label', `Delete ${officer.Name}`);
        row.append(name, badge, renameButton, deleteButton);

        renameButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.className = 'form-control form-control-sm';
            input.value = officer.Name || '';
            input.maxLength = 60;
            input.setAttribute('aria-label', `New name for badge ${officer.BadgeNum}`);
            const badgeEdit = document.createElement('input');
            badgeEdit.className = 'form-control form-control-sm officer-row-badge-input';
            badgeEdit.type = 'number';
            badgeEdit.min = '1';
            badgeEdit.step = '1';
            badgeEdit.inputMode = 'numeric';
            badgeEdit.value = String(officer.BadgeNum);
            badgeEdit.setAttribute('aria-label', `Badge number for ${officer.Name}`);
            const saveButton = button('Save', 'btn-primary', 'bi-check-lg');
            const cancelButton = button('Cancel', 'btn-outline-secondary', 'bi-x-lg');
            row.replaceChildren(input, badgeEdit, saveButton, cancelButton);
            input.focus();
            let editPending = false;
            let editActive = true;

            const save = async () => {
                if (editPending || !editActive) return;
                const newName = input.value.trim();
                const newBadge = Number(badgeEdit.value);
                if (!newName) {
                    showOfficersMessage('Enter a name.', false);
                    return;
                }
                if (!Number.isInteger(newBadge) || newBadge < 1) {
                    showOfficersMessage('Enter a whole-number badge number.', false);
                    return;
                }
                editPending = true;
                saveButton.disabled = input.disabled = badgeEdit.disabled = true;
                try {
                    await postToController(`/api/officers?badge=${officer.BadgeNum}`, { Name: newName, BadgeNum: newBadge }, 'PUT');
                    if (!editActive || !row.isConnected) return;
                    showOfficersMessage(newBadge === Number(officer.BadgeNum)
                        ? `Saved ${newName}.`
                        : `Saved ${newName} (badge ${newBadge}). Their scores moved with them.`, true);
                    loadOfficers();
                } catch (error) {
                    if (!editActive || !row.isConnected) return;
                    showOfficersMessage(error.message, false);
                } finally {
                    editPending = false;
                    if (editActive && row.isConnected) saveButton.disabled = input.disabled = badgeEdit.disabled = false;
                }
            };
            saveButton.addEventListener('click', save);
            const cancelEdit = () => {
                editActive = false;
                if (editPending) showOfficersMessage('The previous edit may still complete. Reload and check the officer before editing again.', false);
                loadOfficers();
            };
            cancelButton.addEventListener('click', cancelEdit);
            [input, badgeEdit].forEach((field) => field.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') save();
                if (event.key === 'Escape') cancelEdit();
            }));
        });

        deleteButton.addEventListener('click', () => {
            pendingDeleteBadge = officer.BadgeNum;
            document.getElementById('deleteOfficerName').textContent = `${officer.Name} (badge ${officer.BadgeNum})`;
            deleteModal?.show();
        });
        return row;
    };

    const loadOfficers = async () => {
        const attempt = ++officerLoadAttempt;
        try {
            const payload = await controllerClient.requestJson(`/api/officers?today=${localDateString()}`);
            if (attempt !== officerLoadAttempt) return;
            if (!Array.isArray(payload)) throw new Error('Invalid officer data');
            const officers = payload
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
            if (attempt !== officerLoadAttempt) return;
            const failed = document.createElement('li');
            failed.className = 'small text-danger';
            failed.textContent = 'Could not load officers from the controller. Check that you are on the CPD Range Control WiFi.';
            officerList.replaceChildren(failed);
        }
    };

    document.getElementById('confirmDeleteOfficerButton').addEventListener('click', async () => {
        if (officerDeletePending) return;
        const badge = pendingDeleteBadge;
        deleteModal?.hide();
        if (badge === null) return;
        officerDeletePending = true;
        pendingDeleteBadge = null;
        try {
            await postToController(`/api/officers?badge=${badge}`, undefined, 'DELETE');
            showOfficersMessage(`Officer with badge ${badge} deleted.`, true);
        } catch (error) {
            showOfficersMessage(error.message, false);
        }
        officerDeletePending = false;
        loadOfficers();
    });

    addOfficerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (officerAddPending) return;
        const name = nameInput.value.trim();
        const badge = Number(badgeInput.value);
        if (!name || !Number.isInteger(badge) || badge < 1) {
            showOfficersMessage('Enter a name and a whole-number badge number.', false);
            return;
        }
        officerAddPending = true;
        const restoreControls = lockFormControls(addOfficerForm);
        try {
            await postToController('/api/officers', { Name: name, BadgeNum: badge });
            showOfficersMessage(`${name} added.`, true);
            addOfficerForm.reset();
            nameInput.focus();
            loadOfficers();
        } catch (error) {
            showOfficersMessage(error.message, false);
        } finally {
            restoreControls();
            officerAddPending = false;
        }
    });

    loadOfficers();
}
