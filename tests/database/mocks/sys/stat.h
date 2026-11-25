// AI-assisted: model the mounted ESP32 VFS independently of File::open failures.
#pragma once
#include <cerrno>
#include_next <sys/stat.h>
#define stat(...) hostFilesystemStat(__VA_ARGS__)
inline int hostFilesystemStat(const char* mountedPath, struct stat*) {
    const std::string mount = "/littlefs";
    const std::string path(mountedPath);
    if (!LittleFS.mounted || path.compare(0, mount.size(), mount) != 0) {
        errno = EIO;
        return -1;
    }
    if (!LittleFS.files.count(path.substr(mount.size()))) {
        errno = ENOENT;
        return -1;
    }
    return 0;
}
