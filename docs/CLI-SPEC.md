# WOMM — CLI Specification

**Project:** works-on-my-machine<br>
**CLI:** `womm`<br>
**Document:** CLI Specification<br>
**Version:** 1.0<br>
**Status:** V1 Specification<br>
**Last Updated:** 2026-09-08<br>

---

# 1. Purpose

This document defines the command-line interface for WOMM V1.

The CLI is the primary user-facing interface for:

- Running project analysis
- Viewing reproducibility findings
- Understanding detected risks
- Inspecting detailed diagnostics
- Returning meaningful process exit codes

The CLI must remain simple.

The primary interaction should be:

```bash
womm
```

The user should not need to understand WOMM's internal architecture to use it.

---

# 2. CLI Philosophy

WOMM follows five CLI principles.

## 2.1 Zero-friction

The fastest path should be:

```bash
womm
```

No required configuration.

No required API key.

No required network connection.

No required Docker installation.

---

## 2.2 Actionable output

WOMM should prioritize:

1. What was found.
2. How serious it is.
3. Why it matters.
4. What the developer should do.

Avoid overwhelming the user with implementation details.

---

## 2.3 Human-first

Terminal output should be optimized for developers reading it directly.

The default output should be:

- Concise
- Scannable
- Structured
- Visually clear
- Color-aware

---

## 2.4 Scriptable

Although the default interface is human-friendly, the underlying architecture must allow machine-readable output in future versions.

The CLI must therefore keep:

```text
AnalysisResult
```

separate from terminal rendering.

---

## 2.5 Read-only

Running any V1 command must not modify the project.

WOMM must not:

- Edit files
- Install dependencies
- Change Git state
- Create configuration files
- Start services
- Stop services

---

# 3. Installation

WOMM will be distributed through npm.

Global installation:

```bash
npm install -g @isthatpratham/womm
```

Then:

```bash
womm
```

One-time execution:

```bash
npx @isthatpratham/womm check .
```

Alternative package-manager execution:

```bash
pnpm dlx @isthatpratham/womm check .
```

The package should expose the CLI through the npm `bin` field.

Expected executable:

```text
womm
```

---

# 4. Command Structure

The V1 command hierarchy is intentionally small.

```text
womm
│
├── check
│
├── --help
└── --version
```

The default command and `check` command perform the core analysis.

Future commands such as:

```text
womm fix
womm explain
womm report
womm ci
womm docker
```

are outside V1.

---

# 5. Primary Command

## Syntax

```bash
womm
```

Equivalent conceptually to:

```bash
womm check .
```

The current working directory is analyzed.

---

## Example

```text
$ womm

  WORKS ON MY MACHINE

  Scanning project...

  Project          Next.js
  Runtime          Node.js 22.14
  Package Manager  pnpm

  Runtime          ✓
  Dependencies     ✓
  Environment      ⚠
  Configuration    ⚠
  Git              ✓

  Reproducibility Score

  ██████████████░░░░░░ 72/100

  ⚠ 3 portability issues detected

  1. Node.js version is not pinned
  2. .env.example is missing
  3. localhost dependency detected

  Run `womm check` for detailed diagnostics.
```

---

# 6. Check Command

## Syntax

```bash
womm check
```

Analyzes the current directory.

A target path may also be supplied:

```bash
womm check ./my-project
```

Absolute paths should be supported:

```bash
womm check /home/user/project
```

Windows paths should be supported:

```powershell
womm check C:\Users\User\project
```

---

# 7. Target Path

The CLI should accept an optional positional target.

```bash
womm check [path]
```

Default:

```text
.
```

Examples:

```bash
womm check
womm check .
womm check ./app
womm check ../project
```

The path must resolve to a readable directory.

If the path does not exist:

```text
Error: Target directory does not exist.
```

The process should exit with the CLI error code.

---

# 8. Global Options

V1 should support a minimal set of global options.

## `--help`

```bash
womm --help
```

or:

```bash
womm check --help
```

Displays available commands and options.

---

## `--version`

```bash
womm --version
```

Outputs the installed WOMM version.

Example:

```text
womm 0.1.0
```

The version must be sourced from the package version rather than hardcoded in multiple locations.

---

# 9. Optional V1 Output Flags

The following flags may be implemented if they do not complicate the initial release.

## `--verbose`

```bash
womm --verbose
```

Provides additional diagnostic information.

Verbose output may include:

- Detector execution
- Detected project files
- Analysis stages
- Additional evidence

Verbose mode must never expose secrets.

---

## `--no-color`

```bash
womm --no-color
```

Disables ANSI color and terminal styling.

This is important for:

- CI
- Log files
- Pipes
- Accessibility
- Terminals that do not support color

If terminal color is automatically disabled because stdout is not a TTY, WOMM should respect that behavior.

---

# 10. Commands Explicitly Deferred

These commands must not be implemented as V1 features unless the implementation is required for the core CLI.

```text
womm fix
womm explain
womm doctor
womm report
womm ci
womm docker
```

Future functionality should not be simulated in V1.

For example, do not create:

```bash
womm fix
```

that merely prints:

```text
Coming soon.
```

unless there is a clear UX reason.

Keep the CLI focused.

---

# 11. Startup Behavior

When WOMM starts:

```text
1. Parse arguments.
2. Resolve target path.
3. Validate target.
4. Create analysis context.
5. Run discovery.
6. Run detectors.
7. Evaluate rules.
8. Aggregate findings.
9. Calculate score.
10. Render report.
11. Exit with appropriate code.
```

---

# 12. Loading State

For operations that take noticeable time, WOMM may display a loading indicator.

Example:

```text
⠋ Scanning project...
```

The spinner should:

- Work on supported terminals.
- Stop cleanly before output.
- Not corrupt piped output.
- Not be required for correctness.

For very fast operations, WOMM may omit the spinner entirely.

---

# 13. Default Output Structure

The default report should follow this hierarchy:

```text
Header
↓
Project summary
↓
Category status
↓
Score
↓
Important findings
↓
Next action
```

Example:

```text
╭────────────────────────────────────╮
│       WORKS ON MY MACHINE          │
╰────────────────────────────────────╯

Project: my-project

Runtime          ✓
Dependencies     ✓
Environment      ⚠
Configuration    🔴
Git              ✓

Reproducibility Score

████████████░░░░░░░░ 61/100

🔴 1 critical issue
⚠ 2 warnings

Critical

1. Required environment variable is missing
   DATABASE_URL

Warnings

2. Node.js version is not pinned
3. Hardcoded localhost URL detected

Next:

  Add DATABASE_URL and pin the Node.js version.
```

---

# 14. Project Summary

Where detectable, WOMM should display:

```text
Project
Framework
Runtime
Package Manager
```

Example:

```text
Project          my-app
Framework        Next.js
Runtime          Node.js 22.14
Package Manager  pnpm
```

Unknown values should not be invented.

Use:

```text
Unknown
```

or omit the field.

---

# 15. Category Status

V1 categories:

```text
Runtime
Dependencies
Environment
Configuration
Git
```

Each category receives a status based on its findings.

Suggested status model:

```text
✓ PASS
⚠ WARNING
🔴 CRITICAL
```

If a category could not be analyzed:

```text
? UNAVAILABLE
```

Example:

```text
Runtime          ✓
Dependencies     ✓
Environment      ⚠
Configuration    🔴
Git              ?
```

---

# 16. Category Status Rules

A category's overall status should be determined by its highest-severity finding.

Priority:

```text
CRITICAL
   ↓
WARNING
   ↓
INFO
   ↓
PASS
```

Therefore:

```text
No findings
→ PASS
```

```text
Only INFO
→ PASS
```

```text
At least one WARNING
→ WARNING
```

```text
At least one CRITICAL
→ CRITICAL
```

An analysis error should be represented separately from a project finding.

---

# 17. Score Display

The score must always be displayed when analysis completes successfully.

Example:

```text
Reproducibility Score

███████████████░░░░░ 76/100
```

The exact score calculation is defined in:

```text
docs/SCORING.md
```

The CLI must not calculate score itself.

It should consume the result provided by the scoring layer.

---

# 18. Score Interpretation

The CLI may provide a human-readable interpretation.

Suggested ranges:

```text
90–100
Highly reproducible

75–89
Mostly reproducible

50–74
Reproducibility risks detected

25–49
Significant reproducibility problems

0–24
Highly environment-dependent
```

These ranges are presentation guidance only.

The authoritative scoring model belongs to `SCORING.md`.

---

# 19. Finding Display

Every finding should have:

```text
Severity
Title
Explanation
Evidence
Recommendation
```

Example:

```text
🔴 RUNTIME-001

Node.js version mismatch

Required: Node.js >=20
Current: Node.js 18.20

This project requires a newer Node.js version
than the one currently installed.

Recommendation:
Install Node.js 20 or newer.
```

---

# 20. Finding Ordering

Findings should be ordered by importance.

Default order:

```text
CRITICAL
WARNING
INFO
```

Within the same severity, use stable deterministic ordering.

Recommended secondary ordering:

```text
Category
Rule ID
```

The order must not change randomly between runs.

---

# 21. Maximum Summary Findings

The default summary should not display an excessive number of findings.

Recommended:

```text
Maximum 5 findings
```

If more exist:

```text
⚠ 12 issues detected

Showing the 5 most important.

Run `womm check` for the complete report.
```

The detailed command may display all findings.

---

# 22. Detailed Output

`womm check` should provide more information than the default invocation.

Example:

```text
$ womm check

WORKS ON MY MACHINE

Project
  Name: my-app
  Framework: Next.js
  Runtime: Node.js 22.14
  Package Manager: pnpm

Runtime
  ✓ Node.js version compatible
  ⚠ Node.js version not pinned

Dependencies
  ✓ pnpm detected
  ✓ pnpm-lock.yaml detected

Environment
  🔴 DATABASE_URL missing
  ⚠ .env.example missing
  ⚠ localhost URL detected

Configuration
  ✓ Build script detected
  ✓ Start script detected

Git
  ✓ Repository detected
  ✓ .env is not tracked

Score: 68/100
```

---

# 23. No Secrets in Output

This is a strict requirement.

WOMM must never print:

```text
API keys
Passwords
Tokens
Private keys
Connection secrets
Full secret environment variable values
```

For example, if:

```text
DATABASE_URL=postgres://user:password@host/db
```

exists:

Never output:

```text
DATABASE_URL=postgres://user:password@host/db
```

Instead:

```text
DATABASE_URL
Status: present
```

Evidence must be sanitized.

---

# 24. Terminal Colors

Color should communicate severity.

Recommended semantic mapping:

```text
Success → green
Warning → yellow
Critical → red
Information → cyan/neutral
Muted → gray
```

The implementation should centralize color handling.

Do not scatter ANSI escape sequences throughout the application.

---

# 25. Unicode and Accessibility

WOMM may use Unicode symbols:

```text
✓
⚠
🔴
→
```

However, output must remain understandable without them.

For example:

```text
[PASS]
[WARN]
[CRITICAL]
```

may be used when color/Unicode is unavailable.

Terminal detection should determine whether styling is appropriate.

---

# 26. Non-TTY Output

When stdout is not an interactive terminal:

```bash
womm > report.txt
```

WOMM should:

- Disable animations.
- Disable unnecessary color.
- Produce stable output.
- Avoid terminal cursor manipulation.
- Keep output parseable by humans.

Example:

```text
WORKS ON MY MACHINE

Score: 72/100

WARNING: Node.js version is not pinned.
WARNING: .env.example is missing.
```

---

# 27. Piped Output

Example:

```bash
womm | grep "CRITICAL"
```

The output should not contain:

- Spinner artifacts
- Cursor control codes
- Broken progress animations

---

# 28. Error Output

Errors should be concise and actionable.

Bad:

```text
Error: ENOENT: no such file or directory, open ...
```

Preferred:

```text
✖ Unable to access the target directory.

Path:
  ./my-project

Check that the directory exists and is readable.
```

Internal stack traces should not appear by default.

They may be available through verbose/debug mode in a future version.

---

# 29. Missing Git

Git is useful but should not make WOMM unusable.

If Git is unavailable:

```text
Git              ? UNAVAILABLE
```

WOMM should continue analyzing the project where possible.

Example:

```text
⚠ Git analysis unavailable.

Git was not found on this machine.

Other checks completed successfully.
```

This should not automatically become a project reproducibility warning unless the scoring model explicitly defines it that way.

---

# 30. Missing Runtime

If a project clearly requires Node.js but Node is unavailable:

```text
🔴 Runtime

Node.js is required by this project,
but Node.js was not found on this machine.

Recommendation:
Install a supported Node.js version.
```

This is a project/environment finding and should receive the severity defined by the relevant rule.

---

# 31. Invalid Project

If WOMM is run in an empty directory:

```bash
mkdir empty
cd empty
womm
```

It should not crash.

Preferred:

```text
No recognizable project configuration was found.

WOMM could not determine the project's runtime
or dependency requirements.

Add a supported project configuration and try again.
```

The exact exit behavior should distinguish:

```text
Valid project with problems
```

from:

```text
No analyzable project
```

---

# 32. Unsupported Project

If WOMM detects a project ecosystem it does not currently support:

```text
Project detected.

WOMM does not currently have dedicated analysis
for this project type.

Generic reproducibility checks will still run.
```

WOMM should perform generic checks wherever possible.

---

# 33. Interrupted Execution

If the user presses:

```text
Ctrl+C
```

WOMM should:

- Stop cleanly.
- Remove spinner/progress artifacts.
- Exit with a non-zero signal-related status where appropriate.
- Avoid modifying the project.

---

# 34. Exit Codes

V1 should use meaningful exit codes.

Recommended:

```text
0
Analysis completed with no warnings or critical issues.

1
Analysis completed and warnings were detected.

2
Analysis completed and at least one critical issue was detected.

3
WOMM encountered a fatal execution error.

4
Invalid CLI usage or invalid target path.
```

The exact mapping should be centralized in the CLI layer.

---

# 35. Exit Code Priority

If both warnings and critical issues exist:

```text
Critical
   ↓
Exit 2
```

If only warnings exist:

```text
Warning
   ↓
Exit 1
```

If no significant findings exist:

```text
Exit 0
```

If the application itself fails before producing a valid result:

```text
Exit 3
```

Invalid arguments:

```text
Exit 4
```

---

# 36. CI Compatibility

Although a dedicated `womm ci` command is outside V1, the exit code system must allow WOMM to be used in scripts.

Example:

```bash
womm
```

can already be used in:

```bash
npm run validate && womm
```

or:

```bash
womm
if [ $? -eq 2 ]; then
  echo "Critical reproducibility issue"
fi
```

Future CI functionality should build on the same analysis result.

---

# 37. JSON Output Future Compatibility

JSON output is not required for the initial V1 CLI, but the architecture must allow:

```bash
womm --json
```

in a future version.

The output should eventually serialize the same internal:

```text
AnalysisResult
```

used by the terminal renderer.

Do not create a second independent analysis implementation for JSON.

---

# 38. Output Contract

The terminal renderer should consume a structured result similar to:

```text
AnalysisResult
│
├── project
├── environment
├── categories
├── findings
├── score
├── duration
└── status
```

The renderer should never perform detection.

---

# 39. Performance Expectations

For normal repositories, the CLI should target:

```text
~1–3 seconds
```

for a complete scan.

The CLI should avoid:

- Installing packages
- Running application builds
- Running arbitrary project scripts
- Network requests
- Full source compilation

V1 analysis should primarily inspect:

```text
Metadata
Configuration
Filesystem
Git state
Installed runtime information
```

---

# 40. Read-Only CLI Guarantee

The following actions are forbidden during a standard scan:

```text
npm install
pnpm install
yarn install
pip install

git checkout
git reset
git clean
git commit
git push

File writes
File deletion
Configuration modification
Environment modification
```

The CLI may execute read-only system commands where necessary.

---

# 41. Shell Safety

Commands executed by WOMM must not be assembled through unsafe string concatenation.

Avoid:

```text
exec("some-command " + userInput)
```

Prefer structured process execution APIs.

Paths supplied by users must be treated as untrusted input.

Project configuration values must never be blindly executed as shell commands.

---

# 42. Cross-Platform CLI Behavior

WOMM must support:

```text
Windows
macOS
Linux
```

The CLI must avoid assumptions such as:

```text
/
bash
grep
cat
which
export
```

when platform-neutral Node.js APIs are available.

Platform-specific behavior should be isolated in the platform layer.

---

# 43. Command Naming

Commands should use simple verbs.

Current:

```text
check
```

Future:

```text
fix
explain
doctor
report
ci
```

Avoid unnecessary nesting such as:

```bash
womm project environment check
```

WOMM should remain concise.

---

# 44. Help Output

Expected:

```text
WOMM — Works On My Machine

Check whether your project is reproducible outside
your current machine.

Usage:
  womm [command] [path] [options]

Commands:
  check [path]    Analyze a project

Options:
  -v, --version   Show version
  -h, --help      Show help
      --verbose   Show additional diagnostics
      --no-color  Disable terminal colors

Examples:
  womm
  womm check
  womm check ./my-project

Learn more:
  https://github.com/<owner>/works-on-my-machine
```

The final repository URL should be inserted during release preparation.

---

# 45. Version Output

Example:

```bash
womm --version
```

Output:

```text
0.1.0
```

Or:

```text
womm 0.1.0
```

The exact format should remain consistent across releases.

---

# 46. Unknown Commands

Example:

```bash
womm banana
```

Output:

```text
Unknown command: banana

Run `womm --help` to see available commands.
```

Exit:

```text
4
```

---

# 47. Unknown Options

Example:

```bash
womm --something
```

Output:

```text
Unknown option: --something

Run `womm --help` for available options.
```

Exit:

```text
4
```

---

# 48. CLI Architecture

The CLI itself should remain thin.

```mermaid id="y8o7p1"
flowchart TD
    U[User] --> P[CLI Parser]

    P --> V[Argument Validation]

    V --> R[Target Resolver]

    R --> A[Analysis Orchestrator]

    A --> C[Project Context]

    C --> D[Detection Engine]

    D --> F[Findings]

    F --> S[Scoring Engine]

    S --> AR[Analysis Result]

    AR --> T[Terminal Renderer]

    T --> O[stdout]

    AR --> E[Exit Code Resolver]

    E --> X[Process Exit]
```

The CLI parser should not know how a Node version mismatch is detected.

The scoring engine should not know how arguments were parsed.

The renderer should not inspect files.

---

# 49. CLI Execution Lifecycle

```mermaid id="f6u1cw"
sequenceDiagram
    participant U as User
    participant C as CLI
    participant A as Analyzer
    participant D as Detectors
    participant S as Scorer
    participant R as Renderer

    U->>C: womm
    C->>C: Parse arguments
    C->>C: Resolve target
    C->>A: Start analysis
    A->>D: Run detectors
    D-->>A: Findings
    A->>S: Calculate score
    S-->>A: Score
    A-->>C: AnalysisResult
    C->>R: Render AnalysisResult
    R-->>U: Terminal report
    C->>C: Resolve exit code
    C-->>U: Process exits
```

---

# 50. CLI Module Boundaries

Recommended structure:

```text
src/cli/
│
├── index.ts
├── commands/
│   ├── check.ts
│   └── index.ts
│
├── options.ts
├── errors.ts
├── exit-codes.ts
└── format.ts
```

Responsibilities:

### `index.ts`

Application entry point.

### `commands/`

Command registration and invocation.

### `options.ts`

CLI option definitions.

### `errors.ts`

User-facing CLI errors.

### `exit-codes.ts`

Centralized process exit code definitions.

### `format.ts`

CLI-specific formatting utilities.

Business logic must remain outside these modules.

---

# 51. CLI Testing Requirements

The CLI must be tested independently from individual detectors.

Tests should verify:

```text
womm
womm check
womm check <path>
womm --help
womm --version
invalid path
unknown command
unknown option
exit codes
non-TTY behavior
```

Example:

```text
Given a project with a critical finding

Run:
womm

Expect:
Exit code 2
Output contains critical finding
```

---

# 52. Snapshot Testing

Snapshot tests may be used for stable terminal output.

However, snapshots should not become brittle because of:

- Terminal width
- OS-specific paths
- Runtime versions
- Timing
- ANSI differences

Prefer testing semantic output where possible.

---

# 53. Terminal Width

The renderer should work reasonably across terminal sizes.

It should avoid extremely wide tables.

Suggested target:

```text
80–120 columns
```

Long paths and descriptions should be wrapped or shortened.

---

# 54. Output Consistency

The same analysis should produce consistent ordering and formatting.

For example:

```text
Runtime
Dependencies
Environment
Configuration
Git
```

should always appear in that order unless the reporting specification changes.

---

# 55. No Raw Internal Errors

Users should not normally see:

```text
TypeError: Cannot read properties of undefined
```

Instead:

```text
WOMM could not complete this analysis.

Try running with `--verbose` for additional diagnostics.
```

Internal errors should be logged only when appropriate and never expose sensitive data.

---

# 56. Telemetry

V1 must not include telemetry.

The CLI must not silently send:

- Project names
- Paths
- Environment information
- Runtime information
- Git information
- Findings
- Usage statistics

to an external service.

---

# 57. Network Access

The standard V1 CLI should not require network access.

A developer should be able to disconnect from the internet and run:

```bash
womm
```

successfully.

If a future feature requires network access, it must be explicit.

---

# 58. Future CLI Evolution

The CLI should be capable of evolving into:

```text
womm
├── check
├── explain
├── fix
├── doctor
├── report
└── ci
```

Potential future usage:

```bash
womm explain ENV-001
womm fix ENV-001
womm ci --threshold 80
womm report --format json
```

These are future concepts only.

They must not influence V1 behavior unnecessarily.

---

# 59. V1 Command Contract

The complete V1 command contract is:

```text
womm
```

Analyze current directory.

```text
womm check
```

Analyze current directory with detailed diagnostics.

```text
womm check <path>
```

Analyze a specific project directory.

```text
womm --help
```

Show help.

```text
womm --version
```

Show installed version.

Optional:

```text
womm --verbose
womm --no-color
```

---

# 60. V1 CLI Definition of Done

The CLI is complete when:

- [ ] `womm` runs successfully.
- [ ] `womm` analyzes the current directory.
- [ ] `womm check` performs detailed analysis.
- [ ] Target paths are supported.
- [ ] `--help` works.
- [ ] `--version` works.
- [ ] Invalid paths produce useful errors.
- [ ] Unknown commands are handled.
- [ ] Unknown options are handled.
- [ ] Exit codes are deterministic.
- [ ] Critical findings return exit code 2.
- [ ] Warnings return exit code 1.
- [ ] Clean analysis returns exit code 0.
- [ ] Fatal WOMM errors return exit code 3.
- [ ] Invalid CLI usage returns exit code 4.
- [ ] Secrets are never printed.
- [ ] Output works without color.
- [ ] Output behaves correctly in non-TTY environments.
- [ ] The CLI remains read-only.
- [ ] No Docker functionality exists.
- [ ] No AI API is required.
- [ ] No network access is required.
- [ ] CLI behavior is covered by tests.

---

# 61. Final CLI Principle

The command should feel almost too simple:

```bash
womm
```

Then WOMM does the complicated work.

The developer should not need to know:

- Which detectors ran.
- Which files were inspected.
- Which rules evaluated.
- How the score was calculated.

Unless they ask for more detail.

The ideal interaction is:

```text
$ womm

It works on your machine.

Here's what might stop it from working elsewhere.
```

WOMM should make the **complexity invisible and the conclusion obvious**.
