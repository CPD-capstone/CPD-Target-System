// Minimal runtime for the stage-reset tests (AI-assisted with Codex).
#pragma once
#include <algorithm>
#include <climits>
#include <cstdint>
#include <cstring>
#include <functional>
#include <stdexcept>
#include <string>
#include <vector>

using String = std::string;
using TickType_t = uint32_t;
using TaskHandle_t = void*;
using portMUX_TYPE = int;
constexpr int portMUX_INITIALIZER_UNLOCKED = 0;
constexpr TickType_t portMAX_DELAY = UINT32_MAX;
constexpr int pdTRUE = 1, pdPASS = 1, eSetBits = 0;
#define pdMS_TO_TICKS(ms) (ms)
#define pdTICKS_TO_MS(ticks) (ticks)
#define portENTER_CRITICAL(lock) ((void)(lock))
#define portEXIT_CRITICAL(lock) ((void)(lock))

inline size_t strlcpy(char* dest, const char* source, size_t capacity){
    if(capacity){
        std::strncpy(dest, source, capacity - 1);
        dest[capacity - 1] = '\0';
    }
    return std::strlen(source);
}
struct SerialMock {
    void println(const char*) {}
    template<class... Args> void printf(const char*, Args...) {}
};
inline SerialMock Serial;
TickType_t xTaskGetTickCount();
int xTaskNotifyWait(uint32_t, uint32_t, uint32_t*, TickType_t);
int xTaskNotify(TaskHandle_t, uint32_t, int);
int xTaskCreatePinnedToCore(void (*)(void*), const char*, uint32_t, void*, int, TaskHandle_t*, int);
void vTaskDelay(TickType_t);
uint32_t esp_random();

// Skip the embedded HAL header: these mocks preserve its public API and cooldown behavior.
#define HAL_H
constexpr uint8_t NUM_TARGETS = 20;
constexpr uint32_t ALL_TARGETS_MASK = (1UL << NUM_TARGETS) - 1;
constexpr uint32_t MECHANICAL_BUFFER = 500;
constexpr uint32_t TARGET_FACE_TRAVEL_MS = 0;
constexpr uint32_t targetBit(uint8_t n){ return 1UL << (n - 1); }
bool hal_isReady();
bool hal_sendCommand(uint32_t, bool, TickType_t = 50);
uint32_t hal_getTargetStates();
bool hal_hold();
void hal_release();
