// In-memory database fixture for the stage-reset tests (AI-assisted with Codex).
#pragma once
#include "Arduino.h"
inline std::string fixtureDatabase;
struct File {
    size_t offset = 0;
    explicit operator bool() const { return !fixtureDatabase.empty(); }
    int read(){ return offset < fixtureDatabase.size() ? uint8_t(fixtureDatabase[offset++]) : -1; }
    size_t readBytes(char* buffer, size_t count){
        size_t copied = std::min(count, fixtureDatabase.size() - offset);
        std::memcpy(buffer, fixtureDatabase.data() + offset, copied);
        offset += copied;
        return copied;
    }
    void close() {}
};
struct LittleFSMock { File open(const char*, const char*) { return {}; } };
inline LittleFSMock LittleFS;
