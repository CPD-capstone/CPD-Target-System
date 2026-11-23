#!/usr/bin/env node
'use strict';

// AI-assisted (Codex): read-only database preflight; JSON reports are optional artifacts.
const fs = require('node:fs');
const path = require('node:path');
const { validateDatabase, parseDatabaseJson, SCHEMA_VERSION, MAX_DATABASE_BYTES } = require('./data-rules.cjs');

function main(args, { writeOutput = text => process.stdout.write(text) } = {}) {
    let input = path.resolve(__dirname, '../data/database.json');
    let reportPath;
    let allowLegacy = true;
    let inputSeen = false;
    try {
        for (let index = 0; index < args.length; index++) {
            const argument = args[index];
            if (argument === '--report') {
                if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('--report requires a file path');
                reportPath = path.resolve(args[++index]);
            } else if (argument === '--strict') allowLegacy = false;
            else if (argument.startsWith('-') || inputSeen) throw new Error(`unexpected argument: ${argument}`);
            else { input = path.resolve(argument); inputSeen = true; }
        }
        if (reportPath) {
            const normalized = value => process.platform === 'win32' ? value.toLowerCase() : value;
            const samePath = normalized(reportPath) === normalized(input);
            const inputInfo = fs.statSync(input);
            const reportInfo = fs.existsSync(reportPath) ? fs.statSync(reportPath) : null;
            const sameFile = reportInfo && inputInfo.dev === reportInfo.dev && inputInfo.ino === reportInfo.ino;
            if (samePath || sameFile) throw new Error('report output must not overwrite the input database');
        }
        // Avoid reading an arbitrarily large file into memory before enforcing the limit.
        if (fs.statSync(input).size > MAX_DATABASE_BYTES) {
            return output({ ok: false, errors: [{ path: '$', code: 'json.size', message: 'database exceeds 256 KiB' }], warnings: [], schemaVersion: SCHEMA_VERSION }, 1);
        }
        // AI-assisted (Codex): reject invalid UTF-8 rather than changing stored names during decoding.
        let text;
        try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(input));
        } catch (error) {
            if (error.code !== 'ERR_ENCODING_INVALID_ENCODED_DATA') throw error;
            return output({ ok: false, errors: [{ path: '$', code: 'json.encoding', message: 'database must contain valid UTF-8' }], warnings: [], schemaVersion: SCHEMA_VERSION }, 1);
        }
        const parsed = parseDatabaseJson(text);
        if (!parsed.ok) return output({ ok: false, errors: parsed.errors, warnings: [], schemaVersion: SCHEMA_VERSION }, 1);
        const result = validateDatabase(parsed.document, { allowLegacy });
        return output(result, result.ok ? 0 : 1);
    } catch (error) {
        return output({ ok: false, errors: [{ path: '$', code: 'preflight.io', message: error.message }], warnings: [], schemaVersion: SCHEMA_VERSION }, 2, false);
    }

    function output(result, status, writeReport = true) {
        const report = { ...result, input };
        const serialized = `${JSON.stringify(report, null, 2)}\n`;
        if (writeReport && reportPath) {
            fs.mkdirSync(path.dirname(reportPath), { recursive: true });
            fs.writeFileSync(reportPath, serialized, 'utf8');
        }
        writeOutput(serialized);
        return status;
    }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
