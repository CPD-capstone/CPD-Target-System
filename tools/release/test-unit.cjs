// AI-generated (Codex): discover unit tests and require a completed run of every suite.
const fs = require('node:fs');
const path = require('node:path');
const { run } = require('node:test');
const { spec } = require('node:test/reporters');

const root = path.resolve(__dirname, '../..');
const files = fs.globSync('tests/**/*.test.cjs', { cwd: root })
    .map(file => path.join(root, file)).sort();
for (const required of [
    'data-rules/data-rules.test.cjs',
    'browser-unit/controller-client.test.cjs',
    'browser-unit/controller-mock.test.cjs',
    'release/release.test.cjs'
]) {
    if (!files.includes(path.join(root, 'tests', required))) {
        throw new Error(`Missing required unit suite: tests/${required}`);
    }
}

// Node counts an empty test file as a passing file. Only a worker's own
// nonempty test summary proves it actually ran any registered tests.
const pending = new Set(files);
const results = run({ files, cwd: root, isolation: 'process' });
results.on('test:summary', ({ file, success, counts }) => {
    if (file && counts.passed > 0) pending.delete(file);
    if (!success || counts.skipped || counts.todo) process.exitCode = 1;
    if (!file && pending.size) {
        for (const missing of pending) console.error(`No passing unit tests in ${path.relative(root, missing)}`);
        process.exitCode = 1;
    }
});
results.compose(spec).pipe(process.stdout);
