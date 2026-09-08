# WOMM — Product Requirements Document

**Project:** works-on-my-machine<br>
**CLI:** `womm`<br>
**Document:** Product Requirements Document<br>
**Version:** 1.0<br>
**Status:** Draft / V1 Specification<br>
**Last Updated:** 2026-09-08<br>

---

## 1. Product Overview

WOMM, short for **Works On My Machine**, is a developer CLI that analyzes a software project and its current execution environment to identify why a project may work on one machine but fail on another.

The core philosophy is simple:

> **It works on my machine. Let's prove it.**

WOMM does not attempt to replace package managers, CI systems, Docker, or deployment platforms.

Instead, it acts as a **local reproducibility and environment diagnostic layer**.

A developer runs:

```bash
womm
```

inside a project.

WOMM inspects the project, compares project requirements against the current machine, detects machine-specific assumptions, evaluates reproducibility risks, and produces a concise actionable report.

Example:

```text
$ womm

  WORKS ON MY MACHINE

  Scanning project...

  Runtime          ✓
  Dependencies     ✓
  Environment      ⚠
  Configuration    ⚠
  Git              ✓

  Reproducibility Score: 72/100

  ⚠ 3 issues may prevent this project from working
    on another machine.

  → Node version is not pinned
  → .env is required but .env.example is missing
  → localhost dependency detected

  Run `womm check` for details.
```

---

# 2. Problem Statement

Software frequently works correctly on the developer's machine but fails when another person, CI environment, server, or deployment environment attempts to run it.

Common causes include:

- Different runtime versions
- Missing dependencies
- Different package managers
- Missing environment variables
- Machine-specific `.env` configuration
- Hardcoded localhost URLs
- Absolute filesystem paths
- Missing lockfiles
- Untracked required files
- Global dependencies
- OS-specific scripts
- Database or service assumptions
- Missing project configuration
- Native dependencies that behave differently across systems

These problems are often discovered late.

The developer may spend significant time debugging errors that could have been identified before the project was shared or deployed.

WOMM aims to detect these risks **before they become someone else's problem**.

---

# 3. Product Vision

WOMM should become a lightweight standard developer tool for answering one question:

> **"Will this project work outside my machine?"**

The long-term vision is to make project reproducibility visible, measurable, and actionable.

A developer should be able to run one command and immediately understand:

1. What environment the project expects.
2. What environment they currently have.
3. Where the two differ.
4. Which differences actually matter.
5. How reproducible the project currently is.
6. What should be fixed first.

---

# 4. V1 Goal

The goal of V1 is to build a **fast, offline, deterministic project reproducibility analyzer**.

V1 must:

- Run locally.
- Require no API key.
- Require no external service.
- Work without an internet connection.
- Analyze the current repository.
- Detect common environment and configuration risks.
- Produce actionable findings.
- Assign a reproducibility score.
- Clearly distinguish informational findings from actual risks.
- Never modify the user's project automatically.

The first release should prioritize **trust and correctness over feature count**.

---

# 5. Non-Goals

The following are explicitly outside V1.

## 5.1 Docker

Docker support is **not part of V1**.

WOMM must not:

- Generate Dockerfiles.
- Generate Docker Compose files.
- Start containers.
- Build containers.
- Manage Docker images.
- Require Docker.

Docker may be considered in a future version.

---

## 5.2 AI

V1 does not require an LLM.

WOMM must not depend on:

- OpenAI APIs
- Gemini APIs
- Anthropic APIs
- Local LLMs
- AI coding agents

The core analysis engine must be deterministic.

AI-assisted explanations or automated fixes may be considered in a future release.

---

## 5.3 Automatic project modification

V1 must not automatically modify:

- Source code
- Configuration files
- `.env`
- Package manifests
- Lockfiles
- Git configuration

WOMM is diagnostic only.

Future versions may introduce an explicit `fix` capability.

---

## 5.4 Deployment management

WOMM is not a deployment platform.

It will not:

- Deploy applications.
- Manage cloud infrastructure.
- Connect to AWS, Azure, GCP, Vercel, etc.
- Replace CI/CD.

---

## 5.5 Full security scanner

WOMM may detect certain obvious environment/security mistakes, such as tracked `.env` files, but V1 is not a security scanner.

It should not attempt to become:

- Snyk
- Dependabot
- Semgrep
- Trivy
- Secret scanning infrastructure

Security checks should remain narrowly related to reproducibility.

---

# 6. Target Users

## 6.1 Individual developers

Developers who want to know whether their projects are portable.

Example:

```bash
cd my-project
womm
```

---

## 6.2 Students

Students frequently move projects between:

- Personal laptops
- College computers
- Lab systems
- Teammates' computers
- Cloud environments

WOMM should help identify missing setup requirements quickly.

---

## 6.3 Development teams

Teams can use WOMM during onboarding and development to reduce:

> "It works for me."

problems.

---

## 6.4 Open-source maintainers

Maintainers can use WOMM to identify setup assumptions before publishing or sharing a project.

---

## 6.5 AI-assisted developers

AI-generated projects often contain implicit environment assumptions.

WOMM should work particularly well on projects created or modified by AI coding agents without requiring any special AI integration.

---

# 7. Core User Experience

The primary workflow must be extremely simple.

```bash
cd project
womm
```

WOMM scans the project and displays the result.

The user should not need to understand the internal architecture.

The output should answer:

> **What's wrong, how serious is it, and what should I do?**

---

# 8. V1 Detection Categories

V1 analysis is divided into five primary categories.

## 8.1 Runtime

WOMM detects runtime requirements and compares them with the current machine.

Potential runtimes include:

- Node.js
- Python
- Java
- Other runtimes where reliable project metadata exists

The implementation should initially prioritize Node.js and Python.

Examples:

```text
Node.js
Required: >=20
Current: 18.20
Status: CRITICAL
```

or:

```text
Node.js
Required: >=20
Current: 22.14
Status: PASS
```

---

# 9. Dependency Analysis

WOMM analyzes project dependency configuration.

Examples:

- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `yarn.lock`
- `bun.lockb`
- `requirements.txt`
- `pyproject.toml`

Potential findings include:

- Missing lockfile
- Lockfile/package manager mismatch
- Dependencies declared but unavailable
- Global dependency assumptions
- Native dependency risks
- Package manager mismatch

WOMM should not attempt to replace the package manager.

---

# 10. Environment Analysis

WOMM analyzes environment configuration and machine-specific assumptions.

Potential findings include:

- `.env` exists
- `.env.example` missing
- Environment variables referenced but not documented
- Hardcoded localhost URLs
- Hardcoded IP addresses
- Absolute filesystem paths
- Machine-specific configuration
- OS-specific assumptions
- Environment-dependent ports

Example:

```text
Environment

🔴 DATABASE_URL is required but not documented.
⚠ API_URL points to localhost.
⚠ Absolute Windows path detected.
```

WOMM must be careful around `.env` files.

It should **never print secret values**.

For example, this is prohibited:

```text
DATABASE_PASSWORD=MySecretPassword
```

Instead:

```text
DATABASE_PASSWORD
Status: present
```

---

# 11. Project Configuration Analysis

WOMM analyzes how the project declares and starts itself.

Potential sources:

- `package.json`
- `pyproject.toml`
- README setup instructions
- runtime configuration
- framework configuration
- project scripts
- configuration files

WOMM should identify:

- Start commands
- Build commands
- Test commands
- Development commands
- Required services where detectable
- Framework
- Runtime
- Package manager

Example:

```text
Project

Framework: Next.js
Runtime: Node.js
Package Manager: pnpm

Available scripts:
✓ dev
✓ build
✓ test
```

---

# 12. Git Analysis

WOMM uses Git information to detect reproducibility risks.

Potential findings include:

- Uncommitted required files
- Tracked `.env`
- Missing lockfile
- Ignored files that appear necessary
- Current branch
- Repository state

WOMM should never modify Git state in V1.

It may inspect:

```bash
git status
git branch
git ls-files
```

but should remain read-only.

---

# 13. Findings Model

Every detected issue should be represented internally using a standardized finding model.

Conceptually:

```text
Finding
├── ID
├── Category
├── Severity
├── Title
├── Description
├── Evidence
├── Impact
└── Recommendation
```

Example:

```text
ID:
ENV-001

Category:
Environment

Severity:
WARNING

Title:
Environment variables are not documented

Description:
The project references environment variables that are
not represented in an example environment file.

Evidence:
DATABASE_URL
NEXT_PUBLIC_API_URL

Impact:
Another developer may not know which variables are required.

Recommendation:
Create or update .env.example.
```

The exact implementation belongs in the architecture specification.

---

# 14. Severity Levels

V1 uses three primary severity levels.

## CRITICAL

A condition is highly likely to prevent the project from working elsewhere.

Examples:

- Required runtime missing
- Required dependency missing
- Required environment variable unavailable
- Required configuration absent
- Project explicitly requires an incompatible runtime

---

## WARNING

A condition may cause problems depending on the environment.

Examples:

- Runtime not pinned
- Hardcoded localhost
- Absolute path
- Missing lockfile
- OS-specific script

---

## INFO

Useful contextual information that does not necessarily indicate a problem.

Examples:

- Detected Node.js version
- Detected package manager
- Detected framework
- Current Git branch

---

# 15. Reproducibility Score

WOMM produces a score from:

```text
0 → 100
```

where:

- `100` means the project appears highly reproducible.
- `0` means major reproducibility problems are present.

The score must be based on deterministic rules.

It must not be randomly generated or subjective.

The exact weighting model will be defined in `SCORING.md`.

The score should communicate risk rather than pretend to guarantee portability.

Therefore:

> **A score of 100 does not guarantee that a project will work everywhere.**

It means WOMM found no known reproducibility problems within the scope of its checks.

---

# 16. User Output

CLI output must prioritize:

1. Overall status.
2. Score.
3. Important problems.
4. Recommended next actions.

Avoid dumping every technical detail immediately.

Example:

```text
╭────────────────────────────────────╮
│          WORKS ON MY MACHINE       │
╰────────────────────────────────────╯

Scanning my-project...

Runtime          ✓
Dependencies     ✓
Environment      ⚠
Configuration    ⚠
Git              ✓

Reproducibility

██████████████░░░░░░ 72/100

⚠ 3 potential portability problems

1. Node.js version is not pinned
2. .env.example is missing
3. localhost dependency detected

Run:

  womm check

for detailed diagnostics.
```

Detailed output should provide the evidence and recommendation for each finding.

---

# 17. CLI Requirements

The initial CLI should be minimal.

## Primary command

```bash
womm
```

Behavior:

- Analyze current directory.
- Produce summary.
- Exit with an appropriate status code.

---

## Explicit check command

```bash
womm check
```

Behavior:

- Perform the same analysis.
- Provide more detailed findings.

---

## Path support

The CLI should eventually support:

```bash
womm /path/to/project
```

This should be included in the architecture so it does not need to be redesigned later.

---

# 18. Exit Codes

WOMM should provide meaningful process exit codes.

Suggested model:

```text
0 = No significant problems detected

1 = Warnings detected

2 = Critical reproducibility problems detected

3 = WOMM itself encountered an execution/configuration error
```

This enables future CI integration without requiring a separate architecture.

---

# 19. Performance Requirements

WOMM should feel instant on normal projects.

Target:

> **Typical project scan should complete in approximately 1–3 seconds.**

The tool should avoid:

- Unnecessary network calls
- Full dependency installation
- Full source-code compilation
- Expensive repository-wide semantic analysis

V1 should primarily inspect metadata, configuration, filesystem information, Git state, and installed runtime information.

---

# 20. Privacy Requirements

WOMM is designed to operate locally.

V1 should not transmit project contents anywhere.

WOMM must not:

- Upload source code.
- Upload `.env` files.
- Upload Git history.
- Send environment variables to external services.

All analysis must happen locally.

---

# 21. Safety Requirements

WOMM must be read-only in V1.

It must not:

- Modify source files.
- Modify configuration.
- Modify `.env`.
- Install dependencies.
- Start services.
- Change Git branches.
- Commit changes.
- Push changes.

The user should be able to run WOMM on an unfamiliar repository without worrying that the tool will alter it.

---

# 22. Technology Requirements

The initial implementation should use:

- TypeScript
- Node.js
- npm-compatible package distribution
- Commander for CLI parsing
- Vitest for testing
- tsup for building
- ESLint for linting
- Prettier for formatting

The final dependency choices are documented separately in:

```text
docs/TECH-STACK.md
```

---

# 23. Architecture Principles

WOMM should follow these principles.

## Deterministic

The same project and environment should produce the same findings.

---

## Modular

Detection logic should be divided into independent rules.

Adding a new detection should not require rewriting the entire scanner.

---

## Extensible

The rule system should make it easy to add:

- New runtimes
- New package managers
- New frameworks
- New environment checks
- New configuration checks

---

## Offline-first

Core functionality must work without network access.

---

## Read-only

V1 only observes.

---

## Explainable

Every warning should have a reason.

Avoid:

```text
Score: 63
```

without explanation.

Prefer:

```text
Score: 63

Why:

- Runtime isn't pinned
- Required environment variables aren't documented
- Absolute path detected
```

---

# 24. Detection Strategy

WOMM should use a layered detection strategy.

```text
Project
   │
   ▼
Project Discovery
   │
   ▼
Environment Discovery
   │
   ▼
Runtime Detection
   │
   ▼
Dependency Detection
   │
   ▼
Configuration Detection
   │
   ▼
Git Detection
   │
   ▼
Rule Evaluation
   │
   ▼
Finding Collection
   │
   ▼
Score Calculation
   │
   ▼
CLI Rendering
```

Each stage should have clearly defined responsibilities.

---

# 25. Rule Design

Each rule should answer four questions:

1. What did WOMM detect?
2. Why does it matter?
3. How severe is it?
4. What should the developer do?

A rule should not merely report raw technical information.

Bad:

```text
Node version: 18
```

Better:

```text
Node.js 18 is installed, but the project requires Node.js 20+.

This may prevent the project from starting.

Recommendation:
Use Node.js 20 or newer.
```

---

# 26. Example User Scenarios

## Scenario A — New developer joins a project

Developer clones the repository.

They run:

```bash
womm
```

WOMM identifies:

```text
Node mismatch
Missing environment variables
Missing Redis
```

The developer knows exactly what needs to be installed/configured.

---

## Scenario B — Developer shares a project

Before sending the repository to a teammate:

```bash
womm
```

WOMM identifies:

```text
.env is required
.env.example missing
Node version isn't pinned
Absolute path detected
```

The developer fixes the issues before sharing.

---

## Scenario C — AI-generated project

An AI coding agent creates a project.

It works locally.

The developer runs:

```bash
womm
```

WOMM discovers:

```text
localhost assumptions
Machine-specific paths
Undocumented environment variables
Missing lockfile
```

The developer can make the project portable before publishing it.

---

## Scenario D — Old project

A developer opens a project after several months.

They run:

```bash
womm
```

WOMM reconstructs detectable project requirements:

```text
Node.js 20+
pnpm
PostgreSQL dependency detected
Required environment variables
Available scripts
```

This helps the developer understand how the project was intended to run.

---

# 27. Success Metrics

V1 should be evaluated using practical developer outcomes.

### Primary metrics

- Scan completion time
- Detection accuracy
- False-positive rate
- Number of reproducibility issues detected
- Number of actionable recommendations
- Successful installation rate

### Product-level success

A successful V1 should make a developer say:

> "I found something I didn't know was wrong with my project."

That is the core success criterion.

---

# 28. Future Possibilities

These are intentionally **not V1 requirements**.

Potential future capabilities include:

### AI explanations

```bash
womm explain
```

Ask an AI to explain complicated findings.

---

### Automatic fixes

```bash
womm fix
```

WOMM proposes and optionally applies fixes.

---

### CI integration

```bash
womm ci
```

Fail builds when reproducibility falls below a configured threshold.

---

### Docker support

```bash
womm docker
```

Generate or validate isolated environments.

**Not part of V1.**

---

### Team baseline

Compare:

```text
Developer A
Developer B
CI
Production
```

against a shared project environment specification.

---

### Environment snapshots

Generate a portable project environment manifest.

---

# 29. V1 Definition of Done

V1 is considered complete when all of the following are true:

- [ ] `womm` can be installed from npm.
- [ ] `womm` runs inside a project.
- [ ] Project type can be detected.
- [ ] Runtime information can be detected.
- [ ] Dependency metadata can be analyzed.
- [ ] Environment configuration can be analyzed.
- [ ] Project configuration can be analyzed.
- [ ] Git state can be analyzed.
- [ ] Findings use standardized severity levels.
- [ ] Reproducibility score is calculated deterministically.
- [ ] CLI output is readable and concise.
- [ ] Detailed diagnostics are available.
- [ ] Exit codes are implemented.
- [ ] Core functionality works offline.
- [ ] No project files are modified.
- [ ] No Docker functionality exists in V1.
- [ ] No AI API is required.
- [ ] Automated tests cover core detection rules.
- [ ] README contains installation and usage instructions.
- [ ] Project can be built and published as an npm CLI.

---

# 30. Product Philosophy

WOMM should never become another tool that produces a giant wall of diagnostics that developers ignore.

The product should follow one principle:

> **Don't tell me everything. Tell me what matters.**

A developer should be able to run:

```bash
womm
```

and understand the result within seconds.

The ideal experience is:

```text
Run WOMM
    ↓
See score
    ↓
See what's suspicious
    ↓
Understand why
    ↓
Know what to do next
```

WOMM exists to turn:

> **"It works on my machine."**

into:

> **"We know why it works, and we know what another machine needs."**

---

# 31. Current V1 Scope Summary

### Included

```text
✓ CLI
✓ Project discovery
✓ Runtime detection
✓ Dependency analysis
✓ Environment analysis
✓ Configuration analysis
✓ Git analysis
✓ Reproducibility rules
✓ Severity system
✓ Reproducibility score
✓ Human-readable reports
✓ Detailed diagnostics
✓ Exit codes
✓ Offline operation
✓ Automated tests
```

### Explicitly excluded

```text
✗ Docker
✗ Docker Compose
✗ AI APIs
✗ LLMs
✗ Automatic fixes
✗ Source-code modification
✗ Dependency installation
✗ Deployment
✗ Cloud integrations
✗ Full security scanning
```

---

# 32. Final Product Definition

**WOMM is a local-first developer CLI that detects the hidden environmental and configuration assumptions that make software work on one machine but fail on another.**

Its first interaction should be as simple as:

```bash
womm
```

Its answer should be equally simple:

```text
Your project works here.

Here's what might stop it from working elsewhere.
```

That is the product.
