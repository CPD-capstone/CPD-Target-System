'use strict';

// AI-assisted (Codex): fixtures exercise database validation failures without hardware.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { main: preflightCommand } = require('../../tools/validate-database.cjs');
const {
    validateDatabase, migrateDatabase, parseDatabaseJson, isDateString,
    twelveMonthCutoff, scoreStatistics, MAX_DATABASE_BYTES, MAX_INT
} = require('../../tools/data-rules.cjs');

const officer = () => ({ Name: 'Audit Officer', BadgeNum: 1, pistolQualScores: [], rifleQualScores: [], swatQualScores: [], qualificationScores: {} });
const drill = (name = 'Stage', action = 'hide') => ({ drillName: name, sequence: [{ step: 1, action }] });
const fixture = () => ({
    schemaVersion: 1, qualifications: ['Pistol', 'Rifle', 'SWAT'],
    Officers: [officer()], drills: [drill()],
    targets: Array.from({ length: 20 }, (_, index) => ({ id: index + 1, working: true }))
});
const rejects = (doc, code) => {
    const result = validateDatabase(doc);
    assert.equal(result.ok, false, JSON.stringify(result));
    assert.ok(result.errors.some(error => error.code === code), JSON.stringify(result.errors));
};

test('the checked-in database passes current preflight without mutation', () => {
    const text = fs.readFileSync(path.join(__dirname, '../../data/database.json'), 'utf8');
    const parsed = parseDatabaseJson(text);
    assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
    const before = JSON.stringify(parsed.document);
    const validation = validateDatabase(parsed.document, { allowLegacy: false });
    assert.equal(validation.ok, true, JSON.stringify(validation.errors));
    assert.equal(JSON.stringify(parsed.document), before);
});

test('legacy migration is explicit, nonmutating, and preserves old score records', () => {
    const doc = fixture();
    delete doc.schemaVersion;
    delete doc.qualifications;
    delete doc.Officers[0].rifleQualScores;
    delete doc.Officers[0].qualificationScores;
    doc.Officers[0].pistolQualScores = [[130, '2024-02-29'], [0, '2023-01-01']];
    doc.extraOperatorMetadata = { keep: true };
    const before = structuredClone(doc);
    const validation = validateDatabase(doc);
    assert.equal(validation.ok, true);
    assert.equal(validation.warnings.length, 2);
    const migrated = migrateDatabase(doc);
    assert.equal(migrated.schemaVersion, 1);
    assert.deepEqual(migrated.qualifications, ['Pistol', 'Rifle', 'SWAT']);
    assert.deepEqual(migrated.Officers, before.Officers);
    assert.deepEqual(migrated.extraOperatorMetadata, before.extraOperatorMetadata);
    assert.deepEqual(doc, before);
    assert.equal(validateDatabase(migrated, { allowLegacy: false }).ok, true);
    assert.equal(validateDatabase(doc, { allowLegacy: false }).ok, false);
});

test('future/invalid versions and ambiguous built-in custom histories cannot migrate', () => {
    for (const version of [0, -1, 2, '1', null, true]) {
        const doc = fixture(); doc.schemaVersion = version;
        rejects(doc, 'schema.version');
        assert.throws(() => migrateDatabase(doc));
    }
    const doc = fixture();
    doc.Officers[0].qualificationScores.Pistol = [[90, '2026-11-23']];
    rejects(doc, 'score.ambiguous');
});

for (const [name, alter, code] of [
    ['missing section', doc => { delete doc.Officers; }, 'schema.array'],
    ['object keyed old section', doc => { doc.Officers = {}; }, 'schema.array'],
    ['target count', doc => { doc.targets.pop(); }, 'target.count'],
    ['duplicate target', doc => { doc.targets[1].id = 1; }, 'target.duplicate'],
    ['target ID lower bound', doc => { doc.targets[0].id = 0; }, 'target.id'],
    ['target ID upper bound', doc => { doc.targets[19].id = 21; }, 'target.id'],
    ['target string ID', doc => { doc.targets[0].id = '1'; }, 'target.id'],
    ['target availability type', doc => { doc.targets[0].working = 0; }, 'target.working'],
    ['duplicate badge', doc => { doc.Officers.push(officer()); }, 'officer.duplicate'],
    ['zero badge', doc => { doc.Officers[0].BadgeNum = 0; }, 'officer.badge'],
    ['overflow badge', doc => { doc.Officers[0].BadgeNum = MAX_INT + 1; }, 'officer.badge'],
    ['blank officer', doc => { doc.Officers[0].Name = '   '; }, 'officer.name'],
    ['officer controls', doc => { doc.Officers[0].Name = 'Audit\nOfficer'; }, 'officer.name'],
    ['officer UTF8 byte limit', doc => { doc.Officers[0].Name = '你'.repeat(22); }, 'officer.name'],
    ['history wrong type', doc => { doc.Officers[0].pistolQualScores = null; }, 'score.history'],
    ['custom history wrong type', doc => { doc.Officers[0].qualificationScores = []; }, 'score.custom'],
    ['absent built-in catalog name', doc => { doc.qualifications.pop(); }, 'qualification.builtin'],
    ['catalog duplicate', doc => { doc.qualifications.push('pistol'); }, 'qualification.duplicate'],
    ['malformed catalog', doc => { doc.qualifications = null; }, 'schema.array'],
    ['qualification byte limit', doc => { doc.qualifications.push('你'.repeat(11)); }, 'qualification.name'],
    ['unknown custom history', doc => { doc.Officers[0].qualificationScores.Unknown = []; }, 'score.qualification'],
    ['duplicate drill', doc => { doc.drills.push(drill()); }, 'drill.duplicate'],
    ['blank drill', doc => { doc.drills[0].drillName = '   '; }, 'drill.name'],
    ['reserved drill', doc => { doc.drills[0].drillName = 'pause'; }, 'drill.name'],
    ['empty sequence', doc => { doc.drills[0].sequence = []; }, 'drill.sequence'],
    ['wrong step order', doc => { doc.drills[0].sequence[0].step = 2; }, 'step.number'],
    ['missing action', doc => { delete doc.drills[0].sequence[0].action; }, 'step.action'],
    ['unknown reference', doc => { doc.drills[0].sequence[0].action = 'Missing'; }, 'step.reference'],
    ['zero delay', doc => { doc.drills[0].sequence[0] = { step: 1, action: 'delay', timeMs: 0 }; }, 'step.delay'],
    ['overflow delay', doc => { doc.drills[0].sequence[0] = { step: 1, action: 'delay', timeMs: MAX_INT + 1 }; }, 'step.delay'],
    ['duplicate tags', doc => { doc.drills[0].qualifications = ['Pistol', 'pistol']; }, 'drill.qualification.duplicate'],
    ['unknown tags', doc => { doc.drills[0].qualifications = ['Unknown']; }, 'drill.qualification'],
    ['invalid targets audited fixture', doc => { doc.drills[0].sequence[0] = { step: 1, action: 'present', targets: [0, 21] }; }, 'step.target'],
    ['duplicate targets', doc => { doc.drills[0].sequence[0].targets = [1, 1]; }, 'step.target'],
    ['empty targets', doc => { doc.drills[0].sequence[0].targets = []; }, 'step.targets'],
    ['targets on delay', doc => { doc.drills[0].sequence[0] = { step: 1, action: 'delay', timeMs: 1, targets: [1] }; }, 'step.targets'],
    ['random on hide', doc => { doc.drills[0].sequence[0].random = 1; }, 'step.random'],
    ['random overflow', doc => { doc.drills[0].sequence[0] = { step: 1, action: 'present', random: 21 }; }, 'step.random'],
    ['mixed random and targets', doc => { doc.drills[0].sequence[0] = { step: 1, action: 'present', random: 1, targets: [1] }; }, 'step.random'],
    ['unsupported target IDs alias', doc => { doc.drills[0].sequence[0].targetIds = [1]; }, 'step.selector'],
    ['unsupported target mode alias', doc => { doc.drills[0].sequence[0].targetMode = 'custom'; }, 'step.selector'],
    ['unsupported random count alias', doc => { doc.drills[0].sequence[0].randomCount = 1; }, 'step.selector']
]) {
    test(`preflight rejects ${name}`, () => { const doc = fixture(); alter(doc); rejects(doc, code); });
}

test('optional legacy score arrays are preserved absent; malformed supplied arrays are not coerced', () => {
    const doc = fixture();
    for (const key of ['pistolQualScores', 'rifleQualScores', 'swatQualScores', 'qualificationScores']) delete doc.Officers[0][key];
    assert.equal(validateDatabase(doc).ok, true);
    doc.Officers[0].pistolQualScores = {};
    rejects(doc, 'score.history');
});

test('custom histories require exact registered spelling and preserve raw point scores', () => {
    const doc = fixture(); doc.qualifications.push('Training');
    doc.Officers[0].qualificationScores.Training = [[MAX_INT, '2026-11-23'], [101, '2026-11-22']];
    assert.equal(validateDatabase(doc).ok, true);
    doc.Officers[0].qualificationScores.training = [];
    rejects(doc, 'score.qualification');
});

for (const value of [[-1, '2026-11-23'], [1.5, '2026-11-23'], ['80', '2026-11-23'], [MAX_INT + 1, '2026-11-23'], [80, '2026-02-31'], [80, '0000-01-01'], [80, '2026-11-23', 'extra'], [80]]) {
    test(`rejects malformed score tuple ${JSON.stringify(value)}`, () => {
        const doc = fixture(); doc.Officers[0].pistolQualScores = [value]; rejects(doc, 'score.entry');
    });
}

test('availability changes do not invalidate a previously authored target reference', () => {
    const doc = fixture();
    doc.targets[0].working = false;
    doc.drills[0].sequence[0].targets = [1, 20];
    assert.equal(validateDatabase(doc).ok, true);
});

test('cycles are rejected and depth four is accepted from every root', () => {
    const doc = fixture();
    doc.drills = [drill('A', 'B'), drill('B', 'C'), drill('C', 'D'), drill('D')];
    assert.equal(validateDatabase(doc).ok, true);
    doc.drills.push(drill('E', 'A'));
    rejects(doc, 'drill.depth');
    doc.drills[3].sequence[0].action = 'A';
    rejects(doc, 'drill.cycle');
    doc.drills = [drill('Self', 'Self')];
    rejects(doc, 'drill.cycle');
});

test('hostile long graphs are rejected without recursive stack overflow', () => {
    const doc = fixture();
    doc.drills = Array.from({ length: 12000 }, (_, index) => drill(`D${index}`, index === 11999 ? 'hide' : `D${index + 1}`));
    rejects(doc, 'drill.depth');
});

test('Gregorian dates enforce month lengths and leap century rules', () => {
    for (const date of ['0001-01-01', '2000-02-29', '2024-02-29', '2026-04-30', '9999-12-31']) assert.equal(isDateString(date), true, date);
    for (const date of ['1900-02-29', '2026-02-29', '2026-02-31', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '0000-01-01', '2026-1-01', null]) assert.equal(isDateString(date), false, String(date));
});

test('12 month statistics include both calendar boundaries and clamp leap day to February 28', () => {
    assert.equal(twelveMonthCutoff('2024-02-29'), '2023-02-28');
    assert.deepEqual(scoreStatistics([[80, '2023-02-28'], [81, '2023-03-01'], [82, '2024-02-29'], [100, '2024-03-01'], [99, '2023-02-27']], '2024-02-29'), { attempts: 3, average: 81, top: 82 });
    assert.deepEqual(scoreStatistics([[80, '2025-11-23'], [81, '2026-11-23'], [81, '2026-11-22']], '2026-11-23'), { attempts: 3, average: 80.7, top: 81 });
    assert.deepEqual(scoreStatistics([], '2026-11-23'), { attempts: 0, average: null, top: null });
    assert.deepEqual(scoreStatistics([[0, '2026-11-23']], '2026-11-23'), { attempts: 1, average: 0, top: 0 });
    assert.throws(() => scoreStatistics([[80, '2026-02-31']], '2026-11-23'));
    assert.throws(() => twelveMonthCutoff('2026-02-31'));
});

test('serialized preflight catches partial JSON, duplicate keys, oversized data, and excessive parser depth', () => {
    for (const text of ['', '{"targets":', '{} trailing']) assert.equal(parseDatabaseJson(text).errors[0].code, 'json.syntax');
    for (const text of ['{"working":false,"working":true}', '{"id":1,"\\u0069d":2}', '{"nested":[{"id":1,"id":2}]}']) {
        assert.equal(parseDatabaseJson(text).errors[0].code, 'json.duplicate');
    }
    assert.equal(parseDatabaseJson(' '.repeat(MAX_DATABASE_BYTES + 1)).errors[0].code, 'json.size');
    assert.equal(parseDatabaseJson('['.repeat(11) + '0' + ']'.repeat(11)).errors[0].code, 'json.depth');
    assert.equal(parseDatabaseJson('['.repeat(10) + '0' + ']'.repeat(10)).ok, true);
    assert.equal(parseDatabaseJson('{"a":"escaped \\" quote","b":[1,true,null]}').ok, true);
});

test('CLI emits machine readable reports, rejects unsafe input, and never rewrites its database', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpd-data-rules-'));
    t.after(() => {
        assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
        assert.ok(path.basename(directory).startsWith('cpd-data-rules-'));
        fs.rmSync(directory, { recursive: true, force: true });
    });
    const input = path.join(directory, 'database.json');
    const report = path.join(directory, 'reports', 'preflight.json');
    const run = (...args) => {
        let stdout = '';
        const status = preflightCommand(args, { writeOutput: text => { stdout += text; } });
        return { status, stdout };
    };
    const text = JSON.stringify(fixture());
    fs.writeFileSync(input, text);
    let result = run(input, '--report', report, '--strict');
    assert.equal(result.status, 0, result.stdout);
    assert.equal(JSON.parse(result.stdout).ok, true);
    assert.equal(JSON.parse(fs.readFileSync(report, 'utf8')).ok, true);
    assert.equal(fs.readFileSync(input, 'utf8'), text);
    result = run(input, '--report', input);
    assert.equal(result.status, 2);
    assert.equal(fs.readFileSync(input, 'utf8'), text);
    fs.writeFileSync(input, '{"id":1,"id":2}');
    result = run(input);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).errors[0].code, 'json.duplicate');
    result = run(path.join(directory, 'missing.json'));
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).ok, false);
    result = run('--report');
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).ok, false);
    // AI-assisted (Codex): a damaged UTF-8 name must not silently become replacement characters.
    const damaged = Buffer.from(text);
    damaged[damaged.indexOf('Audit Officer')] = 0xff;
    fs.writeFileSync(input, damaged);
    result = run(input, '--strict', '--report', report);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(fs.readFileSync(report, 'utf8')).errors[0].code, 'json.encoding');
    assert.deepEqual(fs.readFileSync(input), damaged);
});
