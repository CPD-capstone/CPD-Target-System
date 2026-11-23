# Offline assets and release audit

> Historical audit: the observations below describe behavior before the safeguards. See [implementation and verification](implementation-validation.md) for the current behavior and test results.

This audit covers `CPD-Target-System`. The checks below read files and send GET requests to the existing localhost preview. They do not upload firmware, replace LittleFS, change the database, or execute hardware code. All mitigations and tests are proposals.

Save each JavaScript example to a local `.cjs` file in the repository root and run `node FILE.cjs`; no particular shell is required.

## Reproduce the asset checks

Run commands from the repository root. Start the existing preview in a separate terminal:

```text
python data/preview_server.py
```

Use the following read-only probe in another terminal. It prints the status, MIME type, and compression header for each request:

```javascript
(async () => {
  for (const asset of [
    'vendor/sortable.min.js',
    'vendor/jspdf.umd.min.js',
    'vendor/fonts/NotoSans-Regular.ttf',
    'vendor/fonts/bootstrap-icons.woff'
  ]) {
    for (const encoding of ['gzip', 'identity']) {
      const response = await fetch('http://127.0.0.1:8768/' + asset, {
        headers: { 'Accept-Encoding': encoding },
        signal: AbortSignal.timeout(5000)
      });
      console.log({ asset, encoding, status: response.status,
        type: response.headers.get('content-type'),
        contentEncoding: response.headers.get('content-encoding') });
    }
  }
})();
```

## ASSET 001 Compressed assets require gzip support

**Status:** reproduced in the localhost preview. **Severity:** medium compatibility and recovery risk.

The preview returns the following results for the shipped compressed-only files:

| Requested asset | Accept gzip | Accept identity |
| --- | --- | --- |
| `vendor/sortable.min.js` | 200, JavaScript, gzip | 404, HTML |
| `vendor/jspdf.umd.min.js` | 200, JavaScript, gzip | 404, HTML |
| `vendor/fonts/NotoSans-Regular.ttf` | 200, octet stream, gzip | 404, HTML |

**Expected:** either a documented gzip requirement or a valid uncompressed response when the client cannot accept gzip. **Observed:** the existing preview has no uncompressed source to serve for identity requests. Normal browser requests accepting gzip succeed. The font's octet-stream MIME type is sufficient for its current `fetch(...).arrayBuffer()` loading path; this check does not establish a font rendering defect.

**Impact:** tools or browsers requesting identity cannot load these assets. Missing Sortable blocks drag and drop; missing PDF dependencies blocks export. The equivalent controller response is unverified because this audit did not contact an ESP32.

**Suggested tests:** request every compressed-only dependency with gzip and identity, verify the declared support policy, MIME type, and decompressed bytes; exercise the drill editor and PDF error path after a 404. Include AutoTable and all PDF font files in the inventory.

**Possible mitigations:** keep paired uncompressed sources, or make gzip support an explicit compatibility requirement. Validate compressed assets and their serving headers before deployment.

## ASSET 002 The legacy icon font fallback is missing

**Status:** reproduced file and HTTP check. **Severity:** low while WOFF2 works.

1. Inspect the `@font-face` declaration in `data/vendor/bootstrap-icons.min.css`.
2. Observe references to both `fonts/bootstrap-icons.woff2` and `fonts/bootstrap-icons.woff`.
3. Request the WOFF URL using the probe above: it returns 404 with either encoding.
4. The WOFF2 file exists. Failure of modern browser icon rendering was not reproduced.

**Expected:** every advertised font source exists. **Observed:** the WOFF fallback does not.

**Impact:** clients that require that fallback cannot load the icon font. This is not evidence that WOFF2-capable browsers fail.

**Suggested test:** enumerate CSS `url(...)` references and require each local file or an explicitly supported compressed variant.

**Possible mitigations:** ship the referenced fallback or remove that source from the vendored CSS; update its compressed partner consistently.

## ASSET 003 Compressed and uncompressed Bootstrap bytes differ only in line endings

**Status:** reproduced; integrity observation, not a demonstrated functional defect.

Run this comparison from the repository root:

```javascript
const fs = require('node:fs');
const zlib = require('node:zlib');
for (const name of ['bootstrap.min.css', 'bootstrap-icons.min.css', 'bootstrap.bundle.min.js']) {
  const source = fs.readFileSync('data/vendor/' + name);
  const decoded = zlib.gunzipSync(fs.readFileSync('data/vendor/' + name + '.gz'));
  console.log({ name, sourceBytes: source.length, decodedBytes: decoded.length,
    equal: source.equals(decoded),
    equalAfterCRLFNormalization:
      source.toString().replace(/\r\n/g, '\n') === decoded.toString().replace(/\r\n/g, '\n') });
}
```

Observed source/decoded sizes are 232116/232111, 85879/85875, and 80502/80496 respectively. All three byte comparisons are false, and all three comparisons after CRLF normalization are true.

**Suggested test:** decide whether a future release validator compares exact bytes or canonical text. If exact bytes are required, generate compressed files after line-ending normalization. Do not report the current pairs as different library versions.

## RELEASE 001 Unversioned vendor URLs permit stale cached dependencies

**Status:** confirmed configuration; a cross-release browser failure was not reproduced. **Severity:** medium.

1. Inspect `src/webserver.cpp`: `/vendor/` uses `public, max-age=31536000, immutable`.
2. Inspect the main HTML pages: Bootstrap and other vendor links use stable filenames.
3. In a separate software fixture server, serve those files with the same cache headers. Load a page once, then change a vendor file without changing its URL.
4. Navigate again with normal caching enabled. Record whether the browser uses the cached file. This final browser experiment is a proposed follow-up, not a reported observation.

**Expected:** changed release dependencies have changed URLs or must revalidate. **Risk:** a filesystem replacement can leave a phone using an older dependency for the same URL.

**Suggested test:** a browser test spanning two fixture releases, with caching enabled, that verifies the library version loaded after upgrade. A test that disables caching cannot establish this behavior.

**Possible mitigations:** content hashes or release versions in URLs, or revalidation headers for stable vendor filenames.

## RELEASE 002 A missing static asset can fall through to the target page

**Status:** confirmed by source inspection; controller response unverified. **Severity:** medium.

1. Inspect `src/webserver.cpp`: static serving is followed by an unconditional `onNotFound` response containing `/targets.html`.
2. In a software server fixture implementing that fallback, request `/missing-script.js` with that asset absent.
3. Check for an HTML body and success status rather than a missing-asset error. The controller experiment is not part of this audit.

The API has a separate `/api` error handler in `src/api.cpp`; do not assume unknown API routes necessarily reach this fallback. The Python preview already returns a 404 for missing files and therefore does not reproduce the firmware fallback.

**Suggested tests:** distinguish missing navigation, script, stylesheet, font, image, and API paths; require error status and appropriate content type for missing dependencies. A host-side route test or extracted pure route classifier avoids hardware execution.

**Possible mitigation:** apply the navigation fallback only to navigation requests and return errors for missing assets.

## RELEASE 003 Filesystem replacement needs an explicit saved-data backup procedure

**Status:** release-process gap identified by inspection; no filesystem replacement or data loss experiment was performed. **Severity:** high if saved operational data is replaced.

1. Inspect `platformio.ini`: the project uses LittleFS and the production configuration currently names `esp32-s3-devkitc-1`, 16 MB flash, and `default_16MB.csv`.
2. Observe that `data/database.json` is inside the filesystem source directory alongside the UI.
3. Inspect the existing testing guide and tasks for the distinction between firmware upload and filesystem upload, and for an export/restore step preserving the controller's current saved records.
4. For a future software rehearsal, build one filesystem image with a unique officer fixture, then build a replacement from the repository seed and inspect the replacement image's database. Do not upload either image to reproduce the packaging risk.

**Expected:** an upgrade preserves or explicitly imports the live saved database. **Risk:** rebuilding a whole filesystem from the seed directory packages the seed database rather than records saved on the controller. A firmware-only build does not itself demonstrate filesystem replacement.

**Suggested tests:** inspect staged image contents, require a separately supplied validated backup for upgrades, and reject an upgrade bundle containing the seed implicitly. Test provisioning and upgrade paths separately. Record the chosen board and partition settings; the older board names in `AGENTS.md` are not authoritative evidence of the current configuration.

**Possible mitigations:** documented export/restore and rollback, labeled prior firmware/filesystem archives, a manifest with source state and hashes, and a local release gate that validates software before any upload. These are proposals; no release gate or deployment scripts were added.
