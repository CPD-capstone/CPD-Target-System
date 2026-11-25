// AI-generated (Codex): software-only regression tests against production database.cpp.
#include "mocks/Arduino.h"
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <functional>
#include "../../src/database.cpp"
#define CHECK(c) do { if(!(c)) throw std::runtime_error(std::string(__func__)+":"+std::to_string(__LINE__)+" " #c); } while(false)
static std::string provision;
static int failures=0, groups=0;
static void reset() { LittleFS.reset(); LittleFS.files["/database.json"]=provision; startLFS(); }
static std::string encode(JsonDocument& doc) { std::string value; serializeJson(doc,value); return value; }
static void test(const char* name,const std::function<void()>& run) {
    ++groups;
    try { reset(); run(); std::cout<<"PASS "<<name<<'\n'; }
    catch(const std::exception& error) { ++failures; std::cerr<<"FAIL "<<name<<": "<<error.what()<<'\n'; }
}
static void storageTests() {
    test("incomplete writes retain the complete live file",[] {
        JsonDocument doc; CHECK(loadDatabase(doc)); doc["Officers"][0]["Name"]="replacement";
        LittleFS.writeLimit=12; CHECK(!saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]==provision);
    });
    test("failed replacement retains live bytes",[] {
        JsonDocument doc; CHECK(loadDatabase(doc)); LittleFS.renameFailures=2;
        CHECK(!saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]==provision);
    });
    test("failed recovery returns failure",[] {
        LittleFS.files["/database.json"]="broken"; LittleFS.files["/database.tmp"]=provision;
        LittleFS.renameFailures=1; JsonDocument doc; CHECK(!loadDatabase(doc)); CHECK(doc.isNull());
        CHECK(LittleFS.files["/database.json"]=="broken"); CHECK(LittleFS.exists("/database.tmp"));
    });
    test("mount never requests automatic formatting",[] { startLFS(); CHECK(!LittleFS.autoFormatRequested); });
    test("structurally incomplete data rejected",[] {
        LittleFS.files["/database.json"]="{}"; JsonDocument doc; CHECK(!loadDatabase(doc)); CHECK(doc.isNull());
    });
    test("calendar validation rejects impossible dates",[] {
        CHECK(!isDateString("2025-02-31")); CHECK(!isDateString("1900-02-29"));
        CHECK(isDateString("2000-02-29")); CHECK(!addQualScore(90001,"Pistol",90,"2025-02-31"));
    });
    test("zero and partial writes preserve live and existing backup",[] {
        for (size_t limit : {size_t(0),size_t(1),size_t(12),provision.size()/2}) {
            reset(); LittleFS.files["/database.bak"]=provision;
            JsonDocument doc; CHECK(loadDatabase(doc)); doc["Officers"][0]["Name"]="Updated";
            LittleFS.writeLimit=limit;
            CHECK(!saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]==provision);
            CHECK(LittleFS.files["/database.bak"]==provision);
        }
    });
    test("readback must parse and equal the complete candidate",[] {
        for (const std::string bad : {std::string("{}"),provision}) {
            reset(); JsonDocument doc; CHECK(loadDatabase(doc)); doc["Officers"][0]["Name"]="Updated";
            LittleFS.corruptAfterWrite["/database.tmp"]=bad;
            CHECK(!saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]==provision);
        }
        // AI-assisted (Codex): size and schema alone also match this corrupted write.
        reset();
        JsonDocument doc; CHECK(loadDatabase(doc));
        doc["Officers"][0]["Name"]="Updated A";
        const auto corrupt=encode(doc);
        doc["Officers"][0]["Name"]="Updated B";
        CHECK(corrupt.size()==measureJson(doc));
        LittleFS.corruptAfterWrite["/database.tmp"]=corrupt;
        CHECK(!saveDatabase(doc));
        CHECK(LittleFS.files["/database.json"]==provision);
        CHECK(!LittleFS.exists("/database.bak"));
    });
    test("one byte short is rejected and exact length is accepted",[] {
        JsonDocument doc; CHECK(loadDatabase(doc)); doc["Officers"][0]["Name"]="Updated";
        LittleFS.writeLimits["/database.tmp"]=measureJson(doc)-1;
        CHECK(!saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]==provision);
        LittleFS.writeLimits["/database.tmp"]=measureJson(doc);
        CHECK(saveDatabase(doc));
    });
    test("temp open and backup open failures preserve live data",[] {
        for (const char* path : {"/database.tmp","/database.bak.tmp"}) {
            reset(); JsonDocument doc; CHECK(loadDatabase(doc)); LittleFS.failOpen=path;
            CHECK(!saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]==provision);
        }
    });
    test("backup short write and rename failures preserve existing backup",[] {
        for (bool shortWrite : {false,true}) {
            reset(); JsonDocument doc; CHECK(loadDatabase(doc));
            LittleFS.files["/database.bak"]=provision;
            if (shortWrite) LittleFS.writeLimits["/database.bak.tmp"]=8;
            else LittleFS.renameFailuresByDestination["/database.bak"]=1;
            CHECK(!saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]==provision);
            CHECK(LittleFS.files["/database.bak"]==provision); CHECK(!LittleFS.exists("/database.tmp"));
        }
    });
    test("successful save backs up the previous validated document",[] {
        JsonDocument previous; CHECK(loadDatabase(previous)); const auto original=LittleFS.files["/database.json"];
        previous["Officers"][0]["Name"]="Updated"; CHECK(saveDatabase(previous));
        CHECK(LittleFS.files["/database.bak"]==original);
        JsonDocument current; CHECK(loadDatabase(current)); CHECK(current["Officers"][0]["Name"]=="Updated");
    });
    test("failed live replacement retains a recoverable temp and valid original",[] {
        JsonDocument doc; CHECK(loadDatabase(doc)); doc["Officers"][0]["Name"]="Updated";
        LittleFS.renameFailuresByDestination["/database.json"]=1;
        CHECK(!saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]==provision);
        CHECK(LittleFS.exists("/database.tmp")); CHECK(LittleFS.exists("/database.bak"));
        JsonDocument current; CHECK(loadDatabase(current)); CHECK(current["Officers"][0]["Name"]!="Updated");
    });
    test("valid live always wins an uncommitted temporary file",[] {
        JsonDocument doc; CHECK(loadDatabase(doc)); doc["Officers"][0]["Name"]="Uncommitted";
        LittleFS.files["/database.tmp"]=encode(doc); CHECK(loadDatabase(doc));
        CHECK(doc["Officers"][0]["Name"]!="Uncommitted");
    });
    test("valid temporary file restores missing and malformed live files",[] {
        for (bool missing : {false,true}) {
            reset(); if (missing) LittleFS.files.erase("/database.json"); else LittleFS.files["/database.json"]="broken";
            LittleFS.files["/database.tmp"]=provision; JsonDocument doc; CHECK(loadDatabase(doc));
            CHECK(LittleFS.exists("/database.json")); CHECK(!LittleFS.exists("/database.tmp"));
            JsonDocument health; getDatabaseDiagnostics(health); CHECK(health["ready"]==true);
            CHECK(health["startupStatus"]=="recovered-temporary");
        }
    });
    test("known-good backup recovers malformed live and temp without consuming backup",[] {
        LittleFS.files["/database.json"]="broken"; LittleFS.files["/database.tmp"]="{}";
        LittleFS.files["/database.bak"]=provision; JsonDocument doc; CHECK(loadDatabase(doc));
        CHECK(LittleFS.files["/database.bak"]==provision);
        JsonDocument health; getDatabaseDiagnostics(health); CHECK(health["startupStatus"]=="recovered-backup");
    });
    test("backup recovery write and replacement failures report unavailable",[] {
        for (bool writeFailure : {false,true}) {
            reset(); LittleFS.files["/database.json"]="broken"; LittleFS.files["/database.bak"]=provision;
            if (writeFailure) LittleFS.writeLimit=2; else LittleFS.renameFailuresByDestination["/database.json"]=2;
            JsonDocument doc; CHECK(!loadDatabase(doc)); CHECK(doc.isNull());
            CHECK(LittleFS.files["/database.json"]=="broken"); CHECK(LittleFS.files["/database.bak"]==provision);
            JsonDocument health; getDatabaseDiagnostics(health); CHECK(health["ready"]==false);
            CHECK(health["startupStatus"]=="recovery-failed");
        }
    });
    test("missing malformed oversized and trailing JSON are refused",[] {
        for (const std::string invalid : {std::string(),std::string("{\"Officers\":"),std::string("[]"),
            std::string("{}"),provision+"garbage",std::string(DATABASE_MAX_BYTES+1,' ')}) {
            reset(); LittleFS.files["/database.json"]=invalid; JsonDocument doc; CHECK(!loadDatabase(doc)); CHECK(doc.isNull());
        }
        reset(); LittleFS.files.erase("/database.json"); JsonDocument doc; CHECK(!loadDatabase(doc));
    });
    test("mount failure never formats and remains visible in diagnostics",[] {
        LittleFS.mounted=false; startLFS(); CHECK(!LittleFS.autoFormatRequested);
        JsonDocument health; getDatabaseDiagnostics(health); CHECK(health["ready"]==false);
        CHECK(health["startupStatus"]=="mount-failed"); CHECK(LittleFS.files["/database.json"]==provision);
    });
}

static void schemaTests() {
    auto reject=[](const std::function<void(JsonDocument&)>& mutate) {
        JsonDocument doc; CHECK(loadDatabase(doc)); mutate(doc); String reason;
        CHECK(!validateDatabase(doc,reason)); CHECK(!reason.isEmpty()); CHECK(!saveDatabase(doc));
        CHECK(LittleFS.files["/database.json"]==provision);
    };
    test("provisioning schema and optional legacy histories validate",[] {
        JsonDocument doc; CHECK(loadDatabase(doc)); String reason; CHECK(validateDatabase(doc,reason,false));
        for (const char* field : {"pistolQualScores","rifleQualScores","swatQualScores","qualificationScores"}) doc["Officers"][0].remove(field);
        CHECK(validateDatabase(doc,reason,false));
    });
    test("legacy metadata migrates in memory only and persists on deliberate save",[] {
        JsonDocument legacy; CHECK(loadDatabase(legacy)); legacy.remove("schemaVersion"); legacy.remove("qualifications");
        const auto original=encode(legacy); LittleFS.files["/database.json"]=original;
        JsonDocument doc; CHECK(loadDatabase(doc)); CHECK(doc["schemaVersion"]==1); CHECK(doc["qualifications"].size()==3);
        CHECK(LittleFS.files["/database.json"]==original);
        JsonDocument health; getDatabaseDiagnostics(health); CHECK(health["migrated"]==true);
        CHECK(saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]!=original);
        legacy.remove("schemaVersion"); String reason; CHECK(!validateDatabase(legacy,reason,false));
    });
    test("future live schemas are not downgraded from old temp or backup",[] {
        for (uint64_t version : {uint64_t(2),uint64_t(99),UINT64_MAX}) {
            reset(); JsonDocument doc; CHECK(loadDatabase(doc)); doc["schemaVersion"]=version;
            const auto future=encode(doc); LittleFS.files["/database.json"]=future;
            LittleFS.files["/database.tmp"]=provision; LittleFS.files["/database.bak"]=provision;
            CHECK(!loadDatabase(doc)); CHECK(doc.isNull()); CHECK(!editTarget(1,false));
            CHECK(LittleFS.files["/database.json"]==future);
            JsonDocument restore; CHECK(!deserializeJson(restore,provision)); String reason;
            CHECK(!restoreDatabase(restore,reason)); CHECK(LittleFS.files["/database.json"]==future);
        }
    });
    test("future temporary schema blocks an older backup recovery",[] {
        JsonDocument future; CHECK(loadDatabase(future)); future["schemaVersion"]=2;
        LittleFS.files["/database.json"]="broken"; LittleFS.files["/database.tmp"]=encode(future);
        LittleFS.files["/database.bak"]=provision; JsonDocument doc; CHECK(!loadDatabase(doc));
        CHECK(LittleFS.files["/database.json"]=="broken");
    });
    test("future floating-point version spelling cannot trigger backup downgrade",[] {
        JsonDocument future; CHECK(loadDatabase(future)); future["schemaVersion"]=2.5;
        const auto bytes=encode(future); LittleFS.files["/database.json"]=bytes;
        LittleFS.files["/database.bak"]=provision; JsonDocument doc; CHECK(!loadDatabase(doc));
        CHECK(LittleFS.files["/database.json"]==bytes);
    });
    test("targets require all twenty unique ids and actual booleans",[&] {
        reject([](JsonDocument& d){d["targets"].as<JsonArray>().remove(0);});
        reject([](JsonDocument& d){d["targets"][1]["id"]=1;});
        reject([](JsonDocument& d){d["targets"][0]["id"]=21;});
        reject([](JsonDocument& d){d["targets"][0]["working"]=1;});
    });
    test("officer identity and supplied score histories are validated",[&] {
        reject([](JsonDocument& d){d["Officers"][1]["BadgeNum"]=90001;});
        reject([](JsonDocument& d){d["Officers"][0]["BadgeNum"]=0;});
        reject([](JsonDocument& d){d["Officers"][0]["Name"]="   ";});
        reject([](JsonDocument& d){d["Officers"][0]["Name"]=std::string(65,'x');});
        reject([](JsonDocument& d){d["Officers"][0]["Name"]=std::string("A\0B",3);});
        reject([](JsonDocument& d){d["Officers"][0]["pistolQualScores"]=nullptr;});
        reject([](JsonDocument& d){d["Officers"][0]["qualificationScores"]=false;});
        reject([](JsonDocument& d){auto e=d["Officers"][0]["pistolQualScores"].add<JsonArray>();e.add(-1);e.add("2026-01-01");});
        reject([](JsonDocument& d){auto e=d["Officers"][0]["pistolQualScores"].add<JsonArray>();e.add(1);e.add("2026-04-31");});
        reject([](JsonDocument& d){auto e=d["Officers"][0]["pistolQualScores"].add<JsonArray>();e.add(1);e.add("2026-01-01");e.add(0);});
    });
    test("catalog and custom histories reject ambiguous combinations",[&] {
        reject([](JsonDocument& d){d["qualifications"].add("pistol");});
        reject([](JsonDocument& d){d["qualifications"][0]="pistol";});
        reject([](JsonDocument& d){d["qualifications"]=nullptr;});
        reject([](JsonDocument& d){d["Officers"][0]["qualificationScores"]["Unknown"].to<JsonArray>();});
        reject([](JsonDocument& d){d["Officers"][0]["qualificationScores"]["Pistol"].to<JsonArray>();});
        reject([](JsonDocument& d){auto q=d["drills"][0]["qualifications"].to<JsonArray>();q.add("Pistol");q.add("pistol");});
    });
    test("sequence metadata and selection modes match runtime fields",[&] {
        reject([](JsonDocument& d){d["drills"][0]["sequence"][0]["step"]=2;});
        reject([](JsonDocument& d){d["drills"][0]["sequence"][0]["targets"].to<JsonArray>().add(21);});
        reject([](JsonDocument& d){auto t=d["drills"][0]["sequence"][0]["targets"].to<JsonArray>();t.add(1);t.add(1);});
        reject([](JsonDocument& d){d["drills"][0]["sequence"][0]["targets"].to<JsonArray>();});
        reject([](JsonDocument& d){auto s=d["drills"][0]["sequence"][0];s["targets"].to<JsonArray>().add(1);s["random"]=1;});
        reject([](JsonDocument& d){d["drills"][0]["sequence"][0]["random"]=21;});
        reject([](JsonDocument& d){d["drills"][0]["sequence"][1]["timeMs"]=0;});
        reject([](JsonDocument& d){d["drills"][0]["sequence"][0]["action"]="Unknown";});
        reject([](JsonDocument& d){d["drills"][1]["drillName"]=d["drills"][0]["drillName"];});
        for (const char* alias : {"targetMode","targetIds","randomCount"})
            reject([&](JsonDocument& d){d["drills"][0]["sequence"][0][alias]="unsupported";});
    });
}

static void rawParserTests() {
    test("streaming SHA256 matches known empty and abc vectors",[] {
        for (const auto& input : {std::string(),std::string("abc")}) {
            mbedtls_sha256_context hash; mbedtls_sha256_init(&hash);
            CHECK(mbedtls_sha256_starts_ret(&hash,0)==0);
            for (unsigned char byte : input) CHECK(mbedtls_sha256_update_ret(&hash,&byte,1)==0);
            unsigned char digest[32]; CHECK(mbedtls_sha256_finish_ret(&hash,digest)==0); mbedtls_sha256_free(&hash);
            std::string hex; const char* digits="0123456789abcdef";
            for (unsigned char byte : digest) {hex+=digits[byte>>4];hex+=digits[byte&15];}
            CHECK(hex==(input.empty()?"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855":"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
        }
    });
    test("generic JSON parsing is length bounded and does not migrate schema",[] {
        const char bytes[]={'{','"','a','"',':','1','}'};
        JsonDocument doc; String reason; CHECK(parseDatabaseJson(bytes,sizeof(bytes),doc,reason));
        CHECK(doc["a"]==1); CHECK(doc["schemaVersion"].isUnbound());
        const char* body=" {\"a\":[true,false,null,-1.25e2,\"text\"]} \r\n";
        CHECK(parseDatabaseJson(body,strlen(body),doc,reason)); CHECK(doc["a"].size()==5);
        const char* withJunk="{\"a\":1}garbage";
        CHECK(parseDatabaseJson(withJunk,7,doc,reason));
        CHECK(!parseDatabaseJson(withJunk,strlen(withJunk),doc,reason)); CHECK(doc.isNull());
    });
    test("raw duplicate keys and escaped equivalents are rejected at any object depth",[] {
        for (const char* body : {R"({"a":1,"a":2})",R"({"a":1,"\u0061":2})",
            R"({"outer":{"working":false,"working":true}})",R"({"x":[{"a":1,"a":2}]})",
            R"({"a\u0000b":1,"a\u0000b":2})"}) {
            JsonDocument doc; String reason; CHECK(!parseDatabaseJson(body,strlen(body),doc,reason));
            CHECK(doc.isNull()); CHECK(reason=="Duplicate JSON object key");
        }
        const char* separate=R"({"left":{"a":1},"right":{"a":2}})";
        JsonDocument doc; String reason; CHECK(parseDatabaseJson(separate,strlen(separate),doc,reason));
        const std::string unicode="{\"\\ud83d\\ude00\":1,\"\xf0\x9f\x98\x80\":2}";
        CHECK(!parseDatabaseJson(unicode.data(),unicode.size(),doc,reason));
    });
    test("strict grammar rejects malformed comments numbers escapes and missing bytes",[] {
        for (const char* body : {"", "{}{}", "{", "[1,]", "{\"a\":}", "{a:1}", "{'a':1}",
            "/*comment*/{}", "01", "+1", "1.", "1e", "NaN", "Infinity", "\"\\x41\"", "\"\\u123\""}) {
            JsonDocument doc; String reason; CHECK(!parseDatabaseJson(body,strlen(body),doc,reason)); CHECK(doc.isNull());
        }
        JsonDocument doc; String reason; CHECK(!parseDatabaseJson(nullptr,3,doc,reason));
    });
    test("raw size and nesting boundaries are enforced before deserialization",[] {
        JsonDocument doc; String reason;
        std::string ten(10,'['); ten+='0'; ten+=std::string(10,']');
        CHECK(parseDatabaseJson(ten.data(),ten.size(),doc,reason));
        std::string eleven="["+ten+"]"; CHECK(!parseDatabaseJson(eleven.data(),eleven.size(),doc,reason));
        std::string full="{}"; full.resize(DATABASE_MAX_BYTES,' ');
        CHECK(parseDatabaseJson(full.data(),full.size(),doc,reason));
        full+=' '; CHECK(!parseDatabaseJson(full.data(),full.size(),doc,reason));
    });
    test("disk loads use duplicate checks and reject short reads",[] {
        LittleFS.files["/database.json"]="{\"schemaVersion\":1,"+provision.substr(1);
        JsonDocument doc; CHECK(!loadDatabase(doc)); CHECK(doc.isNull());
        reset(); LittleFS.readLimits["/database.json"]=12; CHECK(!loadDatabase(doc));
        reset(); CHECK(loadDatabase(doc)); LittleFS.readLimits["/database.tmp"]=12;
        CHECK(!saveDatabase(doc)); CHECK(LittleFS.files["/database.json"]==provision);
    });
    test("malformed restore bytes never modify persistent files",[] {
        const auto original=LittleFS.files;
        for (const char* bytes : {R"({"targets":[],"targets":[]})","{\"schemaVersion\":1", "{}trailing"}) {
            JsonDocument doc; String reason; CHECK(!parseDatabaseJson(bytes,strlen(bytes),doc,reason));
            CHECK(LittleFS.files==original);
        }
    });
    test("streaming duplicate checks cross cache boundaries and support long keys",[] {
        const std::string key(600,'a');
        LittleFS.files["/upload.tmp"]="{\""+key+"\":1,\""+key+"\":2}";
        JsonDocument doc; String reason; CHECK(!parseDatabaseFile("/upload.tmp",doc,reason));
        CHECK(reason=="Duplicate JSON object key"); CHECK(doc.isNull());
        LittleFS.files["/upload.tmp"]="{\""+key+"\":1,\"different\":2}";
        CHECK(parseDatabaseFile("/upload.tmp",doc,reason)); CHECK(doc[key].as<int>()==1);
    });
    test("a changed live file is never backed up without a new full validation",[] {
        JsonDocument candidate; CHECK(loadDatabase(candidate)); candidate["Officers"][0]["Name"]="Pending";
        JsonDocument external; CHECK(!deserializeJson(external,provision)); external["Officers"][0]["Name"]="External";
        const auto changed=encode(external); LittleFS.files["/database.json"]=changed;
        CHECK(!saveDatabase(candidate)); CHECK(LittleFS.files["/database.json"]==changed);
        CHECK(!LittleFS.exists("/database.bak"));
        CHECK(loadDatabase(external)); CHECK(saveDatabase(candidate)); CHECK(LittleFS.files["/database.bak"]==changed);
    });
    test("file validation copying and verification read fixed-size chunks",[] {
        LittleFS.maxReadRequest=0;
        JsonDocument doc; CHECK(loadDatabase(doc)); doc["Officers"][0]["Name"]="Chunked";
        CHECK(saveDatabase(doc)); CHECK(LittleFS.maxReadRequest<=256);
        CHECK(LittleFS.maxReadRequest>0);
    });
    test("cached section reads still reject corruption in another section",[] {
        JsonDocument targets; CHECK(getTargets(targets)); CHECK(targets.is<JsonArray>()); CHECK(targets.size()==20);
        JsonDocument corrupted; CHECK(!deserializeJson(corrupted,provision)); corrupted["Officers"][0]["BadgeNum"]=0;
        LittleFS.files["/database.json"]=encode(corrupted);
        CHECK(!getTargets(targets)); CHECK(targets.isNull());
        JsonDocument health; getDatabaseDiagnostics(health); CHECK(health["ready"]==false);
    });
    test("health polling uses the last validation without reading a database",[] {
        const auto previousReads=LittleFS.readCalls;
        JsonDocument health; getDatabaseDiagnostics(health); CHECK(health["ready"]==true);
        CHECK(LittleFS.readCalls==previousReads);
    });
}

static JsonArrayConst oneStep(JsonDocument& doc,const char* action="present") {
    doc.clear(); JsonObject step=doc.to<JsonArray>().add<JsonObject>(); step["step"]=1; step["action"]=action;
    return doc.as<JsonArrayConst>();
}

static void crudTests() {
    test("officer create edit delete are deliberate and idempotent",[] {
        CHECK(!addOfficer(-7,"")); CHECK(!addOfficer(3,"   ")); CHECK(addOfficer(700,"New Officer"));
        CHECK(!addOfficer(700,"Duplicate")); CHECK(editOfficer(700,"Renamed",701)==OfficerEditResult::Saved);
        CHECK(editOfficer(701,nullptr,90001)==OfficerEditResult::BadgeTaken);
        CHECK(editOfficer(701,"",0)==OfficerEditResult::SaveFailed);
        CHECK(deleteOfficer(701)); CHECK(!deleteOfficer(701));
    });
    test("raw point scores aliases ordering and calendar bounds are preserved",[] {
        CHECK(!addQualScore(90001,"Pistol",-1,"2026-11-23"));
        CHECK(addQualScore(90001,"pistol",101,"2026-11-23"));
        CHECK(addQualScore(90001,"Pistol",INT32_MAX,"2026-11-22"));
        CHECK(!addQualScore(90001,"Unknown",10,"2026-11-23"));
        JsonDocument officer; CHECK(getOfficer(90001,"2026-11-23",officer));
        CHECK(officer["pistolQualScores"][0][0].as<int>()==INT32_MAX);
        CHECK(officer["pistolStats"]["attempts"]==2); CHECK(officer["pistolStats"]["top"].as<int>()==INT32_MAX);
    });
    test("statistics window inclusive boundaries leap clamp average and top",[] {
        CHECK(addQualScore(90001,"Pistol",80,"2023-02-28"));
        CHECK(addQualScore(90001,"Pistol",90,"2024-02-29"));
        CHECK(addQualScore(90001,"Pistol",100,"2024-03-01"));
        CHECK(addQualScore(90001,"Pistol",1,"2023-02-27"));
        JsonDocument officer; CHECK(getOfficer(90001,"2024-02-29",officer));
        CHECK(officer["pistolStats"]["attempts"]==2); CHECK(officer["pistolStats"]["average"]==85);
        CHECK(officer["pistolStats"]["top"]==90);
    });
    test("custom qualification uniqueness histories and deletion guards",[] {
        CHECK(addQualification("Custom")); CHECK(!addQualification("custom")); CHECK(!addQualification("SWAT"));
        int count=-1; CHECK(deleteQualification("Pistol",count)==QualificationDeleteResult::BuiltIn); CHECK(count==0);
        JsonDocument sequence, tags; tags.to<JsonArray>().add("Custom");
        CHECK(addDrill("Custom stage",oneStep(sequence),tags.as<JsonArrayConst>()));
        CHECK(deleteQualification("Custom",count)==QualificationDeleteResult::Deleted);
        JsonDocument drill; CHECK(getDrill("Custom stage",drill)); CHECK(drill["qualifications"].size()==0);
        CHECK(addQualification("Custom")); CHECK(addQualScore(90001,"custom",10,"2026-11-23"));
        CHECK(deleteQualification("Custom",count)==QualificationDeleteResult::HasScores); CHECK(count==1);
        CHECK(deleteQualification("Missing",count)==QualificationDeleteResult::NotFound);
    });
    test("drill references rename deletion and complete graph depth",[] {
        JsonDocument sequence; CHECK(addDrill("AuditDepth1",oneStep(sequence)));
        for (int depth=2;depth<=4;depth++) {
            std::string name="AuditDepth"+std::to_string(depth), previous="AuditDepth"+std::to_string(depth-1);
            CHECK(addDrill(name.c_str(),oneStep(sequence,previous.c_str())));
        }
        CHECK(!addDrill("AuditDepth5",oneStep(sequence,"AuditDepth4")));
        CHECK(!editDrill("AuditDepth1",oneStep(sequence,"AuditDepth4")));
        CHECK(!deleteDrill("AuditDepth1")); CHECK(renameDrill("AuditDepth1","Renamed stage"));
        JsonDocument parent; CHECK(getDrill("AuditDepth2",parent)); CHECK(parent["sequence"][0]["action"]=="Renamed stage");
        CHECK(!renameDrill("Renamed stage","delay")); CHECK(deleteDrill("AuditDepth4")); CHECK(!deleteDrill("AuditDepth4"));
    });
    test("dense shared graphs validate without recursively expanding every occurrence",[] {
        JsonDocument doc; CHECK(loadDatabase(doc)); JsonArray drills=doc["drills"].to<JsonArray>();
        for (int level=0;level<4;++level) {
            const int width=level==3?1:15;
            for (int entry=0;entry<width;++entry) {
                JsonObject drill=drills.add<JsonObject>();
                const std::string name="Dense"+std::to_string(level)+"_"+std::to_string(entry);
                drill["drillName"]=name;
                JsonArray sequence=drill["sequence"].to<JsonArray>();
                for (int child=0;child<(level?15:1);++child) {
                    JsonObject step=sequence.add<JsonObject>(); step["step"]=child+1;
                    step["action"]=level?"Dense"+std::to_string(level-1)+"_"+std::to_string(child):"present";
                }
            }
        }
        String reason; CHECK(validateDatabase(doc,reason)); CHECK(saveDatabase(doc));
        doc["drills"][0]["sequence"][0]["action"]="Dense3_0";
        CHECK(!validateDatabase(doc,reason));
    });
    test("combined drill edit rename rolls back entirely on invalid candidate and I/O failure",[] {
        JsonDocument sequence; CHECK(addDrill("Edit original",oneStep(sequence)));
        CHECK(addDrill("Edit parent",oneStep(sequence,"Edit original")));
        JsonDocument original; CHECK(getDrill("Edit original",original)); const auto originalBytes=encode(original);
        String reason;
        CHECK(!editDrillTransaction("Edit original","delay",oneStep(sequence,"hide"),JsonArrayConst(),nullptr,reason));
        CHECK(!editDrillTransaction("Edit original","Edit renamed",oneStep(sequence,"Edit parent"),JsonArrayConst(),nullptr,reason));
        LittleFS.renameFailuresByDestination["/database.json"]=1;
        CHECK(!editDrillTransaction("Edit original","Edit renamed",oneStep(sequence,"hide"),JsonArrayConst(),nullptr,reason));
        CHECK(getDrill("Edit original",original)); CHECK(encode(original)==originalBytes);
        CHECK(!getDrill("Edit renamed",original));
        CHECK(editDrillTransaction("Edit original","Edit renamed",oneStep(sequence,"hide"),JsonArrayConst(),"Changed",reason));
        CHECK(getDrill("Edit renamed",original)); CHECK(original["sequence"][0]["action"]=="hide");
        CHECK(getDrill("Edit parent",original)); CHECK(original["sequence"][0]["action"]=="Edit renamed");
    });
    test("restore rejects invalid data and exports validated supported data",[] {
        JsonDocument candidate; CHECK(getDatabaseBackup(candidate)); const auto backup=encode(candidate);
        candidate["targets"][0]["id"]=21; String reason; CHECK(!restoreDatabase(candidate,reason));
        CHECK(LittleFS.files["/database.json"]==provision);
        CHECK(!deserializeJson(candidate,backup)); candidate["Officers"][0]["Name"]="Restored";
        CHECK(restoreDatabase(candidate,reason)); CHECK(reason.isEmpty());
        JsonDocument exported; CHECK(getDatabaseBackup(exported)); CHECK(exported["Officers"][0]["Name"]=="Restored");
    });
    test("failed getter clears stale output",[] {
        JsonDocument out; out["old"]=true; CHECK(!getDrill(nullptr,out)); CHECK(out.isNull());
        out["old"]=true; CHECK(!getOfficer(999999,"2026-11-23",out)); CHECK(out.isNull());
        LittleFS.files["/database.json"]="broken"; out["old"]=true; CHECK(!getQualifications(out)); CHECK(out.isNull());
    });
}
int main(int argc,char** argv) {
    try {
        CHECK(argc==2); std::ifstream input(argv[1],std::ios::binary);
        provision.assign(std::istreambuf_iterator<char>(input),{}); CHECK(!provision.empty());
        storageTests(); schemaTests(); rawParserTests(); crudTests();
        std::cout<<groups<<" database groups, "<<failures<<" failures\n"; return failures?1:0;
    } catch(const std::exception& error) { std::cerr<<error.what()<<'\n'; return 1; }
}
