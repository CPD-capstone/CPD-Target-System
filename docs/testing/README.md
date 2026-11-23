<!-- AI-assisted (Codex): retained JavaScript/database checks and memory safeguards. -->
# JavaScript and database tests

Run from the repository root:

```text
npm test
npm run test:database
npm run validate:database -- --strict
```

The JavaScript checks use Node 24's built-in test runner with no npm dependencies.
They cover schema rules, duplicate JSON keys, byte/depth limits, drill graph
validation, dates/statistics, and the read-only database validator. The runner
finds new suites and fails on missing, empty, skipped, or failed suites.

The database checks compile production `src/database.cpp` with a C++17 compiler
and the project's ArduinoJson dependency under `.pio/libdeps/esp32/ArduinoJson`.
They simulate Arduino and LittleFS on the development computer, including partial
writes, failed reads/renames, malformed records, and recovery. These small test
substitutes are required to run database tests without a controller.

See [memory and data safeguards](tests-validation-and-guardrails.md) for the
retained protections and [database test details](../../tests/database/README.md).
These commands do not upload firmware, connect to a controller, or actuate targets.
