<!-- AI-generated (Codex): software-only database regression coverage. -->
# Database regression checks

From the repository root, run `python tools/release/test_database.py` with a C++17
compiler and the project's existing ArduinoJson dependency. Set `CXX` to select a
compiler, or use the detected `c++`, `g++`, or `clang++`. The portable runner
builds to a unique temporary executable, checks its exit code, and removes it.

Tests include the production `src/database.cpp` with an in-memory LittleFS and a
minimal Arduino string/Serial runtime. No HAL, GPIO, SPI, target execution, device
connection, upload, or stage-reset test is included. Fault injection covers partial
writes, changed readback, failed opens/renames, backup recovery, future schemas,
legacy migration, schema boundaries, score/statistics operations, qualification
history, and atomic drill edit/rename. The provisioning JSON is read only.

The initial six regression groups failed against the audited implementation before
fixes. Historical observed behavior remains in `docs/testing/database-audit.md`;
the optional audit harness describes that earlier baseline, not acceptance criteria
for the current implementation. These host tests do not establish physical flash
failure rates, power-loss atomicity, or hardware behavior.
