// AI-assisted (Codex): exercise discovery and exit codes with disposable JavaScript suites.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

test('unit gate requires complete test runs and discovers new suites recursively', t => {
    const root = path.resolve(__dirname, '../..');
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'cpd-unit-gate-'));
    t.after(() => fs.rmSync(project, { recursive: true, force: true }));
    const runner = 'tools/test-unit.cjs';
    fs.mkdirSync(path.join(project, 'tools'), { recursive: true });
    fs.copyFileSync(path.join(root, runner), path.join(project, runner));
    const passing = "require('node:test')('passing assertion', () => {});";
    function write(relative, source) {
        const target = path.join(project, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, source);
    }
    for (const file of fs.globSync('tests/**/*.test.cjs', { cwd: root })) write(file, passing);
    function check(status, message) {
        const env = { ...process.env };
        delete env.NODE_TEST_CONTEXT; // Launch the independent runner just as npm does.
        const result = spawnSync(process.execPath, [runner], { cwd: project, env, encoding: 'utf8' });
        assert.ifError(result.error);
        const output = result.stdout + result.stderr;
        assert.equal(result.status, status, output);
        if (message) assert.match(output, message);
    }
    check(0);
    const addedSuite = 'tests/new-area/nested/new.test.cjs';
    write(addedSuite, passing + "\nthrow Error('setup aborted after registration');");
    check(1, /setup aborted after registration/);
    write(addedSuite, "require('node:test').skip('ignored assertion', () => {});");
    check(1, /ignored assertion/);
    write(addedSuite, '// no registered assertions');
    check(1, /No passing unit tests in .*new\.test\.cjs/);
    write(addedSuite, passing);
    fs.unlinkSync(path.join(project, 'tests/data-rules/data-rules.test.cjs'));
    check(1, /Missing required unit suite: tests\/data-rules\/data-rules\.test\.cjs/);
});
