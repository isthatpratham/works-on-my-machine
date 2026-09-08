# WOMM — Detection Engine Specification

**Project:** `works-on-my-machine`<br>
**CLI:** `womm`<br>
**Version:** V1<br>
**Status:** Technical Specification<br>

---

# 1. Purpose

The Detection Engine is the core of WOMM.

Its responsibility is to inspect a project and the current development environment, identify reproducibility risks, evaluate those risks using deterministic rules, and produce standardized findings.

The Detection Engine answers one fundamental question:

> **"What assumptions does this project make about the machine it is running on?"**

WOMM does not attempt to prove that a project will work everywhere.

Instead, it identifies **known conditions that commonly cause "works on my machine" failures.**

---

# 2. Core Principle

The Detection Engine must be:

- Deterministic
- Read-only
- Offline
- Explainable
- Modular
- Cross-platform
- Testable
- Fast

Given the same project and environment, the engine should produce the same findings.

The engine must never depend on an AI model to determine whether a finding exists.

---

# 3. Detection Pipeline

The complete V1 pipeline is:

```text
                    Project Path
                         │
                         ▼
                ┌─────────────────┐
                │ Project Discovery│
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Context Builder │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │    Detectors    │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │      Rules      │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Finding Aggreg. │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Scoring Engine  │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │     Report      │
                └─────────────────┘
```

Each stage has a specific responsibility.

---

# 4. Detection Categories

WOMM V1 contains five primary detection categories.

```text
1. Runtime
2. Dependencies
3. Environment
4. Configuration
5. Git
```

These categories should remain independent.

---

# 5. Category: Runtime

Runtime detection identifies assumptions about programming language runtimes and runtime versions.

Initial V1 priority:

```text
Node.js
Python
Generic runtime metadata
```

Java and additional ecosystems may be added later.

---

## 5.1 Node.js Runtime Detection

WOMM should inspect:

```text
package.json
.nvmrc
.node-version
.volta/
packageManager field
engines.node
```

The detector should determine:

- Whether the project appears to use Node.js
- Whether a Node version is declared
- Whether the version is pinned
- Whether the current Node version satisfies the declared requirement
- Whether multiple conflicting Node version declarations exist

---

## 5.2 Node Version Pinning

Potential evidence:

```text
.nvmrc
.node-version
package.json → engines.node
Volta configuration
```

Examples:

### Good

```text
.nvmrc

20.19.0
```

### Potentially weak

```text
package.json

"engines": {
  "node": ">=18"
}
```

### Risky

```text
No Node version declaration
```

The absence of a runtime declaration should normally produce a warning rather than a critical finding.

---

## 5.3 Node Version Mismatch

Example:

```text
Project expects:
Node 20

Current machine:
Node 18
```

Finding:

```text
CRITICAL

Node.js version mismatch

Project declares Node.js 20, but the current machine is
running Node.js 18.

Impact:
The project may fail to install, build, or run.

Recommendation:
Use the project's declared Node.js version.
```

Exact severity depends on how strongly the project declares the requirement.

---

## 5.4 Conflicting Runtime Declarations

Example:

```text
.nvmrc:
18

package.json:
"engines": {
  "node": "20.x"
}
```

This creates an ambiguity.

Finding:

```text
WARNING

Conflicting Node.js version declarations

.nvmrc specifies Node 18 while package.json specifies Node 20.
```

WOMM should report the evidence rather than silently choosing one source.

---

# 6. Python Runtime Detection

WOMM should inspect common Python runtime metadata:

```text
.python-version
pyproject.toml
runtime.txt
Pipfile
```

Potential checks:

- Python project detection
- Python version declaration
- Current Python version
- Version mismatch
- Conflicting declarations

Example:

```text
WARNING

Python version is not pinned.

No project-level Python version declaration was detected.
```

---

# 7. Generic Runtime Metadata

WOMM should detect common runtime indicators even when the ecosystem is not fully supported.

Examples:

```text
pom.xml
build.gradle
go.mod
Cargo.toml
composer.json
```

V1 does not need full ecosystem analysis for all of these.

The goal is to identify the project rather than falsely claim full support.

Example:

```text
INFO

Go project detected.

Advanced Go runtime analysis is not available in WOMM V1.
```

---

# 8. Category: Dependencies

Dependency detection identifies whether a project has enough information to reproduce its dependency environment.

The key question is:

> **"Can another developer determine exactly what dependencies this project expects?"**

---

# 9. Manifest Detection

Supported V1 manifests should include:

### Node.js

```text
package.json
```

### Python

```text
requirements.txt
pyproject.toml
Pipfile
```

Additional manifests may be recognized generically.

---

# 10. Lockfile Detection

For Node.js, WOMM should recognize:

```text
package-lock.json
pnpm-lock.yaml
yarn.lock
bun.lockb
```

The detector should determine:

- Which package manager appears to be used
- Whether a corresponding lockfile exists
- Whether multiple lockfiles exist
- Whether the lockfile appears inconsistent with the package manager

---

# 11. Missing Lockfile

Example:

```text
package.json
```

but:

```text
No lockfile
```

Finding:

```text
WARNING

Dependency lockfile is missing.

Impact:
Different machines may resolve different dependency versions.

Recommendation:
Commit the lockfile generated by the project's package manager.
```

The finding should not automatically assume that every project requires a lockfile.

For supported package ecosystems, WOMM should use ecosystem-aware rules.

---

# 12. Multiple Lockfiles

Example:

```text
package-lock.json
pnpm-lock.yaml
yarn.lock
```

Finding:

```text
WARNING

Multiple dependency lockfiles detected.

Detected:
package-lock.json
pnpm-lock.yaml
yarn.lock

Impact:
Different developers may use different dependency resolution strategies.

Recommendation:
Keep the lockfile corresponding to the project's intended package manager.
```

---

# 13. Package Manager Detection

WOMM should infer the package manager using evidence such as:

```text
pnpm-lock.yaml
yarn.lock
package-lock.json
bun.lockb
package.json → packageManager
```

Evidence should be ranked.

Example:

```text
Strong:
packageManager field
corresponding lockfile

Weak:
README installation instructions
```

WOMM V1 should avoid relying heavily on README prose for automated conclusions.

---

# 14. Dependency Manifest / Lockfile Consistency

WOMM should identify obvious inconsistencies.

Example:

```text
package.json
pnpm-lock.yaml
package-lock.json
```

Possible finding:

```text
WARNING

Dependency management configuration is inconsistent.

Multiple package manager artifacts were detected.
```

WOMM does not need to fully reproduce dependency resolution in V1.

---

# 15. Dependency Directory Detection

Directories such as:

```text
node_modules/
.venv/
venv/
```

should not be treated as the authoritative dependency definition.

WOMM should rely on:

```text
manifest
+
lockfile
```

rather than installed dependency directories.

---

# 16. Category: Environment

Environment detection identifies machine-specific assumptions.

This category is central to WOMM's purpose.

The key question is:

> **"Does this project depend on information that exists on this machine but may not exist elsewhere?"**

---

# 17. Environment File Detection

WOMM should recognize:

```text
.env
.env.example
.env.local
.env.development
.env.production
```

The engine must distinguish between:

- Existing environment files
- Declared environment templates
- Referenced variables
- Missing variables

---

# 18. Secrets Policy

WOMM must never print environment variable values.

Bad:

```text
DATABASE_URL=postgres://user:password@host/db
```

Good:

```text
DATABASE_URL
```

The engine should operate on variable names wherever possible.

---

# 19. `.env` Without Template

Example:

```text
.env
```

exists, but:

```text
.env.example
```

does not.

Potential finding:

```text
WARNING

Environment variables are required, but no template was found.

Impact:
Another developer may not know which variables are required.

Recommendation:
Provide a sanitized .env.example file.
```

The detector must not assume `.env.example` is mandatory for every project.

Severity should depend on evidence that environment variables are actually required.

---

# 20. Environment Variables Referenced in Source

WOMM should detect common environment access patterns.

Examples:

```text
process.env.DATABASE_URL
process.env.API_KEY
os.getenv("DATABASE_URL")
System.getenv("API_KEY")
```

For V1, detection can focus on supported ecosystems and common patterns.

The engine should collect:

```text
DATABASE_URL
API_KEY
PORT
```

but never their values.

---

# 21. Missing Environment Variable Declaration

If source code references:

```text
DATABASE_URL
STRIPE_SECRET_KEY
```

but no obvious environment template exists, WOMM may report:

```text
WARNING

Required environment variables are not documented.

Detected references:
DATABASE_URL
STRIPE_SECRET_KEY

Impact:
Another machine may not know which environment variables are required.
```

This is a high-value rule because environment configuration is one of the most common causes of onboarding failure.

---

# 22. Hardcoded Localhost

Detect patterns such as:

```text
localhost
127.0.0.1
0.0.0.0
```

However, these are not automatically errors.

For example:

```text
server.listen(3000, "127.0.0.1")
```

may be completely valid.

WOMM should distinguish between:

### Expected local development configuration

```text
DEV_SERVER_HOST=localhost
```

and:

### Potential external dependency

```text
DATABASE_URL="postgres://localhost:5432/app"
```

The second case is more significant.

---

# 23. Hardcoded IP Addresses

Detect hardcoded private/local addresses such as:

```text
192.168.x.x
10.x.x.x
172.16.x.x
127.0.0.1
```

Potential finding:

```text
WARNING

Hardcoded local network address detected.

Evidence:
192.168.1.50

Impact:
The referenced service may not exist on another machine or network.
```

Do not flag every IP address automatically.

Public API endpoints may be legitimate.

---

# 24. Absolute Paths

Detect machine-specific filesystem paths.

Examples:

### Windows

```text
C:\Users\Pratham\project
D:\data\database
```

### macOS/Linux

```text
/home/pratham/project
/Users/pratham/project
```

Finding:

```text
WARNING

Machine-specific absolute path detected.

Impact:
The referenced path may not exist on another machine.
```

The detector should avoid reporting paths that are clearly standard system paths when they are legitimate.

---

# 25. User-Specific Paths

Particular attention should be given to:

```text
C:\Users\<name>\
/Users/<name>/
/home/<name>/
```

The actual username should not be unnecessarily exposed in the terminal report.

Prefer:

```text
C:\Users\<user>\project
```

over:

```text
C:\Users\Pratham\project
```

---

# 26. Port Assumptions

Detect hardcoded ports where they indicate an external service dependency.

Examples:

```text
localhost:5432
localhost:6379
localhost:27017
localhost:3306
localhost:8080
```

Potentially recognizable services:

```text
5432  → PostgreSQL
3306  → MySQL
6379  → Redis
27017 → MongoDB
```

Example finding:

```text
WARNING

Local PostgreSQL dependency detected.

Evidence:
localhost:5432

Impact:
The project expects PostgreSQL to be available locally.
```

This does not mean the project is broken.

It means the project has an external machine/service assumption.

---

# 27. Operating-System Assumptions

Detect obvious OS-specific assumptions.

Examples:

```text
Windows-only path
.exe references
PowerShell-only commands
Unix shell commands
chmod usage
```

Potential finding:

```text
WARNING

Operating-system-specific command detected.

Evidence:
bash ./scripts/setup.sh

Impact:
The setup process may not work on Windows.
```

The engine should avoid over-reporting legitimate platform-specific scripts.

---

# 28. Category: Configuration

Configuration detection identifies project-level metadata and execution assumptions.

---

# 29. Package Scripts

For Node.js projects, inspect:

```text
package.json → scripts
```

Recognize common scripts:

```text
dev
start
build
test
lint
prepare
postinstall
```

The presence of scripts is not itself a problem.

WOMM should inspect them for portability signals.

---

# 30. Script Portability

Potentially risky examples:

```text
export NODE_ENV=production
VAR=value command
rm -rf
cp
mv
chmod
bash script.sh
```

Windows-specific:

```text
set NODE_ENV=production
del
copy
```

A script using platform-specific syntax may receive:

```text
WARNING

Platform-specific command detected in npm script.

Impact:
The script may behave differently across operating systems.
```

---

# 31. Runtime Scripts

Scripts such as:

```text
npm run dev
npm start
npm run build
```

should be identified.

WOMM can use them to understand expected project behavior.

However, V1 must not execute these scripts automatically.

---

# 32. Framework Detection

WOMM should detect common frameworks from dependency manifests.

Examples:

```text
next
react
vue
angular
express
fastapi
django
flask
```

The result can appear in the project summary:

```text
Project:
My Application

Framework:
Next.js

Runtime:
Node.js 20

Package Manager:
pnpm
```

Framework detection should primarily be informational unless a framework-specific rule exists.

---

# 33. Missing Configuration

WOMM should identify obvious missing configuration only when there is sufficient evidence.

Example:

```text
Source code references DATABASE_URL
```

but:

```text
No documented environment template
No configuration documentation
```

Potential finding:

```text
WARNING

Database configuration appears undocumented.
```

The engine must avoid guessing.

---

# 34. Category: Git

Git detection identifies repository-state and version-control issues that affect reproducibility.

---

# 35. Git Repository Detection

Determine whether the target directory is inside a Git repository.

Possible states:

```text
Git repository
Not a Git repository
Git unavailable
Git repository inaccessible
```

These are different conditions.

---

# 36. Current Branch

WOMM may report:

```text
Branch:
main
```

or:

```text
Branch:
feature/auth
```

Branch name alone is not a reproducibility problem.

It is contextual information.

---

# 37. Working Tree Changes

Use:

```bash
git status --porcelain
```

to determine whether uncommitted changes exist.

Example:

```text
WARNING

Working tree contains uncommitted changes.

Impact:
The current machine may contain behavior that is not represented
in the committed project state.
```

This is especially relevant when the user claims that a project works locally but another developer cannot reproduce it.

---

# 38. Tracked Environment Files

WOMM should detect whether sensitive environment files are tracked.

Potential example:

```text
.env
.env.local
```

If tracked by Git:

```text
CRITICAL

Environment file is tracked by Git.

Impact:
Sensitive configuration may be committed to the repository.
```

However, WOMM V1 is not a complete secret scanner.

It should primarily identify environment files that should normally remain untracked.

---

# 39. Ignored Environment Files

If:

```text
.env
```

exists and is ignored:

```text
INFO

Local environment file is present and ignored by Git.
```

This is not a problem.

---

# 40. Missing `.gitignore`

If a project contains obvious generated/local directories but no `.gitignore`, WOMM may report:

```text
WARNING

No .gitignore file detected.

Impact:
Machine-specific files may accidentally enter version control.
```

This should be an ecosystem-aware rule rather than a universal requirement.

---

# 41. Lockfile Tracking

If a lockfile exists locally but is not tracked by Git, report:

```text
WARNING

Dependency lockfile is not tracked by Git.

Impact:
Other machines may resolve different dependency versions.
```

This is a particularly important reproducibility check.

---

# 42. Required Local Files Not Tracked

WOMM should look for signs of required files that exist locally but are not represented in Git.

Examples:

```text
.env
local configuration
generated configuration
machine-specific scripts
```

The engine should be conservative.

It should report strong evidence rather than guessing that every untracked file is required.

---

# 43. Detector Architecture

Every detector should implement a common contract.

Conceptual interface:

```typescript id="4oh0qf"
interface Detector {
  id: string;
  category: DetectionCategory;

  supports(context: ProjectContext): boolean;

  analyze(context: ProjectContext): Finding[];
}
```

---

# 44. Detector Responsibilities

A detector is responsible for:

1. Determining whether it applies
2. Inspecting relevant information
3. Producing evidence
4. Passing evidence to rules
5. Returning findings

A detector should not:

- Render terminal output
- Calculate the global score
- Parse CLI arguments
- Modify project files
- Install dependencies
- Call external APIs

---

# 45. Detector Registry

Detectors should be registered centrally.

Conceptually:

```text
Detector Registry
│
├── node-runtime
├── python-runtime
├── dependency-manifest
├── dependency-lockfile
├── environment-files
├── environment-references
├── portability
├── configuration
├── git-state
└── git-tracking
```

The orchestrator can then iterate over registered detectors.

---

# 46. Rules

Detectors identify evidence.

Rules determine whether that evidence represents a problem.

This distinction is important.

Example:

```text
Detector:
Node runtime detector

Evidence:
Current Node = 18
Declared Node = 20
```

Rule:

```text
node-version-mismatch
```

Result:

```text
CRITICAL
```

---

# 47. Rule Contract

Conceptual structure:

```typescript id="azv4f7"
interface Rule {
  id: string;
  category: DetectionCategory;
  severity: Severity;

  evaluate(context: ProjectContext): Finding | null;
}
```

A rule should produce a standardized finding.

---

# 48. Finding Model

Every finding should conform to a common structure.

```typescript id="5v1wqe"
interface Finding {
  id: string;
  category: DetectionCategory;
  severity: Severity;

  title: string;
  description: string;

  evidence?: Evidence[];

  impact: string;
  recommendation: string;
}
```

---

# 49. Evidence Model

Evidence should explain why the finding exists.

Conceptually:

```typescript id="9b9p9d"
interface Evidence {
  type: string;
  source: string;
  detail?: string;
}
```

Examples:

```text
source:
package.json

detail:
engines.node = "20.x"
```

or:

```text
source:
.env

detail:
DATABASE_URL detected
```

Evidence must be sanitized.

---

# 50. Severity

V1 severity levels:

```text
CRITICAL
WARNING
INFO
```

### CRITICAL

Strong evidence that the project is unlikely to reproduce correctly.

Examples:

```text
Declared Node version conflicts with current required runtime
Tracked .env file
```

### WARNING

A reproducibility risk exists but may not prevent execution.

Examples:

```text
Missing lockfile
Unpinned runtime
Hardcoded localhost dependency
Uncommitted changes
```

### INFO

Useful contextual information without a meaningful risk.

Examples:

```text
Next.js detected
Git repository detected
Node.js 20 detected
```

---

# 51. Rule Naming

Rules should use stable IDs.

Format:

```text
<category>.<specific-condition>
```

Examples:

```text
runtime.node.unpinned
runtime.node.mismatch
runtime.node.conflict

dependencies.lockfile.missing
dependencies.lockfile.multiple
dependencies.manager.conflict

environment.env.template-missing
environment.variable.undocumented
environment.localhost.dependency
environment.absolute-path

configuration.script.platform-specific

git.env.tracked
git.lockfile.untracked
git.working-tree.dirty
git.gitignore.missing
```

Stable IDs allow future:

- JSON output
- CI integrations
- Documentation
- Suppression configuration
- Analytics
- Rule references

without changing the human-facing title.

---

# 52. Rule Deduplication

Multiple detectors may discover the same underlying issue.

Example:

```text
Environment detector:
.env required

Git detector:
.env untracked
```

These may produce related but distinct findings.

However, duplicate findings should be merged when they represent the same condition.

The aggregator should deduplicate using:

```text
finding.id
+
relevant evidence
```

---

# 53. Finding Aggregation

After detection:

```text
Detector results
      ↓
Normalize
      ↓
Validate
      ↓
Deduplicate
      ↓
Sort
      ↓
AnalysisResult
```

Sorting priority:

```text
CRITICAL
↓
WARNING
↓
INFO
```

Within the same severity:

```text
Category order
↓
Rule priority
↓
Stable rule ID
```

The ordering must be deterministic.

---

# 54. Partial Failure Handling

One detector failing should not automatically destroy the complete analysis.

Example:

```text
Node detector       ✓
Dependency detector ✓
Environment detector✓
Git detector        ✗
```

Result:

```text
WOMM completed with partial analysis.

Git:
Unavailable
```

The analysis result should preserve detector errors separately from findings.

---

# 55. Detector Errors

Detector failures should be represented internally.

Conceptually:

```typescript id="v7p6k4"
interface DetectorError {
  detectorId: string;
  message: string;
}
```

Internal errors should not expose sensitive filesystem information unnecessarily.

---

# 56. Project Context

All detectors should receive a normalized `ProjectContext`.

Conceptual model:

```typescript id="6z4dr0"
interface ProjectContext {
  rootPath: string;

  projectFiles: ProjectFile[];
  metadata: ProjectMetadata;

  runtime: RuntimeContext;
  dependencies: DependencyContext;
  environment: EnvironmentContext;
  git: GitContext;
}
```

The exact type may evolve during implementation.

---

# 57. Project File Model

Project discovery should produce normalized file information.

Conceptually:

```typescript id="t4g0e7"
interface ProjectFile {
  relativePath: string;
  type: ProjectFileType;
}
```

Examples:

```text
package.json
.env
.env.example
.gitignore
pnpm-lock.yaml
src/index.ts
```

The engine should generally operate using relative project paths when displaying evidence.

---

# 58. Source Scanning

Source scanning should be selective.

WOMM should not read the entire repository indiscriminately.

Priority:

```text
1. Configuration files
2. Dependency manifests
3. Environment templates
4. Relevant source files
5. Scripts
```

Large generated files should be ignored.

---

# 59. File Size Limits

To prevent pathological performance:

- Avoid reading extremely large files completely
- Apply reasonable per-file limits
- Skip binaries
- Skip known generated directories
- Stop scanning after sufficient evidence when possible

The exact limits can be implemented as constants and adjusted using benchmarks.

---

# 60. Binary Detection

WOMM should not attempt to interpret binary files as source code.

Examples:

```text
.png
.jpg
.jpeg
.gif
.mp4
.zip
.pdf
.exe
.dll
```

Binary detection should preferably use file content heuristics rather than only extensions where practical.

---

# 61. Ignore Rules

Default ignored directories:

```text
.git
node_modules
dist
build
coverage
.next
.cache
.venv
venv
__pycache__
```

The scanner should also respect `.gitignore` where appropriate for repository-aware analysis.

However, important project configuration files must never be skipped merely because they are ignored.

---

# 62. Determinism

The same input must produce the same result.

Avoid:

```text
Current random IDs
unordered filesystem traversal
random finding ordering
network-dependent checks
time-dependent rules
```

If filesystem traversal order differs by operating system, results must be sorted before processing.

---

# 63. False Positive Strategy

WOMM should prefer:

> **Useful warnings over aggressive guessing.**

A detector should not report a problem solely because a pattern exists.

Example:

```text
localhost
```

does not automatically mean:

```text
BROKEN
```

Instead, the rule should ask:

```text
Is localhost being used as an external dependency?
Is this a development server?
Is this configuration intentionally local?
```

When confidence is low, downgrade or omit the finding.

---

# 64. Confidence

V1 does not need a user-visible numerical confidence score.

Internally, rules may classify evidence as:

```text
HIGH
MEDIUM
LOW
```

This can help determine severity.

Example:

```text
Strong version mismatch:
HIGH confidence → CRITICAL

Unclear localhost reference:
LOW confidence → INFO or no finding
```

---

# 65. Initial V1 Rule Set

The first implementation should prioritize approximately these rules.

## Runtime

```text
runtime.node.unpinned
runtime.node.mismatch
runtime.node.conflict
runtime.python.unpinned
runtime.python.mismatch
```

## Dependencies

```text
dependencies.lockfile.missing
dependencies.lockfile.multiple
dependencies.manager.conflict
dependencies.lockfile.untracked
```

## Environment

```text
environment.env.template-missing
environment.variable.undocumented
environment.localhost.dependency
environment.absolute-path
environment.hardcoded-local-ip
```

## Configuration

```text
configuration.script.platform-specific
configuration.runtime-metadata.missing
```

## Git

```text
git.env.tracked
git.working-tree.dirty
git.gitignore.missing
git.lockfile.untracked
```

This is the initial target, not a requirement to implement every rule simultaneously.

---

# 66. Rule Priority

Implementation priority should be based on practical "works on my machine" impact.

### Tier 1 — Highest value

```text
Node/runtime mismatch
Missing runtime declaration
Missing lockfile
Multiple lockfiles
Missing environment documentation
Hardcoded local dependency
Absolute machine-specific path
Tracked .env
Untracked lockfile
```

### Tier 2

```text
Platform-specific scripts
Dirty working tree
Conflicting runtime declarations
Missing .gitignore
```

### Tier 3

```text
Additional ecosystems
Advanced source scanning
Advanced configuration inference
```

---

# 67. Example End-to-End Detection

Consider:

```text
project/
├── package.json
├── src/
│   └── server.js
├── .env
├── .gitignore
└── package-lock.json
```

`package.json`:

```json
{
  "engines": {
    "node": "20.x"
  }
}
```

Current machine:

```text
Node 18
```

`server.js`:

```javascript
const db = process.env.DATABASE_URL;
```

`.env`:

```text
DATABASE_URL=postgres://localhost:5432/app
```

The engine may produce:

```text
CRITICAL
runtime.node.mismatch
Node 18 is running, but the project requires Node 20.x.

WARNING
environment.env.template-missing
Environment variables are used but no template was found.

WARNING
environment.localhost.dependency
A local PostgreSQL dependency was detected.

WARNING
git.env.tracked
.env is tracked by Git.
```

The actual severity of each finding depends on the implemented rule logic and evidence.

---

# 68. Example Clean Project

A well-configured project might produce:

```text
Runtime
✓

Dependencies
✓

Environment
✓

Configuration
✓

Git
✓

Reproducibility Score: 100/100

No known reproducibility issues detected.
```

The result means:

> WOMM found no known issues within its detection scope.

It does **not** mean:

> This project is guaranteed to work everywhere.

---

# 69. Example Partial Support

For an unsupported ecosystem:

```text
Project:
Rust Application

Runtime:
Rust detected

Dependencies:
Cargo manifest detected

Environment:
No obvious issues

Configuration:
Limited analysis

Git:
Repository detected
```

WOMM should clearly communicate the boundary of its analysis.

It must not pretend that unsupported ecosystems have been fully validated.

---

# 70. Performance Requirements

Detection should target:

```text
Typical project:
1–3 seconds
```

To achieve this:

- Cache discovery results within a single scan
- Avoid repeated file reads
- Avoid recursive scanning when unnecessary
- Ignore generated directories
- Avoid spawning unnecessary processes
- Process independent checks efficiently

Persistent caching is not required in V1.

---

# 71. Read-Only Guarantee

The Detection Engine must never:

```text
write files
delete files
rename files
install dependencies
modify package.json
modify lockfiles
modify .env
modify .gitignore
commit changes
checkout branches
reset Git
```

WOMM observes.

It does not repair.

---

# 72. No Project Execution

V1 detectors must not execute arbitrary project code.

Do not automatically run:

```text
npm install
npm test
npm run build
npm start
python app.py
```

Reasons:

- Security
- Predictability
- Performance
- Side effects
- Potentially destructive scripts

Future controlled execution can be considered separately.

---

# 73. No Network Dependency

No detector should require:

```text
HTTP requests
DNS lookups
remote APIs
package registries
GitHub
npm registry
PyPI
cloud services
```

The scanner must work on an offline machine.

---

# 74. Future Extensibility

The engine should support future detector categories without changing the core pipeline.

Potential future categories:

```text
Services
Databases
Containers
Cloud
CI
Build Systems
Toolchains
AI-generated project assumptions
```

However, these are not V1 requirements.

---

# 75. Future Docker Integration

Docker is explicitly excluded from V1.

If added later, it should sit outside the deterministic core.

Potential future flow:

```text
WOMM Detection Engine
        │
        ├── Local Analysis
        │
        └── Optional Reproduction Adapter
                         │
                       Docker
```

Docker should not become a requirement for normal WOMM usage.

---

# 76. Future AI Integration

AI should operate on findings rather than replace detection.

Future architecture:

```text
Project
   ↓
Deterministic Detection Engine
   ↓
Findings
   ↓
Optional AI Layer
   ├── Explain
   ├── Prioritize
   └── Suggest Fix
```

This preserves deterministic diagnosis while allowing richer explanations later.

---

# 77. Testing Requirements

Every rule must have tests.

Minimum test structure:

```text
Rule
├── positive case
├── negative case
├── edge case
└── malformed input case
```

Example:

```text
runtime.node.mismatch
├── Node 18 vs required 20 → finding
├── Node 20 vs required 20 → no finding
├── Node 20.10 vs 20.x → no finding
└── malformed engines field → graceful handling
```

---

# 78. Fixture-Driven Testing

Fixture repositories should represent realistic projects.

Example:

```text
fixtures/
├── clean-node/
├── node-version-mismatch/
├── node-unpinned/
├── missing-lockfile/
├── multiple-lockfiles/
├── missing-env-template/
├── localhost-database/
├── absolute-path/
├── tracked-env/
├── dirty-git/
└── platform-specific-script/
```

Expected findings should be explicit.

---

# 79. Cross-Platform Testing

Where platform behavior matters, tests should account for:

```text
Windows
macOS/Linux
```

Examples:

```text
Windows absolute path
Unix absolute path
PowerShell script
Bash script
Windows command
Unix command
```

Rules must avoid assuming the machine running the test is the only platform that matters.

---

# 80. Detection Engine Quality Gates

The Detection Engine is considered V1-ready when:

```text
✓ Detectors are modular
✓ Rules have stable IDs
✓ Findings use a common schema
✓ Results are deterministic
✓ Tests cover major rules
✓ No detector modifies project files
✓ No detector requires network access
✓ No detector requires AI
✓ No detector requires Docker
✓ Secrets are never exposed
✓ Large dependency directories are ignored
✓ Partial detector failures are handled
✓ Findings are deduplicated
✓ Findings are consistently ordered
✓ Unsupported projects degrade gracefully
```

---

# 81. Final Principle

WOMM should not attempt to answer:

> **"Will this project definitely work on another machine?"**

That is impossible to guarantee through static analysis alone.

Instead, WOMM answers the more useful question:

> **"What assumptions does this project make about the machine it's running on, and which of those assumptions are not reproducible?"**

The Detection Engine exists to turn those assumptions into:

```text
Evidence
   ↓
Findings
   ↓
Severity
   ↓
Score
   ↓
Action
```

That is the core of WOMM.

**Works on my machine. Let's prove it.**
