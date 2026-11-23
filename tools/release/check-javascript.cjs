// AI-generated (Codex): syntax-check local application and vendored JavaScript without execution.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Symbolic link in JavaScript inventory: ${file}`);
        return entry.isDirectory() ? walk(file) : /\.(js|cjs|mjs)$/.test(file) ? [file] : [];
    });
}
for (const file of walk(path.resolve(process.argv[2] || 'data'))) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.error || result.status !== 0) {
        console.error(file, result.error?.message || result.stderr);
        process.exit(1);
    }
}
console.log('JavaScript syntax checks passed');
