<!-- AI-assisted documentation: Codex. Describes the implemented safeguards and existing test results. -->
# Unit tests data validation and guardrails

## Plain English summary

The new checks protect saved officers, qualification scores, and drills when a save or update goes wrong. They also help a person using a phone understand whether a save succeeded, failed, or needs checking. A failed target-data load now produces a visible error instead of making every target look available. The retained release workflow requires a supplied records backup and a complete set of software checks.

These changes support an authorized, trustworthy person using an Android or Apple phone on site. They address ordinary storage, connection, repeated-tap, and maintenance problems. They do not add a new authentication system or change how the physical targets are driven.

## What runs on the ESP32 and on the phone

| Location | What runs there |
| --- | --- |
| ESP32-S3 controller | C++ firmware, LittleFS storage, database validation and recovery, HTTP API, and locally stored website files |
| Android or Apple phone | HTML, CSS, and JavaScript in the mobile browser, including save confirmation, request deadlines, form guards, and availability checks |
| Development computer | Portable Node and Python tools, a C++17 host compiler, Playwright browser tests, and PlatformIO builds for the ESP32 |

Phone users do not install Node, Python, a compiler, or a test runner. Host test executables are temporary and never become ESP32 firmware or LittleFS assets. The deployed website uses controller-hosted assets and does not require an internet CDN.

The existing npm unit/browser/preflight commands and Python release gate are the explicitly retained development-tool exception. They remain on the development computer; they are not processes, dependencies, or simulation code installed on the ESP32. Production `data/` contains the controller's website assets, without the development mock or preview server.

The current production configuration is `esp32-s3-devkitc-1`, with 16 MB flash, QIO flash, octal PSRAM, `default_16MB.csv`, and LittleFS. The new workflow does not require a particular desktop operating system, shell, or system browser.

## Test inventory and results

The most recent completed software verification passed the following checks. Counts are separate test layers; a C++ group can contain several assertions.

| Suite | Passed | Purpose and source |
| --- | ---: | --- |
| Data rules | 62 | Schema, dates, statistics, migration, and serialized JSON boundaries in [data-rules.test.cjs](../../tests/data-rules/data-rules.test.cjs) |
| Browser request helper | 7 | Production JavaScript transport and availability validation in [controller-client.test.cjs](../../tests/browser-unit/controller-client.test.cjs) |
| Local controller mock contracts | 25 | Rejection, persistence, editing, and statistics behavior of the actual development mock in [controller-mock.test.cjs](../../tests/browser-unit/controller-mock.test.cjs) |
| Release and asset integrity | 14 | Real staging and verification functions with disposable files in [release.test.cjs](../../tests/release/release.test.cjs) |
| Portable release command guards | 8 | Confirmation, backup, dry-run, and export protections in [test_release.py](../../tests/release/test_release.py) |
| Production database regression groups | 49 | Production C++ database code with a simulated filesystem in [runner.cpp](../../tests/database/runner.cpp) |
| Browser regression matrix | 48 | Sixteen scenarios run across three browser projects in [controller-ui.spec.js](../../tests/ui/controller-ui.spec.js) and [release-safety.spec.js](../../tests/ui/release-safety.spec.js) |

The first four rows total **108 JavaScript unit and contract tests**. The browser matrix includes **12 new failure/recovery scenarios** and four existing workflows, each exercised in desktop Chromium, Android viewport Chromium emulation, and iPhone WebKit emulation. Browser scenarios are integration tests rather than isolated unit tests.

The initial six core database regression groups and six initial browser regressions failed against the audited code before their fixes. Additional mock contract tests also reproduced gaps before the mock was corrected. The historical audit reports preserve those observations.

## Data validation rules

Validation exists in the controller's [database implementation](../../src/database.cpp) and the developer-side [preflight validator](../../tools/release/data-rules.cjs). A browser form is not the only place that checks incoming data.

| Area | Rules now enforced |
| --- | --- |
| Raw database JSON | At most 262144 bytes, valid complete JSON, no trailing garbage, no duplicate decoded object keys, and at most ten nested JSON containers |
| Root structure | An object containing `Officers`, `drills`, and `targets` arrays |
| Schema version | Current version is numeric `schemaVersion: 1`; unsupported supplied versions are rejected |
| Target records | Exactly twenty records, unique integer IDs from 1 through 20, and an actual boolean `working` value |
| Officer identity | Unique positive integer badge numbers up to 2147483647; visible, non-control-character names of at most 64 UTF-8 bytes. Names themselves need not be unique |
| Qualifications | Visible names of at most 32 UTF-8 bytes, unique ignoring case; the catalog retains the exact built-in names `Pistol`, `Rifle`, and `SWAT` |
| Score entries | A two-element `[score, date]` array; score is a nonnegative signed 32-bit integer and date is a real Gregorian `YYYY-MM-DD` date, with a year from 0001 through 9999 |
| Score histories | Supplied histories must have the expected types. Custom histories use an exact registered custom qualification name. Built-in scores cannot also appear under custom-history keys |
| Drill names | Visible text without control characters, unique by exact name, and not one of the reserved action names `present`, `hide`, `yield`, `pause`, or `delay` |
| Drill sequences | Nonempty arrays with contiguous `step` numbers starting at 1; each action is a supported action or an existing drill name |
| Delays | `delay` steps require integer `timeMs` from 1 through 2147483647 |
| Nested drills | Referenced drills exist, cycles are rejected, and every possible root stays within four levels including that root |
| Specific target selections | A nonempty list of unique IDs from 1 through 20, allowed only on `present` and `hide` steps |
| Random target selections | Integer `random` from 1 through 20, allowed only on `present`, without a simultaneous `targets` list |
| Unsupported selection fields | `targetMode`, `targetIds`, and `randomCount` are rejected so the runtime cannot silently ignore a supposed restriction |
| Optional metadata | Supplied `description` must be text and `builtIn` must be boolean. Unrelated metadata can be preserved without bypassing operational validation |

The [API body handler](../../src/api.cpp) also requires JSON object bodies and bounds ordinary mutation requests to 16384 bytes. The explicit database-restore endpoint permits up to the 262144-byte database limit, with its incoming body staged in `/database.upload` on LittleFS rather than kept as a full raw RAM buffer. Only one file-backed upload owns that staging path at a time; another receives a busy response. Completion, rejection, and disconnect cleanup release the staging file and request state. A partially uploaded file is never treated as a committed database. Query identifiers are checked for integer overflow.

### Scores are raw points

A score of 101 or 137 is valid. No 100-point maximum was added. Negative scores, fractional values, numeric strings, values above 2147483647, and malformed score/date pairs are rejected.

### Calendar dates and statistics

Date validation checks month lengths and leap-year century rules. Examples such as `2026-02-31` and `1900-02-29` are rejected; `2000-02-29` is valid.

The twelve-month statistics window includes both its lower date boundary and today. A February 29 anniversary is clamped to February 28 in a preceding ordinary year. Older and future-dated entries are excluded from that calculation, not deleted from history. Average is rounded to one decimal place; average and top are null when there are no qualifying attempts. The API caller supplies today's date for the offline controller.

### Supported legacy data

A database missing `schemaVersion` or the qualification catalog can use the supported legacy path, with warnings. Missing optional historical score arrays remain acceptable; malformed supplied arrays are not silently converted. Migration preserves the score records and unrelated metadata.

Controller loading adds supported missing metadata in memory; it does not automatically replace the disk file merely because it was read. An explicit save or staged upgrade can persist that metadata. A future-version live or recovery file blocks an automatic downgrade from an older backup.

### Availability and stored references are different checks

A saved drill can retain a valid reference to a target that later becomes unavailable. Marking a target unavailable does not make the entire database invalid. Operator-facing availability checks and existing controller execution restrictions still determine whether that target can be used.

## ESP32 database save and recovery guardrails

The [production C++ implementation](../../src/database.cpp) checks a candidate database before writing it. It measures the intended serialization, writes the temporary file, flushes and closes it, and reads it back. A streamed comparison requires every stored byte to match the serialization of that already validated candidate. This proves the stored content without allocating a second parsed database for readback.

Before replacing valid live data, the save preserves a verified previous copy. Replacement happens only after the checks succeed. A failed replacement does not delete the valid live file first.

The working database paths are `/database.json`, `/database.tmp`, `/database.bak`, and the backup staging path `/database.bak.tmp`. `/database.upload` is separate incoming-request staging and is not an automatic recovery candidate. The backup is the previous known-good state, not an unlimited history of every edit. Labeled release/export backups provide separately retained snapshots.

Recovery follows these rules:

1. A valid live database takes precedence over an uncommitted temporary file.
2. If live data is missing or invalid, a valid temporary file is considered before the known-good backup.
3. Recovery checks the replacement result before reporting success. A parsed copy in memory is not treated as proof that storage was repaired.
4. Unsupported future versions are not silently replaced with older recovery data.
5. A failed filesystem mount does not request automatic formatting.
6. Readiness, migration, recovery, and warnings are available through software diagnostics.

Editing a drill's sequence, renaming it, and updating its references now form one validated save. An invalid candidate or storage failure preserves the original transaction state. Failed getters clear their output so callers cannot mistake stale data for a successful read.

### What the 49 C++ groups cover

The native runner compiles the actual database source with an in-memory LittleFS substitute and a minimal Arduino runtime. It checks:

- Incomplete writes, zero-byte writes, one-byte-short writes, exact-length success, changed readback, and failed temporary-file opens.
- Backup write/open/rename failures and successful preservation of the preceding valid document.
- Failed live replacement, valid-live precedence, temporary recovery, backup recovery, and failure during recovery.
- Missing, malformed, oversized, trailing, duplicate-key, short-read, and deeply nested JSON, including escaped duplicate key spellings and unterminated buffers.
- Mount failure without formatting, supported legacy migration, and future-version refusal even when an old backup exists.
- Required schema sections, target identity/state, officers, qualification catalogs, score histories, and selector fields.
- Officer creation/edit/deletion, duplicate badges, real dates, raw-point score bounds, score order, and statistics.
- Custom qualification uniqueness, protected built-in names, removal of unused assignments, and refusal to remove qualifications with score history.
- Drill references, rename/delete restrictions, cycles, depth limits, and densely shared graphs without repeatedly expanding every path during validation.
- Combined drill edits and renames, failure rollback, validated restore/export, and clearing stale getter results.
- Streamed file reads and verification, cached diagnostics, selective section/record reads, detection of changed live bytes, and the memory-saving save/backup paths.

These tests simulate specified filesystem results. They do not cut power to a board or measure physical flash failure rates.

### ESP32 RAM behavior

The controller still needs parsed records for schema checks and edits, but avoids keeping unnecessary full copies alive together:

- Strict file scanning, hashing, comparison, and backup copying use fixed 256-byte working buffers. There can be more than one small buffer in an operation; this is not a 256-byte limit on the entire operation.
- A normal edit/save keeps one full parsed database. Readback compares streamed bytes with that validated document, and the preceding known-good file is copied and hash-checked without parsing another full document.
- A rare explicit restore against an unknown or changed live file can temporarily need the incoming candidate and the previous parsed database together. The previous document is released before writes begin. Restoring does not create an additional full clone of the parsed request.
- Reads check the live file's SHA-256 and size against the exact bytes previously fully validated. An unchanged file can then be parsed directly into the requested section or record. A changed file must pass full validation again before that shortcut is allowed; filtering cannot conceal a damaged section. Hash checks still read the file, but do not allocate its full text.
- Health diagnostics use cached startup/last-operation fields, so reading health does not repeatedly parse the complete database. This is last-known software state, not a new full-file validation on every health refresh.
- On-device `release.json` contains version fields and a build timestamp. Source-control provenance stays in the external bundle/manifest, avoiding its allocation during controller health checks.
- JSON responses take ownership of their parsed document and serialize into network buffers as needed. They do not make full serialized `String` copies. The document remains alive until the response finishes; large responses still consume memory for their requested records and take CPU time to serialize.
- Ordinary request buffers are released after parsing and before database work. Large restore bodies are file-backed, with the 262144-byte limit still enforced.


## Mobile request and form guardrails

The production [request helper](../../data/controller-client.js) runs normally in the phone browser and is imported directly by the seven JavaScript unit tests. Those tests cover:

1. **Valid save acknowledgment:** only the expected JSON confirmation succeeds. HTML, empty replies, broken JSON, `{ "ok": false }`, and missing acknowledgments remain unconfirmed.
2. **Useful rejection messages:** an explicit server error is preserved, with one request and no automatic retry.
3. **Bounded waiting:** the deadline covers both waiting for a response and reading its JSON body, including a transport that ignores abort.
4. **Lost connections:** the outcome stays unknown and the request is not silently repeated.
5. **Caller cancellation:** cancellation can end a waiting read before the normal deadline.
6. **Repeated pending writes:** identical active writes share one request; a later deliberate save can still occur after completion.
7. **Availability shape:** the response needs all twenty unique IDs and explicit boolean states before it is trusted.

Production requests use a ten-second deadline. Unit tests use a short configurable deadline so they can exercise that behavior quickly.

The [page logic](../../data/script.js) additionally guards form submissions and checks which dialog/draft owns an operation. A late response cannot close or reset a newer drill draft. Closing a score batch stops subsequent requests, and reopening while a prior save is pending shows a warning to reload and check saved scores.

**Cancellation does not undo a score already accepted by the controller.** A batch is not an all-or-nothing database transaction. These guards prevent unintended follow-up work and misleading UI updates. They are not permanent server-side idempotency keys: manually repeating a completed score request can still add another score.

When availability cannot be verified, the target page shows a recovery message and keeps the relevant controls unavailable instead of initializing invented healthy defaults. Required-asset or page-version failures also block normal mutations until the operator resolves the mismatch.

## Development mock contract tests

The 25 tests in [controller-mock.test.cjs](../../tests/browser-unit/controller-mock.test.cjs) load the actual development adapter from [tests/fixtures/controller-test.js](../../tests/fixtures/controller-test.js) with in-memory storage. They verify that it rejects impossible dates, invalid target lists, direct/indirect cycles, excessive depth, blank/reserved names, duplicate qualification tags, unsupported selector aliases, and conflicting edits.

Rejected operations must leave saved mock state unchanged. Positive cases cover rename-only and sequence-only edits, updated references, persisted raw-point scores across reload, and the leap-day statistics boundary. An incomplete initial mock database fails visibly.

This makes browser development tests more representative of production rules. It does not establish that every mock endpoint behaves identically to firmware. Playwright injects this fixture only for localhost test pages; `?test=1` by itself does not enable any simulator in the production application. The fixture and [preview server](../../tests/ui/preview_server.py) live under `tests/`, outside deployed `data/`.

## Browser integration coverage for Android and Apple phones

The 12 new scenarios in [release-safety.spec.js](../../tests/ui/release-safety.spec.js) check four invalid-success reply types, unknown availability, repeated officer submissions, stale drill-save completion, canceled/reopened score batches, release mismatch, missing required scripts, software-health warnings, and missing-route/gzip/cache responses.

The four existing scenarios still cover manual-mode gating and mock persistence, unavailable-target exclusion, drill authoring, PDF creation, phone-width layout, and compressed asset headers. Layout widths include 320, 360, 390, and 430 CSS pixels.

Every scenario runs in three projects: desktop Chromium, Pixel 7 viewport/user-agent emulation in Chromium, and iPhone 13 WebKit emulation. The complete matrix passed 48 checks with external page requests blocked. PDF coverage verifies creation of a nonempty `application/pdf` blob; opening and sharing that PDF on an actual phone remains a device check.

## Offline assets and software health

The [asset validator](../../tools/release/validate-assets.cjs) inventories local HTML, CSS, JavaScript, imports, fonts, images, and PDF dependencies. It checks required files, missing references, external asset URLs, case-insensitive duplicate paths, unsafe reference paths, empty files, gzip integrity, and exact agreement between compressed files and their uncompressed sources. It also performs basic PNG, WOFF2, and SVG checks; these are not full image/font decoder tests.

Paired vendored sources are kept locally, and their line-ending policy makes gzip comparisons repeatable. The preview supports gzip and identity requests with appropriate response types. Stable vendor paths now revalidate rather than being treated as immutable for a year. Application asset URLs carry a release version.

Missing static files produce an error rather than a successful HTML fallback. The existing JSON API catchall remains separate from navigation handling. API responses use `no-store` caching.

The [Software health page](../../data/health.html) displays firmware, UI, and schema versions; database readiness and startup status; warnings; and a validated backup download. It does not issue target-motion commands or claim to certify hardware readiness.

## Release and update guardrails

The portable [release driver](../../tools/release/release.py) and [bundle validator](../../tools/release/bundle.cjs) separate new-controller provisioning from upgrades:

- **Provision:** explicitly selects the repository starter database for a new empty controller.
- **Upgrade:** requires a separately supplied current-records backup and rejects the repository seed path as that backup. It migrates the staged copy, preserves the original export, and excludes recovery/development files from the image.

The gate requires nine passed checks: database, assets, JavaScript syntax, JavaScript unit tests, release-command unit tests, native database tests, browser tests, firmware build, and LittleFS build. Browser tests use the staged directory and a fresh preview server. Board settings, the generated partition table, and image sizes are checked before the release is finalized.

The completed bundle records versions, build time, source state when available, validation results, and hashes. Verification rejects changed files, missing images, unrecorded payload files, and inconsistent checksum reports. These checks detect unintended changes; they are not cryptographic signatures.

Staging excludes development fixtures, and the asset preflight rejects development code found in production `data/`. The release tests deliberately introduce a mock filename to check its exclusion. With fixtures stored outside `data/`, a normal filesystem build no longer includes them. A direct PlatformIO command still packages the current directory contents; it does not run the npm/Python preflight checks by itself.

### What the 14 release and asset tests cover

1. Refuse an absent upgrade backup and the repository seed path.
2. Preserve supplied saved records and the original backup without changing the seed.
3. Use the seed only when provisioning is explicitly selected.
4. Refuse future-version, malformed, and duplicate-key backup inputs.
5. Migrate only the staged legacy copy, preserving score history.
6. Block production board, environment, memory, and partition drift.
7. Refuse manifest generation when a software check failed or was omitted.
8. Verify a complete bundle and reject corrupted image bytes.
9. Reject incomplete or mismatched filesystem/partition images.
10. Reject release paths that escape the destination.
11. Reject files omitted from the manifest and damaged checksum reports.
12. Check complete rollback-archive size, board identity, and hashes.
13. Detect missing/external dependencies and stale or invalid gzip files.
14. Accept the complete checked-in local asset inventory and matching gzip partners.

### What the eight release command tests cover

1. Upgrade refuses a missing backup before invoking build commands.
2. Upload requires both an explicit port and confirmation.
3. Dry-run verifies without invoking device tooling.
4. Upgrade deployment requires a current backup and a rollback bundle/archive.
5. A supplied backup changed since staging blocks deployment before device access.
6. Full-flash capture requires explicit read confirmation.
7. Database restore requires explicit confirmation before file/network work.
8. An invalid export never becomes a usable backup file.

Firmware and filesystem uploads remain separate. Upgrade deployment compares the supplied backup with the staged original; it does not automatically discover every record added to a live controller afterward. A fresh export and the documented maintenance procedure remain necessary. Backup, restore, and upload commands contact a device only when deliberately invoked; the software tests replace that access with mocks or use dry-run mode.

## Commands for developers

Run these retained developer commands from `CPD-Target-System` on a development computer with Node 24, Python, the installed project/browser dependencies, and a C++17 compiler. They are the explicit development-tool exception and do not run on the ESP32 or an operator's phone.

```text
# All 108 JavaScript unit and contract tests
npm test

# Eight portable release command tests
npm run test:release

# Forty-nine production database regression groups
npm run test:database

# Database preflight and asset inventory
npm run validate:database
npm run validate:assets

# Complete browser matrix, or desktop only
npm run test:ui
npm run test:ui:desktop

# Full staged upgrade gate; builds but never uploads
python tools/release/release.py build --mode Upgrade --database-backup PATH_TO_CURRENT_DATABASE_BACKUP
```

The preflight command can also emit a machine-readable report:

```text
node tools/release/validate-database.cjs data/database.json --strict --report database-validation.json
```

`--strict` requires the current schema/catalog metadata rather than accepting the supported missing legacy metadata. Invalid data produces a nonzero exit code, and the validator does not rewrite the input database.

## What still requires an ESP32 and a physical phone

The firmware and LittleFS images built successfully for the configured ESP32-S3. The release rehearsal also passed checksum/partition verification and separate firmware/filesystem deployment dry runs using synthetic records and a synthetic rollback archive. Those artifacts are demonstrations, not actual controller backups.

No controller upload, live database restore, flash capture, target operation, physical power-cut test, or flash-wear measurement was performed. Browser emulation does not reproduce every Android or Apple keyboard, screen-sleep, Wi-Fi reconnect, PDF viewer, or installed-home-screen behavior. JSON size and graph-depth limits also do not prove that every permitted dataset fits every runtime memory condition.

Use the [connected-device checklist](connected-device-test-list.md) for actual phone/controller validation. Hardware-facing source and existing stage-reset/HAL test behavior were preserved, and those tests remain outside this software release gate.

For the broader changes and recorded build results, see [implementation and verification](implementation-validation.md). For operational backup, upgrade, deployment, and rollback steps, see the [release procedure](deployment-and-rollback.md).
