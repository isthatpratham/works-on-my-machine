<p align="center">
  <img src="images/2.png" alt="WOMM — Works on my machine. Let's prove it." width="240">
</p>

---

# Works on My Machine

> Let's prove it.

[![CI](https://github.com/isthatpratham/works-on-my-machine/actions/workflows/ci.yml/badge.svg)](https://github.com/isthatpratham/works-on-my-machine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](package.json)

**WOMM** is a local-first, read-only developer CLI that analyzes your project and host machine to identify reproducibility and portability risks before code is pushed or shared.

---

## Quick Navigation

[Quick Start](#quick-start) · [What WOMM Does](#what-womm-does) · [What It Checks](#what-womm-checks) · [Scoring](#scoring) · [Command Reference](#command-reference) · [Exit Codes](#exit-codes) · [Safe by Design](#safe-by-design) · [Example Output](#example-output) · [Development](#development) · [FAQ](#faq)

---

## The Problem

> *"Works on my machine."*

Every developer has heard it, and every team has lost hours to it. A project builds and runs smoothly on one machine, only to fail on another due to hidden assumptions:

- **Runtime drift:** Unpinned or mismatched Node.js/Python versions.
- **Dependency inconsistencies:** Missing, conflicting, or untracked lockfiles.
- **Undocumented environment requirements:** Missing `.env.example` templates or undeclared environment variables.
- **Local service dependencies:** Code expecting local PostgreSQL, Redis, or daemon processes running on `localhost`.
- **Platform-specific scripts:** Shell scripts and absolute paths that fail across operating systems.
- **Git state risks:** Tracked `.env` secret files, missing `.gitignore`, or uncommitted dirty working tree state.

WOMM surfaces these portability issues instantly and gives you a single, deterministic score.

---

## Why WOMM?

- **Catch drift early:** Detect runtime and dependency mismatches before debugging broken builds.
- **Surface hidden dependencies:** Identify hardcoded `localhost` URLs and machine-specific file paths.
- **Enforce template hygiene:** Ensure every environment variable is documented in `.env.example`.
- **Single reproducibility score:** Get an instant 0–100 score that summarizes project portability.
- **Zero configuration:** Works out of the box with zero configuration files, accounts, or setup.

---

## Installation

### Global Installation (Recommended)

```bash
npm install -g @isthatpratham/womm
```

Verify the installation:

```bash
womm --version
```

### One-Time Execution

Run without global installation using `npx`:

```bash
npx @isthatpratham/womm check .
```

*(or using `pnpm dlx @isthatpratham/womm check .`)*

---

## Quick Start

### 1. Analyze Current Directory

Navigate to any project directory and run:

```bash
cd my-project
womm
```

*(Equivalent to `womm check .`)*

### 2. Analyze a Specific Target Directory

```bash
womm check ./path/to/project
```

Supports relative, absolute, and cross-platform paths (macOS, Linux, Windows).

---

## How It Works

WOMM operates as a deterministic, multi-stage analysis pipeline:

```text
Discover ───▶ Collect ───▶ Detect ───▶ Evaluate ───▶ Score ───▶ Report
```

1. **Discover:** Locates manifests, lockfiles, environment files, and configuration.
2. **Collect:** Safely inspects project files and host environment (Node.js, Python, Git).
3. **Detect:** Runs modular, deterministic detectors across five core domains.
4. **Evaluate:** Applies authoritative rule definitions to produce normalized findings.
5. **Score:** Calculates a deterministic Reproducibility Score from 0 to 100.
6. **Report:** Renders clean, actionable terminal cards with evidence and recommendations.

---

## What WOMM Checks

| Category | What it checks | Examples |
| :--- | :--- | :--- |
| **Runtime** | Runtime versions declared vs. installed on host | Node.js mismatch, unpinned engines, version conflicts |
| **Dependencies** | Lockfile presence, consistency, and tracking | Missing lockfile, multiple lockfiles, untracked lockfiles |
| **Environment** | Environment variables, templates, and service couplings | Missing `.env.example`, undocumented variables, `localhost` dependencies |
| **Configuration** | Project execution metadata and script portability | Missing package manager metadata, platform-specific shell scripts |
| **Git** | Repository state, secret exposure, and tracking hygiene | Tracked `.env` files, uncommitted changes, missing `.gitignore` |

---

## Rule Reference

### Runtime (`runtime`)

- **Node.js version mismatch** (`runtime.node.mismatch`): Project declared version does not match host Node.js version.
- **Node.js version unpinned** (`runtime.node.unpinned`): Node.js version allows arbitrary minor/patch ranges (`^`, `>=`, `*`).
- **Conflicting Node.js declarations** (`runtime.node.conflict`): Multiple configuration files declare conflicting Node.js versions.
- **Python version mismatch** (`runtime.python.mismatch`): Project declared Python version does not match host Python version.
- **Python version unpinned** (`runtime.python.unpinned`): Python version constraint is unpinned or allows unbounded ranges.

### Dependencies (`dependencies`)

- **Missing lockfile** (`dependencies.lockfile.missing`): Manifest exists (`package.json`, `pyproject.toml`) but no lockfile was found.
- **Multiple lockfiles** (`dependencies.lockfile.multiple`): Conflicting lockfiles detected from different package managers.
- **Package manager conflict** (`dependencies.manager.conflict`): Lockfile does not match declared package manager metadata.
- **Untracked lockfile** (`dependencies.lockfile.untracked`): Lockfile exists on disk but is not tracked in Git.

### Environment (`environment`)

- **Missing .env template** (`environment.env.template-missing`): `.env` file exists without a corresponding `.env.example`.
- **Undocumented environment variable** (`environment.variable.undocumented`): Environment variable used in code/`.env` but omitted from `.env.example`.
- **Local service dependency** (`environment.localhost.dependency`): Hardcoded dependency on `localhost` services (PostgreSQL, Redis, MySQL, etc.).
- **Machine-specific absolute path** (`environment.absolute-path`): Hardcoded local filesystem path (`/Users/...`, `C:\Users\...`, `/home/...`).
- **Hardcoded local IP** (`environment.hardcoded-local-ip`): Hardcoded private network IP address (`127.0.0.1`, `192.168.x.x`, `10.x.x.x`).

### Configuration (`configuration`)

- **Platform-specific script** (`configuration.script.platform-specific`): Scripts contain platform-dependent shell commands (`rm -rf`, `export`, Windows `cmd`).
- **Missing runtime engine metadata** (`configuration.runtime-metadata.missing`): Project lacks explicit runtime or engine declarations.

### Git (`git`)

- **Tracked environment file** (`git.env.tracked`): `.env` file containing local values or secrets is tracked in Git.
- **Dirty working tree** (`git.working-tree.dirty`): Uncommitted modifications or untracked changes exist in the working directory.
- **Missing .gitignore** (`git.gitignore.missing`): Git repository lacks a `.gitignore` file.
- **Untracked lockfile in Git** (`git.lockfile.untracked`): Lockfile is ignored or omitted from version control.

---

## Scoring

WOMM uses a deterministic risk deduction model:

$$\text{Score} = \max(0, 100 - \sum \text{penalties})$$

Every analysis starts at **100 points**. Findings apply deterministic penalties based on severity and risk:

### Finding Severities

| Severity | Default Penalty | Impact |
| :--- | :---: | :--- |
| **CRITICAL** | `-25 pts` | Direct portability blocker (e.g. runtime mismatch, tracked `.env`) |
| **WARNING** | `-5 to -15 pts` | Potential inconsistency or environment assumption |
| **INFO** | `0 pts` | Informational fact; does not reduce score |

### Status Bands

| Score Range | Status | Interpretation |
| :---: | :---: | :--- |
| **90 – 100** | `EXCELLENT` | Highly reproducible across machines |
| **75 – 89** | `GOOD` | Mostly reproducible with minor risks |
| **50 – 74** | `MODERATE` | Reproducibility risks detected |
| **25 – 49** | `RISKY` | Significant reproducibility problems |
| **0 – 24** | `POOR` | Severe reproducibility risks |

---

## Command Reference

| Command | Description |
| :--- | :--- |
| `womm` | Analyze current directory (default) |
| `womm check [path]` | Analyze project at target directory (default: `.`) |
| `womm --help` / `-h` | Display CLI help and available options |
| `womm --version` / `-v` | Output installed WOMM version |

---

## CLI Options

| Option | Description |
| :--- | :--- |
| `--verbose` | Enable verbose diagnostic output and detailed stage execution |
| `--no-color` | Disable colored terminal output (useful for CI, logs, and pipes) |
| `-v, --version` | Output the version number |
| `-h, --help` | Display help for command |

---

## Exit Codes

WOMM provides standardized exit codes for CI pipelines and automation scripts:

| Exit Code | Constant | Meaning |
| :---: | :--- | :--- |
| `0` | `SUCCESS` | Analysis completed successfully with no warnings or critical findings. |
| `1` | `WARNINGS` | Analysis completed and detected one or more warning findings. |
| `2` | `CRITICAL` | Analysis completed and detected one or more critical findings. |
| `3` | `FATAL` | Fatal execution error during analysis. |
| `4` | `INVALID_USAGE` | Invalid CLI arguments, unrecognized options, or inaccessible target path. |

---

## Example Output

```text
┌───────────────────────────┐
│    WORKS ON MY MACHINE    │
│      Let's prove it.      │
└───────────────────────────┘

PROJECT
test-node-app
Next.js · Node.js 22.17.1 · pnpm 10.18.0

Path: /home/user/projects/test-node-app

──────────────────────────────────────────────────

REPRODUCIBILITY

██████████░░░░░░░░░░  50 / 100

MODERATE
Reproducibility risks detected

──────────────────────────────────────────────────

CATEGORY HEALTH

  Runtime          ✖ CRITICAL
  Dependencies     ✓ PASS
  Environment      ⚠ WARNING
  Configuration    ✓ PASS
  Git              ⚠ WARNING

──────────────────────────────────────────────────

FINDINGS

┌  ✖ CRITICAL  ───────────────────────────────────────────────────────────────┐
│ Node.js version mismatch                                                     │
│ runtime.node.mismatch                                                        │
│                                                                              │
│ Project declares Node.js 20.19.0, but the current machine is running Node.js │
│ 22.17.1.                                                                     │
│                                                                              │
│ Evidence                                                                     │
│ › [runtime-mismatch] .nvmrc                                                  │
│ declared: 20.19.0, installed: 22.17.1                                        │
│                                                                              │
│ Impact                                                                       │
│ The project may fail to install, build, or run due to runtime                │
│ incompatibilities.                                                           │
│                                                                              │
│ Recommendation                                                               │
│ Switch to the project's declared Node.js version.                            │
│                                                                              │
│ -25 points                                                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌  ⚠ WARNING  ──────────────────────────────────────────────────────────────┐
│ Local service dependency detected                                          │
│ environment.localhost.dependency                                           │
│                                                                            │
│ The project references a local POSTGRES dependency on localhost.           │
│                                                                            │
│ Evidence                                                                   │
│ › [local-service] .env                                                     │
│ localhost (POSTGRES)                                                       │
│                                                                            │
│ Impact                                                                       │
│ The project expects external services to be running locally on the host    │
│ machine.                                                                   │
│                                                                            │
│ Recommendation                                                             │
│ Document local service dependencies and provide automated service setup    │
│ (e.g. scripts or documentation).                                           │
│                                                                            │
│ -15 points                                                                 │
└────────────────────────────────────────────────────────────────────────────┘

┌  ⚠ WARNING  ────────────────────────────────────────────────────────────────┐
│ No .gitignore file detected                                                  │
│ git.gitignore.missing                                                        │
│                                                                              │
│ The Git repository does not contain a .gitignore file.                       │
│                                                                              │
│ Evidence                                                                     │
│ › [missing-file] .gitignore                                                  │
│                                                                              │
│ Impact                                                                       │
│ Machine-specific files, dependency directories, or secrets may accidentally  │
│ enter version control.                                                       │
│                                                                              │
│ Recommendation                                                               │
│ Add a .gitignore file appropriate for the project ecosystem.                 │
│                                                                              │
│ -5 points                                                                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌  ⚠ WARNING  ────────────────────────────────────────────────────────────────┐
│ Working tree contains uncommitted changes                                    │
│ git.working-tree.dirty                                                       │
│                                                                              │
│ The Git working tree contains uncommitted modifications or untracked         │
│ changes.                                                                     │
│                                                                              │
│ Evidence                                                                     │
│ › [git-status] .git                                                          │
│ Working tree is dirty (uncommitted changes detected)                         │
│                                                                              │
│ Impact                                                                       │
│ The current machine state may contain behavior not represented in the        │
│ committed repository state.                                                  │
│                                                                              │
│ Recommendation                                                               │
│ Commit or stash all uncommitted changes before verifying reproducibility.    │
│                                                                              │
│ -5 points                                                                    │
└──────────────────────────────────────────────────────────────────────────────┘

──────────────────────────────────────────────────

Summary

  1 critical, 3 warnings, 0 informational

  Analysis complete.
```

---

## Safe by Design

WOMM is engineered with strict read-only, local-first safety guarantees:

- **100% Read-Only:** WOMM never modifies, creates, or deletes any files in your repository.
- **Zero Script Execution:** WOMM does not execute `npm install`, build commands, or arbitrary package scripts.
- **Zero Network Access:** Operates completely offline; no external requests are made.
- **Zero Telemetry:** No analytics, tracking, or user data are ever collected or transmitted.
- **Secret Sanitization:** Environment variable values, credentials, tokens, and database passwords are safe and never displayed in findings or evidence.
- **Deterministic:** Identical repository and host machine states always yield identical findings and scores.

---

## Supported Environment

- **Runtime:** Node.js `>= 20.0.0`
- **Operating Systems:** macOS, Linux, Windows
- **Ecosystems (V1):** Node.js (`npm`, `pnpm`, `yarn`, `bun`), Python (`pip`, `poetry`, `pipenv`), and Git repositories

---

## Development

Contributions and bug reports are welcome!

### Prerequisites

- Node.js `>= 20.0.0`
- pnpm `>= 10.0.0`

### Setup

```bash
# Clone the repository
git clone https://github.com/isthatpratham/works-on-my-machine.git
cd works-on-my-machine

# Install dependencies
pnpm install

# Run TypeScript typecheck
pnpm typecheck

# Run ESLint
pnpm lint

# Check formatting
pnpm format:check

# Run full test suite
pnpm test

# Build distribution bundle
pnpm build
```

---

## Project Structure

```text
src/
├── application/     # Application workflow and context orchestration
├── cli/             # Commander CLI setup, commands, options, and exit codes
├── detection/       # Detection engine, registry, and rule detector implementations
├── discovery/       # Project discovery and fact collection (Node, Python, Git, Env)
├── domain/          # Core domain entities, finding contracts, severity models
├── platform/        # Safe filesystem, child process, and Git interfaces
├── reporting/       # Terminal renderer, box formatters, score bars, cards
└── scoring/         # Scoring engine, penalties, status classification
```

---

## V1 Status & Roadmap

- **Current Version:** `v0.1.0`
- **Status:** Initial V1 Core Release (Local-first detection & scoring)

### Future Considerations (Post-V1)

- Machine-readable output formats (`--json`)
- Additional language ecosystem detectors (Rust, Go, Java, Dockerfile analysis)
- CI summary formatters and GitHub Actions integration
- Configurable rule thresholds and ignore files

---

## FAQ

#### Does WOMM modify my project or files?
No. WOMM is strictly read-only and never creates, updates, or deletes any project files.

#### Does WOMM run `npm install` or execute package scripts?
No. WOMM only inspects existing static files, manifests, lockfiles, and environment declarations. It never runs install or build commands.

#### Does WOMM require internet or send telemetry?
No. WOMM is 100% offline and local-first with zero telemetry or network calls.

#### Does WOMM require Docker or AI/LLMs?
No. WOMM relies on deterministic static analysis and local system discovery without Docker or external AI APIs.

#### Can I run WOMM in CI?
Yes. WOMM produces standard exit codes (`0` for clean, `1` for warnings, `2` for critical issues) and supports `--no-color` for CI log output.

#### Does a score of 100/100 guarantee my project will run everywhere?
A 100/100 score indicates that WOMM detected no reproducibility issues within its V1 detection scope. It does not guarantee universal compatibility against uninspected external hardware or proprietary services.

---

## License

WOMM is open-source software licensed under the [MIT License](LICENSE).
