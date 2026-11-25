#include "database.h"
#include "hal.h"
#include <memory>
#include <new>
#include <cerrno>
#include <sys/stat.h>
#include <strings.h>
#include <mbedtls/sha256.h>

static JsonArray qualificationNames(JsonDocument& doc);
static bool validText(const char* value, size_t maximum);

/*
 * AI-assisted (Claude): the CRUD functions below were migrated from an older object-keyed
 * schema to the one in data/database.json, which is authoritative. It uses top-level ARRAYS:
 *
 *   "Officers": [ { "Name": str, "BadgeNum": int,
 *                   "pistolQualScores": [[score, "YYYY-MM-DD"], ...],   // newest first
 *                   "rifleQualScores":  [...], "swatQualScores": [...],
 *                   "qualificationScores": { "<custom name>": [...] } } ]   // AI-modified (Claude)
 *   "qualifications": [ "Pistol", "Rifle", "SWAT", ...custom names ]
 *   "drills":   [ { "drillName": str,
 *                   "sequence": [ { "step": int, "action": str, "timeMs"?: int } ] } ]
 *                 action is "present" | "hide" | "yield" | "delay" (delay requires timeMs),
 *                 (AI-modified (Claude): "yield" was "pause"; the old name is still accepted)
 *                 OR the drillName of another drill (the "... Full Drill" entries compose stages)
 *   "targets":  [ { "id": 1..20, "working": bool } ]
 *
 * Records are found with findIndex() (below), edited through arr[i], deleted with
 * arr.remove(i), and appended with arr.add<JsonObject>().
 */

static constexpr char DB_MOUNT[] = "/littlefs";
static const char* DB_PATH = "/database.json";
static const char* TMP_PATH = "/database.tmp";
static const char* BACKUP_PATH = "/database.bak";
static const char* BACKUP_TMP_PATH = "/database.bak.tmp";

// AI-generated (Codex): readiness describes persisted state, not just a parsed RAM copy.
static bool databaseReady = false;
static bool databaseMigrated = false;
static String databaseStartup = "not-checked";
static String databaseWarning;

struct DatabaseFingerprint {
    unsigned char sha256[32] = {};
    size_t bytes = 0;
    bool valid = false;
};
static DatabaseFingerprint validatedLive;

static bool sameFingerprint(const DatabaseFingerprint& a, const DatabaseFingerprint& b) {
    return a.valid && b.valid && a.bytes == b.bytes && memcmp(a.sha256, b.sha256, sizeof(a.sha256)) == 0;
}

// A streaming hash also proves that a backup still contains the exact file validated earlier.
// The fixed reader buffer replaces raw-file strings and readback JsonDocument copies.
class HashingFileReader {
    File& file;
    mbedtls_sha256_context hash;
    unsigned char buffer[256];
    size_t total, fetched = 0, available = 0, position = 0;
    bool good;
public:
    explicit HashingFileReader(File& source) : file(source), total(source.size()), good(source.seek(0)) {
        mbedtls_sha256_init(&hash);
        good = good && mbedtls_sha256_starts_ret(&hash, 0) == 0;
    }
    ~HashingFileReader() { mbedtls_sha256_free(&hash); }
    int read() {
        if (!good) return -1;
        if (position == available) {
            if (fetched == total) return -1;
            const size_t expected = total - fetched < sizeof(buffer) ? total - fetched : sizeof(buffer);
            available = file.readBytes((char*)buffer, expected);
            position = 0;
            if (available != expected || mbedtls_sha256_update_ret(&hash, buffer, available) != 0) { good = false; return -1; }
            fetched += available;
        }
        return buffer[position++];
    }
    size_t readBytes(char* output, size_t count) {
        size_t readCount = 0;
        int next;
        while (readCount < count && (next = read()) >= 0) output[readCount++] = (char)next;
        return readCount;
    }
    bool finish(DatabaseFingerprint& result) {
        while (read() >= 0) {}
        result.valid = good && fetched == total && mbedtls_sha256_finish_ret(&hash, result.sha256) == 0;
        result.bytes = total;
        return result.valid;
    }
};

static bool fileFingerprint(const char* path, DatabaseFingerprint& result) {
    result.valid = false;
    File file = LittleFS.open(path, "r");
    if (!file || file.size() == 0 || file.size() > DATABASE_MAX_BYTES) { if (file) file.close(); return false; }
    bool ok;
    { HashingFileReader reader(file); ok = reader.finish(result); }
    file.close();
    return ok;
}

// AI-generated (Codex): seekable inputs keep file validation independent of database size.
// The file reader has one fixed cache; HTTP parsing borrows the caller's existing body.
class JsonInput {
public:
    const size_t length;
    bool good = true;
    explicit JsonInput(size_t count) : length(count) {}
    virtual int at(size_t offset) = 0;
    virtual ~JsonInput() = default;
};

class MemoryJsonInput : public JsonInput {
    const char* bytes;
public:
    MemoryJsonInput(const char* data, size_t count) : JsonInput(count), bytes(data) {}
    int at(size_t offset) override { return offset < length ? (unsigned char)bytes[offset] : -1; }
};

class FileJsonInput : public JsonInput {
    File& file;
    char cache[256];
    size_t start = (size_t)-1, count = 0;
public:
    explicit FileJsonInput(File& source) : JsonInput(source.size()), file(source) {}
    int at(size_t offset) override {
        if (offset >= length || !good) return -1;
        if (start == (size_t)-1 || offset < start || offset >= start + count) {
            if (!file.seek(offset)) { good = false; return -1; }
            start = offset;
            const size_t expected = length - offset < sizeof(cache) ? length - offset : sizeof(cache);
            count = file.readBytes(cache, expected);
            if (count != expected) { good = false; return -1; }
        }
        return (unsigned char)cache[offset - start];
    }
};

// Decodes only the keys being compared, one codepoint at a time, without allocating strings.
class JsonKeyReader {
    JsonInput& input;
    size_t position, end;
    uint32_t hex4(size_t offset) {
        uint32_t result = 0;
        for (unsigned digit = 0; digit < 4; ++digit) {
            const int c = input.at(offset + digit);
            result = (result << 4) | (c <= '9' ? c - '0' : (c | 32) - 'a' + 10);
        }
        return result;
    }
public:
    JsonKeyReader(JsonInput& source, size_t first, size_t last) : input(source), position(first + 1), end(last - 1) {}
    bool next(uint32_t& point) {
        if (position >= end) return false;
        int c = input.at(position++);
        if (c == '\\') {
            c = input.at(position++);
            if (c == 'u') {
                point = hex4(position); position += 4;
                if (point >= 0xD800 && point <= 0xDBFF && end - position >= 6 &&
                    input.at(position) == '\\' && input.at(position + 1) == 'u') {
                    const uint32_t low = hex4(position + 2);
                    if (low >= 0xDC00 && low <= 0xDFFF) { point = 0x10000 + ((point - 0xD800) << 10) + low - 0xDC00; position += 6; }
                }
                return true;
            }
            switch (c) {
                case 'b': point = '\b'; break; case 'f': point = '\f'; break;
                case 'n': point = '\n'; break; case 'r': point = '\r'; break;
                case 't': point = '\t'; break; default: point = c; break;
            }
            return true;
        }
        point = c;
        if (c >= 0xC0) {
            unsigned tail = c < 0xE0 ? 1 : c < 0xF0 ? 2 : 3;
            point = c & (tail == 1 ? 0x1F : tail == 2 ? 0x0F : 7);
            while (tail-- && position < end) point = (point << 6) | (input.at(position++) & 0x3F);
        }
        return true;
    }
};

// Lexical checks run before ArduinoJson can overwrite duplicate keys. Re-reading earlier
// keys trades bounded extra I/O for constant RAM: no per-object key documents or strings.
class StrictJsonScanner {
    JsonInput& input;
    const size_t length;
    size_t position = 0;
    String& reason;
    static bool whitespace(char value) { return value == ' ' || value == '\t' || value == '\r' || value == '\n'; }
    int at(size_t offset) { return input.at(offset); }
    void skipSpace() { while (position < length && whitespace(at(position))) ++position; }
    bool fail(const char* message) { reason = message; return false; }
    bool consume(char value) {
        skipSpace();
        if (position >= length || at(position) != value) return false;
        ++position; return true;
    }
    bool stringToken() {
        if (position >= length || at(position++) != '"') return fail("Expected a JSON string");
        while (position < length) {
            const int next = at(position++);
            if (next < 0) return fail("Incomplete JSON read");
            if (next == '"') return true;
            if (next < 32) return fail("Unescaped control byte in JSON string");
            if (next != '\\') continue;
            if (position >= length) return fail("Incomplete JSON string escape");
            const char escape = at(position++);
            if (escape == 'u') {
                for (int digit = 0; digit < 4; ++digit)
                    if (position >= length || !isxdigit((unsigned char)at(position++))) return fail("Invalid JSON Unicode escape");
            } else if (escape != '"' && escape != '\\' && escape != '/' && escape != 'b' &&
                       escape != 'f' && escape != 'n' && escape != 'r' && escape != 't') {
                return fail("Invalid JSON string escape");
            }
        }
        return fail("Unterminated JSON string");
    }
    bool numberToken() {
        if (at(position) == '-') ++position;
        if (position >= length) return fail("Incomplete JSON number");
        if (at(position) == '0') ++position;
        else {
            if (at(position) < '1' || at(position) > '9') return fail("Invalid JSON number");
            while (position < length && at(position) >= '0' && at(position) <= '9') ++position;
        }
        if (position < length && at(position) == '.') {
            const size_t first = ++position;
            while (position < length && at(position) >= '0' && at(position) <= '9') ++position;
            if (position == first) return fail("Incomplete JSON fractional number");
        }
        if (position < length && (at(position) == 'e' || at(position) == 'E')) {
            ++position;
            if (position < length && (at(position) == '+' || at(position) == '-')) ++position;
            const size_t first = position;
            while (position < length && at(position) >= '0' && at(position) <= '9') ++position;
            if (position == first) return fail("Incomplete JSON exponent");
        }
        return true;
    }
    bool sameKey(size_t first, size_t firstEnd, size_t second, size_t secondEnd) {
        JsonKeyReader left(input, first, firstEnd), right(input, second, secondEnd);
        uint32_t a, b;
        while (true) {
            const bool hasA = left.next(a), hasB = right.next(b);
            if (!hasA || !hasB) return hasA == hasB;
            if (a != b) return false;
        }
    }
    bool uniqueKey(size_t objectStart, size_t keyStart, size_t keyEnd, unsigned depth) {
        const size_t resume = position;
        position = objectStart + 1;
        skipSpace();
        while (position < keyStart) {
            const size_t earlier = position;
            if (!stringToken()) { position = resume; return false; }
            if (sameKey(earlier, position, keyStart, keyEnd)) { position = resume; return fail("Duplicate JSON object key"); }
            if (!consume(':') || !value(depth, false) || !consume(',')) {
                position = resume; return fail("Invalid JSON object structure");
            }
            skipSpace();
        }
        position = resume;
        return true;
    }
    bool object(unsigned depth, bool checkDuplicates) {
        const size_t objectStart = position;
        ++position;
        if (consume('}')) return true;
        do {
            skipSpace();
            const size_t start = position;
            if (!stringToken()) return false;
            if (checkDuplicates && !uniqueKey(objectStart, start, position, depth)) return false;
            if (!consume(':')) return fail("Expected colon after JSON object key");
            if (!value(depth, checkDuplicates)) return false;
            if (consume('}')) return true;
        } while (consume(','));
        return fail("Expected comma or closing JSON object brace");
    }
    bool array(unsigned depth, bool checkDuplicates) {
        ++position;
        if (consume(']')) return true;
        do {
            if (!value(depth, checkDuplicates)) return false;
            if (consume(']')) return true;
        } while (consume(','));
        return fail("Expected comma or closing JSON array bracket");
    }
    bool value(unsigned depth, bool checkDuplicates) {
        skipSpace();
        if (position >= length) return fail("Incomplete JSON value");
        const char next = at(position);
        if (next == '{' || next == '[') {
            if (depth >= 10) return fail("JSON exceeds the supported nesting limit of 10");
            return next == '{' ? object(depth + 1, checkDuplicates) : array(depth + 1, checkDuplicates);
        }
        if (next == '"') return stringToken();
        if (next == '-' || (next >= '0' && next <= '9')) return numberToken();
        for (const char* literal : {"true", "false", "null"}) {
            const size_t count = strlen(literal);
            bool matches = length - position >= count;
            for (size_t i = 0; matches && i < count; ++i) matches = at(position + i) == literal[i];
            if (matches) { position += count; return true; }
        }
        return fail("Invalid JSON value");
    }
public:
    StrictJsonScanner(JsonInput& source, String& error) : input(source), length(source.length), reason(error) {}
    bool sectionOffset(const char* name, size_t& offset) {
        position = 0;
        if (!consume('{') || consume('}')) return false;
        do {
            skipSpace();
            const size_t start = position;
            if (!stringToken()) return false;
            JsonKeyReader key(input, start, position);
            size_t index = 0;
            uint32_t point;
            bool matches = true;
            while (key.next(point)) {
                if (!name[index] || point != (unsigned char)name[index]) matches = false;
                if (name[index]) ++index;
            }
            matches = matches && name[index] == '\0';
            if (!consume(':')) return false;
            skipSpace();
            if (matches) { offset = position; return input.good; }
            if (!value(1, false)) return false;
            if (consume('}')) return false;
        } while (consume(','));
        return false;
    }
    bool run() {
        if (!value(0, true)) return false;
        skipSpace();
        if (!input.good) return fail("Incomplete JSON read");
        return position == length || fail("Unexpected bytes after JSON value");
    }
};

bool parseDatabaseJson(const char* payload, size_t length, JsonDocument& doc, String& reason) {
    doc.clear(); reason = "";
    if (!payload || length == 0 || length > DATABASE_MAX_BYTES) {
        reason = "JSON body is empty or exceeds the supported size"; return false;
    }
    MemoryJsonInput input(payload, length);
    StrictJsonScanner scanner(input, reason);
    if (!scanner.run()) return false;
    const DeserializationError error = deserializeJson(doc, payload, length, DeserializationOption::NestingLimit(10));
    if (error || doc.overflowed()) {
        reason = String("Invalid JSON: ") + error.c_str(); doc.clear(); return false;
    }
    return true;
}

static void databaseFailure(const String& reason) {
    databaseReady = false;
    databaseWarning = reason;
    Serial.printf("Database: %s\r\n", reason.c_str());
}

void startLFS(){
    databaseReady = false;
    databaseMigrated = false;
    databaseWarning = "";
    validatedLive.valid = false;
    // A failed mount must never implicitly format saved operator records.
    if (!LittleFS.begin(false, DB_MOUNT)) {
        databaseStartup = "mount-failed";
        databaseFailure("LittleFS mount failed; saved records were not formatted");
        return;
    }
    databaseStartup = "mounted";
    JsonDocument startup;
    loadDatabase(startup);
}

// AI-modified (Codex): only absence or confirmed invalid contents permit automatic replacement.
// Arduino FS::exists() also returns false for open failures. Consult the mounted VFS for ENOENT.
enum class DatabaseRead { Valid, Missing, Invalid, Unavailable, Future };

static bool confirmedAbsent(const char* path) {
    char mountedPath[64];
    int count = snprintf(mountedPath, sizeof(mountedPath), "%s%s", DB_MOUNT, path);
    if (count < 0 || (size_t)count >= sizeof(mountedPath)) return false;
    struct stat entry;
    return stat(mountedPath, &entry) < 0 && errno == ENOENT;
}

static DatabaseRead readJsonFile(const char* path, JsonDocument& doc, String& reason,
                                 DatabaseFingerprint* fingerprint = nullptr) {
    doc.clear();
    if (fingerprint) fingerprint->valid = false;
    File readFile = LittleFS.open(path, "r");
    if (!readFile) {
        reason = "Database file is missing or cannot be opened";
        return confirmedAbsent(path) ? DatabaseRead::Missing : DatabaseRead::Unavailable;
    }
    if (readFile.size() == 0 || readFile.size() > DATABASE_MAX_BYTES) {
        reason = "Database file is empty or exceeds the supported size";
        return DatabaseRead::Invalid;
    }
    {
        FileJsonInput input(readFile);
        StrictJsonScanner scanner(input, reason);
        if (!scanner.run()) return input.good ? DatabaseRead::Invalid : DatabaseRead::Unavailable;
    }
    if (!readFile.seek(0)) { reason = "Cannot rewind database file"; return DatabaseRead::Unavailable; }
    DeserializationError error;
    bool complete = true;
    if (fingerprint) {
        HashingFileReader reader(readFile);
        error = deserializeJson(doc, reader, DeserializationOption::NestingLimit(10));
        complete = reader.finish(*fingerprint);
    } else {
        error = deserializeJson(doc, readFile, DeserializationOption::NestingLimit(10));
    }
    if (error || !complete || doc.overflowed()) {
        // The complete lexical scan above already succeeded. A failed second pass
        // does not establish corruption, including when ArduinoJson runs out of RAM.
        reason = String("Could not finish reading database: ") + error.c_str();
        doc.clear();
        return DatabaseRead::Unavailable;
    }
    return DatabaseRead::Valid;
}

bool parseDatabaseFile(const char* path, JsonDocument& doc, String& reason) {
    reason = "";
    return readJsonFile(path, doc, reason) == DatabaseRead::Valid;
}

static bool futureVersion(JsonDocument& doc) {
    JsonVariantConst version = doc["schemaVersion"];
    // Float/exponent spelling of a future version must not permit backup downgrade either.
    return version.is<double>() && version.as<double>() > DATABASE_SCHEMA_VERSION;
}

class ComparingJsonWriter {
    HashingFileReader& reader;
public:
    bool equal = true;
    explicit ComparingJsonWriter(HashingFileReader& source) : reader(source) {}
    size_t write(uint8_t byte) { if (reader.read() != byte) equal = false; return 1; }
    size_t write(const uint8_t* bytes, size_t count) { for (size_t i = 0; i < count; ++i) write(bytes[i]); return count; }
};

// Full byte-for-byte comparison against the already validated candidate proves JSON/schema
// validity too; it does not need to parse a second full document into RAM.
static bool writeVerified(const char* path, JsonDocument& doc, String& reason, DatabaseFingerprint* fingerprint = nullptr) {
    const size_t expected = measureJson(doc);
    File output = LittleFS.open(path, "w");
    if (!output) { reason = "Cannot open database temporary file for writing"; return false; }
    const size_t written = serializeJson(doc, output);
    output.flush();
    output.close();
    if (written != expected) {
        LittleFS.remove(path);
        reason = "Incomplete database write; live data was preserved";
        return false;
    }
    File input = LittleFS.open(path, "r");
    bool verified = false;
    DatabaseFingerprint readback;
    if (input && input.size() == expected) {
        HashingFileReader reader(input);
        ComparingJsonWriter compare(reader);
        verified = serializeJson(doc, compare) == expected && compare.equal && reader.finish(readback);
    }
    if (input) input.close();
    if (!verified) {
        LittleFS.remove(path);
        reason = "Database temporary-file verification failed; live data was preserved";
        return false;
    }
    if (fingerprint) *fingerprint = readback;
    return true;
}

static bool copyVerified(const char* from, const char* to, const DatabaseFingerprint& expected) {
    File source = LittleFS.open(from, "r");
    if (!source || source.size() != expected.bytes) { if (source) source.close(); return false; }
    File output = LittleFS.open(to, "w");
    if (!output) { source.close(); return false; }
    bool complete = true;
    DatabaseFingerprint copied;
    {
        HashingFileReader reader(source);
        char buffer[256];
        size_t count;
        while ((count = reader.readBytes(buffer, sizeof(buffer))) != 0)
            if (output.write((const uint8_t*)buffer, count) != count) { complete = false; break; }
        complete = complete && reader.finish(copied) && sameFingerprint(copied, expected);
    }
    source.close(); output.flush(); output.close();
    DatabaseFingerprint readback;
    complete = complete && fileFingerprint(to, readback) && sameFingerprint(readback, expected);
    if (!complete) LittleFS.remove(to);
    return complete;
}

static bool validateDatabaseImpl(JsonDocument& doc, String& reason, bool allowLegacy, bool& memoryFailure);

static DatabaseRead readStoredDatabase(const char* path, JsonDocument& doc, String& reason,
                                       DatabaseFingerprint& readback, bool& legacy) {
    DatabaseRead result = readJsonFile(path, doc, reason, &readback);
    if (result != DatabaseRead::Valid) return result;
    if (futureVersion(doc)) {
        reason = "Database schema is newer than this firmware; restore matching firmware";
        return DatabaseRead::Future;
    }
    legacy = doc["schemaVersion"].isUnbound() || doc["qualifications"].isUnbound();
    bool memoryFailure = false;
    if (validateDatabaseImpl(doc, reason, true, memoryFailure)) return DatabaseRead::Valid;
    return memoryFailure || doc.overflowed() ? DatabaseRead::Unavailable : DatabaseRead::Invalid;
}

bool loadDatabase(JsonDocument& doc) {
    if (databaseStartup == "mount-failed") { doc.clear(); return false; }
    String reason;
    DatabaseFingerprint readback;
    validatedLive.valid = false;
    for (const char* recovery : {DB_PATH, TMP_PATH, BACKUP_PATH}) {
        String recoveryReason;
        bool legacy = false;
        DatabaseRead result = readStoredDatabase(recovery, doc, recoveryReason, readback, legacy);
        if (result == DatabaseRead::Future || result == DatabaseRead::Unavailable) {
            databaseStartup = result == DatabaseRead::Future ? "unsupported-version" : "read-failed";
            databaseFailure(recoveryReason);
            doc.clear(); return false;
        }
        if (result != DatabaseRead::Valid) {
            if (recovery == DB_PATH) reason = recoveryReason;
            continue;
        }
        if (recovery == DB_PATH) {
            validatedLive = readback;
            databaseReady = true;
            if (legacy) {
                databaseMigrated = true;
                databaseStartup = "legacy-migrated-in-memory";
                databaseWarning = "Legacy metadata migrated in memory; export a backup before deployment";
            } else if (databaseStartup == "not-checked" || databaseStartup == "mounted" || databaseStartup == "read-failed") {
                databaseStartup = "ready";
                databaseWarning = "";
            }
            return true;
        }
        // Copy a backup through a verified temporary file; never consume the only backup.
        if (strcmp(recovery, BACKUP_PATH) == 0 && !writeVerified(TMP_PATH, doc, recoveryReason, &readback)) {
            databaseStartup = "recovery-failed"; databaseFailure(recoveryReason); doc.clear(); return false;
        }
        if (!LittleFS.rename(TMP_PATH, DB_PATH)) {
            databaseStartup = "recovery-failed";
            databaseFailure("Database recovery could not replace the live file; recoverable copies were retained");
            doc.clear(); return false;
        }
        validatedLive = readback;
        databaseReady = true;
        databaseMigrated = databaseMigrated || legacy;
        databaseStartup = strcmp(recovery, TMP_PATH) == 0 ? "recovered-temporary" : "recovered-backup";
        databaseWarning = "Database recovered after missing or invalid live data; export a backup";
        return true;
    }
    databaseStartup = "unavailable";
    databaseFailure(reason);
    doc.clear(); return false;
}

// A requested array/record can be parsed directly into its destination after the entire
// file matches a previously schema-validated SHA256. A changed file always gets a new full
// validation before this shortcut is used, so filtering cannot conceal a damaged section.
static bool openValidatedSection(File& file, const char* key) {
    for (unsigned attempt = 0; attempt < 2; ++attempt) {
        file = LittleFS.open(DB_PATH, "r");
        DatabaseFingerprint current;
        bool unchanged = false;
        if (file && file.size() <= DATABASE_MAX_BYTES) {
            HashingFileReader reader(file);
            unchanged = reader.finish(current) && sameFingerprint(current, validatedLive);
        }
        if (unchanged) {
            size_t offset = 0;
            String reason;
            bool found;
            { FileJsonInput input(file); StrictJsonScanner scanner(input, reason); found = scanner.sectionOffset(key, offset); }
            if (found && file.seek(offset)) return true;
        }
        if (file) file.close();
        if (attempt == 0) {
            // This temporary is released before the requested section is allocated.
            JsonDocument check;
            if (!loadDatabase(check)) return false;
        }
    }
    databaseFailure("Requested database section could not be read");
    return false;
}

static bool loadSectionRoot(JsonDocument& out, const char* key) {
    out.clear();
    File file;
    if (!openValidatedSection(file, key)) return false;
    const DeserializationError error = deserializeJson(out, file, DeserializationOption::NestingLimit(10));
    file.close();
    if (error || out.overflowed() || !out.is<JsonArray>()) {
        out.clear(); validatedLive.valid = false;
        databaseFailure("Database section read failed"); return false;
    }
    return true;
}

static int nonWhitespace(File& file) {
    int next;
    do { next = file.read(); } while (next == ' ' || next == '\r' || next == '\n' || next == '\t');
    return next;
}

static bool loadRecordRoot(JsonDocument& out, const char* section, const char* field, int number, const char* text = nullptr) {
    out.clear();
    File file;
    if (!openValidatedSection(file, section)) return false;
    if (nonWhitespace(file) != '[') { file.close(); return false; }
    int next;
    while ((next = nonWhitespace(file)) != ']') {
        if (next != '{' || !file.seek(file.position() - 1)) break;
        const DeserializationError error = deserializeJson(out, file, DeserializationOption::NestingLimit(10));
        if (error || out.overflowed()) break;
        JsonVariantConst value = out[field];
        if (text ? (value.is<const char*>() && strcmp(value.as<const char*>(), text) == 0)
                 : (value.is<int>() && value.as<int>() == number)) { file.close(); return true; }
        out.clear();
        next = nonWhitespace(file);
        if (next == ']') { file.close(); return false; }
        if (next != ',') break;
    }
    file.close(); out.clear();
    return false;
}

// AI-assisted (Claude): copies `src` into `out` so it becomes the root of `out`; false if src
// is null or `out` ran out of memory
static bool copyInto(JsonDocument& out, JsonVariantConst src) {
    out.clear();
    if (src.isNull()) return false;
    out.set(src);
    if (out.overflowed()) { out.clear(); return false; }
    return true;
}

//Helper function for writing new data
static bool saveDatabaseImpl(JsonDocument& doc, bool explicitRestore) {
    String reason;
    if (!validateDatabase(doc, reason)) { databaseWarning = reason; return false; }
    DatabaseFingerprint previousFingerprint;
    bool hasPrevious = fileFingerprint(DB_PATH, previousFingerprint) &&
        sameFingerprint(previousFingerprint, validatedLive);
    if (!hasPrevious) {
        if (!explicitRestore) {
            databaseWarning = "Database changed or could not be read since its validated load; reload before saving";
            return false;
        }
        // Release the previous document before writing. An unverified existing file
        // cannot be overwritten merely because reading it ran out of RAM or failed.
        JsonDocument previous;
        bool legacy = false;
        DatabaseRead result = readStoredDatabase(DB_PATH, previous, reason, previousFingerprint, legacy);
        if (result == DatabaseRead::Unavailable || result == DatabaseRead::Future) {
            databaseFailure(reason);
            return false;
        }
        hasPrevious = result == DatabaseRead::Valid;
    }
    DatabaseFingerprint candidateFingerprint;
    if (!writeVerified(TMP_PATH, doc, reason, &candidateFingerprint)) { databaseWarning = reason; return false; }
    if (hasPrevious) {
        if (!copyVerified(DB_PATH, BACKUP_TMP_PATH, previousFingerprint) ||
            !LittleFS.rename(BACKUP_TMP_PATH, BACKUP_PATH)) {
            // The candidate has not committed: do not let it be mistaken for a completed save.
            LittleFS.remove(TMP_PATH);
            databaseWarning = "Could not preserve the known-good backup; live data was retained";
            return false;
        }
    }
    if (!LittleFS.rename(TMP_PATH, DB_PATH)) {
        databaseWarning = "Database replacement failed; live and recovery copies were retained";
        return false;
    }
    validatedLive = candidateFingerprint;
    databaseReady = true;
    if (databaseStartup == "unavailable" || databaseStartup == "not-checked") databaseStartup = "ready";
    return true;
}

bool saveDatabase(JsonDocument& doc) { return saveDatabaseImpl(doc, false); }

bool restoreDatabase(JsonDocument& doc, String& reason) {
    if (!validateDatabase(doc, reason)) return false;
    if (!saveDatabaseImpl(doc, true)) { reason = databaseWarning; return false; }
    reason = ""; return true;
}

bool getDatabaseBackup(JsonDocument& out) { return loadDatabase(out); }

void getDatabaseDiagnostics(JsonDocument& out) {
    out.clear();
    // Startup and every database operation maintain these fields; polling does not allocate
    // or parse a full database. Explicit reads/restores retry any failed recovery.
    out["schemaVersion"] = DATABASE_SCHEMA_VERSION;
    out["ready"] = databaseReady;
    out["startupStatus"] = databaseStartup;
    out["migrated"] = databaseMigrated;
    out["warning"] = databaseWarning;
}

// ---- AI-assisted (Claude): lookup and validation helpers ----------------------------------

//Returns the index of the element whose [key] == value, or -1 (targets.id, Officers.BadgeNum)
static int findIndex(JsonArrayConst arr, const char* key, int value) {
    for (size_t i = 0; i < arr.size(); i++) {
        JsonVariantConst field = arr[i][key];
        if (field.is<int>() && field.as<int>() == value) return (int)i;
    }
    return -1;
}

//Returns the index of the element whose [key] == value, or -1 (drills.drillName)
static int findIndex(JsonArrayConst arr, const char* key, const char* value) {
    if (!value) return -1;
    for (size_t i = 0; i < arr.size(); i++) {
        const char* field = arr[i][key];
        if (field && strcmp(field, value) == 0) return (int)i;
    }
    return -1;
}

// AI-modified (Codex): actual Gregorian calendar dates, not merely a formatted string.
static int daysInMonth(int year, int month) {
    static const int days[] = {31,28,31,30,31,30,31,31,30,31,30,31};
    if (month < 1 || month > 12) return 0;
    const bool leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    return days[month - 1] + (month == 2 && leap ? 1 : 0);
}

bool isDateString(const char* date) {
    if (!date || strlen(date) != 10 || date[4] != '-' || date[7] != '-') return false;
    for (int i = 0; i < 10; i++) {
        if (i != 4 && i != 7 && !isdigit((unsigned char)date[i])) return false;
    }
    const int year = atoi(date), month = atoi(date + 5), day = atoi(date + 8);
    return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

// AI-modified (Claude): "yield" is the new name for "pause" (still accepted for older drills)
static bool isBasicAction(const char* action) {
    if (!action) return false;
    return strcmp(action, "present") == 0 || strcmp(action, "hide") == 0 ||
           strcmp(action, "yield") == 0 || strcmp(action, "pause") == 0 || strcmp(action, "delay") == 0;
}

//Checks every step of a sequence for drill `drillName`: action must be present/hide/pause/delay
//(delay needs a positive timeMs) or another existing drill. The complete candidate graph is
// checked once by validateDatabase before any save, including changes to ancestors' depth.
static bool validateSequence(JsonArrayConst drills, const char* drillName, JsonArrayConst sequence) {
    if (sequence.isNull() || sequence.size() == 0) {
        Serial.printf("Drill %s has an empty sequence\r\n", drillName);
        return false;
    }

    size_t expectedStep = 1;
    for (JsonVariantConst v : sequence) {
        JsonObjectConst step = v.as<JsonObjectConst>();
        const char* action = step["action"];
        if (step.isNull() || !action || !*action || step["action"].as<JsonString>().size() != strlen(action) || !step["step"].is<int>() ||
            step["step"].as<int>() != (int)expectedStep++) {
            Serial.printf("Drill %s has a step with no action\r\n", drillName);
            return false;
        }

        // AI-generated (Codex): match the runner's actual targets/random data fields.
        const bool hasTargets = !step["targets"].isUnbound();
        const bool hasRandom = !step["random"].isUnbound();
        if (!step["targetMode"].isUnbound() || !step["targetIds"].isUnbound() ||
            !step["randomCount"].isUnbound()) return false;
        if (hasTargets) {
            if ((strcmp(action, "present") != 0 && strcmp(action, "hide") != 0) ||
                !step["targets"].is<JsonArrayConst>() || step["targets"].size() == 0 || hasRandom) return false;
            bool seen[NUM_TARGETS + 1] = {};
            for (JsonVariantConst target : step["targets"].as<JsonArrayConst>()) {
                if (!target.is<int>()) return false;
                const int id = target.as<int>();
                if (id < 1 || id > NUM_TARGETS || seen[id]) return false;
                seen[id] = true;
            }
        }
        if (hasRandom && (strcmp(action, "present") != 0 || !step["random"].is<int>() ||
            step["random"].as<int>() < 1 || step["random"].as<int>() > NUM_TARGETS)) return false;

        if (strcmp(action, "delay") == 0) {
            if (!step["timeMs"].is<int>() || step["timeMs"].as<int>() <= 0) {
                Serial.printf("Drill %s has a delay step without a positive timeMs\r\n", drillName);
                return false;
            }
        } else if (!isBasicAction(action)) {
            //Not a basic action, so it must name another drill (composite "Full Drill" entry)
            if (strcmp(action, drillName) == 0 || findIndex(drills, "drillName", action) < 0) {
                Serial.printf("Drill %s: unknown action or drill '%s'\r\n", drillName, action);
                return false;
            }
        }
    }
    return true;
}

// AI-assisted (Claude): public wrapper so the API can report a reserved name before saving anything
bool isReservedDrillName(const char* drillName) {
    return drillName && isBasicAction(drillName);
}

// AI-assisted (Claude): a new drill name must be non-empty, unused, and not a basic action --
// a drill named "delay" would be read as a delay step wherever another drill includes it
static bool isValidDrillName(JsonArrayConst drills, const char* drillName) {
    if (!validText(drillName, (size_t)-1)) {
        Serial.println("Drill name is empty");
        return false;
    }
    if (isBasicAction(drillName)) {
        Serial.printf("Drill name %s is reserved for a step action\r\n", drillName);
        return false;
    }
    if (findIndex(drills, "drillName", drillName) >= 0) {
        Serial.printf("Drill %s already exists\r\n", drillName);
        return false;
    }
    return true;
}

// AI-generated (Codex): shared validation for load, restore, recovery and every save.
static bool validText(const char* value, size_t maximum) {
    if (!value || !*value || strlen(value) > maximum) return false;
    bool visible = false;
    for (const unsigned char* p = (const unsigned char*)value; *p; ++p) {
        if (*p < 32 || *p == 127) return false;
        if (!isspace(*p)) visible = true;
    }
    return visible;
}

static bool validationError(String& reason, const char* message) { reason = message; return false; }

static bool validTextField(JsonVariantConst field, size_t maximum) {
    if (!field.is<const char*>()) return false;
    const JsonString value = field.as<JsonString>();
    return value.size() == strlen(value.c_str()) && validText(value.c_str(), maximum);
}

static bool validScores(JsonVariantConst value) {
    if (value.isUnbound()) return true; // Optional histories in older saved officer records.
    if (!value.is<JsonArrayConst>()) return false;
    for (JsonVariantConst item : value.as<JsonArrayConst>()) {
        if (!item.is<JsonArrayConst>() || item.size() != 2 || !item[0].is<int>() ||
            item[0].as<int>() < 0 || !item[1].is<const char*>() || item[1].as<JsonString>().size() != 10 || !isDateString(item[1])) return false;
    }
    return true;
}

static bool catalogHas(JsonArrayConst names, const char* name, bool exact = false) {
    if (!name) return false;
    for (const char* registered : names) {
        if (exact ? strcmp(registered, name) == 0 : strcasecmp(registered, name) == 0) return true;
    }
    return false;
}

static bool graphWithinLimit(JsonArrayConst drills, int index, uint8_t* state, uint8_t* height, unsigned depth) {
    // The runner's root starts at depth 1 and supports at most four drill levels.
    if (depth > 4) return false;
    if (state[index] == 1) return false;
    if (state[index] == 2) return depth + height[index] - 1 <= 4;
    state[index] = 1;
    height[index] = 1;
    for (JsonObjectConst step : drills[index]["sequence"].as<JsonArrayConst>()) {
        const char* action = step["action"];
        if (isBasicAction(action)) continue;
        const int next = findIndex(drills, "drillName", action);
        if (next < 0 || !graphWithinLimit(drills, next, state, height, depth + 1)) return false;
        if (height[next] + 1 > height[index]) height[index] = height[next] + 1;
    }
    state[index] = 2;
    return true;
}

static bool validateDatabaseImpl(JsonDocument& doc, String& reason, bool allowLegacy, bool& memoryFailure) {
    reason = "";
    if (doc.overflowed() || !doc.is<JsonObject>()) return validationError(reason, "Database root must be an object");
    if (measureJson(doc) > DATABASE_MAX_BYTES) return validationError(reason, "Database exceeds the supported size");
    if (doc["schemaVersion"].isUnbound()) {
        if (!allowLegacy) return validationError(reason, "Database schemaVersion is required");
        doc["schemaVersion"] = DATABASE_SCHEMA_VERSION;
    }
    if (!doc["schemaVersion"].is<int>() || doc["schemaVersion"].as<int>() != DATABASE_SCHEMA_VERSION)
        return validationError(reason, "Unsupported database schemaVersion");
    if (!doc["Officers"].is<JsonArray>() || !doc["drills"].is<JsonArray>() || !doc["targets"].is<JsonArray>())
        return validationError(reason, "Database requires Officers, drills and targets arrays");
    if (doc["qualifications"].isUnbound()) {
        if (!allowLegacy) return validationError(reason, "Database qualifications catalog is required");
        qualificationNames(doc);
    }
    if (!doc["qualifications"].is<JsonArray>()) return validationError(reason, "Qualifications must be an array");
    JsonArrayConst names = doc["qualifications"];
    for (size_t i = 0; i < names.size(); ++i) {
        const char* name = names[i].as<const char*>();
        if (!validTextField(names[i], 32)) return validationError(reason, "Invalid qualification name");
        for (size_t j = 0; j < i; ++j) if (strcasecmp(name, names[j].as<const char*>()) == 0)
            return validationError(reason, "Duplicate qualification name");
    }
    for (const char* builtin : {"Pistol", "Rifle", "SWAT"}) if (!catalogHas(names, builtin, true))
        return validationError(reason, "Built-in qualification names Pistol, Rifle and SWAT are required");

    JsonArrayConst targets = doc["targets"];
    if (targets.size() != NUM_TARGETS) return validationError(reason, "Database requires exactly 20 targets");
    bool seen[NUM_TARGETS + 1] = {};
    for (JsonVariantConst value : targets) {
        if (!value.is<JsonObjectConst>() || !value["id"].is<int>() || !value["working"].is<bool>())
            return validationError(reason, "Target requires an integer id and boolean working flag");
        const int id = value["id"].as<int>();
        if (id < 1 || id > NUM_TARGETS || seen[id]) return validationError(reason, "Duplicate or invalid target id");
        seen[id] = true;
    }

    JsonArrayConst officers = doc["Officers"];
    for (size_t i = 0; i < officers.size(); ++i) {
        JsonObjectConst officer = officers[i].as<JsonObjectConst>();
        if (officer.isNull() || !officer["BadgeNum"].is<int>() || officer["BadgeNum"].as<int>() <= 0 ||
            !validTextField(officer["Name"], 64))
            return validationError(reason, "Officer requires a positive badge and a name of at most 64 bytes");
        for (size_t j = 0; j < i; ++j) if (officer["BadgeNum"].as<int>() == officers[j]["BadgeNum"].as<int>())
            return validationError(reason, "Duplicate officer badge");
        for (const char* field : {"pistolQualScores", "rifleQualScores", "swatQualScores"})
            if (!validScores(officer[field])) return validationError(reason, "Invalid built-in qualification score history");
        JsonVariantConst custom = officer["qualificationScores"];
        if (!custom.isUnbound()) {
            if (!custom.is<JsonObjectConst>()) return validationError(reason, "qualificationScores must be an object");
            for (JsonPairConst history : custom.as<JsonObjectConst>()) {
                const char* name = history.key().c_str();
                if (!catalogHas(names, name, true) || strcasecmp(name, "Pistol") == 0 ||
                    strcasecmp(name, "Rifle") == 0 || strcasecmp(name, "SWAT") == 0 ||
                    !validScores(history.value())) return validationError(reason, "Invalid or ambiguous custom score history");
            }
        }
    }

    JsonArrayConst drills = doc["drills"];
    // Memoized subtree heights prevent repeatedly expanding shared subdrills during validation.
    std::unique_ptr<uint8_t[]> state(new(std::nothrow) uint8_t[drills.size() + 1]());
    std::unique_ptr<uint8_t[]> height(new(std::nothrow) uint8_t[drills.size() + 1]());
    if (!state || !height) {
        memoryFailure = true;
        return validationError(reason, "Insufficient memory to validate drill graph");
    }
    for (size_t i = 0; i < drills.size(); ++i) {
        JsonObjectConst drill = drills[i].as<JsonObjectConst>();
        const char* name = drill["drillName"];
        if (drill.isNull() || !validTextField(drill["drillName"], (size_t)-1) || isBasicAction(name))
            return validationError(reason, "Invalid or reserved drill name");
        for (size_t j = 0; j < i; ++j) if (strcmp(name, drills[j]["drillName"].as<const char*>()) == 0)
            return validationError(reason, "Duplicate drill name");
        if (!drill["description"].isUnbound() && !drill["description"].is<const char*>())
            return validationError(reason, "Drill description must be a string");
        if (!drill["builtIn"].isUnbound() && !drill["builtIn"].is<bool>())
            return validationError(reason, "Drill builtIn must be boolean");
        JsonVariantConst tags = drill["qualifications"];
        if (!tags.isUnbound()) {
            if (!tags.is<JsonArrayConst>()) return validationError(reason, "Drill qualifications must be an array");
            for (size_t q = 0; q < tags.size(); ++q) {
                const char* tag = tags[q].as<const char*>();
                if (!tags[q].is<const char*>() || !catalogHas(names, tag)) return validationError(reason, "Unknown drill qualification");
                for (size_t p = 0; p < q; ++p) if (strcasecmp(tag, tags[p].as<const char*>()) == 0)
                    return validationError(reason, "Duplicate drill qualification assignment");
            }
        }
        if (!drill["sequence"].is<JsonArrayConst>() || !validateSequence(drills, name, drill["sequence"].as<JsonArrayConst>()))
            return validationError(reason, "Drill sequence has invalid steps, actions, targets or references");
        if (!graphWithinLimit(drills, (int)i, state.get(), height.get(), 1)) return validationError(reason, "Drill graph contains a cycle or exceeds depth 4");
    }
    if (doc.overflowed() || measureJson(doc) > DATABASE_MAX_BYTES) return validationError(reason, "Database exceeds supported capacity");
    return true;
}

bool validateDatabase(JsonDocument& doc, String& reason, bool allowLegacy) {
    bool memoryFailure = false;
    return validateDatabaseImpl(doc, reason, allowLegacy, memoryFailure);
}

// ---- Targets -------------------------------------------------------------------------------

// AI-modified (Claude): targets are an array of { id, working }
void readTargets() {
    JsonDocument doc;
    if (!loadDatabase(doc)) return;

    JsonArray targets = doc["targets"];
    if (targets.isNull()) {
        Serial.println("No targets found");
        return;
    }

    for (JsonObject t : targets) {
        int id = t["id"];
        bool working = t["working"] | false;
        Serial.printf("Target %d | Working: %s\r\n", id, working ? "yes" : "no");
    }
}

// Getter for targets
bool getTargets(JsonDocument& out) {
    return loadSectionRoot(out, "targets");
}

// AI-modified (Claude): the range has a fixed set of NUM_TARGETS, so only ids 1..NUM_TARGETS
// that aren't already present can be added
bool addTarget(int id, bool working) {
    if (id < 1 || id > NUM_TARGETS) {
        Serial.printf("Target id %d out of range 1..%d\r\n", id, NUM_TARGETS);
        return false;
    }

    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray targets = doc["targets"];
    //Check if targets exist, if not create an array to hold targets
    if (targets.isNull()) {
        targets = doc["targets"].to<JsonArray>();
    }

    //Check if a target already has this ID, if so return to prevent an overwrite
    if (findIndex(targets, "id", id) >= 0) {
        Serial.printf("Target %d already exists\r\n", id);
        return false;
    }

    JsonObject target = targets.add<JsonObject>();
    target["id"] = id;
    target["working"] = working;

    return saveDatabase(doc);
}

// AI-modified (Claude): this is how a broken target gets marked out of service
bool editTarget(int id, bool working) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray targets = doc["targets"];
    int i = findIndex(targets, "id", id);
    if (i < 0) {
        Serial.printf("No target found: %d\r\n", id);
        return false;
    }

    targets[i]["working"] = working;
    return saveDatabase(doc);
}

// AI-modified (Claude): the hardware always has NUM_TARGETS, so "deleting" a target marks it
// working=false instead of removing its entry
bool deleteTarget(int id) {
    return editTarget(id, false);
}

// ---- Officers ------------------------------------------------------------------------------

// ---- AI-assisted (Claude): qualification stats ---------------------------------------------

//Writes { attempts, average, top } for the scores in a [[score, "YYYY-MM-DD"], ...] list dated
//from cutoff (a year ago) through today (both "YYYY-MM-DD", so plain string comparison orders them). The
//average is rounded to one decimal place; average and top are null when attempts is 0.
static void writeStats(JsonObject dest, JsonArrayConst scores, const char* cutoff, const char* today) {
    int64_t sum = 0; // AI-modified (Codex): raw-point histories can exceed a 32-bit sum.
    int count = 0;
    int top = 0;
    for (JsonArrayConst entry : scores) {
        const char* date = entry[1];
        if (!entry[0].is<int>() || !date) continue;
        if (strcmp(date, cutoff) < 0 || strcmp(date, today) > 0) continue;
        int score = entry[0].as<int>();
        if (count == 0 || score > top) top = score;
        sum += score;
        count++;
    }
    dest["attempts"] = count;
    if (count == 0) {
        dest["average"] = nullptr;
        dest["top"] = nullptr;
        return;
    }
    dest["average"] = round((double)sum / count * 10.0) / 10.0;
    dest["top"] = top;
}

//Adds pistolStats / rifleStats / swatStats to an officer object, from its own score lists
static void addStats(JsonObject officer, const char* cutoff, const char* today) {
    writeStats(officer["pistolStats"].to<JsonObject>(), officer["pistolQualScores"], cutoff, today);
    writeStats(officer["rifleStats"].to<JsonObject>(), officer["rifleQualScores"], cutoff, today);
    writeStats(officer["swatStats"].to<JsonObject>(), officer["swatQualScores"], cutoff, today);
    JsonObject customStats = officer["qualificationStats"].to<JsonObject>();
    for (JsonPair history : officer["qualificationScores"].as<JsonObject>()) {
        writeStats(customStats[history.key().c_str()].to<JsonObject>(), history.value().as<JsonArrayConst>(), cutoff, today);
    }
}

//Validates today and writes the date one year earlier ("YYYY-MM-DD") into cutoff[11].
// AI-modified (Codex): February 29 clamps to February 28 in a non-leap prior year.
static bool makeCutoff(const char* today, char* cutoff) {
    if (!isDateString(today)) {
        Serial.printf("Date must be YYYY-MM-DD: %s\r\n", today ? today : "(null)");
        return false;
    }
    const int year = atoi(today) - 1, month = atoi(today + 5), day = atoi(today + 8);
    if (year < 1) { strcpy(cutoff, "0001-01-01"); return true; }
    snprintf(cutoff, 11, "%04d-%02d-%02d", year, month, day > daysInMonth(year, month) ? daysInMonth(year, month) : day);
    return true;
}

// AI-modified (Claude): getters also return each officer's 12-month qualification stats
// Getter for officers (all of them)
bool getOfficers(const char* today, JsonDocument& out) {
    out.clear();
    char cutoff[11];
    if (!makeCutoff(today, cutoff)) return false;

    if (!loadSectionRoot(out, "Officers")) return false;
    for (JsonObject officer : out.as<JsonArray>()) {
        addStats(officer, cutoff, today);
    }
    if (out.overflowed()) { out.clear(); return false; }
    return true;
}

// Getter for officer (just one)
bool getOfficer(int badgeNum, const char* today, JsonDocument& out) {
    out.clear();
    char cutoff[11];
    if (!makeCutoff(today, cutoff)) return false;

    if (!loadRecordRoot(out, "Officers", "BadgeNum", badgeNum)) return false;
    addStats(out.as<JsonObject>(), cutoff, today);
    if (out.overflowed()) { out.clear(); return false; }
    return true;
}

// AI-modified (Claude): officers are identified by BadgeNum and start with empty score lists
bool addOfficer(int badgeNum, const char* name) {
    // AI-generated (Codex): persistence also defends callers that do not use the HTTP API.
    if (badgeNum <= 0 || !validText(name, 64)) return false;
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray officers = doc["Officers"];
    if (officers.isNull()) {
        officers = doc["Officers"].to<JsonArray>();
    }

    if (findIndex(officers, "BadgeNum", badgeNum) >= 0) {
        Serial.printf("Officer with badge %d already exists\r\n", badgeNum);
        return false;
    }

    JsonObject officer = officers.add<JsonObject>();
    officer["Name"] = name;
    officer["BadgeNum"] = badgeNum;
    officer["pistolQualScores"].to<JsonArray>();
    officer["rifleQualScores"].to<JsonArray>();
    officer["swatQualScores"].to<JsonArray>();

    return saveDatabase(doc);
}

// AI-modified (Claude): scores are edited separately with addQualScore(). Also changes the badge
// number (the officer's scores move with them); a badge another officer has is refused.
OfficerEditResult editOfficer(int badgeNum, const char* name, int newBadgeNum) {
    if (badgeNum <= 0 || newBadgeNum < 0 || (name && !validText(name, 64))) return OfficerEditResult::SaveFailed;
    JsonDocument doc;
    if (!loadDatabase(doc)) return OfficerEditResult::SaveFailed;

    JsonArray officers = doc["Officers"];
    int i = findIndex(officers, "BadgeNum", badgeNum);
    if (i < 0) {
        Serial.printf("No officer found with badge %d\r\n", badgeNum);
        return OfficerEditResult::NotFound;
    }
    if (newBadgeNum > 0 && newBadgeNum != badgeNum) {
        if (findIndex(officers, "BadgeNum", newBadgeNum) >= 0) {
            Serial.printf("Officer with badge %d already exists\r\n", newBadgeNum);
            return OfficerEditResult::BadgeTaken;
        }
        officers[i]["BadgeNum"] = newBadgeNum;
    }

    if (name) officers[i]["Name"] = name;
    return saveDatabase(doc) ? OfficerEditResult::Saved : OfficerEditResult::SaveFailed;
}

// AI-modified (Codex): scores remain newest-first without cloning the complete history.
bool addQualScore(int badgeNum, const char* qualType, int score, const char* date) {
    if (badgeNum <= 0 || score < 0 || !qualType || !*qualType) return false;
    //Expect "YYYY-MM-DD"
    if (!isDateString(date)) {
        Serial.printf("Date must be YYYY-MM-DD: %s\r\n", date ? date : "(null)");
        return false;
    }

    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    String registeredName;
    for (const char* name : qualificationNames(doc)) {
        if (String(name).equalsIgnoreCase(qualType)) registeredName = name;
    }
    if (registeredName.isEmpty()) return false;

    JsonArray officers = doc["Officers"];
    int i = findIndex(officers, "BadgeNum", badgeNum);
    if (i < 0) {
        Serial.printf("No officer found with badge %d\r\n", badgeNum);
        return false;
    }

    // Preserve existing built-in fields. Custom histories use the catalog's exact saved names.
    String normalized = registeredName;
    normalized.toLowerCase();
    const bool legacy = normalized == "pistol" || normalized == "rifle" || normalized == "swat";
    JsonObject histories = officers[i].as<JsonObject>();
    String key = normalized + "QualScores";
    if (!legacy) {
        histories = officers[i]["qualificationScores"].is<JsonObject>()
            ? officers[i]["qualificationScores"].as<JsonObject>()
            : officers[i]["qualificationScores"].to<JsonObject>();
        key = registeredName;
    }
    // Shift from the tail so only one tuple is copied at a time, rather than cloning history.
    JsonArray scores = histories[key].is<JsonArray>() ? histories[key].as<JsonArray>() : histories[key].to<JsonArray>();
    const size_t previousCount = scores.size();
    scores.add(nullptr);
    if (doc.overflowed()) return false;
    for (size_t position = previousCount; position > 0; --position) {
        scores[position].set(scores[position - 1]);
        if (doc.overflowed()) return false;
    }
    JsonArray entry = scores[0].to<JsonArray>();
    entry.add(score);
    entry.add(date);

    return saveDatabase(doc);
}

// AI-modified (Claude)
bool deleteOfficer(int badgeNum) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray officers = doc["Officers"];
    int i = findIndex(officers, "BadgeNum", badgeNum);
    if (i < 0) {
        Serial.printf("No officer found with badge %d\r\n", badgeNum);
        return false;
    }

    officers.remove(i);
    return saveDatabase(doc);
}

// ---- Drills --------------------------------------------------------------------------------

// Older databases receive the same built-in qualification names without a migration upload.
static JsonArray qualificationNames(JsonDocument& doc) {
    if (!doc["qualifications"].is<JsonArray>()) {
        JsonArray names = doc["qualifications"].to<JsonArray>();
        names.add("Pistol");
        names.add("Rifle");
        names.add("SWAT");
    }
    return doc["qualifications"].as<JsonArray>();
}

bool getQualifications(JsonDocument& out) {
    out.clear();
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;
    return copyInto(out, qualificationNames(doc));
}

bool addQualification(const char* name) {
    String trimmed = name ? name : "";
    trimmed.trim();
    if (trimmed.isEmpty() || trimmed.length() > 32) return false;
    for (char c : trimmed) if (static_cast<unsigned char>(c) < 32) return false;
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;
    JsonArray names = qualificationNames(doc);
    for (const char* existing : names) if (trimmed.equalsIgnoreCase(existing)) return false;
    names.add(trimmed);
    return saveDatabase(doc);
}

// AI-generated (Claude): delete a custom qualification (see database.h)
QualificationDeleteResult deleteQualification(const char* name, int& scoreCount) {
    scoreCount = 0;
    String target = name ? name : "";
    target.trim();
    for (const char* builtIn : {"Pistol", "Rifle", "SWAT"}) {
        if (target.equalsIgnoreCase(builtIn)) return QualificationDeleteResult::BuiltIn;
    }
    JsonDocument doc;
    if (!loadDatabase(doc)) return QualificationDeleteResult::SaveFailed;
    JsonArray names = qualificationNames(doc);
    int index = -1;
    for (size_t i = 0; i < names.size(); i++) {
        if (target.equalsIgnoreCase(names[i].as<const char*>())) index = (int)i;
    }
    if (index < 0) return QualificationDeleteResult::NotFound;

    // Scores recorded under it (custom histories are keyed by name in qualificationScores)
    for (JsonObject officer : doc["Officers"].as<JsonArray>()) {
        for (JsonPair history : officer["qualificationScores"].as<JsonObject>()) {
            if (target.equalsIgnoreCase(history.key().c_str())) {
                scoreCount += history.value().as<JsonArray>().size();
            }
        }
    }
    if (scoreCount > 0) return QualificationDeleteResult::HasScores;

    names.remove(index);
    // Untag drills; a drill left with no qualification simply has none
    for (JsonObject drill : doc["drills"].as<JsonArray>()) {
        JsonArray tags = drill["qualifications"].as<JsonArray>();
        for (int i = (int)tags.size() - 1; i >= 0; i--) {
            if (target.equalsIgnoreCase(tags[i].as<const char*>())) tags.remove(i);
        }
    }
    // Drop empty histories so re-adding the same name starts clean
    for (JsonObject officer : doc["Officers"].as<JsonArray>()) {
        JsonObject histories = officer["qualificationScores"].as<JsonObject>();
        String key;
        for (JsonPair history : histories) {
            if (target.equalsIgnoreCase(history.key().c_str())) key = history.key().c_str();
        }
        if (key.length()) histories.remove(key);
    }
    return saveDatabase(doc) ? QualificationDeleteResult::Deleted : QualificationDeleteResult::SaveFailed;
}

static bool validQualifications(JsonDocument& doc, JsonArrayConst selected) {
    if (selected.isNull()) return true;
    JsonArray names = qualificationNames(doc);
    if (selected.size() > names.size()) return false;
    for (JsonVariantConst value : selected) {
        if (!value.is<const char*>()) return false;
        bool found = false;
        for (const char* name : names) if (String(name).equalsIgnoreCase(value.as<const char*>())) found = true;
        if (!found) return false;
    }
    return true;
}

// Getter for drills (all of them)
bool getDrills(JsonDocument& out) {
    return loadSectionRoot(out, "drills");
}

// Getter for drill (just one, not expanded)
bool getDrill(const char* drillName, JsonDocument& out) {
    if (!drillName) { out.clear(); return false; }
    return loadRecordRoot(out, "drills", "drillName", 0, drillName);
}

// AI-modified (Claude): drills are just "drillName" + a validated "sequence"
// AI-modified (Claude): optional description
bool addDrill(const char* drillName, JsonArrayConst sequence, JsonArrayConst qualifications, const char* description) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray drills = doc["drills"];
    if (drills.isNull()) {
        drills = doc["drills"].to<JsonArray>();
    }

    if (!isValidDrillName(drills, drillName)) return false;
    if (!validateSequence(drills, drillName, sequence)) return false;
    if (!validQualifications(doc, qualifications)) return false;

    JsonObject drill = drills.add<JsonObject>();
    drill["drillName"] = drillName;
    drill["sequence"] = sequence;
    if (!qualifications.isNull()) drill["qualifications"] = qualifications;
    if (description && *description) drill["description"] = description;

    return saveDatabase(doc);
}

// AI-modified (Claude): replaces the sequence only (see renameDrill for the name), so Full Drills
// that reference this drill by name stay valid
// AI-modified (Claude): optional description (nullptr = unchanged, "" = remove)
bool editDrill(const char* drillName, JsonArrayConst newSequence, JsonArrayConst qualifications, const char* description) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray drills = doc["drills"];
    int i = findIndex(drills, "drillName", drillName);
    if (i < 0) {
        Serial.printf("No drill found: %s\r\n", drillName);
        return false;
    }
    if (!validateSequence(drills, drillName, newSequence)) return false;
    if (!validQualifications(doc, qualifications)) return false;

    drills[i]["sequence"] = newSequence;
    if (!qualifications.isNull()) drills[i]["qualifications"] = qualifications;
    if (description) {
        if (*description) drills[i]["description"] = description;
        else drills[i].remove("description");
    }
    return saveDatabase(doc);
}

// AI-generated (Codex): no intermediate rename/edit is persisted, including on an I/O failure.
bool editDrillTransaction(const char* oldName, const char* newName, JsonArrayConst sequence,
                          JsonArrayConst qualifications, const char* description, String& reason) {
    reason = "";
    JsonDocument doc;
    if (!loadDatabase(doc)) { reason = databaseWarning; return false; }
    JsonArray drills = doc["drills"];
    const int index = findIndex(drills, "drillName", oldName);
    if (index < 0) return validationError(reason, "Drill not found");
    const char* finalName = newName ? newName : oldName;
    if (!validText(finalName, (size_t)-1) || isBasicAction(finalName)) return validationError(reason, "Invalid or reserved drill name");
    const int taken = findIndex(drills, "drillName", finalName);
    if (taken >= 0 && taken != index) return validationError(reason, "A drill with that name already exists");
    if (!sequence.isNull()) drills[index]["sequence"] = sequence;
    if (!qualifications.isNull()) drills[index]["qualifications"] = qualifications;
    if (description) {
        if (*description) drills[index]["description"] = description;
        else drills[index].remove("description");
    }
    if (strcmp(finalName, oldName) != 0) {
        for (JsonObject drill : drills) for (JsonObject step : drill["sequence"].as<JsonArray>()) {
            const char* action = step["action"];
            if (action && strcmp(action, oldName) == 0) step["action"] = finalName;
        }
        drills[index]["drillName"] = finalName;
    }
    if (!validateDatabase(doc, reason)) return false;
    if (!saveDatabase(doc)) { reason = databaseWarning; return false; }
    return true;
}

// AI-assisted (Claude): renames a drill and every step that includes it, in one save, so Full
// Drills that reference it stay valid
bool renameDrill(const char* oldName, const char* newName) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray drills = doc["drills"];
    int i = findIndex(drills, "drillName", oldName);
    if (i < 0) {
        Serial.printf("No drill found: %s\r\n", oldName);
        return false;
    }
    if (!isValidDrillName(drills, newName)) return false;

    // Update references first: comparing against drills[i]["drillName"] would change under us
    for (JsonObject drill : drills) {
        for (JsonObject step : drill["sequence"].as<JsonArray>()) {
            const char* action = step["action"];
            if (action && strcmp(action, oldName) == 0) step["action"] = newName;
        }
    }
    drills[i]["drillName"] = newName;

    return saveDatabase(doc);
}

// AI-modified (Claude): refuses while another drill still includes this one as a step
bool deleteDrill(const char* drillName) {
    JsonDocument doc;
    if (!loadDatabase(doc)) return false;

    JsonArray drills = doc["drills"];
    int i = findIndex(drills, "drillName", drillName);
    if (i < 0) {
        Serial.printf("No drill found: %s\r\n", drillName);
        return false;
    }

    for (JsonObjectConst drill : drills) {
        for (JsonObjectConst step : drill["sequence"].as<JsonArrayConst>()) {
            const char* action = step["action"];
            if (action && strcmp(action, drillName) == 0) {
                Serial.printf("Drill %s is still used by %s\r\n", drillName, (const char*)drill["drillName"]);
                return false;
            }
        }
    }

    drills.remove(i);
    return saveDatabase(doc);
}
