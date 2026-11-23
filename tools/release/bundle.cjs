// AI-generated (Codex): stage explicit saved data, validate build policy and hash release artifacts.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { inventory, validateAssets } = require('./validate-assets.cjs');
const policy = require('./production-policy.json');
const releaseModes = ['Provision', 'Upgrade'];
const requiredChecks = ['database', 'assets', 'javascript', 'unit', 'release-unit', 'native', 'browser', 'firmware', 'littlefs'];
function requireCondition(condition, message) { if (!condition) throw new Error(message); }
function writeJson(file, object) { fs.writeFileSync(file, JSON.stringify(object, null, 2) + '\n'); }
function safePath(root, relative) {
    requireCondition(typeof relative === 'string' && relative && !path.isAbsolute(relative) && !relative.includes('\\'), 'Unsafe release path');
    const base = path.resolve(root), resolved = path.resolve(base, relative);
    requireCondition(resolved.startsWith(base + path.sep), `Path escapes release: ${relative}`);
    return resolved;
}
function readPolicy(config) {
    const sections = {};
    let current = '';
    for (const raw of config.split(/\r?\n/)) {
        const line = raw.split(';')[0].trim();
        if (!line || line.startsWith('#')) continue;
        if (line.startsWith('[')) { current = line.slice(1, -1); sections[current] ||= {}; continue; }
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) sections[current][match[1].trim()] = match[2].trim();
    }
    requireCondition(sections.platformio?.default_envs === policy.environment, 'Production default environment drift');
    requireCondition(!sections.platformio.extra_configs, 'External PlatformIO overrides are not allowed in a release');
    const environment = sections[`env:${policy.environment}`];
    requireCondition(environment && !environment.extends, 'Missing or inherited production environment');
    for (const [key, value] of Object.entries(policy.settings)) requireCondition(environment[key] === value, `Production setting drift: ${key}; expected ${value}`);
    requireCondition(environment.build_flags?.includes('-DBOARD_HAS_PSRAM'), 'Production PSRAM flag is missing');
    return { environment: policy.environment, chip: policy.chip, settings: policy.settings };
}
function readDatabase(file) {
    const rules = require('./data-rules.cjs');
    const text = fs.readFileSync(file, 'utf8');
    const parsed = rules.parseDatabaseJson(text);
    requireCondition(parsed.ok, `Database parse preflight failed: ${JSON.stringify(parsed.errors)}`);
    const report = rules.validateDatabase(parsed.document);
    requireCondition(report.ok, `Database preflight failed: ${JSON.stringify(report.errors)}`);
    // Migrate only the explicitly supported legacy format, only in staging.
    const data = rules.migrateDatabase(parsed.document);
    const migrated = rules.validateDatabase(data);
    requireCondition(migrated.ok, `Migrated database failed preflight: ${JSON.stringify(migrated.errors)}`);
    return { data, report };
}
function sourceState(root) {
    try {
        return {
            commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim(),
            changes: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim().split(/\r?\n/).filter(Boolean)
        };
    } catch { return { commit: null, changes: [], note: 'Git metadata unavailable' }; }
}
function stageRelease({ root, destination, mode, backup }) {
    root = path.resolve(root); destination = path.resolve(destination);
    requireCondition(releaseModes.includes(mode), 'Select Provision or Upgrade explicitly');
    requireCondition(!fs.existsSync(destination), 'Release destination already exists');
    requireCondition(!destination.startsWith(path.join(root, 'data') + path.sep) && destination !== path.join(root, 'data'), 'Release must be outside the live data source');
    if (mode === 'Upgrade') requireCondition(backup && path.resolve(backup) !== path.join(root, 'data/database.json'), 'Upgrade requires a separately supplied current database backup');
    const config = fs.readFileSync(path.join(root, 'platformio.ini'), 'utf8');
    const production = readPolicy(config);
    const versions = JSON.parse(fs.readFileSync(path.join(root, 'data/release.json'), 'utf8'));
    const header = fs.readFileSync(path.join(root, 'include/release_version.h'), 'utf8');
    for (const [key, macro] of [['uiVersion', 'CPD_UI_VERSION'], ['firmwareVersion', 'CPD_FIRMWARE_VERSION']]) {
        requireCondition(/^\d+\.\d+\.\d+(?:[-.][a-zA-Z0-9.-]+)?$/.test(versions[key]), `Invalid ${key}`);
        requireCondition(header.includes(`#define ${macro} "${versions[key]}"`), `Firmware/UI version mismatch: ${key}`);
    }
    requireCondition(versions.databaseSchemaVersion === 1, 'Unsupported release database schema');
    const databaseFile = mode === 'Upgrade' ? path.resolve(backup) : path.join(root, 'data/database.json');
    const database = readDatabase(databaseFile);
    const sourceFiles = inventory(path.join(root, 'data'));
    fs.mkdirSync(path.join(destination, 'data'), { recursive: true });
    fs.mkdirSync(path.join(destination, 'reports'));
    fs.mkdirSync(path.join(destination, 'backup'));
    for (const file of sourceFiles) {
        if (file.path.split('/').includes('__pycache__') || file.path === 'controller-test.js' || /\.(?:test|spec)\.[cm]?js$/i.test(file.path) || /\.(py|pyc|md|tmp|bak|upload)$/i.test(file.path) || /(?:^|\/)package(?:-lock)?\.json$/.test(file.path)) continue;
        const output = safePath(path.join(destination, 'data'), file.path);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.copyFileSync(path.join(root, 'data', file.path), output);
    }
    fs.copyFileSync(databaseFile, path.join(destination, 'backup/database-original.json'));
    writeJson(path.join(destination, 'data/database.json'), database.data);
    // AI-modified (Codex): keep source provenance in the external bundle, not in the
    // device metadata that firmware and phones can verify.
    const metadata = { ...versions, builtAt: new Date().toISOString() };
    writeJson(path.join(destination, 'data/release.json'), metadata);
    writeJson(path.join(destination, 'reports/database.json'), database.report);
    const assets = validateAssets(path.join(destination, 'data'));
    writeJson(path.join(destination, 'reports/assets.json'), assets);
    requireCondition(assets.ok, `Asset preflight failed: ${assets.errors.join('; ')}`);
    writeJson(path.join(destination, 'release-state.json'), { mode, versions, production, builtAt: metadata.builtAt, source: sourceState(root) });
    // Use an isolated build directory so image creation never overwrites another release.
    const normalize = value => value.split(path.sep).join('/');
    const stagedConfig = config.replace(/\[platformio\]/, `[platformio]\ndata_dir = ${normalize(path.join(destination, 'data'))}\nbuild_dir = ${normalize(path.join(destination, 'build'))}`);
    fs.writeFileSync(path.join(destination, 'platformio-release.ini'), stagedConfig);
    return { mode, destination, production, versions };
}
function validateImages(directory) {
    const images = {};
    for (const [name, offset] of Object.entries(policy.images)) {
        const file = path.join(directory, name);
        requireCondition(fs.existsSync(file) && fs.statSync(file).size > 0, `Missing release image: ${name}`);
        images[name] = { offset, bytes: fs.statSync(file).size };
    }
    requireCondition(images['littlefs.bin'].bytes === policy.filesystemBytes, 'LittleFS partition image size drift');
    const partitions = fs.readFileSync(path.join(directory, 'partitions.bin'));
    const table = [];
    for (let at = 0; at + 32 <= partitions.length; at += 32) {
        if (partitions.readUInt16LE(at) !== 0x50aa) break;
        table.push({ type: partitions[at + 2], subtype: partitions[at + 3], offset: partitions.readUInt32LE(at + 4), size: partitions.readUInt32LE(at + 8) });
    }
    requireCondition(table.some(p => p.type === 1 && p.subtype === 0x82 && p.offset === Number(policy.images['littlefs.bin']) && p.size === policy.filesystemBytes), 'Partition table does not match the LittleFS image');
    requireCondition(table.some(p => p.type === 0 && p.offset === Number(policy.images['firmware.bin']) && images['firmware.bin'].bytes <= p.size), 'Firmware does not fit the production app partition');
    return images;
}
function checksumLines(destination, files) {
    const manifestBytes = fs.readFileSync(path.join(destination, 'manifest.json'));
    const manifestHash = crypto.createHash('sha256').update(manifestBytes).digest('hex');
    return [...files.map(file => `${file.sha256}  ${file.path}`), `${manifestHash}  manifest.json`];
}
function finalizeRelease(destination, checks) {
    destination = path.resolve(destination);
    for (const check of requiredChecks) requireCondition(checks[check] === true, `Release gate did not pass: ${check}`);
    const state = JSON.parse(fs.readFileSync(path.join(destination, 'release-state.json'), 'utf8'));
    const images = validateImages(path.join(destination, 'images'));
    const assets = validateAssets(path.join(destination, 'data'));
    requireCondition(assets.ok, `Staged assets changed: ${assets.errors.join('; ')}`);
    readDatabase(path.join(destination, 'data/database.json'));
    writeJson(path.join(destination, 'reports/checks.json'), checks);
    const manifest = { manifestVersion: 1, ...state, checks, images, files: inventory(destination).filter(file => !file.path.startsWith('build/') && !['manifest.json', 'SHA256SUMS.txt'].includes(file.path)) };
    writeJson(path.join(destination, 'manifest.json'), manifest);
    fs.writeFileSync(path.join(destination, 'SHA256SUMS.txt'), checksumLines(destination, manifest.files).join('\n') + '\n');
    return manifest;
}
function verifyRelease(destination) {
    destination = path.resolve(destination);
    const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8'));
    requireCondition(manifest.manifestVersion === 1, 'Unsupported manifest');
    requireCondition(releaseModes.includes(manifest.mode), 'Invalid release mode');
    requireCondition(JSON.stringify(manifest.production) === JSON.stringify({ environment: policy.environment, chip: policy.chip, settings: policy.settings }), 'Release board policy mismatch');
    for (const check of requiredChecks) requireCondition(manifest.checks[check] === true, `Missing passed check: ${check}`);
    const recorded = new Set();
    for (const file of manifest.files) {
        const absolute = safePath(destination, file.path);
        requireCondition(!recorded.has(file.path), 'Duplicate manifest path'); recorded.add(file.path);
        const bytes = fs.readFileSync(absolute);
        requireCondition(bytes.length === file.bytes && crypto.createHash('sha256').update(bytes).digest('hex') === file.sha256, `Release checksum mismatch: ${file.path}`);
    }
    for (const name of Object.keys(policy.images)) requireCondition(recorded.has(`images/${name}`), `Unhashed image: ${name}`);
    requireCondition(recorded.has('backup/database-original.json'), 'Database backup is missing');
    requireCondition(recorded.has('release-state.json'), 'Staged release state is missing');
    const state = JSON.parse(fs.readFileSync(path.join(destination, 'release-state.json'), 'utf8'));
    requireCondition(manifest.mode === state.mode, 'Release mode differs from staged mode');
    for (const file of inventory(destination)) {
        if (['manifest.json', 'SHA256SUMS.txt'].includes(file.path)) continue;
        requireCondition(recorded.has(file.path), `Unhashed release file: ${file.path}`);
    }
    const sums = fs.readFileSync(path.join(destination, 'SHA256SUMS.txt'), 'utf8').split(/\r?\n/);
    if (sums.at(-1) === '') sums.pop();
    const expected = new Set(checksumLines(destination, manifest.files));
    for (const line of sums) requireCondition(expected.delete(line), 'Unexpected or duplicate checksum report entry');
    requireCondition(expected.size === 0, 'Incomplete checksum report');
    validateImages(path.join(destination, 'images'));
    requireCondition(validateAssets(path.join(destination, 'data')).ok, 'Release assets invalid');
    readDatabase(path.join(destination, 'data/database.json'));
    return manifest;
}
function verifyRollbackArchive(directory) {
    const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'rollback-manifest.json'), 'utf8'));
    requireCondition(metadata.chip === policy.chip && metadata.board === policy.settings.board, 'Rollback archive board mismatch');
    requireCondition(metadata.bytes === 16 * 1024 * 1024, 'Rollback archive must contain the complete 16 MB flash image');
    const bytes = fs.readFileSync(safePath(directory, metadata.file));
    requireCondition(bytes.length === metadata.bytes && crypto.createHash('sha256').update(bytes).digest('hex') === metadata.sha256, 'Rollback flash archive checksum mismatch');
    return metadata;
}
if (require.main === module) {
    try {
        const [action, destination, argument, extra] = process.argv.slice(2);
        if (action === 'stage') console.log(JSON.stringify(stageRelease({ root: process.cwd(), destination, mode: argument, backup: extra })));
        else if (action === 'finish') console.log(JSON.stringify(finalizeRelease(destination, JSON.parse(fs.readFileSync(argument, 'utf8')))));
        else if (action === 'verify') console.log(JSON.stringify(verifyRelease(destination)));
        else if (action === 'verify-rollback') console.log(JSON.stringify(verifyRollbackArchive(destination)));
        else throw new Error('Usage: bundle.cjs stage DIR Provision|Upgrade [BACKUP] | finish DIR CHECKS.json | verify DIR');
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { stageRelease, finalizeRelease, verifyRelease, verifyRollbackArchive, validateImages, readPolicy, safePath, requiredChecks };
