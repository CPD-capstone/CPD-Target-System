// AI-generated (Codex): validate the complete local browser dependency inventory.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const requiredFiles = ['targets.html', 'drills.html', 'Performance.html', 'settings.html', 'script.js', 'style.css', 'database.json', 'release.json', 'manifest.json', 'results-pdf.js', 'vendor/bootstrap.bundle.min.js', 'vendor/sortable.min.js', 'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js', 'vendor/fonts/NotoSans-Regular.ttf'];
function inventory(directory) {
    const root = path.resolve(directory), files = [], lower = new Set();
    function walk(folder) {
        for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
            const absolute = path.join(folder, entry.name);
            const relative = path.relative(root, absolute).split(path.sep).join('/');
            if (entry.isSymbolicLink()) throw new Error(`${relative}: symbolic links are not release files`);
            if (entry.isDirectory()) { walk(absolute); continue; }
            if (lower.has(relative.toLowerCase())) throw new Error(`${relative}: duplicate path ignoring case`);
            lower.add(relative.toLowerCase());
            const bytes = fs.readFileSync(absolute);
            files.push({ path: relative, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
        }
    }
    walk(root);
    return files.sort((a, b) => a.path.localeCompare(b.path));
}
function validateAssets(directory, required = requiredFiles) {
    const root = path.resolve(directory), errors = [], references = [];
    let files;
    try { files = inventory(root); } catch (error) { return { ok: false, errors: [error.message], files: [], references }; }
    const paths = new Set(files.map(file => file.path));
    function reference(from, value) {
        if (!value || /^(?:#|data:|blob:|mailto:|tel:)/i.test(value)) return;
        if (/^(?:https?:)?\/\//i.test(value)) { errors.push(`${from}: external asset ${value}`); return; }
        if (/^\/api(?:\/|\?|$)/.test(value)) return;
        let clean;
        try { clean = decodeURIComponent(value.split(/[?#]/)[0]); } catch { errors.push(`${from}: invalid URL ${value}`); return; }
        if (!clean || clean === '/') return;
        const target = path.posix.normalize(clean.startsWith('/') ? clean.slice(1) : path.posix.join(path.posix.dirname(from), clean));
        if (target.startsWith('../') || target === '..' || target.includes('\\')) { errors.push(`${from}: reference escapes data directory: ${value}`); return; }
        references.push({ from, target });
        if (!paths.has(target)) errors.push(`${from}: missing ${target}`);
    }
    for (const file of files) {
        const absolute = path.join(root, file.path), bytes = fs.readFileSync(absolute);
        if (file.path === 'controller-test.js' || /\.(py|pyc|cjs|mjs)$/i.test(file.path) || /\.(?:test|spec)\.js$/i.test(file.path) || file.path.split('/').includes('__pycache__')) {
            errors.push(`${file.path}: development code must stay outside ESP32 data`);
        }
        if (!bytes.length) errors.push(`${file.path}: empty asset`);
        if (file.path.endsWith('.gz')) {
            const source = file.path.slice(0, -3);
            try {
                const unpacked = zlib.gunzipSync(bytes, { maxOutputLength: 16 * 1024 * 1024 });
                if (!paths.has(source)) errors.push(`${file.path}: missing uncompressed source`);
                else if (!unpacked.equals(fs.readFileSync(path.join(root, source)))) errors.push(`${file.path}: gzip differs from source`);
            } catch (error) { errors.push(`${file.path}: invalid gzip (${error.message})`); }
        }
        if (/\.(html|css|js)$/.test(file.path)) {
            const text = bytes.toString('utf8');
            if (/\.(html|js)$/.test(file.path)) for (const match of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"'${}]+)["']/g)) reference(file.path, match[1]);
            if (file.path.endsWith('.css')) for (const match of text.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/g)) reference(file.path, match[1]);
            if (file.path.endsWith('.js')) {
                const dependencies = /(?:\b(?:fetch|import|loadScript)\s*\(\s*|\b(?:from|import)\s+)(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g;
                for (const match of text.matchAll(dependencies)) {
                    const url = match[1] ?? match[2] ?? match[3];
                    // Cache queries may be computed while the asset path stays literal.
                    if (match[3] && url.split(/[?#]/, 1)[0].includes('${')) continue;
                    reference(file.path, url);
                }
            }
        }
        if (file.path.endsWith('.png') && !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) errors.push(`${file.path}: invalid PNG`);
        if (file.path.endsWith('.woff2') && bytes.subarray(0, 4).toString() !== 'wOF2') errors.push(`${file.path}: invalid WOFF2`);
        if (file.path.endsWith('.svg') && !bytes.toString().includes('<svg')) errors.push(`${file.path}: invalid SVG`);
        if (file.path === 'manifest.json') {
            try { for (const icon of JSON.parse(bytes).icons || []) reference(file.path, icon.src); }
            catch (error) { errors.push(`manifest.json: ${error.message}`); }
        }
    }
    for (const requiredFile of required) if (!paths.has(requiredFile)) errors.push(`release: missing required ${requiredFile}`);
    return { ok: errors.length === 0, errors: [...new Set(errors)], files, references };
}
if (require.main === module) {
    const result = validateAssets(process.argv[2] || path.join(__dirname, '../../data'));
    const json = JSON.stringify(result, null, 2) + '\n';
    if (process.argv[3]) fs.writeFileSync(process.argv[3], json);
    process.stdout.write(json);
    process.exitCode = result.ok ? 0 : 1;
}
module.exports = { inventory, validateAssets, requiredFiles };
