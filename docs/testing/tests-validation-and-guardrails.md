<!-- AI-assisted (Codex): describes the retained database and API safeguards. -->
# Memory and data safeguards

The controller retains the database validation, persistence protections, and
bounded-memory API handling exercised by the JavaScript and database tests.

- Database JSON is limited to 256 KiB and ten nested containers. Strict parsing
  rejects duplicate keys, malformed/trailing JSON, and unsupported schemas.
- Database files are read and hashed through fixed-size buffers. Reads of a
  section or record avoid copying a complete database into a second document;
  changed files must pass full validation before a filtered read is allowed.
- Allocation failures and ArduinoJson overflow are checked. Drill graph
  validation bounds nesting and avoids recursive expansion of shared subgraphs.
- Ordinary JSON request bodies are limited to 16 KiB. Fragment bounds are checked,
  buffers are freed on disconnect/error/completion, and raw request bytes are
  released before database work begins.
- JSON responses own their document until asynchronous transmission completes,
  avoiding a second full serialized string and dangling error-message text.
- Query identifiers reject integer overflow. Drill edits apply to one candidate
  document and save together, avoiding partially applied edits and extra live
  lookup documents.
- Saves require complete writes and verified readback before replacing live data.
  A validated previous file is retained for recovery. Invalid or future-version
  files cannot silently replace good data, and mount failure never formats storage.

Database tests also exercise schema rules, dates, score statistics, qualifications,
and CRUD operations. The JavaScript validator checks the same data boundaries
without modifying the input file, including rejection of malformed UTF-8.

These limits reduce peak memory use and reject known failure conditions; they do
not guarantee immunity to exhaustion under all concurrent workloads. Host tests
simulate storage faults and do not establish physical flash or power-loss behavior.
