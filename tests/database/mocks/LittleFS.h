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
    size_t cursor = 0;
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
    bool seek(size_t offset) { if (!fs) return false; cursor=offset; return true; }
    size_t position() const { return cursor; }
    void flush() {}
    void close();
};
struct MemoryFilesystem {
    std::map<std::string,std::string> files;
    bool mounted = true, autoFormatRequested = false;
    size_t writeLimit = std::numeric_limits<size_t>::max();
    int renameFailures = 0;
    std::string failOpen;
    std::map<std::string,int> renameFailuresByDestination;
    std::map<std::string,std::string> corruptAfterWrite;
    std::map<std::string,size_t> writeLimits;
    std::map<std::string,size_t> readLimits;
    size_t maxReadRequest = 0, readCalls = 0;
    bool begin(bool format=false, const char* mount="/littlefs") { autoFormatRequested=format; return mounted; }
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
        if (renameFailuresByDestination[to]>0) { --renameFailuresByDestination[to]; return false; }
        if (!exists(from)) return false;
        files[to]=files[from]; files.erase(from); return true;
    }
    void reset() { *this=MemoryFilesystem(); }
};
inline MemoryFilesystem LittleFS;
inline int File::read() { if (!fs) return -1; ++fs->readCalls; if (cursor>=fs->files[path].size()) return -1; return (unsigned char)fs->files[path][cursor++]; }
inline size_t File::readBytes(char* data,size_t count) {
    if (fs) fs->maxReadRequest=std::max(fs->maxReadRequest,count);
    if (fs && fs->readLimits.count(path)) count=std::min(count,fs->readLimits[path]);
    size_t n=0; int c; while(n<count && (c=read())>=0) data[n++]=(char)c; return n;
}
inline size_t File::write(const uint8_t* data,size_t count) {
    if (!fs || !writable) return 0;
    size_t limit=fs->writeLimits.count(path)?fs->writeLimits[path]:fs->writeLimit;
    size_t n=std::min(count,limit>cursor?limit-cursor:0);
    fs->files[path].append((const char*)data,n); cursor+=n; return n;
}
inline size_t File::size() const { return fs ? fs->files[path].size() : 0; }
inline void File::close() {
    if (fs && writable && fs->corruptAfterWrite.count(path)) {
        fs->files[path]=fs->corruptAfterWrite[path]; fs->corruptAfterWrite.erase(path);
    }
    writable=false;
}
