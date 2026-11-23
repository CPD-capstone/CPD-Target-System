// AI-generated (Codex): host-only runtime; no hardware interfaces are implemented.
#pragma once
#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#define HAL_H
constexpr uint8_t NUM_TARGETS = 20;
class String : public std::string {
public:
    using std::string::string;
    String(const std::string& value) : std::string(value) {}
    bool isEmpty() const { return empty(); }
    bool equalsIgnoreCase(const char* other) const {
        if (!other || size() != std::strlen(other)) return false;
        for (size_t i=0;i<size();i++) if (std::tolower((unsigned char)(*this)[i]) != std::tolower((unsigned char)other[i])) return false;
        return true;
    }
    void toLowerCase() { for (char& c : *this) c = std::tolower((unsigned char)c); }
    void trim() {
        const auto first=find_first_not_of(" \r\n\t");
        if (first == npos) { clear(); return; }
        *this=substr(first,find_last_not_of(" \r\n\t")-first+1);
    }
};
struct SerialMock {
    void println(const char*) {}
    template<class... Args> void printf(const char*, Args...) {}
};
inline SerialMock Serial;
