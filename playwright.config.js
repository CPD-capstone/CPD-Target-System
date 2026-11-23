// AI-generated (Copilot): repeatable browser coverage for the localhost-only controller mock.
const { defineConfig, devices } = require('@playwright/test');
// AI-modified (Codex): a release gets its own server while a manual preview is open.
const releaseCheck = process.env.CPD_RELEASE_TEST === '1';
const previewURL = releaseCheck ? 'http://127.0.0.1:8769' : 'http://127.0.0.1:8768';

module.exports = defineConfig({
    testDir: './tests/ui',
    fullyParallel: true,
    workers: 1,
    forbidOnly: releaseCheck || !!process.env.CI,
    reporter: releaseCheck ? [['list'], ['./tools/release/browser-results.cjs']] : 'list',
    expect: { timeout: 10000 },
    use: {
        baseURL: previewURL,
        trace: 'retain-on-failure'
    },
    projects: [
        {
            name: 'desktop-chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'android-viewport-chromium',
            use: { ...devices['Pixel 7'] }
        },
        {
            name: 'ios-safari-webkit-emulated',
            use: { ...devices['iPhone 13'] }
        }
    ],
    webServer: {
        command: `"${process.env.CPD_PYTHON || 'python'}" tests/ui/preview_server.py`,
        url: previewURL + '/targets.html?test=1',
        // AI-modified (Codex): release checks must start the selected staged data, not a stale preview.
        reuseExistingServer: !releaseCheck,
        stdout: 'ignore',
        stderr: 'ignore',
        timeout: 30000
    }
});
