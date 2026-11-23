'use strict';

// AI-assisted (Codex): contract tests execute the real localhost mock with memory-only
// storage and fetch. They never start the preview server or issue controller commands.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const STORAGE_KEY = 'cpd-temporary-controller-test';
const source = fs.readFileSync(path.join(__dirname, '../fixtures/controller-test.js'), 'utf8');
const factoryModule = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const stage = (drillName = 'Stage', action = 'hide') => ({ drillName, sequence: [{ step: 1, action }], qualifications: ['Pistol'] });
const seedDatabase = () => ({
    schemaVersion: 1, qualifications: ['Pistol', 'Rifle', 'SWAT'],
    Officers: [{ Name: 'Audit Officer', BadgeNum: 1, pistolQualScores: [], rifleQualScores: [], swatQualScores: [], qualificationScores: {} }],
    drills: [stage()], targets: Array.from({ length: 20 }, (_, index) => ({ id: index + 1, working: true }))
});
const release = { uiVersion: '1.0.0', firmwareVersion: '1.0.0', databaseSchemaVersion: 1 };

async function withMock(seed, body) {
    const originals = new Map(['location', 'sessionStorage', 'document', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const originalNow = Date.now;
    const storage = new Map();
    const requests = [];
    try {
        globalThis.location = new URL('http://127.0.0.1:8768/targets.html?test=1');
        globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
        const element = () => ({ append() {} });
        globalThis.document = { createElement: element, head: element(), body: element(), querySelectorAll: () => [] };
        globalThis.fetch = async requested => {
            requests.push(String(requested));
            if (requested === 'database.json') return new Response(JSON.stringify(seed));
            if (requested === 'release.json') return new Response(JSON.stringify(release));
            throw new Error(`Unexpected fetch in isolated mock contract: ${requested}`);
        };
        // Freezing this clock lets a refused operation prove the whole stored state stayed
        // identical, rather than ignoring unrelated idle-timer updates in advance().
        Date.now = () => Date.UTC(2026, 10, 23, 12);
        const { createControllerTest } = await factoryModule;
        const request = await createControllerTest();
        await request('/database.json'); // Establish the initial stored snapshot.
        await body({ request, storage, requests, reload: createControllerTest });
        assert.ok(requests.every(requested => requested === 'database.json' || requested === 'release.json'));
    } finally {
        Date.now = originalNow;
        for (const [key, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
        }
    }
}

async function refusedWithoutMutation(context, endpoint, body, method = 'POST') {
    const before = context.storage.get(STORAGE_KEY);
    const response = await context.request(endpoint, { method, body: JSON.stringify(body) });
    assert.equal(response.ok, false, `accepted invalid input ${JSON.stringify(body)}`);
    assert.equal(typeof (await response.json()).error, 'string');
    assert.equal(context.storage.get(STORAGE_KEY), before, 'a refused mutation changed persisted mock state');
}

for (const date of ['2026-02-31', '2026-02-29', '1900-02-29', '0000-01-01']) {
    test(`controller mock rejects impossible score date ${date} without changing storage`, () => withMock(seedDatabase(), context => refusedWithoutMutation(context, '/api/officers/scores', { BadgeNum: 1, qualType: 'Pistol', score: 80, date })));
}

for (const targets of [[0, 21], [1, 1], [], ['1']]) {
    test(`controller mock rejects invalid authored targets ${JSON.stringify(targets)}`, () => withMock(seedDatabase(), context => refusedWithoutMutation(context, '/api/drills', { drillName: 'Invalid targets', sequence: [{ step: 1, action: 'present', targets }] })));
}

test('controller mock rejects self cycles before persisting the candidate', () => withMock(seedDatabase(), context => refusedWithoutMutation(context, '/api/drills', stage('Cycle', 'Cycle'))));

test('controller mock rejects an edit that introduces a two-drill cycle', () => {
    const seed = seedDatabase(); seed.drills = [stage('A', 'B'), stage('B')];
    return withMock(seed, context => refusedWithoutMutation(context, '/api/drills?name=B', stage('B', 'A'), 'PUT'));
});

test('controller mock rejects a fifth nesting level considering existing parents', () => {
    const seed = seedDatabase(); seed.drills = [stage('A', 'B'), stage('B', 'C'), stage('C', 'D'), stage('D')];
    return withMock(seed, context => refusedWithoutMutation(context, '/api/drills', stage('Root', 'A')));
});

for (const name of ['', '   ', 'delay']) {
    test(`controller mock rejects invalid drill name ${JSON.stringify(name)}`, () => withMock(seedDatabase(), context => refusedWithoutMutation(context, '/api/drills', stage(name))));
}

for (const qualifications of [['Pistol', 'Pistol'], ['Pistol', 'pistol']]) {
    test(`controller mock rejects duplicate qualification tags ${JSON.stringify(qualifications)}`, () => withMock(seedDatabase(), context => refusedWithoutMutation(context, '/api/drills', { ...stage('Duplicate tags'), qualifications })));
}

for (const [alias, value] of [['targetMode', 'custom'], ['targetIds', [1]], ['randomCount', 1]]) {
    test(`controller mock rejects unsupported selector ${alias}`, () => withMock(seedDatabase(), context => refusedWithoutMutation(context, '/api/drills', { drillName: 'Unsupported selector', sequence: [{ step: 1, action: 'present', [alias]: value }] })));
}

test('controller mock refuses failed edits and duplicate badge changes without partial mutations', () => {
    const seed = seedDatabase(); seed.Officers.push({ ...structuredClone(seed.Officers[0]), Name: 'Second Officer', BadgeNum: 2 });
    return withMock(seed, async context => {
        await refusedWithoutMutation(context, '/api/drills?name=Stage', { drillName: 'Renamed', sequence: [{ step: 1, action: 'Missing drill' }] }, 'PUT');
        await refusedWithoutMutation(context, '/api/officers?badge=1', { Name: 'Changed Name', BadgeNum: 2 }, 'PUT');
        await refusedWithoutMutation(context, '/api/targets?id=1', { working: 'false' }, 'PUT');
    });
});

test('controller mock supports rename-only edits and updates references while preserving sequence', () => {
    const seed = seedDatabase(); seed.drills.push(stage('Composite', 'Stage'));
    return withMock(seed, async ({ request }) => {
        const response = await request('/api/drills?name=Stage', { method: 'PUT', body: JSON.stringify({ drillName: 'Renamed Stage' }) });
        assert.equal(response.status, 200, JSON.stringify(await response.json()));
        const drills = await (await request('/api/drills')).json();
        assert.deepEqual(drills.find(drill => drill.drillName === 'Renamed Stage').sequence, seed.drills[0].sequence);
        assert.deepEqual(drills.find(drill => drill.drillName === 'Renamed Stage').qualifications, ['Pistol']);
        assert.equal(drills.find(drill => drill.drillName === 'Composite').sequence[0].action, 'Renamed Stage');
    });
});

test('controller mock supports sequence-only edits while preserving name and qualification tags', () => withMock(seedDatabase(), async ({ request }) => {
    const sequence = [{ step: 1, action: 'delay', timeMs: 1000 }, { step: 2, action: 'hide' }];
    const response = await request('/api/drills?name=Stage', { method: 'PUT', body: JSON.stringify({ sequence }) });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    const drills = await (await request('/api/drills')).json();
    assert.equal(drills[0].drillName, 'Stage');
    assert.deepEqual(drills[0].sequence, sequence);
    assert.deepEqual(drills[0].qualifications, ['Pistol']);
}));

test('controller mock fails visibly for an incomplete initial database', async () => {
    await assert.rejects(withMock({}, async () => {}), /incomplete/i);
});

test('controller mock accepts raw point scores and preserves them through a browser reload', () => withMock(seedDatabase(), async ({ request, reload }) => {
    for (const [score, date] of [[101, '2026-11-23'], [2147483647, '2000-02-29']]) {
        const response = await request('/api/officers/scores', { method: 'POST', body: JSON.stringify({ BadgeNum: 1, qualType: 'Pistol', score, date }) });
        assert.equal(response.status, 200);
    }
    const reopened = await reload();
    const saved = await (await reopened('/database.json')).json();
    assert.deepEqual(saved.Officers[0].pistolQualScores, [[2147483647, '2000-02-29'], [101, '2026-11-23']]);
}));

test('controller mock statistics clamp the prior leap-day cutoff and include both boundaries', () => {
    const seed = seedDatabase();
    seed.Officers[0].pistolQualScores = [[80, '2023-02-28'], [81, '2023-03-01'], [82, '2024-02-29'], [100, '2024-03-01'], [99, '2023-02-27']];
    return withMock(seed, async ({ request }) => {
        const response = await request('/api/officers?today=2024-02-29');
        assert.equal(response.status, 200);
        const officers = await response.json();
        assert.deepEqual(officers[0].pistolStats, { attempts: 3, average: 81, top: 82 });
        assert.deepEqual(officers[0].rifleStats, { attempts: 0, average: null, top: null });
        assert.equal((await request('/api/officers?today=2026-02-31')).ok, false);
    });
});
