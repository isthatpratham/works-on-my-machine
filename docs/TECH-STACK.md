# WOMM — Technology Stack

**Project:** `works-on-my-machine`<br>
**CLI:** `womm`<br>
**Version:** V1<br>
**Status:** Technical Specification<br>

---

## 1. Purpose

This document defines the technology stack, runtime requirements, dependencies, development tooling, and implementation conventions for WOMM V1.

The stack is intentionally lightweight.

WOMM is a local-first CLI, so the implementation should prioritize:

- Fast startup
- Small dependency footprint
- Cross-platform compatibility
- Deterministic behavior
- Offline execution
- Easy installation through npm
- Strong TypeScript support
- Maintainability
- Testability

WOMM V1 must not require Docker, AI services, API keys, cloud services, or network access.

---

# 2. Core Stack

| Area             | Technology | Purpose                             |
| ---------------- | ---------- | ----------------------------------- |
| Language         | TypeScript | Primary implementation language     |
| Runtime          | Node.js    | CLI execution environment           |
| Package Manager  | pnpm       | Dependency and workspace management |
| CLI Framework    | Commander  | CLI commands and argument parsing   |
| Terminal Styling | Chalk      | Semantic terminal colors            |
| Terminal Spinner | Ora        | Scan progress feedback              |
| Terminal Layout  | Boxen      | Structured terminal sections        |
| Tables           | cli-table3 | Structured terminal data            |
| Build Tool       | tsup       | TypeScript bundling                 |
| Testing          | Vitest     | Unit and integration testing        |
| Linting          | ESLint     | Static code quality                 |
| Formatting       | Prettier   | Consistent formatting               |
| Version Control  | Git        | Repository and change tracking      |
| Distribution     | npm        | CLI package distribution            |

---

# 3. Runtime

## 3.1 Node.js

WOMM will use Node.js as its runtime.

### Minimum version

**Node.js 20 LTS or newer**

The project should avoid APIs that require newer Node versions unless there is a strong reason to raise the minimum version.

### Why Node.js?

Node provides direct access to the functionality WOMM needs:

- Filesystem inspection
- Process execution
- Operating-system information
- Environment information
- Path handling
- Cross-platform process management
- Git command execution
- Package metadata inspection

It also provides a natural distribution mechanism through npm.

---

## 3.2 Supported Operating Systems

V1 should target:

- Windows
- macOS
- Linux

The implementation must not assume Unix-specific behavior.

Avoid:

- Bash-only commands
- `/bin/sh`
- Unix-specific filesystem paths
- `grep`
- `sed`
- `awk`
- `which`
- `cat`
- Unix-only environment variables

Prefer Node.js APIs wherever possible.

---

# 4. Programming Language

## 4.1 TypeScript

TypeScript is the primary development language.

All application source code should use TypeScript.

Recommended compiler configuration:

- Strict mode enabled
- ES2022-compatible target
- Node-compatible module system
- No implicit `any`
- Strict null checking
- Consistent module resolution

Example principles:

```text
Avoid:
any
implicit coercion
untyped external boundaries
large global objects

Prefer:
interfaces
types
discriminated unions
explicit return types
small modules
dependency injection
pure functions
```

---

# 5. CLI Framework

## 5.1 Commander

WOMM will use **Commander** for CLI parsing.

Primary responsibilities:

- Command registration
- Arguments
- Options
- Help output
- Version output
- Command validation

Commander should remain isolated inside the CLI layer.

The core analysis engine must not depend on Commander.

### Example

```bash
womm
womm check
womm check ./my-project
womm --help
womm --version
```

The CLI layer converts command-line input into application-level options.

It should not perform detection itself.

---

# 6. Terminal UI

WOMM's terminal UI should remain intentionally simple.

The CLI is a developer diagnostic tool, not a dashboard.

## 6.1 Chalk

Use Chalk for semantic terminal styling.

Examples:

```text
CRITICAL → red
WARNING  → yellow
INFO     → cyan
PASS     → green
MUTED    → gray
```

Colors must communicate meaning rather than decoration.

---

## 6.2 Ora

Ora may be used for scan progress.

Example:

```text
⠋ Scanning project...
```

However, animations must automatically disappear or be disabled when:

- stdout is not a TTY
- `--no-color` is used
- output is being piped
- the environment does not support interactive output

WOMM must never produce broken spinner characters in CI logs.

---

## 6.3 Boxen

Boxen may be used for the main result summary.

Example conceptual output:

```text
┌─────────────────────────────────────┐
│ WORKS ON MY MACHINE                 │
│                                     │
│ Reproducibility Score: 72/100       │
└─────────────────────────────────────┘
```

Boxen should only be used where it improves readability.

Avoid excessive boxes.

---

## 6.4 cli-table3

Use `cli-table3` only when tabular information materially improves comprehension.

For example:

```text
Category        Status
──────────────  ────────
Runtime         PASS
Dependencies    PASS
Environment     WARN
Configuration   WARN
Git             PASS
```

Do not turn every result into a table.

---

# 7. Core Node.js APIs

WOMM should rely heavily on Node's standard library.

Important modules include:

```text
node:fs
node:fs/promises
node:path
node:os
node:process
node:child_process
node:url
node:util
node:crypto
```

Not every module is required from the beginning.

The principle is:

> Use Node's standard library before adding a dependency.

---

# 8. Filesystem

Filesystem inspection is central to WOMM.

Use:

```text
node:fs
node:fs/promises
node:path
```

Typical operations:

- Check whether files exist
- Read configuration files
- Discover project files
- Inspect lockfiles
- Inspect `.gitignore`
- Read package manifests
- Search source files for portability signals

### Important rule

WOMM must be **read-only**.

Filesystem operations must not:

- Create files
- Modify files
- Delete files
- Install dependencies
- Rewrite configuration
- Modify Git state

---

# 9. Process Execution

WOMM sometimes needs authoritative information from the local machine.

Examples:

```bash
node --version
python --version
git --version
git status
git branch --show-current
```

Use Node's process APIs rather than shell scripts.

Preferred API:

```text
node:child_process
```

with structured argument arrays.

Conceptually:

```text
execFile("node", ["--version"])
```

rather than:

```text
exec("node --version")
```

This reduces shell-specific behavior and avoids unnecessary command interpretation.

---

# 10. Git Integration

Git is an important V1 data source.

WOMM should inspect Git using the installed Git executable when available.

Potential commands include:

```bash
git rev-parse --is-inside-work-tree
git branch --show-current
git status --porcelain
git ls-files
git check-ignore
```

Git commands must:

- Be read-only
- Have bounded execution
- Handle Git not being installed
- Handle non-Git directories
- Never modify repository state

### Git is optional

A missing Git installation must not prevent WOMM from analyzing the rest of the project.

Example:

```text
Git
⚠ Git unavailable
```

The other detectors should continue normally.

---

# 11. Project Metadata Parsing

WOMM needs to understand common project manifests.

V1 should support structured parsing of files such as:

### Node.js

```text
package.json
package-lock.json
pnpm-lock.yaml
yarn.lock
bun.lockb
.nvmrc
.node-version
```

### Python

```text
requirements.txt
pyproject.toml
Pipfile
Pipfile.lock
.python-version
```

### Generic

```text
README.md
.gitignore
.env
.env.example
.editorconfig
```

Additional ecosystems may be added later.

---

# 12. YAML and TOML

WOMM may require parsers for configuration formats that cannot be reliably handled with simple text processing.

Potential dependencies:

```text
yaml
toml
```

These should only be added when required by implemented detection rules.

The project should avoid introducing a dependency merely for speculative future functionality.

---

# 13. Dependency Policy

WOMM should maintain a small dependency footprint.

Every runtime dependency should answer at least one of these questions:

1. Does Node's standard library not provide the required functionality?
2. Does the dependency significantly improve correctness?
3. Does it materially improve the CLI experience?
4. Would implementing the functionality internally create unnecessary complexity?

If the answer is no, do not add the dependency.

---

# 14. Runtime Dependencies

The expected initial runtime dependency set is approximately:

```text
commander
chalk
ora
boxen
cli-table3
```

Additional parsers may be introduced when required.

The exact final dependency list should reflect actual implementation needs rather than this specification alone.

---

# 15. Development Dependencies

Expected development tooling:

```text
typescript
tsup
vitest
eslint
prettier
@types/node
```

Additional ESLint plugins/configuration packages may be added if required.

---

# 16. Build System

## 16.1 tsup

WOMM will use **tsup** for production builds.

Responsibilities:

- Bundle TypeScript
- Produce Node-compatible JavaScript
- Generate source maps where useful
- Produce declaration files if required
- Keep the distribution simple

Expected output:

```text
dist/
├── index.js
├── index.d.ts
└── ...
```

The package should expose a CLI executable through `package.json`.

---

# 17. Package Configuration

The package should define a CLI binary.

Conceptually:

```json
{
  "name": "womm",
  "bin": {
    "womm": "./dist/index.js"
  }
}
```

The actual package metadata should also include:

- Description
- Version
- Repository
- License
- Keywords
- Node engine requirement
- Files included in the published package

---

# 18. Package Manager

## pnpm

Development will use **pnpm**.

Reasons:

- Fast installation
- Efficient dependency storage
- Strong lockfile
- Good workspace support
- Reproducible development environment
- Widely used in modern TypeScript projects

The repository should commit:

```text
pnpm-lock.yaml
```

The lockfile itself is important to WOMM because the tool analyzes dependency reproducibility.

---

# 19. Testing

## 19.1 Vitest

WOMM will use Vitest.

Testing must focus heavily on deterministic detection behavior.

Test categories:

```text
Unit Tests
Integration Tests
CLI Tests
Fixture Tests
Cross-platform behavior
```

---

# 20. Fixture Repositories

Fixture projects are especially important.

Instead of testing detectors only against the developer's current machine, WOMM should maintain artificial repositories representing known scenarios.

Example:

```text
tests/
└── fixtures/
    ├── node-unpinned/
    ├── node-pinned/
    ├── missing-env-example/
    ├── tracked-env/
    ├── hardcoded-localhost/
    ├── absolute-path/
    ├── missing-lockfile/
    ├── python-project/
    ├── clean-project/
    └── git-mismatch/
```

Each fixture should have an expected analysis result.

This makes detection behavior deterministic.

---

# 21. Testing Philosophy

A detector should ideally be testable as a pure unit.

For example:

```text
Input:
ProjectContext

Output:
Finding[]
```

The detector should not need:

- Internet access
- A personal development environment
- A real production repository
- A specific Git history
- An API key

Fixtures should provide controlled environments.

---

# 22. Linting

## ESLint

ESLint will enforce code-quality rules.

Primary goals:

- Catch likely bugs
- Prevent unsafe patterns
- Maintain consistent TypeScript practices
- Reduce accidental complexity

Linting should be run before commits and in CI.

---

# 23. Formatting

## Prettier

Prettier will handle formatting.

Formatting should not be manually debated inside pull requests.

Expected configuration:

```text
Single quotes or project-selected convention
Trailing commas
Consistent indentation
Consistent line endings
```

The exact formatting configuration should be committed to the repository.

---

# 24. Source Structure

The recommended source tree is:

```text
src/
├── cli/
│   ├── index.ts
│   ├── commands/
│   │   ├── check.ts
│   │   └── index.ts
│   ├── options.ts
│   ├── errors.ts
│   ├── exit-codes.ts
│   └── format.ts
│
├── application/
│   ├── analyze-project.ts
│   └── project-context.ts
│
├── discovery/
│   ├── project-discovery.ts
│   ├── environment-discovery.ts
│   ├── git-discovery.ts
│   └── package-manager-discovery.ts
│
├── detectors/
│   ├── runtime/
│   ├── dependencies/
│   ├── environment/
│   ├── configuration/
│   └── git/
│
├── rules/
│   ├── runtime/
│   ├── dependencies/
│   ├── environment/
│   ├── configuration/
│   └── git/
│
├── scoring/
│   └── score.ts
│
├── reporting/
│   ├── report.ts
│   └── terminal-renderer.ts
│
├── platform/
│   ├── filesystem.ts
│   ├── process.ts
│   ├── os.ts
│   └── git.ts
│
├── types/
│   ├── finding.ts
│   ├── project.ts
│   └── analysis.ts
│
└── index.ts
```

The structure may evolve during implementation, but responsibilities should remain separated.

---

# 25. Dependency Direction

The architecture should maintain a mostly one-directional dependency flow:

```text
CLI
 ↓
Application
 ↓
Detection / Rules
 ↓
Platform
```

Reporting should consume analysis results rather than perform analysis.

Scoring should consume findings rather than inspect the filesystem directly.

Detectors should not depend on CLI formatting.

Example:

```text
GOOD:

Detector → Finding
Scorer   → Finding[]
Renderer → AnalysisResult


BAD:

Detector → Chalk
Detector → Commander
Detector → Terminal renderer
Scorer   → Filesystem
```

---

# 26. Configuration

WOMM should minimize configuration in V1.

The default command should work without a configuration file:

```bash
womm
```

A user should not need to create:

```text
.wommrc
womm.config.js
womm.yaml
```

for normal usage.

Configuration support can be introduced later if real use cases justify it.

---

# 27. Environment Variables

WOMM itself should not require environment variables for normal operation.

There should be:

```text
No WOMM API key
No cloud credentials
No telemetry key
No remote service configuration
```

WOMM may inspect project environment-variable **names**, but must never print their values.

Example:

```text
DATABASE_URL     ✓ declared
API_KEY          ⚠ required
SECRET_TOKEN     ⚠ required
```

Never:

```text
API_KEY=sk-xxxxxxxx
```

---

# 28. Networking

WOMM V1 does not require networking.

The core scanner must work with the network completely disabled.

This means:

```text
No API calls
No telemetry
No remote project uploads
No dependency installation
No cloud scanning
No external validation
```

This is a deliberate product feature.

---

# 29. AI

AI is explicitly **not part of the V1 core engine**.

The detection engine must not depend on:

- OpenAI
- Gemini
- Claude
- Ollama
- Local LLMs
- Embedding models
- Vector databases

The V1 engine must remain deterministic.

AI-assisted functionality may be added in a future version as an optional adapter.

Possible future architecture:

```text
Deterministic Engine
        ↓
Findings
        ↓
Optional AI Explanation Layer
```

AI must never become necessary for basic scanning.

---

# 30. Docker

Docker is explicitly excluded from V1.

There should be no Docker dependency in:

```text
package.json
architecture
CLI
scanner
tests
installation
documentation
```

Docker-based reproduction may be considered in a future version.

The V1 architecture should simply avoid preventing future integration.

---

# 31. Security and Privacy

WOMM runs against potentially sensitive source repositories.

Therefore:

### Never upload source code.

### Never transmit environment variables.

### Never print secret values.

### Never modify the project.

### Never execute arbitrary project scripts automatically.

For example, WOMM should not automatically run:

```bash
npm install
npm run build
npm test
python app.py
```

unless a future feature explicitly introduces controlled execution.

V1 is an analyzer, not an executor.

---

# 32. Performance

WOMM should feel nearly instantaneous for normal repositories.

Target:

```text
Small project: < 1 second
Typical project: 1–3 seconds
Large project: graceful degradation
```

Performance priorities:

1. Avoid unnecessary filesystem traversal
2. Avoid reading huge files unnecessarily
3. Ignore `.git` contents except where explicitly required
4. Ignore dependency directories such as `node_modules`
5. Avoid duplicate filesystem reads
6. Run independent detectors efficiently
7. Avoid spawning excessive processes

---

# 33. Large Repository Handling

WOMM must not blindly scan every file.

Default exclusions should include:

```text
node_modules/
.git/
.venv/
venv/
__pycache__/
dist/
build/
coverage/
.next/
.cache/
```

Additional exclusions may be added as the detection engine evolves.

The scanner should focus on:

- Configuration
- Metadata
- Source files relevant to specific rules
- Dependency manifests
- Git metadata

---

# 34. Cross-Platform Rules

Platform-specific behavior must be isolated.

Instead of scattering:

```text
process.platform === ...
```

throughout the codebase, platform logic should primarily live inside the platform layer.

Example:

```text
platform/
├── os.ts
├── filesystem.ts
├── process.ts
└── git.ts
```

Detectors should consume normalized information.

---

# 35. Error Handling

Errors should be classified.

### Expected environmental errors

Examples:

```text
Git is not installed
Python is not installed
Permission denied for one file
Project is not a Git repository
```

These should normally result in partial analysis rather than a crash.

### WOMM execution errors

Examples:

```text
Unable to initialize scanner
Invalid internal state
Unexpected filesystem failure
```

These may terminate the scan.

### User input errors

Examples:

```text
Invalid path
Unknown command
Invalid option
```

These should produce clear CLI errors.

---

# 36. Logging

WOMM should not produce noisy logs by default.

Default output should be the human-facing analysis report.

Debug information may be exposed through:

```bash
womm --verbose
```

Debug logs must not accidentally expose:

- Environment variable values
- Secrets
- Credentials
- Tokens
- Full sensitive file contents

---

# 37. Exit Codes

The CLI will use deterministic exit codes.

```text
0 → No warnings or critical issues
1 → One or more warnings
2 → One or more critical issues
3 → WOMM execution failure
4 → Invalid CLI usage / target path
```

These codes allow WOMM to later integrate naturally with:

```text
CI
pre-commit hooks
GitHub Actions
scripts
development workflows
```

No CI implementation is required for V1.

---

# 38. Package Distribution

The intended distribution channel is npm.

Primary installation:

```bash
npm install -g @isthatpratham/womm
```

One-time execution:

```bash
npx @isthatpratham/womm check .
```

pnpm:

```bash
pnpm dlx @isthatpratham/womm check .
```

The published package should contain only files required to execute WOMM.

Development files, tests, fixtures, and internal documentation should not unnecessarily inflate the npm package.

---

# 39. Versioning

WOMM should follow Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

Examples:

```text
1.0.0
1.1.0
1.1.1
```

V1 detection rules should be treated as product behavior.

Adding a new detector should normally be a minor feature release.

Changing the meaning of an existing rule or exit code may require stronger versioning consideration.

---

# 40. Technology Decisions

The following decisions are locked for V1:

```text
Language        → TypeScript
Runtime         → Node.js 20+
Package Manager → pnpm
CLI             → Commander
Build           → tsup
Testing         → Vitest
Linting         → ESLint
Formatting      → Prettier
Distribution    → npm
Architecture    → Modular deterministic scanner
Execution       → Local only
Networking      → Not required
AI              → Excluded
Docker          → Excluded
Telemetry       → Excluded
Project writes  → Excluded
```

---

# 41. Engineering Principles

All implementation decisions should follow these principles.

### 1. Deterministic first

The same project and environment should produce the same analysis.

### 2. Offline first

The core engine must work without network access.

### 3. Read-only by default

WOMM diagnoses. It does not modify.

### 4. Standard library first

Do not add dependencies unnecessarily.

### 5. Cross-platform by design

Windows, macOS, and Linux are first-class targets.

### 6. Explainable results

Every finding should have evidence and a reason.

### 7. Small modules

A new rule should not require modifying a giant scanner file.

### 8. Fast feedback

The CLI should feel lightweight enough to run frequently.

### 9. No hidden behavior

No telemetry, uploads, background services, or unexpected project execution.

### 10. Future-proof, not future-heavy

Design clean extension points for future features without implementing those features prematurely.

---

# 42. V1 Technology Boundary

The following diagram represents the intended technology boundary:

```text
                         WOMM V1
                            │
              ┌─────────────┴─────────────┐
              │                           │
          TypeScript                  Node.js
              │                           │
              └─────────────┬─────────────┘
                            │
                       CLI / Commander
                            │
                    Application Engine
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
      Discovery          Detection          Rules
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                       Findings
                            │
                    ┌───────┴───────┐
                    │               │
                 Scoring         Reporting
                    │               │
                    └───────┬───────┘
                            │
                       Terminal CLI


                EXPLICITLY OUTSIDE V1

                    ✗ Docker
                    ✗ AI
                    ✗ Cloud
                    ✗ APIs
                    ✗ Telemetry
                    ✗ Auto-fixes
                    ✗ Dependency installation
```

---

# 43. Final Stack Decision

WOMM V1 should remain a **small TypeScript + Node.js CLI with a deterministic local analysis engine**.

The technology stack should support the product rather than become the product.

The core promise remains:

> **Works on my machine. Let's prove it.**

If a technology choice makes WOMM heavier, slower, less deterministic, less private, or harder to run locally without providing a clear user benefit, it should not be included in V1.
