// AI-generated (Codex): software release failure cases; localhost fixtures only.
const { test, expect } = require('@playwright/test');
const seed = require('./browser-records.cjs');
const { parseDatabaseJson, validateDatabase, MAX_DATABASE_BYTES } = require('../../tools/release/data-rules.cjs');

async function mockController(page, { targets = seed.targets, officers = [], onWrite, onRead } = {}) {
    await page.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.hostname !== '127.0.0.1') return route.abort();
        if (!url.pathname.startsWith('/api/')) return route.continue();
        let body = [];
        if (request.method() === 'GET') onRead?.(url.pathname);
        if (request.method() !== 'GET') {
            if (onWrite) return onWrite(route);
            body = { ok: true };
        } else if (url.pathname === '/api/targets') body = targets;
        else if (url.pathname === '/api/officers') body = officers;
        else if (url.pathname === '/api/database/backup') body = seed;
        else if (url.pathname === '/api/drills') body = seed.drills;
        else if (url.pathname === '/api/qualifications') body = ['Pistol', 'Rifle', 'SWAT'];
        else if (url.pathname === '/api/settings/target-flip') body = { faceTravelMs: 300 };
        else if (url.pathname === '/api/drill/status') body = {
            state: 'idle', hardwareReady: true, facing: [], targets: [], stopped: false, lastOutcome: 'none'
        };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
}

for (const [label, contentType, body] of [
    ['HTML', 'text/html', '<!doctype html><title>Range</title>'],
    ['empty', 'text/plain', ''],
    ['false acknowledgement', 'application/json', '{"ok":false}'],
    ['malformed JSON', 'application/json', '{']
]) {
    test(`a ${label} response never confirms a write`, async ({ page }) => {
        await mockController(page);
        // AI-assisted (Codex): an earlier unrelated rejection must not satisfy this test.
        const requests = [];
        await page.route('**/audit-write', (route) => {
            requests.push([route.request().method(), route.request().postDataJSON()]);
            return route.fulfill({ status: 200, contentType, body });
        });
        await page.goto('/settings.html');
        const result = await page.evaluate(async () => {
            try { await postToController('/audit-write', { audit: true }); return 'accepted'; }
            catch (error) { return error.message; }
        });
        expect(requests).toEqual([['POST', { audit: true }]]);
        expect(result).toMatch(/check|reload|confirm/i);
    });
}

test('malformed availability stays unknown and offers recovery', async ({ page }) => {
    await mockController(page, { targets: { unexpected: 'object instead of targets array' } });
    await page.goto('/targets.html');
    await expect(page.locator('#targetDataWarning')).toBeVisible();
    await expect(page.locator('#manualModeButton')).toBeDisabled();
    await expect(page.locator('.target-card:not([disabled])')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reload target data' })).toBeVisible();
});

test('repeated officer submit events send one pending write', async ({ page }) => {
    const writes = [];
    await mockController(page, { onWrite: async (route) => {
        const request = route.request();
        writes.push([new URL(request.url()).pathname, request.method(), request.postDataJSON()]);
        await new Promise((resolve) => setTimeout(resolve, 200));
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    } });
    await page.goto('/settings.html');
    await page.evaluate(() => {
        document.getElementById('newOfficerName').value = 'Repeated Audit';
        document.getElementById('newOfficerBadge').value = '54321';
        const form = document.getElementById('addOfficerForm');
        for (let index = 0; index < 2; index++) form.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    await expect(page.locator('#officersMessage')).toContainText('Repeated Audit added.');
    expect(writes).toEqual([['/api/officers', 'POST', { Name: 'Repeated Audit', BadgeNum: 54321 }]]);
});

test('a completed old drill save cannot close or reset a new draft', async ({ page }) => {
    let releaseWrite;
    let started = false;
    const gate = new Promise((resolve) => { releaseWrite = resolve; });
    await mockController(page, { onWrite: async (route) => {
        started = true;
        await gate;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    } });
    await page.goto('/drills.html');
    await page.locator('#createDrillButton').click();
    await page.locator('#drillEditorName').fill('Old save');
    await page.locator('[data-block="delay"]').click();
    await page.locator('#drillEditorSave').click();
    await expect.poll(() => started).toBeTruthy();
    await page.locator('#drillEditorModal [data-bs-dismiss="modal"]').last().click();
    await expect(page.locator('#drillEditorModal')).toBeHidden();
    await page.locator('#createDrillButton').click();
    await page.locator('#drillEditorName').fill('New unsaved draft');
    releaseWrite();
    await expect(page.locator('#drillEditorModal')).toBeVisible();
    await expect(page.locator('#drillEditorName')).toHaveValue('New unsaved draft');
    await expect(page.locator('#drillEditorSave')).toBeEnabled();
});

test('closing a score batch stops later writes and old completion leaves a reopened dialog alone', async ({ page }) => {
    let writes = 0;
    let releaseWrite;
    const gate = new Promise((resolve) => { releaseWrite = resolve; });
    await mockController(page, { officers: seed.Officers, onWrite: async (route) => {
        writes++;
        await gate;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    } });
    await page.goto('/Performance.html');
    await page.locator('#addScoresToggle').click();
    await page.locator('#scoreOfficer').selectOption({ index: 1 });
    await page.locator('#scoreQualification').selectOption({ index: 1 });
    await page.locator('#scoreValue1').fill('88');
    await page.locator('#scoreDate1').fill('2026-11-23');
    await page.locator('#addScoreEntry').click();
    await page.locator('#scoreValue2').fill('89');
    await page.locator('#scoreDate2').fill('2026-11-23');
    await page.locator('#saveScoresButton').click();
    await expect.poll(() => writes).toBe(1);
    await page.locator('#closeScoresDialog').click();
    await expect(page.locator('#addScoresDialog')).not.toBeVisible();
    await page.locator('#addScoresToggle').click();
    await expect(page.locator('#addScoresError')).toContainText('previous save is still pending');
    releaseWrite();
    await expect(page.locator('#saveScoresButton')).toBeEnabled();
    await expect(page.locator('#addScoresDialog')).toBeVisible();
    expect(writes).toBe(1);
    await expect(page.locator('#scoreValue1')).toHaveValue('88');
    await expect(page.locator('#addScoresError')).toContainText('check the saved scores');
});

test('missing required scripts surface recovery instead of an empty app', async ({ page }) => {
    await mockController(page);
    await page.route('**/controller-client.js*', (route) => route.abort());
    await page.goto('/settings.html');
    await expect(page.locator('#requiredAssetWarning')).toContainText('reload');
});

test('phone downloads the original restorable bytes at the database size limit', async ({ page }) => {
    await mockController(page);
    const data = structuredClone(seed);
    data.Officers[0].Name = 'María';
    data.Officers[0].pistolQualScores = Array.from({ length: 10000 }, () => [137, '2026-11-23']);
    // Keep a metadata integer outside JavaScript's safe-integer range to catch lossy reserialization.
    const prefix = JSON.stringify(data).slice(0, -1) + ',"externalId":9007199254740993,"note":"';
    const raw = prefix + 'x'.repeat(MAX_DATABASE_BYTES - Buffer.byteLength(prefix) - 2) + '"}';
    await page.route('**/api/database/backup', route => route.fulfill({ contentType: 'application/json', body: raw }));
    await page.goto('/settings.html');
    const backup = await page.evaluate(async () => {
        const { file } = await controllerClient.requestBackup();
        return { bytes: [...new Uint8Array(await file.arrayBuffer())] };
    });
    const file = Buffer.from(backup.bytes);
    expect(file.length).toBe(MAX_DATABASE_BYTES);
    expect(file.equals(Buffer.from(raw))).toBe(true);
    const parsed = parseDatabaseJson(file.toString('utf8'));
    expect(parsed.ok).toBe(true);
    expect(validateDatabase(parsed.document, { allowLegacy: false }).ok).toBe(true);
});

test('preview rejects unknown APIs/assets and revalidates paired gzip assets', async ({ request }) => {
    const unknownApi = await request.get('/api/not-an-endpoint');
    expect(unknownApi.status()).toBe(404);
    expect(unknownApi.headers()['content-type']).toContain('application/json');
    const missing = await request.get('/missing-release-file.js');
    expect(missing.status()).toBe(404);
    const compressed = await request.get('/vendor/sortable.min.js', { headers: { 'Accept-Encoding': 'gzip' } });
    expect(compressed.headers()['content-encoding']).toBe('gzip');
    expect(compressed.headers()['cache-control']).toBe('no-cache');
    expect(compressed.headers()['content-type']).toContain('javascript');
    const identity = await request.get('/vendor/sortable.min.js', { headers: { 'Accept-Encoding': 'identity' } });
    expect(identity.ok()).toBeTruthy();
    expect(identity.headers()['content-encoding']).toBeUndefined();
    expect(await identity.body()).toEqual(await compressed.body());
});
