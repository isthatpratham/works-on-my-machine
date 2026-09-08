<p align="center">
  <img src="images/1.png" alt="WOMM — Works on my machine. Let's prove it." width="480">
</p>

<h1 align="center">WOMM</h1>

<p align="center">
  <strong>Works on my machine. Let's prove it.</strong>
</p>

<p align="center">
  A local-first CLI that finds the environment differences that make projects work on one machine and fail on another.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#what-it-checks">What It Checks</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#documentation">Documentation</a>
</p>

---

## The Problem

> "But it works on my machine."

Every developer has heard it.

A project works perfectly on one laptop, then someone else clones it and gets:

- A different Node/Python version
- Missing environment variables
- Different dependency versions
- A local database that doesn't exist
- A hardcoded machine path
- An OS-specific command
- A lockfile that never made it into Git
- Configuration that only exists on the original machine

Usually, you discover these problems **after** someone else tries to run the project.

WOMM asks a better question:

> **What assumptions is this project making about the machine it's running on?**

And then it shows you.

---

## Quick Start

### Run it in the current project

```bash
npx womm
```

Or install it globally:

```bash
npm install -g womm
```

Then:

```bash
womm
```

You can also analyze another project:

```bash
womm check ./my-project
```

No account.

No API key.

No cloud service.

No Docker.

No AI.

Just run it.

---

## What It Looks Like

```text
$ womm

  WORKS ON MY MACHINE

  Scanning project...

  Runtime          ✓
  Dependencies     ⚠
  Environment      ⚠
  Configuration    ✓
  Git              ✓

  Reproducibility Score: 72/100

  ⚠ 3 issues may prevent this project
    from working on another machine.

  WARNING  Dependency lockfile is missing
           Different machines may resolve different versions.

  WARNING  .env.example is missing
           Required environment variables may not be documented.

  WARNING  Local PostgreSQL dependency detected
           The project expects PostgreSQL at localhost:5432.

  → Run `womm check --verbose` for all findings.
```

The goal is simple:

**Run WOMM before someone else runs into the problem.**

---

# What Is WOMM?

WOMM is a deterministic, local-first project reproducibility analyzer.

It inspects:

```text
Your Project
     +
Your Environment
     +
Git State
     ↓
Reproducibility Analysis
     ↓
Findings
     ↓
Score
     ↓
Actionable Report
```

It doesn't modify your project.

It doesn't install anything.

It doesn't upload your source code.

It simply looks at what is there and tells you what another machine might be missing.

---

# What It Checks

WOMM V1 analyzes five areas:

| Category          | What WOMM looks for                                               |
| ----------------- | ----------------------------------------------------------------- |
| **Runtime**       | Node/Python versions, runtime declarations, version mismatches    |
| **Dependencies**  | Manifests, lockfiles, package-manager conflicts                   |
| **Environment**   | `.env`, required variables, localhost dependencies, machine paths |
| **Configuration** | Scripts, framework metadata, platform-specific assumptions        |
| **Git**           | Tracked `.env`, untracked lockfiles, dirty state, `.gitignore`    |

---

## 1. Runtime

WOMM checks whether the project and the current machine agree about the runtime.

For example:

```text
Project requires: Node 20.x
Your machine:     Node 18.x
```

WOMM reports:

```text
CRITICAL

Node.js version mismatch

Project declares Node.js 20.x,
but the current machine is running Node 18.x.
```

It can also detect missing or conflicting runtime declarations.

---

## 2. Dependencies

Dependency reproducibility matters.

WOMM checks for things such as:

```text
package.json
package-lock.json
pnpm-lock.yaml
yarn.lock
bun.lockb
requirements.txt
pyproject.toml
```

For example:

```text
package.json
```

but no lockfile.

WOMM can flag:

```text
WARNING

Dependency lockfile is missing.

Different machines may resolve different
dependency versions.
```

It can also detect multiple competing lockfiles.

---

## 3. Environment

This is where many "works on my machine" problems hide.

WOMM can detect signals such as:

```text
.env
.env.example
process.env.DATABASE_URL
localhost:5432
192.168.1.50
C:\Users\someone\project
/home/someone/project
```

For example:

```text
WARNING

Local PostgreSQL dependency detected.

Evidence:
localhost:5432

Impact:
The project expects PostgreSQL to be
available on this machine.
```

WOMM **never prints environment variable values**.

It works with variable names and sanitized evidence.

---

## 4. Configuration

WOMM looks at project configuration and execution assumptions.

Examples include:

```text
npm scripts
runtime metadata
framework configuration
platform-specific commands
```

It can identify situations where:

```bash
bash ./setup.sh
```

or another OS-specific command may make the project behave differently on another machine.

---

## 5. Git

Your working directory can contain things that your repository doesn't.

WOMM checks Git state for reproducibility signals such as:

```text
.env tracked by Git
lockfile not tracked
uncommitted changes
missing .gitignore
```

Example:

```text
CRITICAL

Environment file is tracked by Git.

Impact:
Sensitive local configuration may be committed
to the repository.
```

WOMM is not a full security scanner.

It simply identifies high-value Git/reproducibility issues within its scope.

---

# The Reproducibility Score

WOMM produces a deterministic score from:

```text
0 ─────────────────────────────── 100
│                                  │
Severe                         Excellent
```

Example:

```text
Reproducibility Score: 72/100
```

The score starts at:

```text
100
```

and known reproducibility risks deduct points.

Default penalties:

```text
CRITICAL   -25
WARNING    -10
INFO         0
```

Some rules have more specific penalties based on their impact.

For example:

```text
Node mismatch              -25
Missing lockfile           -10
Local database dependency  -15
Dirty working tree          -5
                           ───
Total                      -55

Score                       45/100
```

### Score bands

|      Score | Meaning   |
| ---------: | --------- |
| **90–100** | Excellent |
|  **75–89** | Good      |
|  **50–74** | Moderate  |
|  **25–49** | Risky     |
|   **0–24** | Poor      |

A score of `100` means:

> **WOMM found no known reproducibility issues within its detection scope.**

It does **not** mean the project is guaranteed to work everywhere.

---

# How It Works

WOMM follows a deterministic analysis pipeline:

```mermaid
flowchart TD
    A["Project Path"] --> B["Project Discovery"]
    B --> C["Build Project Context"]
    C --> D["Detection Engine"]

    D --> D1["Runtime"]
    D --> D2["Dependencies"]
    D --> D3["Environment"]
    D --> D4["Configuration"]
    D --> D5["Git"]

    D1 --> E["Rule Engine"]
    D2 --> E
    D3 --> E
    D4 --> E
    D5 --> E

    E --> F["Finding Aggregator"]
    F --> G["Scoring Engine"]
    F --> H["Report Renderer"]

    G --> H

    H --> I["Human-readable CLI Report"]
```

The important part:

**Detection and presentation are separate.**

A detector doesn't know how the terminal looks.

A renderer doesn't decide whether something is a problem.

A scorer doesn't inspect your filesystem.

Each layer has one job.

---

# Architecture

```mermaid
flowchart LR
    CLI["CLI Layer"] --> APP["Application Orchestrator"]

    APP --> DISC["Discovery"]
    APP --> DET["Detection Engine"]

    DISC --> CTX["Project Context"]
    CTX --> DET

    DET --> RULES["Rule Engine"]
    RULES --> FIND["Findings"]

    FIND --> SCORE["Scoring"]
    FIND --> REPORT["Reporting"]

    SCORE --> REPORT

    PLATFORM["Platform Layer"] --> DISC
    PLATFORM --> DET
```

### Core design principles

- **Deterministic** — same input, same result
- **Read-only** — WOMM never modifies the project
- **Offline** — no network required
- **Modular** — detectors and rules are independent
- **Cross-platform** — Windows, macOS, and Linux
- **Explainable** — every finding has evidence and a recommendation

---

# Why Not Just Run Docker?

Docker can reproduce an environment.

That's useful.

But WOMM solves a different problem first:

> **Before containerizing the project, understand what is actually different about the environment.**

V1 intentionally does **not** use Docker.

Docker-based reproduction may become a future feature, but the core WOMM analyzer remains useful without it.

---

# Why Not Use AI?

Because the core problem doesn't need AI.

If WOMM sees:

```text
Project requires Node 20
Machine has Node 18
```

there is nothing an LLM needs to decide.

The result should be:

```text
Node version mismatch
```

Every time.

WOMM V1 therefore keeps the core engine:

```text
Deterministic
+
Local
+
Offline
+
Explainable
```

AI-assisted explanations may be added later as an optional layer.

---

# What WOMM Does Not Do

WOMM V1 deliberately does **not**:

- Modify your source code
- Install dependencies
- Change your configuration
- Run arbitrary project scripts
- Commit or reset Git changes
- Upload source code
- Require an API key
- Require Docker
- Require AI
- Act as a full security scanner

WOMM diagnoses.

**It doesn't "fix" things behind your back.**

---

# Read-Only by Design

WOMM is an analyzer, not a repair tool.

```mermaid
flowchart LR
    P["Your Project"] --> R["WOMM"]
    R --> A["Analyze"]
    A --> F["Find Problems"]
    F --> S["Suggest Action"]

    R -.->|"Never modifies"| P
```

That means you can safely run:

```bash
womm
```

against a project before handing it to a teammate, publishing it, or deploying it.

---

# Security & Privacy

WOMM is designed to run against real-world repositories, including private ones.

### WOMM does not upload your project.

There is no required:

```text
Cloud service
API
Telemetry
Remote scanner
```

### WOMM does not print secrets.

For example, if your project contains:

```text
DATABASE_URL=postgres://user:password@localhost/db
```

WOMM may report:

```text
DATABASE_URL
```

but it will never intentionally print:

```text
password
```

### WOMM does not execute your application.

It will not automatically run:

```bash
npm install
npm start
npm test
python app.py
```

---

# Supported Platforms

WOMM is designed for:

```text
Windows
macOS
Linux
```

The implementation avoids unnecessary shell-specific behavior and relies primarily on Node.js APIs.

---

# CLI

## Analyze the current directory

```bash
womm
```

Equivalent to:

```bash
womm check .
```

---

## Analyze another project

```bash
womm check ./my-project
```

---

## Detailed analysis

```bash
womm check --verbose
```

---

## Disable terminal colors

```bash
womm check --no-color
```

---

## Help

```bash
womm --help
```

---

## Version

```bash
womm --version
```

---

# Exit Codes

WOMM can also be used by scripts and CI systems.

| Exit Code | Meaning                          |
| --------: | -------------------------------- |
|       `0` | No warnings or critical issues   |
|       `1` | One or more warnings             |
|       `2` | One or more critical issues      |
|       `3` | WOMM execution failure           |
|       `4` | Invalid CLI usage or target path |

This means you can eventually do:

```bash
womm && echo "Looks reproducible."
```

or:

```bash
womm
if [ $? -ne 0 ]; then
  echo "Reproducibility issues detected."
fi
```

---

# Installation

## npm

```bash
npm install -g womm
```

## Run without installing

```bash
npx womm
```

## pnpm

```bash
pnpm dlx womm
```

---

# Development

Clone the repository:

```bash
git clone https://github.com/<your-username>/works-on-my-machine.git
cd works-on-my-machine
```

Install dependencies:

```bash
pnpm install
```

Run the CLI in development:

```bash
pnpm dev
```

Run tests:

```bash
pnpm test
```

Run linting:

```bash
pnpm lint
```

Build:

```bash
pnpm build
```

---

# Project Structure

```text
works-on-my-machine/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── TECH-STACK.md
│   ├── DETECTION-ENGINE.md
│   ├── CLI-SPEC.md
│   └── SCORING.md
│
├── images/
│   └── 1.png
│
├── src/
│   ├── cli/
│   ├── application/
│   ├── discovery/
│   ├── detectors/
│   ├── rules/
│   ├── scoring/
│   ├── reporting/
│   ├── platform/
│   └── types/
│
├── tests/
│   └── fixtures/
│
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── eslint.config.js
├── prettier.config.js
└── README.md
```

---

# Detection Engine

The detection engine is intentionally modular.

```mermaid
flowchart TD
    CTX["Project Context"]

    CTX --> R["Runtime Detectors"]
    CTX --> D["Dependency Detectors"]
    CTX --> E["Environment Detectors"]
    CTX --> C["Configuration Detectors"]
    CTX --> G["Git Detectors"]

    R --> RULE["Rules"]
    D --> RULE
    E --> RULE
    C --> RULE
    G --> RULE

    RULE --> FIND["Standardized Findings"]
```

A finding contains:

```text
ID
Category
Severity
Title
Description
Evidence
Impact
Recommendation
```

Example:

```text
runtime.node.mismatch

Severity:
CRITICAL

Title:
Node.js version mismatch

Evidence:
package.json → engines.node = 20.x
Machine → Node 18.x

Impact:
The project may fail to install, build, or run.

Recommendation:
Use the project's declared Node.js version.
```

---

# Current V1 Rules

The initial rule set focuses on high-value reproducibility problems.

### Runtime

```text
runtime.node.unpinned
runtime.node.mismatch
runtime.node.conflict
runtime.python.unpinned
runtime.python.mismatch
```

### Dependencies

```text
dependencies.lockfile.missing
dependencies.lockfile.multiple
dependencies.manager.conflict
dependencies.lockfile.untracked
```

### Environment

```text
environment.env.template-missing
environment.variable.undocumented
environment.localhost.dependency
environment.absolute-path
environment.hardcoded-local-ip
```

### Configuration

```text
configuration.script.platform-specific
configuration.runtime-metadata.missing
```

### Git

```text
git.env.tracked
git.working-tree.dirty
git.gitignore.missing
git.lockfile.untracked
```

The rule set will grow based on real-world usage.

---

# Technology

WOMM V1 is intentionally lightweight.

```text
TypeScript
Node.js 20+
Commander
Vitest
tsup
ESLint
Prettier
pnpm
npm
```

The project prioritizes Node's standard library wherever possible.

---

# Design Philosophy

## Diagnose before you containerize.

Before reaching for Docker, cloud environments, or complicated setup scripts, understand the assumptions your project is already making.

## Deterministic before intelligent.

A reproducibility problem should be detected by a reproducible rule whenever possible.

## Read-only before automated fixes.

A developer should know what WOMM found before anything changes.

## Local-first before cloud-first.

Your project stays on your machine.

## Simple before clever.

The ideal WOMM experience is:

```bash
womm
```

and a few seconds later:

```text
Here's what may break.
Here's why.
Here's what you should check.
```

---

# Roadmap

### V1 — Local Reproducibility Analysis

- [x] Project discovery architecture
- [x] Runtime analysis design
- [x] Dependency analysis design
- [x] Environment analysis design
- [x] Configuration analysis design
- [x] Git analysis design
- [x] Deterministic scoring model
- [ ] Node.js runtime detector
- [ ] Python runtime detector
- [ ] Dependency detectors
- [ ] Environment detectors
- [ ] Configuration detectors
- [ ] Git detectors
- [ ] CLI implementation
- [ ] Fixture-based tests
- [ ] npm package

### Future

Potential future capabilities:

```text
AI-assisted explanations
Automatic fix suggestions
Docker-based reproduction
CI integration
GitHub Actions
JSON output
Historical comparisons
Additional language ecosystems
Service/database detection
```

These are intentionally outside the V1 core.

---

# Documentation

Technical documentation lives in [`docs/`](docs/).

| Document                                          | Purpose                           |
| ------------------------------------------------- | --------------------------------- |
| [`PRD.md`](docs/PRD.md)                           | Product requirements and V1 scope |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md)         | System architecture               |
| [`TECH-STACK.md`](docs/TECH-STACK.md)             | Technology decisions              |
| [`DETECTION-ENGINE.md`](docs/DETECTION-ENGINE.md) | Detection and rule system         |
| [`CLI-SPEC.md`](docs/CLI-SPEC.md)                 | CLI behavior and UX               |
| [`SCORING.md`](docs/SCORING.md)                   | Reproducibility scoring model     |

---

# Contributing

Contributions are welcome.

If you want to add a detector or rule, the preferred approach is:

```text
1. Identify a real reproducibility problem.
2. Add a deterministic detection rule.
3. Add a representative fixture.
4. Add tests.
5. Document the rule and its scoring impact.
6. Submit a pull request.
```

A good WOMM rule should answer:

> **"What exactly would make this project fail or behave differently on another machine?"**

Avoid rules that merely report interesting information without a reproducibility benefit.

---

# Philosophy

WOMM isn't trying to tell you:

> "Your project is broken."

It's trying to catch the moment before someone else says:

> **"It doesn't work on my machine."**

So before you send that repository to your teammate...

Before you publish that starter template...

Before you hand over that project...

Run:

```bash
womm
```

**Works on my machine. Let's prove it.**

---

## License

MIT License.

See [`LICENSE`](LICENSE) for details.

---

<p align="center">
  <strong>Works on my machine. Let's prove it.</strong>
</p>

<p align="center">
  If WOMM saves you from one "works on my machine" argument, give the repo a ⭐
</p>
