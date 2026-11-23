// Development-only browser API fixture. Tests inject it; it is never a deployed asset.
// This mock does not validate firmware or hardware.
export async function createControllerTest() {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
        || new URLSearchParams(location.search).get('test') !== '1') {
        throw new Error('Temporary controller bypass requires localhost and ?test=1.');
    }

    const storageKey = 'cpd-temporary-controller-test';
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    const database = saved?.database || await (await fetch('database.json', { cache: 'no-store' })).json();
    // AI-generated (Codex): malformed development fixtures must fail visibly, never reach an API.
    if (!Array.isArray(database?.Officers) || !Array.isArray(database?.drills) || !Array.isArray(database?.targets)) {
        throw new Error('Browser test data is incomplete. Clear test data before continuing.');
    }
    const release = await (await fetch('release.json', { cache: 'no-store' })).json();
    const idleStatus = {
        state: 'idle', drillName: '', targets: [], facing: [], lastOutcome: 'none', stopped: false,
        hardwareReady: true, stageResetPending: false, stageRestartReady: false
    };
    const run = saved?.run || { status: { ...idleStatus }, steps: [], stages: [], index: 0, remaining: null, at: Date.now() };
    const status = run.status;
    const rssiParameter = new URLSearchParams(location.search).get('rssi');
    const testRSSI = rssiParameter === null ? NaN : Number(rssiParameter);
    const testSignal = Number.isFinite(testRSSI)
        ? { signal: testRSSI < -75 ? 'weak' : 'good', rssi: testRSSI }
        : { signal: 'unknown', rssi: null };
    const save = () => sessionStorage.setItem(storageKey, JSON.stringify({ database, run }));
    const json = (body, code = 200) => new Response(JSON.stringify(body), {
        status: code, headers: { 'Content-Type': 'application/json' }
    });
    const refuse = (message) => { throw new Error(message); };
    const isDate = (date) => {
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
        const [year, month, day] = date.split('-').map(Number);
        const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        return year >= 1 && month >= 1 && month <= 12 && day >= 1
            && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    };
    const officersWithStats = (today) => {
        if (!isDate(today)) refuse('Enter a real calendar date.');
        let cutoff = `${String(Number(today.slice(0, 4)) - 1).padStart(4, '0')}${today.slice(4)}`;
        if (today.endsWith('-02-29')) cutoff = `${cutoff.slice(0, 8)}28`;
        const stats = (history = []) => {
            const scores = history.filter((entry) => Array.isArray(entry) && Number.isInteger(entry[0])
                && entry[1] >= cutoff && entry[1] <= today).map((entry) => entry[0]);
            return { attempts: scores.length, top: scores.length ? Math.max(...scores) : null,
                average: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length * 10) / 10 : null };
        };
        return database.Officers.map((officer) => {
            const result = structuredClone(officer);
            for (const type of ['pistol', 'rifle', 'swat']) result[`${type}Stats`] = stats(officer[`${type}QualScores`]);
            result.qualificationStats = Object.fromEntries(Object.entries(officer.qualificationScores || {}).map(([name, history]) => [name, stats(history)]));
            return result;
        });
    };
    const workingTargets = (requested) => database.targets
        .filter((target) => target.working !== false && (!requested?.length || requested.includes(target.id)))
        .map((target) => target.id);
    const stage = () => run.stages.filter((item) => item.first <= run.index
        && (run.index < item.end || run.steps[run.index]?.action === 'yield')).pop();
    // AI-generated (Claude): mirrors stageJumpTarget() and the part counts in target_manager.cpp.
    // AI-modified (Claude): returns the step index to jump to
    const jumpTarget = (jump) => {
        const current = stage();
        if (!current) return -1;
        const index = run.stages.indexOf(current);
        const target = jump === 'current' ? index : jump === 'previous' ? index - 1
            : index + (run.index >= current.end ? 2 : 1);
        return target >= 0 && target < run.stages.length ? run.stages[target].first : -1;
    };
    const partsOf = (current) => {
        if (!current || run.stagesAreParts) return { partIndex: 0, partCount: 0 };
        let before = 0, total = 0;
        for (let index = current.first; index < current.end; index++) {
            if (run.steps[index].action !== 'yield') continue;
            total++;
            if (index < run.index) before++;
        }
        return { partIndex: before + 1, partCount: total + 1 };
    };
    const move = (targets, present) => {
        status.facing = [...new Set([...status.facing.filter((id) => !targets.includes(id)), ...(present ? targets : [])])];
    };
    const finish = (outcome) => {
        status.state = 'idle';
        status.lastOutcome = outcome;
        status.stageResetPending = status.stageRestartReady = false;
        run.remaining = null;
        run.resetUntil = 0;
    };
    const advance = () => {
        const now = Date.now();
        let elapsed = Math.max(0, now - run.at);
        run.at = now;
        if (status.stageResetPending && now >= run.resetUntil) {
            move(status.targets, false);
            run.index = run.jumpTo;
            run.remaining = null;
            status.stageResetPending = false;
            status.stageRestartReady = true;
        }
        while (status.state === 'running') {
            const step = run.steps[run.index];
            if (!step) {
                move(status.targets, false);
                finish('completed');
                break;
            }
            if (step.action === 'delay') {
                run.remaining = (run.remaining ?? step.timeMs) - elapsed;
                elapsed = 0;
                if (run.remaining > 0) break;
                elapsed = -run.remaining;
                run.remaining = null;
            } else if (step.action === 'yield') {
                status.state = 'paused';
                break;
            } else {
                let targets = status.targets.filter((id) => !step.targets?.length || step.targets.includes(id));
                if (step.random) {
                    targets = [...targets];
                    for (let index = targets.length - 1; index > 0; index--) {
                        const other = Math.floor(Math.random() * (index + 1));
                        [targets[index], targets[other]] = [targets[other], targets[index]];
                    }
                    targets = targets.slice(0, step.random);
                }
                move(targets, step.action === 'present');
            }
            run.index++;
        }
        save();
    };
    const expand = (name, depth = 1) => {
        if (depth > 4) refuse('Drill nesting exceeds four levels.');
        const drill = database.drills.find((item) => item.drillName === name);
        if (!drill?.sequence?.length) refuse('Drill not found or empty.');
        for (const step of drill.sequence) {
            // AI-modified (Claude): "yield" (old name "pause", read as yield)
            if (['present', 'hide', 'yield', 'pause', 'delay'].includes(step.action)) {
                if (step.action === 'delay' && (!Number.isInteger(step.timeMs) || step.timeMs < 0)) refuse('Invalid delay.');
                if (step.targets?.some((id) => !workingTargets().includes(id))) refuse('Drill contains a defective target.');
                run.steps.push(step.action === 'pause' ? { ...step, action: 'yield' } : step);
            } else {
                const first = run.steps.length;
                expand(step.action, depth + 1);
                if (depth === 1) run.stages.push({ name: step.action, first, end: run.steps.length });
            }
        }
    };

    // TEMPORARY TESTING BANNER AND NAVIGATION: KEEP THE BYPASS VISIBLE ON EVERY PAGE.
    // AI-modified (Claude): a small pill fixed to the bottom-left corner instead of a full-width
    // alert under the status bar, so the page looks as it will on the controller. Sits above the
    // Stop bar when that is showing. (Its id is not controllerTestBanner on purpose: script.js
    // would otherwise place the connection banner after it.)
    const badgeStyle = document.createElement('style');
    badgeStyle.textContent = `
        .controller-test-badge { position: fixed; left: calc(0.75rem + env(safe-area-inset-left, 0px));
            bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px)); z-index: 1042; display: flex;
            align-items: center; gap: 0.5rem; padding: 0.3rem 0.65rem; border: 1px solid #e0b100;
            border-radius: 2rem; background: #fff3cd; color: #664d03; font: 600 0.75rem/1.2 system-ui, sans-serif;
            box-shadow: 0 0.15rem 0.5rem rgba(0, 0, 0, 0.15); opacity: 0.92; }
        body.has-action-bar .controller-test-badge { bottom: calc(5.4rem + env(safe-area-inset-bottom, 0px)); }
        .controller-test-badge button, .controller-test-badge a { padding: 0; border: 0; background: none;
            color: #664d03; font: inherit; text-decoration: underline; }
        @media print { .controller-test-badge { display: none; } }`;
    document.head.append(badgeStyle);
    const banner = document.createElement('aside');
    banner.className = 'controller-test-badge';
    banner.id = 'controllerTestBadge';
    banner.title = 'Temporary webpage test mode: the controller is bypassed and no hardware commands are sent.';
    const label = document.createElement('strong');
    label.textContent = 'TEST MODE';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Clear';
    clear.title = 'Clear test data (back to database.json)';
    clear.onclick = () => { sessionStorage.removeItem(storageKey); location.reload(); };
    const exit = document.createElement('a');
    const normalUrl = new URL(location.href);
    normalUrl.searchParams.delete('test');
    exit.href = normalUrl.href;
    exit.textContent = 'Exit';
    exit.title = 'Exit test mode';
    banner.append(label, clear, exit);
    document.body.append(banner);
    document.querySelectorAll('a[href]').forEach((link) => {
        const url = new URL(link.href);
        if (link !== exit && url.origin === location.origin && url.pathname.endsWith('.html')) {
            url.searchParams.set('test', '1');
            link.href = url.href;
        }
    });

    // TEMPORARY API RESPONSES: NEVER FALL THROUGH TO A REAL /api/ REQUEST IN TEST MODE.
    return async (path, options = {}) => {
        const url = new URL(path, location.href);
        if (url.origin !== location.origin) refuse('External requests are unavailable in test mode.');
        if (url.pathname !== '/database.json' && !url.pathname.startsWith('/api/')) return fetch(path, options);
        advance();
        const method = options.method || 'GET';
        const body = options.body ? JSON.parse(options.body) : {};
        const route = url.pathname;
        try {
            if (method === 'GET') {
                if (route === '/database.json') return json(database);
                if (route === '/api/database/backup') return json(database);
                if (route === '/api/targets') return json(database.targets);
                if (route === '/api/drills') return json(database.drills);
                if (route === '/api/qualifications') return json(database.qualifications || ['Pistol', 'Rifle', 'SWAT']);
                if (route === '/api/targets/state') return json({ facing: status.facing });
                // AI-generated (Claude): target flip delay (kept with the test data)
                if (route === '/api/settings/target-flip') return json({ faceTravelMs: database.faceTravelMs ?? 300, maxMs: 5000, defaultMs: 300 });
                if (route === '/api/officers') return json(officersWithStats(url.searchParams.get('today') || new Date().toISOString().slice(0, 10)));
                if (route === '/api/drill/status') {
                    const active = status.state !== 'idle';
                    const current = active ? stage() : null;
                    const step = active ? run.steps[run.index] : null;
                    return json({ ...status, step: active ? run.index + 1 : 0, stepCount: run.steps.length,
                        stepAction: step?.action || '', delayMs: step?.action === 'delay' ? step.timeMs : 0,
                        delayRemainingMs: run.remaining || 0, stageName: current?.name || '',
                        stageIndex: current ? run.stages.indexOf(current) + 1 : 0,
                        betweenStages: Boolean(current && run.index >= current.end),
                        canResetStage: active && !status.stageResetPending && jumpTarget('current') >= 0,
                        canGoBack: active && !status.stageResetPending && jumpTarget('previous') >= 0,
                        canSkip: active && !status.stageResetPending && jumpTarget('next') >= 0,
                        stageCount: active ? run.stages.length : 0, stagesAreParts: Boolean(run.stagesAreParts),
                        ...partsOf(active ? current : null), finalStageComplete: false,
                        ...testSignal });
                }
                return json({ error: 'Unknown temporary test endpoint.' }, 404);
            } else if (route === '/api/drill/start') {
                if (status.state !== 'idle' || status.stopped) refuse('Stop and Reset the current drill first.');
                run.steps = [];
                run.stages = [];
                expand(body.drillName);
                // AI-generated (Claude): a drill without stages moves by parts (between pauses)
                run.stagesAreParts = !run.stages.length;
                if (run.stagesAreParts) {
                    let first = 0;
                    run.steps.forEach((step, index) => {
                        if (step.action !== 'yield') return;
                        if (index > first) run.stages.push({ name: '', first, end: index });
                        first = index + 1;
                    });
                    if (run.steps.length > first) run.stages.push({ name: '', first, end: run.steps.length });
                }
                const targets = workingTargets(body.targets);
                if (!targets.length) refuse('No working targets selected.');
                Object.assign(status, idleStatus, { state: 'running', drillName: body.drillName, targets });
                Object.assign(run, { index: 0, remaining: null, at: Date.now() });
            } else if (route === '/api/drill/pause') {
                if (status.state !== 'running') refuse('No drill is running.');
                status.state = 'paused';
            } else if (route === '/api/drill/resume') {
                if (status.state !== 'paused' || status.stageResetPending) refuse('No paused drill is ready to resume.');
                if (!status.stageRestartReady && run.steps[run.index].action === 'yield') run.index++;
                status.stageRestartReady = false;
                status.state = 'running';
            } else if (route === '/api/drill/jump') {
                // AI-generated (Claude): a given stage and part (1-based), while running or paused
                if (status.state === 'idle' || status.stageResetPending) refuse('No drill is running, or a stage change is pending.');
                const target = run.stages[body.stage - 1];
                let step = -1;
                if (target && (body.part ?? 1) === 1) step = target.first;
                else if (target && !run.stagesAreParts) {
                    let pauses = 0;
                    for (let index = target.first; index < target.end; index++) {
                        if (pauses === body.part - 1) { step = index; break; }
                        if (run.steps[index].action === 'yield') pauses++;
                    }
                }
                if (step < 0) refuse('That stage or part does not exist in this drill');
                if (!(status.stageRestartReady && step === run.index)) {
                    Object.assign(status, { state: 'paused', stageRestartReady: false, stageResetPending: true });
                    Object.assign(run, { jumpTo: step, remaining: null, resetUntil: Date.now() + 600 });
                }
            } else if (['/api/drill/reset-stage', '/api/drill/previous-stage', '/api/drill/next-stage'].includes(route)) {
                // AI-modified (Claude): Back / Redo / Skip a stage, while running or paused
                const jump = { 'reset-stage': 'current', 'previous-stage': 'previous', 'next-stage': 'next' }[route.split('/').pop()];
                if (status.state === 'idle' || status.stageResetPending) refuse('No drill is running, or a stage change is pending.');
                const target = jumpTarget(jump);
                if (target < 0) refuse('There is no stage to move to.');
                if (!(status.stageRestartReady && target === run.index)) {
                    status.state = 'paused';
                    status.stageRestartReady = false;
                    status.stageResetPending = true;
                    run.jumpTo = target;
                    run.remaining = null;
                    run.resetUntil = Date.now() + 600;
                }
            } else if (route === '/api/stop') {
                finish('stopped');
                status.stopped = true;
            } else if (route === '/api/reset' || route === '/api/targets/present' || route === '/api/targets/hide') {
                if (status.state !== 'idle') refuse('Stop the drill first.');
                if (route === '/api/reset') {
                    status.stopped = false;
                    status.facing = [];
                } else {
                    if (status.stopped) refuse('Targets are stopped; press Reset first.');
                    const targets = workingTargets(body.targets);
                    if (!targets.length) refuse('No working targets selected.');
                    move(targets, route.endsWith('/present'));
                }
            } else if (route === '/api/targets' && method === 'PUT') {
                const target = database.targets.find((item) => item.id === Number(url.searchParams.get('id')));
                if (!target) refuse('Target not found.');
                if (typeof body.working !== 'boolean') refuse('working must be a boolean.');
                target.working = body.working;
            } else if (route === '/api/officers/scores' && method === 'POST') {
                const officer = database.Officers.find((item) => item.BadgeNum === body.BadgeNum);
                const name = (database.qualifications || ['Pistol', 'Rifle', 'SWAT']).find((item) => (
                    typeof body.qualType === 'string' && item.toLowerCase() === body.qualType.toLowerCase()
                ));
                if (!officer || !name || !Number.isInteger(body.score) || body.score < 0 || body.score > 2147483647
                    || !isDate(body.date)) refuse('Score rejected: unknown officer, qualification, or invalid score/date.');
                const type = name.toLowerCase();
                const entry = [body.score, body.date];
                if (['pistol', 'rifle', 'swat'].includes(type)) {
                    officer[`${type}QualScores`] = [entry, ...(officer[`${type}QualScores`] || [])];
                } else {
                    const histories = officer.qualificationScores || {};
                    officer.qualificationScores = { ...histories, [name]: [entry, ...(Object.hasOwn(histories, name) ? histories[name] : [])] };
                }
            } else if (route === '/api/settings/target-flip' && method === 'PUT') {
                if (!Number.isInteger(body.faceTravelMs) || body.faceTravelMs < 0 || body.faceTravelMs > 5000) refuse('faceTravelMs must be a whole number from 0 to 5000');
                database.faceTravelMs = body.faceTravelMs;
            } else if (route === '/api/officers') {
                // AI-generated (Claude): add / edit (name, badge) / delete officers in test mode
                const badge = Number(url.searchParams.get('badge'));
                const index = database.Officers.findIndex((item) => item.BadgeNum === badge);
                const nameOk = (name) => typeof name === 'string' && name.trim() && name.trim().length <= 64;
                if (method === 'POST') {
                    if (!Number.isInteger(body.BadgeNum) || body.BadgeNum < 1 || body.BadgeNum > 2147483647 || !nameOk(body.Name)) refuse('Enter a name and a positive badge number.');
                    if (database.Officers.some((item) => item.BadgeNum === body.BadgeNum)) refuse('An officer with that badge number already exists');
                    database.Officers.push({ Name: body.Name.trim(), BadgeNum: body.BadgeNum, qualificationScores: {},
                        pistolQualScores: [], rifleQualScores: [], swatQualScores: [] });
                } else if (method === 'PUT') {
                    if (index < 0) refuse('Officer not found');
                    if (body.Name !== undefined && !nameOk(body.Name)) refuse('Name is required');
                    if (body.BadgeNum !== undefined) {
                        if (!Number.isInteger(body.BadgeNum) || body.BadgeNum < 1 || body.BadgeNum > 2147483647) refuse('BadgeNum must be a positive whole number');
                        if (body.BadgeNum !== badge && database.Officers.some((item) => item.BadgeNum === body.BadgeNum)) refuse('Another officer already has that badge number');
                        database.Officers[index].BadgeNum = body.BadgeNum;
                    }
                    if (body.Name !== undefined) database.Officers[index].Name = body.Name.trim();
                } else if (method === 'DELETE') {
                    if (index < 0) refuse('Officer not found');
                    database.Officers.splice(index, 1);
                }
            } else if (route === '/api/qualifications' && method === 'DELETE') {
                // AI-generated (Claude): mirrors deleteQualification() in database.cpp
                const name = (url.searchParams.get('name') || '').trim();
                const names = database.qualifications || ['Pistol', 'Rifle', 'SWAT'];
                const same = (other) => String(other).toLowerCase() === name.toLowerCase();
                if (['pistol', 'rifle', 'swat'].includes(name.toLowerCase())) refuse('Pistol, Rifle and SWAT are built in and cannot be deleted');
                if (!names.some(same)) refuse('Qualification not found');
                const scores = database.Officers.reduce((total, officer) => total + Object.entries(officer.qualificationScores || {})
                    .filter(([key]) => same(key)).reduce((sum, [, history]) => sum + (history?.length || 0), 0), 0);
                if (scores) refuse(`${scores} ${scores === 1 ? 'score is' : 'scores are'} recorded under ${name}. It can only be deleted once it has no scores.`);
                database.qualifications = names.filter((other) => !same(other));
                database.drills.forEach((drill) => {
                    if (Array.isArray(drill.qualifications)) drill.qualifications = drill.qualifications.filter((other) => !same(other));
                });
            } else if (route === '/api/qualifications' && method === 'POST') {
                const name = typeof body.name === 'string' ? body.name.trim() : '';
                const names = database.qualifications || ['Pistol', 'Rifle', 'SWAT'];
                if (!name || new TextEncoder().encode(name).length > 32 || /[\u0000-\u001f]/.test(name)
                    || names.some((item) => item.toLowerCase() === name.toLowerCase())) refuse('Enter a unique, short qualification name.');
                database.qualifications = [...names, name];
            } else if (route === '/api/drills') {
                const name = url.searchParams.get('name');
                const index = database.drills.findIndex((item) => item.drillName === name);
                if (method === 'DELETE') {
                    if (index < 0 || database.drills.some((item) => item.sequence.some((step) => step.action === name))) refuse('Drill not found or used by another drill.');
                    database.drills.splice(index, 1);
                } else {
                    // AI-generated (Codex): reject the same authoring boundaries as preflight.
                    if (method === 'PUT' && index < 0) refuse('Drill not found.');
                    if (method === 'PUT' && body.sequence == null
                        && (body.qualifications != null || body.description != null || body.drillName == null)) refuse('A sequence is required for this edit.');
                    // Rename-only edits are supported by the production API; validate the final record.
                    const candidate = method === 'PUT' ? { ...database.drills[index], ...body,
                        drillName: body.drillName ?? database.drills[index].drillName,
                        sequence: body.sequence ?? database.drills[index].sequence,
                        qualifications: body.qualifications ?? database.drills[index].qualifications,
                        description: body.description ?? database.drills[index].description } : body;
                    const actions = new Set(['present', 'hide', 'yield', 'pause', 'delay']);
                    if (typeof candidate.drillName !== 'string' || !candidate.drillName.trim() || actions.has(candidate.drillName)
                        || !Array.isArray(candidate.sequence) || !candidate.sequence.length) refuse('A unique drill name and sequence are required.');
                    for (const [stepIndex, step] of candidate.sequence.entries()) {
                        if (!step || step.step !== stepIndex + 1 || typeof step.action !== 'string') refuse('Invalid drill step.');
                        if (['targetMode', 'targetIds', 'randomCount'].some((key) => Object.hasOwn(step, key))) refuse('Unsupported target-selection fields.');
                        if (step.action === 'delay' && (!Number.isInteger(step.timeMs) || step.timeMs <= 0 || step.timeMs > 2147483647)) refuse('Delay needs a positive whole-number duration.');
                        if (step.targets !== undefined && (!['present', 'hide'].includes(step.action) || !Array.isArray(step.targets)
                            || !step.targets.length || new Set(step.targets).size !== step.targets.length
                            || step.targets.some((id) => !Number.isInteger(id) || id < 1 || id > 20 || !workingTargets().includes(id)))) refuse('Choose valid available targets.');
                        if (step.random !== undefined && (step.action !== 'present' || !Number.isInteger(step.random)
                            || step.random < 1 || step.random > 20 || step.targets !== undefined)) refuse('Invalid random target count.');
                    }
                    const graph = new Map(database.drills.filter((drill) => drill.drillName !== name).map((drill) => [drill.drillName, drill]));
                    graph.set(candidate.drillName, candidate);
                    const visit = (drillName, path = []) => {
                        if (path.includes(drillName) || path.length >= 4) refuse('Drill references form a cycle or exceed four levels.');
                        const drill = graph.get(drillName);
                        if (!drill) refuse('Nested drill not found.');
                        for (const step of drill.sequence) if (!actions.has(step.action)) visit(step.action === name ? candidate.drillName : step.action, [...path, drillName]);
                    };
                    for (const drillName of graph.keys()) visit(drillName);
                    if (candidate.qualifications !== undefined && (!Array.isArray(candidate.qualifications)
                        || candidate.qualifications.some((name) => typeof name !== 'string'
                            || !(database.qualifications || ['Pistol', 'Rifle', 'SWAT']).some((item) => item.toLowerCase() === name.toLowerCase())))) {
                        refuse('Unknown qualification.');
                    }
                    if (candidate.qualifications && new Set(candidate.qualifications.map((qualification) => qualification.toLowerCase())).size !== candidate.qualifications.length) refuse('Duplicate qualification assignments.');
                    if (database.drills.some((item, other) => item.drillName === candidate.drillName && other !== index)) refuse('Drill name already exists.');
                    if (index < 0) database.drills.push(candidate);
                    else {
                        database.drills[index] = candidate;
                        database.drills.forEach((item) => item.sequence.forEach((step) => {
                            if (step.action === name) step.action = candidate.drillName;
                        }));
                    }
                }
            } else {
                return json({ error: 'This action requires the real controller and is unavailable in temporary test mode.' }, 501);
            }
            advance();
            return json({ ok: true });
        } catch (error) {
            return json({ error: error.message }, 409);
        }
    };
}
// END TEMPORARY CONTROLLER BYPASS.
