'use strict';

// AI-assisted (Codex): software-only rules shared by database preflight and tests.
// These limits match the stored schema and runner; no controller is contacted.
const SCHEMA_VERSION = 1;
const TARGET_COUNT = 20;
const MAX_INT = 2147483647;
const MAX_DATABASE_BYTES = 256 * 1024;
const MAX_JSON_DEPTH = 10; // Installed ArduinoJson DEFAULT_NESTING_LIMIT.
const MAX_DRILL_DEPTH = 4; // target_manager.cpp counts the requested root as depth 1.
const BUILT_INS = Object.freeze(['Pistol', 'Rifle', 'SWAT']);
const ACTIONS = new Set(['present', 'hide', 'yield', 'pause', 'delay']);
const own = (object, key) => Object.hasOwn(object, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = (value, minimum = 0) => Number.isInteger(value) && value >= minimum && value <= MAX_INT;
const visibleName = (value, limit = Infinity) => typeof value === 'string'
    && value.trim().length > 0 && !/[\u0000-\u001f\u007f]/u.test(value)
    && Buffer.byteLength(value, 'utf8') <= limit;
const issue = (path, code, message) => ({ path, code, message });

function isDateString(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    return day <= daysInMonth(year, month);
}

function daysInMonth(year, month) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function twelveMonthCutoff(today) {
    if (!isDateString(today)) throw new TypeError('today must be a real YYYY-MM-DD date');
    const previousYear = Number(today.slice(0, 4)) - 1;
    const month = Number(today.slice(5, 7));
    const day = Math.min(Number(today.slice(8, 10)), daysInMonth(previousYear, month));
    // Year 0000 is only a lower-bound sentinel when today is in the first supported year.
    return `${String(previousYear).padStart(4, '0')}-${today.slice(5, 7)}-${String(day).padStart(2, '0')}`;
}

function validScoreEntry(entry) {
    return Array.isArray(entry) && entry.length === 2 && int(entry[0]) && isDateString(entry[1]);
}

function scoreStatistics(history, today) {
    const cutoff = twelveMonthCutoff(today);
    if (!Array.isArray(history) || !history.every(validScoreEntry)) {
        throw new TypeError('history must contain [nonnegative int32 score, real YYYY-MM-DD date] pairs');
    }
    let attempts = 0;
    let sum = 0;
    let top = null;
    for (const [score, date] of history) {
        if (date < cutoff || date > today) continue;
        attempts++;
        sum += score;
        top = top === null ? score : Math.max(top, score);
    }
    return { attempts, average: attempts ? Math.round(sum / attempts * 10) / 10 : null, top };
}

function validateDatabase(doc, { allowLegacy = true } = {}) {
    const errors = [];
    const warnings = [];
    const fail = (path, code, message) => errors.push(issue(path, code, message));
    const warn = (path, code, message) => warnings.push(issue(path, code, message));
    const result = () => ({ ok: errors.length === 0, errors, warnings, schemaVersion: SCHEMA_VERSION });
    if (!object(doc)) {
        fail('$', 'schema.root', 'database must be an object');
        return result();
    }
    if (!own(doc, 'schemaVersion')) {
        if (allowLegacy) warn('$.schemaVersion', 'legacy.version', 'versionless legacy database migrates to schema 1');
        else fail('$.schemaVersion', 'schema.version', 'schemaVersion 1 is required');
    } else if (doc.schemaVersion !== SCHEMA_VERSION) {
        fail('$.schemaVersion', 'schema.version', 'unsupported schemaVersion; only schema 1 is supported');
    }
    for (const name of ['Officers', 'drills', 'targets']) {
        if (!Array.isArray(doc[name])) fail(`$.${name}`, 'schema.array', `${name} must be an array`);
    }

    let qualifications = BUILT_INS;
    if (!own(doc, 'qualifications')) {
        if (allowLegacy) warn('$.qualifications', 'legacy.qualifications', 'absent legacy catalog migrates to Pistol, Rifle, SWAT');
        else fail('$.qualifications', 'schema.array', 'qualifications must be an array');
    } else if (!Array.isArray(doc.qualifications)) {
        fail('$.qualifications', 'schema.array', 'qualifications must be an array');
        qualifications = [];
    } else {
        qualifications = doc.qualifications;
    }
    const catalog = new Map();
    qualifications.forEach((name, index) => {
        const path = `$.qualifications[${index}]`;
        if (!visibleName(name, 32)) {
            fail(path, 'qualification.name', 'qualification name must contain visible text, no controls, and at most 32 UTF-8 bytes');
            return;
        }
        const key = name.toLowerCase();
        if (catalog.has(key)) fail(path, 'qualification.duplicate', 'qualification names must be unique ignoring case');
        catalog.set(key, name);
    });
    BUILT_INS.forEach(name => {
        if (!qualifications.includes(name)) fail('$.qualifications', 'qualification.builtin', `built-in ${name} must retain its exact name`);
    });

    if (Array.isArray(doc.targets)) {
        if (doc.targets.length !== TARGET_COUNT) fail('$.targets', 'target.count', `exactly ${TARGET_COUNT} targets are required`);
        const ids = new Set();
        doc.targets.forEach((target, index) => {
            const path = `$.targets[${index}]`;
            if (!object(target)) { fail(path, 'target.shape', 'target must be an object'); return; }
            if (!int(target.id, 1) || target.id > TARGET_COUNT) fail(`${path}.id`, 'target.id', 'target id must be an integer from 1 to 20');
            if (ids.has(target.id)) fail(`${path}.id`, 'target.duplicate', 'target id must be unique');
            ids.add(target.id);
            if (typeof target.working !== 'boolean') fail(`${path}.working`, 'target.working', 'working must be a boolean');
        });
    }

    const validateHistory = (history, path) => {
        if (!Array.isArray(history)) { fail(path, 'score.history', 'score history must be an array'); return; }
        history.forEach((entry, index) => {
            if (!validScoreEntry(entry)) fail(`${path}[${index}]`, 'score.entry', 'score must be [nonnegative int32, real YYYY-MM-DD date]');
        });
    };
    if (Array.isArray(doc.Officers)) {
        const badges = new Set();
        doc.Officers.forEach((officer, index) => {
            const path = `$.Officers[${index}]`;
            if (!object(officer)) { fail(path, 'officer.shape', 'officer must be an object'); return; }
            if (!visibleName(officer.Name, 64)) fail(`${path}.Name`, 'officer.name', 'officer name must contain visible text, no controls, and at most 64 UTF-8 bytes');
            if (!int(officer.BadgeNum, 1)) fail(`${path}.BadgeNum`, 'officer.badge', 'badge must be a positive int32');
            if (badges.has(officer.BadgeNum)) fail(`${path}.BadgeNum`, 'officer.duplicate', 'badge must be unique');
            badges.add(officer.BadgeNum);
            for (const name of BUILT_INS) {
                const key = `${name.toLowerCase()}QualScores`;
                if (own(officer, key)) validateHistory(officer[key], `${path}.${key}`);
            }
            if (own(officer, 'qualificationScores')) {
                if (!object(officer.qualificationScores)) {
                    fail(`${path}.qualificationScores`, 'score.custom', 'qualificationScores must be an object');
                } else {
                    for (const [name, history] of Object.entries(officer.qualificationScores)) {
                        const historyPath = `${path}.qualificationScores[${JSON.stringify(name)}]`;
                        const canonical = catalog.get(name.toLowerCase());
                        if (BUILT_INS.some(builtIn => builtIn.toLowerCase() === name.toLowerCase())) {
                            fail(historyPath, 'score.ambiguous', 'built-in scores belong only in their legacy QualScores arrays');
                        } else if (canonical !== name) {
                            fail(historyPath, 'score.qualification', 'custom history must use an existing qualification catalog name exactly');
                        }
                        validateHistory(history, historyPath);
                    }
                }
            }
        });
    }

    const drills = Array.isArray(doc.drills) ? doc.drills : [];
    const byName = new Map();
    drills.forEach((drill, index) => {
        const path = `$.drills[${index}]`;
        if (!object(drill)) { fail(path, 'drill.shape', 'drill must be an object'); return; }
        if (!visibleName(drill.drillName) || ACTIONS.has(drill.drillName)) fail(`${path}.drillName`, 'drill.name', 'drill name must contain visible text, no controls, and not be a reserved action');
        if (typeof drill.drillName === 'string') {
            if (byName.has(drill.drillName)) fail(`${path}.drillName`, 'drill.duplicate', 'drill names must be unique');
            byName.set(drill.drillName, index);
        }
        if (own(drill, 'description') && typeof drill.description !== 'string') fail(`${path}.description`, 'drill.description', 'description must be a string');
        if (own(drill, 'builtIn') && typeof drill.builtIn !== 'boolean') fail(`${path}.builtIn`, 'drill.builtin', 'builtIn must be a boolean');
        if (own(drill, 'qualifications')) {
            if (!Array.isArray(drill.qualifications)) {
                fail(`${path}.qualifications`, 'drill.qualifications', 'drill qualifications must be an array');
            } else {
                const selected = new Set();
                drill.qualifications.forEach((name, position) => {
                    const tagPath = `${path}.qualifications[${position}]`;
                    if (typeof name !== 'string' || !catalog.has(name.toLowerCase())) fail(tagPath, 'drill.qualification', 'drill qualification must be registered');
                    else {
                        const key = name.toLowerCase();
                        if (selected.has(key)) fail(tagPath, 'drill.qualification.duplicate', 'drill qualifications must be unique ignoring case');
                        selected.add(key);
                    }
                });
            }
        }
    });

    const edges = drills.map(() => []);
    drills.forEach((drill, index) => {
        if (!object(drill)) return;
        const path = `$.drills[${index}].sequence`;
        if (!Array.isArray(drill.sequence) || !drill.sequence.length) { fail(path, 'drill.sequence', 'sequence must be a nonempty array'); return; }
        drill.sequence.forEach((step, position) => {
            const stepPath = `${path}[${position}]`;
            if (!object(step)) { fail(stepPath, 'step.shape', 'step must be an object'); return; }
            if (!int(step.step, 1) || step.step !== position + 1) fail(`${stepPath}.step`, 'step.number', 'step numbers must be contiguous from 1 in array order');
            if (typeof step.action !== 'string' || !step.action.length) {
                fail(`${stepPath}.action`, 'step.action', 'action must be a basic action or an existing drill name');
            } else if (!ACTIONS.has(step.action)) {
                if (!byName.has(step.action)) fail(`${stepPath}.action`, 'step.reference', 'referenced drill does not exist');
                else edges[index].push(byName.get(step.action));
            }
            for (const alias of ['targetMode', 'targetIds', 'randomCount']) {
                if (own(step, alias)) fail(`${stepPath}.${alias}`, 'step.selector', 'unsupported selector field; use targets or random so the runtime cannot silently ignore selection');
            }
            if (step.action === 'delay' && !int(step.timeMs, 1)) fail(`${stepPath}.timeMs`, 'step.delay', 'delay requires positive int32 timeMs');
            if (own(step, 'targets')) {
                if (!['present', 'hide'].includes(step.action) || !Array.isArray(step.targets) || !step.targets.length) {
                    fail(`${stepPath}.targets`, 'step.targets', 'targets must be a nonempty array on a present/hide step');
                } else {
                    const ids = new Set();
                    step.targets.forEach((id, targetIndex) => {
                        if (!int(id, 1) || id > TARGET_COUNT || ids.has(id)) fail(`${stepPath}.targets[${targetIndex}]`, 'step.target', 'target IDs must be unique integers from 1 to 20');
                        ids.add(id);
                    });
                }
            }
            if (own(step, 'random') && (step.action !== 'present' || !int(step.random, 1) || step.random > TARGET_COUNT || own(step, 'targets'))) {
                fail(`${stepPath}.random`, 'step.random', 'random must be 1..20 on present, without a targets field');
            }
        });
    });
    // Walk leaves toward parents so hostile long chains cannot overflow the JS stack.
    // Every edge is visited once, including in densely shared acyclic graphs.
    const parents = drills.map(() => []);
    const remaining = edges.map(children => children.length);
    const heights = drills.map(() => 1);
    edges.forEach((children, parent) => children.forEach(child => parents[child].push(parent)));
    const queue = remaining.flatMap((count, index) => count === 0 ? [index] : []);
    for (let position = 0; position < queue.length; position++) {
        const child = queue[position];
        for (const parent of parents[child]) {
            heights[parent] = Math.max(heights[parent], Math.min(MAX_DRILL_DEPTH + 1, heights[child] + 1));
            if (--remaining[parent] === 0) queue.push(parent);
        }
    }
    for (let index = 0; index < drills.length; index++) {
        if (remaining[index] > 0) fail(`$.drills[${index}].sequence`, 'drill.cycle', 'drill forms or reaches a nested-drill cycle');
        else if (heights[index] > MAX_DRILL_DEPTH) fail(`$.drills[${index}].sequence`, 'drill.depth', 'nested drills must not exceed four levels including the root');
    }
    return result();
}

function migrateDatabase(doc) {
    const validation = validateDatabase(doc);
    if (!validation.ok) throw new TypeError('database must pass validation before migration');
    const migrated = structuredClone(doc);
    if (!own(migrated, 'schemaVersion')) migrated.schemaVersion = SCHEMA_VERSION;
    if (!own(migrated, 'qualifications')) migrated.qualifications = [...BUILT_INS];
    return migrated;
}

function parseDatabaseJson(text) {
    const errors = [];
    if (typeof text !== 'string') return { ok: false, document: null, errors: [issue('$', 'json.input', 'JSON input must be text')] };
    if (Buffer.byteLength(text, 'utf8') > MAX_DATABASE_BYTES) {
        return { ok: false, document: null, errors: [issue('$', 'json.size', 'database exceeds 256 KiB')] };
    }
    let document;
    try { document = JSON.parse(text); }
    catch (error) { return { ok: false, document: null, errors: [issue('$', 'json.syntax', error.message)] }; }
    // JSON.parse validates grammar; this second pass preserves duplicate-key evidence that
    // parsers otherwise discard. It also bounds JSON depth to the firmware parser's default.
    let cursor = 0;
    const skip = () => { while (/\s/.test(text[cursor] || '') && cursor < text.length) cursor++; };
    const string = () => {
        const start = cursor++;
        while (cursor < text.length) {
            if (text[cursor] === '\\') cursor += 2;
            else if (text[cursor++] === '"') break;
        }
        return JSON.parse(text.slice(start, cursor));
    };
    const visit = (path, depth) => {
        skip();
        const kind = text[cursor];
        if (kind === '{' || kind === '[') {
            if (depth >= MAX_JSON_DEPTH) throw issue(path, 'json.depth', 'JSON nesting exceeds firmware parser limit of 10');
            cursor++;
            skip();
            const close = kind === '{' ? '}' : ']';
            const keys = new Set();
            let index = 0;
            while (text[cursor] !== close) {
                let childPath;
                if (kind === '{') {
                    const key = string();
                    childPath = `${path}[${JSON.stringify(key)}]`;
                    if (keys.has(key)) errors.push(issue(childPath, 'json.duplicate', 'duplicate object key'));
                    keys.add(key);
                    skip();
                    cursor++; // colon
                } else childPath = `${path}[${index++}]`;
                visit(childPath, depth + 1);
                skip();
                if (text[cursor] !== ',') break;
                cursor++;
                skip();
            }
            cursor++; // closing bracket
        } else if (kind === '"') string();
        else while (cursor < text.length && !/[,}\]\s]/.test(text[cursor])) cursor++;
    };
    try { visit('$', 0); }
    catch (error) { errors.push(error && error.code ? error : issue('$', 'json.inspect', error.message)); }
    return { ok: errors.length === 0, document: errors.length ? null : document, errors };
}

module.exports = {
    SCHEMA_VERSION, TARGET_COUNT, MAX_INT, MAX_DATABASE_BYTES, MAX_JSON_DEPTH, MAX_DRILL_DEPTH,
    BUILT_INS, isDateString, twelveMonthCutoff, scoreStatistics,
    validateDatabase, migrateDatabase, parseDatabaseJson
};
