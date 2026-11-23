// AI-generated (Copilot): browser regression checks use only the localhost test adapter.
const { test, expect } = require('@playwright/test');
const { installControllerMock } = require('./install-controller-mock.cjs');

const isTouchProject = (projectName) => projectName.includes('android') || projectName.includes('ios');
const tapOrClick = async (locator, projectName) => {
    if (isTouchProject(projectName)) await locator.tap();
    else await locator.click();
};

test.beforeEach(async ({ page }) => {
    await installControllerMock(page);
    await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1') return route.abort();
        return route.continue();
    });
});

test('manual target controls stay gated and persist; defective targets are excluded', async ({ page }, testInfo) => {
    await page.goto('/targets.html?test=1');
    await expect(page.locator('#controllerTestBadge')).toContainText('TEST MODE');
    await expect(page.locator('.target-card')).toHaveCount(20);

    const targetOne = page.locator('[data-target-number="1"] .target-card');
    await expect(targetOne).toBeDisabled();
    await page.locator('#manualModeButton').click();
    await expect(targetOne).toBeEnabled();
    await tapOrClick(targetOne, testInfo.project.name);
    await expect(targetOne).toHaveClass(/is-red/);

    await page.reload();
    await expect(page.locator('[data-target-number="1"] .target-card')).toHaveClass(/is-red/);

    await page.goto('/settings.html?test=1');
    await page.getByRole('button', { name: 'Defective targets' }).click();
    const targetTwoDefect = page.locator('#defectiveTargetList input[type="checkbox"]').nth(1);
    await targetTwoDefect.check();
    await expect(page.locator('#defectiveTargetsMessage')).toContainText('Target 2 marked defective');

    await page.goto('/targets.html?test=1');
    const targetTwo = page.locator('[data-target-number="2"] .target-card');
    await expect(targetTwo).toHaveClass(/is-defective/);
    await expect(targetTwo).toBeDisabled();
    await page.locator('.target-toggle[data-toggle-set="all"]').click();
    await expect(targetTwo).not.toHaveClass(/is-red/);
    await expect(page.locator('.target-card.is-red')).toHaveCount(19);
});

test('drill editor loads Sortable and saves a tap-built sequence', async ({ page }) => {
    await page.goto('/drills.html?test=1');
    await expect(page.locator('#controllerTestBadge')).toContainText('TEST MODE');
    expect(await page.evaluate(() => typeof Sortable)).toBe('function');

    await page.locator('#createDrillButton').click();
    await page.locator('#drillEditorName').fill('Browser Test Drill');
    for (const action of ['present', 'delay', 'hide']) {
        await page.locator(`[data-block="${action}"]`).click();
    }
    await expect(page.locator('#sequenceList > li')).toHaveCount(3);
    await page.locator('#drillEditorSave').click();
    await expect(page.locator('#drillEditorModal')).toBeHidden();
    await expect(page.locator('#drillList')).toContainText('Browser Test Drill');
});

test('performance score entry generates an application/pdf', async ({ page }) => {
    await page.addInitScript(() => {
        const createObjectURL = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (blob) => {
            if (blob instanceof Blob && blob.type === 'application/pdf') window.__generatedPdf = blob;
            return createObjectURL(blob);
        };
    });
    await page.goto('/Performance.html?test=1');
    await expect(page.locator('#controllerTestBadge')).toContainText('TEST MODE');
    await page.locator('#addScoresToggle').click();
    await page.locator('#scoreOfficer').selectOption({ index: 1 });
    await page.locator('#scoreQualification').selectOption({ index: 1 });
    await page.locator('#scoreValue1').fill('88');
    const localDate = await page.evaluate(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    await page.locator('#scoreDate1').fill(localDate);
    await page.locator('#saveScoresButton').click();
    // AI-assisted (Codex): read the saved record back before inspecting the exported bytes.
    await expect(page.locator('#performanceMessage')).toContainText('1 score saved for Browser fixture');
    const officers = await page.evaluate(async () => (await fetch('/api/officers')).json());
    expect(officers.find(officer => officer.BadgeNum === 801).pistolQualScores).toEqual([[88, localDate]]);
    await expect(page.locator('#exportPdfButton')).toBeEnabled();
    await page.locator('#exportPdfButton').click();
    await page.locator('#exportQualifications input[type="checkbox"]').first().check();
    await expect(page.locator('#printResultsButton')).toBeEnabled();
    await page.locator('#printResultsButton').click();
    await page.waitForFunction(() => window.__generatedPdf?.type === 'application/pdf', null, { timeout: 15000 });
    const bytes = Buffer.from(await page.evaluate(async () => Array.from(
        new Uint8Array(await window.__generatedPdf.arrayBuffer()))));
    const pdf = bytes.toString('latin1');
    expect(pdf).toMatch(/^%PDF-\d\.\d/);
    expect(pdf).toMatch(/\/Type\s*\/Page\b/);
    const trailer = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(pdf);
    expect(trailer).not.toBeNull();
    expect(pdf.slice(Number(trailer[1]), Number(trailer[1]) + 4)).toBe('xref');
});

test('phone layouts do not overflow horizontally and compressed assets have browser MIME headers', async ({ page, request }) => {
    for (const width of [320, 360, 390, 430]) {
        await page.setViewportSize({ width, height: 800 });
        for (const route of ['/targets.html?test=1', '/drills.html?test=1', '/settings.html?test=1', '/Performance.html?test=1']) {
            await page.goto(route);
            await expect(page.locator('#controllerTestBadge')).toContainText('TEST MODE');
            const dimensions = await page.evaluate(() => ({
                viewport: document.documentElement.clientWidth,
                content: document.documentElement.scrollWidth
            }));
            expect(dimensions.content, `${route} overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
        }
    }

    const sortable = await request.get('/vendor/sortable.min.js');
    expect(sortable.ok()).toBeTruthy();
    expect(sortable.headers()['content-encoding']).toBe('gzip');
    expect(sortable.headers()['content-type']).toContain('application/javascript');
});
