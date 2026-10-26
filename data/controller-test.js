// ============================================================================
// TEMPORARY CONTROLLER BYPASS FOR LOCAL WEBPAGE TESTING ONLY.
// AI-ASSISTED WITH CODEX. REMOVE THIS FILE AND ITS script.js LOADER AFTER TESTING.
// TEST DATA STAYS IN THIS BROWSER TAB. THIS DOES NOT VALIDATE FIRMWARE OR HARDWARE.
// ============================================================================
export async function createControllerTest() {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
        || new URLSearchParams(location.search).get('test') !== '1') {
        throw new Error('Temporary controller bypass requires localhost and ?test=1.');
    }

    const storageKey = 'cpd-temporary-controller-test';
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    const database = saved?.database || await (await fetch('database.json', { cache: 'no-store' })).json();
    const idleStatus = {
        state: 'idle', drillName: '', targets: [], facing: [], lastOutcome: 'none', stopped: false,
        hardwareReady: true, stageResetPending: false, stageRestartReady: false
    };
    const run = saved?.run || { status: { ...idleStatus }, steps: [], stages: [], index: 0, remaining: null, at: Date.now() };
    const status = run.status;
    const save = () => sessionStorage.setItem(storageKey, JSON.stringify({ database, run }));
    const json = (body, code = 200) => new Response(JSON.stringify(body), {
        status: code, headers: { 'Content-Type': 'application/json' }
    });
    const refuse = (message) => { throw new Error(message); };
    const officersWithStats = (today) => {
        const cutoff = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
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
        && (run.index < item.end || run.steps[run.index]?.action === 'pause')).pop();
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
            run.index = stage().first;
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
            } else if (step.action === 'pause') {
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
            if (['present', 'hide', 'pause', 'delay'].includes(step.action)) {
                if (step.action === 'delay' && (!Number.isInteger(step.timeMs) || step.timeMs < 0)) refuse('Invalid delay.');
                if (step.targets?.some((id) => !workingTargets().includes(id))) refuse('Drill contains a defective target.');
                run.steps.push(step);
            } else {
                const first = run.steps.length;
                expand(step.action, depth + 1);
                if (depth === 1) run.stages.push({ name: step.action, first, end: run.steps.length });
            }
        }
    };

    // TEMPORARY TESTING BANNER AND NAVIGATION: KEEP THE BYPASS VISIBLE ON EVERY PAGE.
    const banner = document.createElement('aside');
    banner.className = 'alert alert-warning m-3';
    banner.id = 'controllerTestBanner';
    banner.textContent = 'TEMPORARY WEBPAGE TEST MODE — Controller bypassed. No hardware commands are sent. ';
    const clear = document.createElement('button');
    clear.className = 'btn btn-sm btn-outline-dark me-2';
    clear.textContent = 'Clear test data';
    clear.onclick = () => { sessionStorage.removeItem(storageKey); location.reload(); };
    const exit = document.createElement('a');
    const normalUrl = new URL(location.href);
    normalUrl.searchParams.delete('test');
    exit.href = normalUrl.href;
    exit.textContent = 'Exit test mode';
    banner.append(clear, exit);
    (document.getElementById('drillStatus') || document.body.firstElementChild).after(banner);
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
                if (route === '/api/targets') return json(database.targets);
                if (route === '/api/drills') return json(database.drills);
                if (route === '/api/qualifications') return json(database.qualifications || ['Pistol', 'Rifle', 'SWAT']);
                if (route === '/api/targets/state') return json({ facing: status.facing });
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
                        canResetStage: Boolean(current && status.state === 'paused' && !status.stageResetPending) });
                }
                return json({ error: 'Unknown temporary test endpoint.' }, 404);
            } else if (route === '/api/drill/start') {
                if (status.state !== 'idle' || status.stopped) refuse('Stop and Reset the current drill first.');
                run.steps = [];
                run.stages = [];
                expand(body.drillName);
                const targets = workingTargets(body.targets);
                if (!targets.length) refuse('No working targets selected.');
                Object.assign(status, idleStatus, { state: 'running', drillName: body.drillName, targets });
                Object.assign(run, { index: 0, remaining: null, at: Date.now() });
            } else if (route === '/api/drill/pause') {
                if (status.state !== 'running') refuse('No drill is running.');
                status.state = 'paused';
            } else if (route === '/api/drill/resume') {
                if (status.state !== 'paused' || status.stageResetPending) refuse('No paused drill is ready to resume.');
                if (!status.stageRestartReady && run.steps[run.index].action === 'pause') run.index++;
                status.stageRestartReady = false;
                status.state = 'running';
            } else if (route === '/api/drill/reset-stage') {
                if (status.state !== 'paused' || !stage() || status.stageResetPending) refuse('Pause a full-drill stage before resetting it.');
                if (!status.stageRestartReady) {
                    status.stageResetPending = true;
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
                target.working = body.working;
            } else if (route === '/api/officers/scores' && method === 'POST') {
                const officer = database.Officers.find((item) => item.BadgeNum === body.BadgeNum);
                const name = (database.qualifications || ['Pistol', 'Rifle', 'SWAT']).find((item) => (
                    typeof body.qualType === 'string' && item.toLowerCase() === body.qualType.toLowerCase()
                ));
                if (!officer || !name || !Number.isInteger(body.score) || body.score < 0 || body.score > 2147483647
                    || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) refuse('Score rejected: unknown officer, qualification, or invalid score/date.');
                const type = name.toLowerCase();
                const entry = [body.score, body.date];
                if (['pistol', 'rifle', 'swat'].includes(type)) {
                    officer[`${type}QualScores`] = [entry, ...(officer[`${type}QualScores`] || [])];
                } else {
                    const histories = officer.qualificationScores || {};
                    officer.qualificationScores = { ...histories, [name]: [entry, ...(Object.hasOwn(histories, name) ? histories[name] : [])] };
                }
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
                    if (body.qualifications !== undefined && (!Array.isArray(body.qualifications)
                        || body.qualifications.some((name) => typeof name !== 'string'
                            || !(database.qualifications || ['Pistol', 'Rifle', 'SWAT']).some((item) => item.toLowerCase() === name.toLowerCase())))) {
                        refuse('Unknown qualification.');
                    }
                    if (database.drills.some((item, other) => item.drillName === body.drillName && other !== index)) refuse('Drill name already exists.');
                    if (method === 'PUT' && index < 0) refuse('Drill not found.');
                    if (index < 0) database.drills.push(body);
                    else {
                        database.drills[index] = { ...database.drills[index], ...body };
                        database.drills.forEach((item) => item.sequence.forEach((step) => {
                            if (step.action === name) step.action = body.drillName;
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
