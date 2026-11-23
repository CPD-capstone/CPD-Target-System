// AI-generated (Codex): real release staging and integrity checks with disposable saved data.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { validateAssets } = require('../../tools/release/validate-assets.cjs');
const { stageRelease, finalizeRelease, verifyRelease, verifyRollbackArchive, readPolicy, safePath, requiredChecks } = require('../../tools/release/bundle.cjs');
const root = path.resolve(__dirname, '../..');
const policy = require('../../tools/release/production-policy.json');
function temporary(t) {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'cpd-release-test-'));
    t.after(() => {
        assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(folder).startsWith('cpd-release-test-'));
        fs.rmSync(folder, { recursive: true, force: true });
    });
    return folder;
}
function fixture(t) {
    const folder = temporary(t), project = path.join(folder, 'project');
    fs.mkdirSync(path.join(project, 'include'), { recursive: true });
    fs.cpSync(path.join(root, 'data'), path.join(project, 'data'), { recursive: true });
    fs.copyFileSync(path.join(root, 'platformio.ini'), path.join(project, 'platformio.ini'));
    fs.copyFileSync(path.join(root, 'include/release_version.h'), path.join(project, 'include/release_version.h'));
    const backup = path.join(folder, 'saved-controller-database.json');
    const database = JSON.parse(fs.readFileSync(path.join(project, 'data/database.json'), 'utf8'));
    database.Officers.push({ BadgeNum: 7654321, Name: 'Upgrade preservation check', pistolQualScores: [[137, '2026-11-23']] });
    fs.writeFileSync(backup, JSON.stringify(database));
    return { root: project, destination: path.join(folder, 'bundle'), backup, mode: 'Upgrade' };
}
function imageFixtures(destination) {
    const images = path.join(destination, 'images'); fs.mkdirSync(images);
    for (const name of Object.keys(policy.images)) fs.writeFileSync(path.join(images, name), Buffer.from([0xe9, 1, 2]));
    fs.writeFileSync(path.join(images, 'littlefs.bin'), Buffer.alloc(policy.filesystemBytes));
    const partitions = Buffer.alloc(96, 0xff);
    const entry = (at, type, subtype, offset, bytes) => {
        partitions.writeUInt16LE(0x50aa, at); partitions[at + 2] = type; partitions[at + 3] = subtype;
        partitions.writeUInt32LE(offset, at + 4); partitions.writeUInt32LE(bytes, at + 8);
    };
    entry(0, 0, 0, 0x10000, 0x640000); entry(32, 1, 0x82, 0xc90000, policy.filesystemBytes);
    fs.writeFileSync(path.join(images, 'partitions.bin'), partitions);
}
const passedChecks = () => Object.fromEntries(requiredChecks.map(key => [key, true]));

test('upgrade refuses an absent backup and the repository seed as its backup', t => {
    const args = fixture(t);
    assert.throws(() => stageRelease({ ...args, backup: undefined }), /separately supplied/);
    assert.throws(() => stageRelease({ ...args, backup: path.join(args.root, 'data/database.json') }), /separately supplied/);
    assert.equal(fs.existsSync(args.destination), false);
});
test('upgrade stages saved records, retains original backup, and never changes the seed', t => {
    const args = fixture(t), seedPath = path.join(args.root, 'data/database.json');
    const seed = fs.readFileSync(seedPath);
    fs.writeFileSync(path.join(args.root, 'data/database.tmp'), 'uncommitted');
    fs.writeFileSync(path.join(args.root, 'data/database.bak'), 'stale');
    fs.writeFileSync(path.join(args.root, 'data/database.upload'), 'incomplete restore');
    fs.writeFileSync(path.join(args.root, 'data/preview_server.py'), '# development server must not ship');
    fs.writeFileSync(path.join(args.root, 'data/controller-test.js'), '// development fixture must not ship');
    assert.equal(validateAssets(path.join(args.root, 'data')).ok, false);
    stageRelease(args);
    const staged = JSON.parse(fs.readFileSync(path.join(args.destination, 'data/database.json')));
    const deviceRelease = JSON.parse(fs.readFileSync(path.join(args.destination, 'data/release.json')));
    assert.equal(Object.hasOwn(deviceRelease, 'source'), false);
    assert.equal(Object.hasOwn(JSON.parse(fs.readFileSync(path.join(args.destination, 'release-state.json'))), 'source'), true);
    assert.equal(staged.Officers.find(officer => officer.BadgeNum === 7654321).pistolQualScores[0][0], 137);
    assert.deepEqual(fs.readFileSync(path.join(args.destination, 'backup/database-original.json')), fs.readFileSync(args.backup));
    assert.deepEqual(fs.readFileSync(seedPath), seed);
    assert.equal(fs.existsSync(path.join(args.destination, 'data/preview_server.py')), false);
    assert.equal(fs.existsSync(path.join(args.destination, 'data/controller-test.js')), false);
    assert.equal(fs.existsSync(path.join(args.destination, 'data/database.tmp')), false);
    assert.equal(fs.existsSync(path.join(args.destination, 'data/database.bak')), false);
    assert.equal(fs.existsSync(path.join(args.destination, 'data/database.upload')), false);
});
test('provisioning uses the seed only when Provision is explicitly selected', t => {
    const args = fixture(t);
    assert.throws(() => stageRelease({ ...args, mode: undefined }), /Select Provision or Upgrade/);
    stageRelease({ ...args, mode: 'Provision', backup: undefined });
    const staged = JSON.parse(fs.readFileSync(path.join(args.destination, 'data/database.json')));
    assert.equal(staged.Officers.some(officer => officer.BadgeNum === 7654321), false);
});
test('future, malformed and duplicate-key backup files cannot create a release', t => {
    const args = fixture(t), database = JSON.parse(fs.readFileSync(args.backup));
    database.schemaVersion = 99;
    for (const content of [JSON.stringify(database), '{', '{"targets":[],"targets":[]}']) {
        fs.writeFileSync(args.backup, content);
        assert.throws(() => stageRelease(args), /preflight/);
        assert.equal(fs.existsSync(args.destination), false);
    }
});
test('legacy backup migrates only the staged copy and preserves score history', t => {
    const args = fixture(t), database = JSON.parse(fs.readFileSync(args.backup));
    delete database.schemaVersion; delete database.qualifications;
    fs.writeFileSync(args.backup, JSON.stringify(database));
    stageRelease(args);
    const staged = JSON.parse(fs.readFileSync(path.join(args.destination, 'data/database.json')));
    assert.equal(staged.schemaVersion, 1);
    assert.deepEqual(staged.Officers.at(-1).pistolQualScores, database.Officers.at(-1).pistolQualScores);
    assert.equal(JSON.parse(fs.readFileSync(args.backup)).schemaVersion, undefined);
});
// AI-assisted (Codex): compare serialized records so JS numeric rounding cannot mask a loss.
for (const legacy of [false, true]) {
    test(`staging preserves large record identifiers in a ${legacy ? 'legacy' : 'current'} export`, t => {
        const args = fixture(t);
        const database = JSON.parse(fs.readFileSync(args.backup));
        if (legacy) delete database.schemaVersion;
        const identifier = '"externalId":9007199254740993';
        const input = JSON.stringify(database).slice(0, -1) + ',' + identifier + '}';
        fs.writeFileSync(args.backup, input);
        stageRelease(args);
        const staged = fs.readFileSync(path.join(args.destination, 'data/database.json'), 'utf8');
        assert.match(staged, /"externalId"\s*:\s*9007199254740993\b/);
        assert.equal(JSON.parse(staged).schemaVersion, 1);
        assert.equal(fs.readFileSync(path.join(args.destination, 'backup/database-original.json'), 'utf8'), input);
    });
}

test('a valid current export at the byte limit still fits after staging', t => {
    const args = fixture(t);
    const { MAX_DATABASE_BYTES } = require('../../tools/release/data-rules.cjs');
    const prefix = fs.readFileSync(args.backup, 'utf8').trimEnd().slice(0, -1) + ',"notes":"';
    const input = prefix + 'x'.repeat(MAX_DATABASE_BYTES - Buffer.byteLength(prefix) - 2) + '"}';
    fs.writeFileSync(args.backup, input);
    stageRelease(args);
    const staged = fs.readFileSync(path.join(args.destination, 'data/database.json'));
    assert.ok(staged.length <= MAX_DATABASE_BYTES);
    assert.deepEqual(JSON.parse(staged), JSON.parse(input));
});

test('production board, environment, memory and partition drift block release', () => {
    const config = fs.readFileSync(path.join(root, 'platformio.ini'), 'utf8');
    assert.equal(readPolicy(config).chip, 'esp32s3');
    for (const [before, after] of [['esp32-s3-devkitc-1','esp32dev'],['default_16MB.csv','default.csv'],['qio_opi','qio_qspi'],['default_envs = esp32','default_envs = temporary']]) {
        assert.throws(() => readPolicy(config.replace(before, after)), /drift/);
    }
});
test('a failed or omitted software check prevents manifest generation', t => {
    const args = fixture(t); stageRelease(args); imageFixtures(args.destination);
    const expectedChecks = ['database', 'assets', 'javascript', 'unit', 'release-unit', 'native', 'browser', 'firmware', 'littlefs'];
    for (const name of expectedChecks) {
        const checks = passedChecks();
        delete checks[name];
        assert.throws(() => finalizeRelease(args.destination, checks), new RegExp(name));
        checks[name] = false;
        assert.throws(() => finalizeRelease(args.destination, checks), new RegExp(name));
    }
    assert.equal(fs.existsSync(path.join(args.destination, 'manifest.json')), false);
});
test('complete software bundle verifies, image corruption is rejected', t => {
    const args = fixture(t); stageRelease(args); imageFixtures(args.destination);
    const manifest = finalizeRelease(args.destination, passedChecks());
    assert.equal(manifest.mode, 'Upgrade');
    assert.ok(manifest.files.some(file => file.path === 'backup/database-original.json'));
    assert.equal(verifyRelease(args.destination).versions.databaseSchemaVersion, 1);
    fs.appendFileSync(path.join(args.destination, 'images/firmware.bin'), 'corruption');
    assert.throws(() => verifyRelease(args.destination), /checksum mismatch/);
});
test('missing and wrong-partition filesystem images block release', t => {
    const args = fixture(t); stageRelease(args); imageFixtures(args.destination);
    const filesystem = path.join(args.destination, 'images/littlefs.bin');
    fs.unlinkSync(filesystem);
    assert.throws(() => finalizeRelease(args.destination, passedChecks()), /Missing release image: littlefs\.bin/);
    fs.writeFileSync(filesystem, 'short');
    assert.throws(() => finalizeRelease(args.destination, passedChecks()), /size drift/);
    fs.writeFileSync(path.join(args.destination, 'images/littlefs.bin'), Buffer.alloc(policy.filesystemBytes));
    fs.writeFileSync(path.join(args.destination, 'images/partitions.bin'), Buffer.alloc(96));
    assert.throws(() => finalizeRelease(args.destination, passedChecks()), /Partition table/);
});
test('release paths cannot escape their destination', () => {
    for (const escape of ['../outside', '../../file', '..\\outside', '/outside']) assert.throws(() => safePath(root, escape), /[Pp]ath|Unsafe/);
});
test('files omitted from the manifest and a damaged checksum report fail verification', t => {
    const args = fixture(t); stageRelease(args); imageFixtures(args.destination); finalizeRelease(args.destination, passedChecks());
    fs.writeFileSync(path.join(args.destination, 'unhashed-extra.js'), 'extra');
    assert.throws(() => verifyRelease(args.destination), /Unhashed release file/);
    fs.unlinkSync(path.join(args.destination, 'unhashed-extra.js'));
    const checksumFile = path.join(args.destination, 'SHA256SUMS.txt');
    const original = fs.readFileSync(checksumFile, 'utf8');
    for (const extra of [original.split('\n')[0], '0'.repeat(64) + '  manifest.json']) {
        fs.writeFileSync(checksumFile, original + extra + '\n');
        assert.throws(() => verifyRelease(args.destination), /checksum report/i);
    }
    fs.writeFileSync(checksumFile, 'damaged');
    assert.throws(() => verifyRelease(args.destination), /checksum report/);
});
test('only the mode recorded during staging passes bundle verification', t => {
    const args = fixture(t);
    stageRelease(args);
    imageFixtures(args.destination);
    const manifest = finalizeRelease(args.destination, passedChecks());
    const manifestFile = path.join(args.destination, 'manifest.json');
    const checksumFile = path.join(args.destination, 'SHA256SUMS.txt');
    const sums = fs.readFileSync(checksumFile, 'utf8');
    for (const mode of ['Provision', 'Unknown', undefined]) {
        fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, mode }));
        const digest = crypto.createHash('sha256').update(fs.readFileSync(manifestFile)).digest('hex');
        fs.writeFileSync(checksumFile, sums.replace(/^[a-f0-9]{64}  manifest\.json$/m, digest + '  manifest.json'));
        assert.throws(() => verifyRelease(args.destination), /release mode/i);
    }
});
test('first-upgrade rollback archive validates the complete flash bytes and board', t => {
    const folder = temporary(t);
    const bytes = Buffer.alloc(16 * 1024 * 1024, 0xff);
    const image = path.join(folder, 'controller-flash.bin');
    fs.writeFileSync(image, bytes);
    const metadata = { chip: policy.chip, board: policy.settings.board, bytes: bytes.length,
        file: 'controller-flash.bin', sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
    fs.writeFileSync(path.join(folder, 'rollback-manifest.json'), JSON.stringify(metadata));
    assert.equal(verifyRollbackArchive(folder).bytes, bytes.length);
    bytes[0] ^= 1;
    fs.writeFileSync(image, bytes);
    assert.throws(() => verifyRollbackArchive(folder), /checksum mismatch/);
    fs.truncateSync(image, bytes.length - 1);
    metadata.bytes = bytes.length - 1;
    metadata.sha256 = crypto.createHash('sha256').update(bytes.subarray(0, -1)).digest('hex');
    fs.writeFileSync(path.join(folder, 'rollback-manifest.json'), JSON.stringify(metadata));
    assert.throws(() => verifyRollbackArchive(folder), /complete 16 MB/);
    metadata.bytes = bytes.length;
    metadata.board = 'esp32dev';
    fs.writeFileSync(path.join(folder, 'rollback-manifest.json'), JSON.stringify(metadata));
    assert.throws(() => verifyRollbackArchive(folder), /board mismatch/);
});
test('asset validator detects missing, external and damaged gzip dependencies', t => {
    const folder = temporary(t);
    fs.writeFileSync(path.join(folder, 'page.html'), '<script src="missing.js"></script><link href="https://cdn.example/critical.css">');
    fs.writeFileSync(path.join(folder, 'bundle.js'), 'const valid = true;');
    fs.writeFileSync(path.join(folder, 'bundle.js.gz'), zlib.gzipSync(Buffer.from('const stale = true;')));
    let result = validateAssets(folder, []);
    assert.equal(result.ok, false);
    for (const phrase of ['missing missing.js','external asset','gzip differs']) assert.ok(result.errors.some(error => error.includes(phrase)));
    fs.writeFileSync(path.join(folder, 'bundle.js.gz'), 'not gzip');
    result = validateAssets(folder, []);
    assert.ok(result.errors.some(error => error.includes('invalid gzip')));
});
test('all local dependencies and exact gzip partners pass the asset inventory', () => {
    const result = validateAssets(path.join(root, 'data'));
    assert.equal(result.ok, true, result.errors.join('\n'));
    assert.ok(result.references.some(reference => reference.target === 'vendor/fonts/NotoSans-Regular.ttf'));
    assert.ok(result.references.some(reference => reference.from === 'script.js' && reference.target === 'results-pdf.js'));
});
test('a cache query cannot conceal a broken module reference behind an existing required file', t => {
    const folder = temporary(t);
    fs.writeFileSync(path.join(folder, 'report.js'), 'export const version = 1;');
    fs.writeFileSync(path.join(folder, 'app.js'), 'import(`./reports.js?v=${encodeURIComponent(version)}`);');
    const result = validateAssets(folder, ['report.js']);
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, ['app.js: missing reports.js']);
});
