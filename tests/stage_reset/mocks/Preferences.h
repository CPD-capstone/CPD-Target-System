// AI-generated (Codex): host-only substitute for the runner's saved timing settings.
#pragma once
#include <cstddef>
#include <cstdint>
#include <string>
#include <unordered_map>

class Preferences {
public:
    bool begin(const char* name, bool readOnly = false) {
        namespaceName = name ? name : "";
        this->readOnly = readOnly;
        return true;
    }
    uint32_t getUInt(const char* key, uint32_t defaultValue = 0) const {
        const auto found = values.find(storageKey(key));
        return found == values.end() ? defaultValue : found->second;
    }
    size_t putUInt(const char* key, uint32_t value) {
        if (readOnly) return 0;
        values[storageKey(key)] = value;
        return sizeof(value);
    }
    void end() {}
    static void clear() { values.clear(); }

private:
    std::string storageKey(const char* key) const {
        return namespaceName + ":" + (key ? key : "");
    }
    inline static std::unordered_map<std::string, uint32_t> values;
    std::string namespaceName;
    bool readOnly = true;
};
