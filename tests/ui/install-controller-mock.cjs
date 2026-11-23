'use strict';

// AI-assisted (Codex): the browser fixture lives outside data/ and is installed by
// tests only. Production pages always use their normal fetch implementation.
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../fixtures/controller-test.js'), 'utf8');
const records = require('./browser-records.cjs');

async function installControllerMock(page) {
    await page.addInitScript(async ({ fixtureSource, records }) => {
        if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
            || new URLSearchParams(location.search).get('test') !== '1') return;
        const nativeFetch = window.fetch.bind(window);
        const domReady = document.readyState === 'loading'
            ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }))
            : Promise.resolve();
        const moduleUrl = `data:text/javascript;base64,${btoa(unescape(encodeURIComponent(fixtureSource)))}`;
        // Install the fetch boundary synchronously, before any application script runs.
        // The adapter can append its visible badge once the page DOM exists. Its initial
        // seed comes from disposable records, while release metadata comes from the actual page origin.
        const adapter = domReady.then(async () => (await import(moduleUrl)).createControllerTest());
        window.fetch = async (input, options = {}) => {
            const url = new URL(input instanceof Request ? input.url : String(input), location.href);
            if (url.origin === location.origin && url.pathname === '/database.json') return Response.json(records);
            if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
                return (await adapter)(url.href, options);
            }
            return nativeFetch(input, options);
        };
    }, { fixtureSource: source, records });
}

module.exports = { installControllerMock };
