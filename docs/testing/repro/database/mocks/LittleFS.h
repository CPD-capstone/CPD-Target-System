// AI-generated (Codex): deterministic in-memory filesystem and failure injection.
#pragma once
#include "Arduino.h"
#include <map>
#include <memory>
#include <limits>
struct MemoryFilesystem;
class File {
    MemoryFilesystem* fs = nullptr;
    std::string path;
    size_t position = 0;
    bool writable = false;
public:
    File() = default;
    File(MemoryFilesystem* owner, const std::string& name, bool write) : fs(owner),path(name),writable(write) {}
    explicit operator bool() const { return fs != nullptr; }
    int read();
    size_t readBytes(char* data, size_t count);
    size_t write(uint8_t value) { return write(&value,1); }
    size_t write(const uint8_t* data, size_t count);
    size_t size() const;
    void flush() {}
    void close() {}
};
struct MemoryFilesystem {
    std::map<std::string,std::string> files;
    bool mounted = true, autoFormatRequested = false;
    size_t writeLimit = std::numeric_limits<size_t>::max();
    int renameFailures = 0;
    std::string failOpen;
    bool begin(bool format=false) { autoFormatRequested=format; return mounted; }
    bool exists(const char* path) const { return files.count(path); }
    File open(const char* path,const char* mode) {
        if (!mounted || failOpen == path) return File();
        const bool write = mode[0] == 'w';
        if (write) files[path].clear();
        if (!exists(path)) return File();
        return File(this,path,write);
    }
    bool remove(const char* path) { return files.erase(path)>0; }
    bool rename(const char* from,const char* to) {
        if (renameFailures>0) { --renameFailures; return false; }
        if (!exists(from)) return false;
        files[to]=files[from]; files.erase(from); return true;
    }
    void reset() { *this=MemoryFilesystem(); }
};
inline MemoryFilesystem LittleFS;
inline int File::read() { if (!fs || position>=fs->files[path].size()) return -1; return (unsigned char)fs->files[path][position++]; }
inline size_t File::readBytes(char* data,size_t count) { size_t n=0; int c; while(n<count && (c=read())>=0) data[n++]=(char)c; return n; }
inline size_t File::write(const uint8_t* data,size_t count) {
    if (!fs || !writable) return 0;
    size_t n=std::min(count,fs->writeLimit>position?fs->writeLimit-position:0);
    fs->files[path].append((const char*)data,n); position+=n; return n;
}
inline size_t File::size() const { return fs ? fs->files[path].size() : 0; }
