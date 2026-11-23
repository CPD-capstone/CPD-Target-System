// AI-generated (Codex): optional audit reproduction, not a release gate or fixed-behavior test.
// Exercises unchanged production database.cpp without GPIO, tasks or HAL.
#include "mocks/Arduino.h"
#include <fstream>
#include <iostream>
#include <stdexcept>
#include "../../../../src/database.cpp"
#define CHECK(c) do { if(!(c)) throw std::runtime_error(std::string(__func__)+":"+std::to_string(__LINE__)+" " #c); } while(false)
static std::string provision;
static void reset() { LittleFS.reset(); LittleFS.files["/database.json"]=provision; }
static std::string encode(JsonDocument& doc) { std::string value; serializeJson(doc,value); return value; }
static void baseline() {
    reset(); JsonDocument doc;
    LittleFS.files["/database.json"]="{}";
    std::cout << "shape_empty_object_accepted=" << loadDatabase(doc) << '\n';
    std::cout << "impossible_date_accepted=" << isDateString("2025-02-31") << '\n';
    reset(); CHECK(loadDatabase(doc));
    doc["Officers"][0]["Name"]="replacement";
    LittleFS.writeLimit=12;
    std::cout << "partial_write_reported_success=" << saveDatabase(doc) << '\n';
    std::cout << "partial_write_live_bytes=" << LittleFS.files["/database.json"].size() << '\n';
    reset(); CHECK(loadDatabase(doc)); LittleFS.renameFailures=2;
    std::cout << "rename_failure_save_result=" << saveDatabase(doc) << '\n';
    std::cout << "rename_failure_preserved_live=" << LittleFS.exists("/database.json") << '\n';
    std::cout << "rename_failure_preserved_tmp=" << LittleFS.exists("/database.tmp") << '\n';
    reset(); LittleFS.files["/database.json"]="broken"; LittleFS.files["/database.tmp"]=provision; LittleFS.renameFailures=1;
    std::cout << "failed_recovery_reported_success=" << loadDatabase(doc) << '\n';
    std::cout << "failed_recovery_live_exists=" << LittleFS.exists("/database.json") << '\n';
    reset(); startLFS(); std::cout << "mount_autoformat_requested=" << LittleFS.autoFormatRequested << '\n';

    reset(); CHECK(loadDatabase(doc));
    doc["schemaVersion"]=99; LittleFS.files["/database.json"]=encode(doc);
    std::cout << "future_schema_accepted=" << loadDatabase(doc) << '\n';
    std::cout << "future_schema_crud_allowed=" << editTarget(1,false) << '\n';

    reset(); CHECK(loadDatabase(doc));
    doc["targets"][1]["id"]=doc["targets"][0]["id"];
    LittleFS.files["/database.json"]=encode(doc);
    std::cout << "duplicate_target_id_accepted=" << loadDatabase(doc) << '\n';

    reset(); CHECK(loadDatabase(doc));
    doc["Officers"][1]["BadgeNum"]=doc["Officers"][0]["BadgeNum"];
    LittleFS.files["/database.json"]=encode(doc);
    std::cout << "duplicate_badge_accepted=" << loadDatabase(doc) << '\n';

    reset(); std::cout << "negative_score_saved=" << addQualScore(90001,"Pistol",-1,"2026-11-23") << '\n';
    reset(); std::cout << "score_101_saved=" << addQualScore(90001,"Pistol",101,"2026-11-23") << '\n';
    reset(); std::cout << "impossible_score_date_saved=" << addQualScore(90001,"Pistol",90,"2025-02-31") << '\n';
    reset(); std::cout << "negative_badge_blank_name_saved=" << addOfficer(-7,"") << '\n';

    reset(); CHECK(loadDatabase(doc));
    LittleFS.files["/database.json"]="broken";
    LittleFS.files["/database.bak"]=provision;
    std::cout << "valid_backup_recovered=" << loadDatabase(doc) << '\n';

    reset(); JsonDocument sequence;
    JsonObject present=sequence.to<JsonArray>().add<JsonObject>();
    present["step"]=1; present["action"]="present";
    present["targets"].to<JsonArray>().add(21);
    std::cout << "out_of_range_step_target_saved=" << addDrill("Audit invalid target",sequence.as<JsonArrayConst>()) << '\n';

    reset(); sequence.clear(); present=sequence.to<JsonArray>().add<JsonObject>();
    present["step"]=1; present["action"]="present";
    present["targets"].to<JsonArray>().add(1); present["random"]=2;
    std::cout << "ambiguous_targets_and_random_saved=" << addDrill("Audit ambiguous targets",sequence.as<JsonArrayConst>()) << '\n';

    reset(); bool chain=true;
    for(int depth=1;depth<=5;depth++) {
        sequence.clear(); JsonObject step=sequence.to<JsonArray>().add<JsonObject>();
        step["step"]=1;
        std::string name="AuditDepth"+std::to_string(depth);
        std::string action=depth==1?"present":"AuditDepth"+std::to_string(depth-1);
        step["action"]=action;
        chain=addDrill(name.c_str(),sequence.as<JsonArrayConst>()) && chain;
    }
    std::cout << "depth_five_graph_saved=" << chain << '\n';

    reset(); JsonDocument stats;
    CHECK(addQualScore(90001,"Pistol",80,"2023-02-28"));
    CHECK(getOfficer(90001,"2024-02-29",stats));
    std::cout << "leap_day_prior_feb28_attempts=" << stats["pistolStats"]["attempts"].as<int>() << '\n';
}
int main(int argc,char** argv) {
    try {
        CHECK(argc>=2); std::ifstream input(argv[1],std::ios::binary);
        provision.assign(std::istreambuf_iterator<char>(input),{}); CHECK(!provision.empty());
        baseline(); return 0;
    } catch(const std::exception& error) { std::cerr<<error.what()<<'\n'; return 1; }
}
