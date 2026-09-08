# WOMM — Scoring Specification

**Project:** `works-on-my-machine`<br>
**CLI:** `womm`<br>
**Version:** V1<br>
**Status:** Technical Specification<br>

---

# 1. Purpose

The WOMM scoring engine converts detected reproducibility risks into a deterministic **Reproducibility Score from 0 to 100**.

The score provides a quick answer to:

> **"How reproducible does this project appear to be based on the issues WOMM can detect?"**

The score is a summary.

It is not a guarantee that the project will work on another machine.

---

# 2. Core Principle

The score must be:

- Deterministic
- Explainable
- Stable
- Independent of AI
- Independent of network access
- Independent of terminal rendering
- Based only on findings
- Resistant to minor noise
- Easy to test

Given the same findings:

```text
Same findings
      ↓
Same score
```

No randomness, machine-specific scoring adjustments, or hidden weighting should exist.

---

# 3. Score Range

The score is always:

```text
0–100
```

Where:

|  Score | Interpretation                    |
| -----: | --------------------------------- |
| 90–100 | Excellent reproducibility         |
|  75–89 | Good, minor risks                 |
|  50–74 | Moderate reproducibility concerns |
|  25–49 | Significant reproducibility risks |
|   0–24 | Severe reproducibility risks      |

These ranges describe **detected risk**, not guaranteed compatibility.

---

# 4. What 100 Means

A score of:

```text
100/100
```

means:

> WOMM found no known reproducibility issues within its current detection scope.

It does **not** mean:

> The project is guaranteed to run on every machine.

There may still be:

- Unsupported dependencies
- Undetected services
- Hardware requirements
- Network requirements
- External APIs
- OS-specific behavior
- Undetected configuration
- Runtime bugs
- Application-level bugs

The score must therefore always be presented as a **WOMM analysis score**, not a universal compatibility score.

---

# 5. Scoring Model

V1 uses a **risk deduction model**.

Start with:

```text
Base Score = 100
```

Each finding contributes a deterministic penalty.

```text
Final Score = max(0, 100 - Total Penalty)
```

Where:

```text
Total Penalty = Sum of finding penalties
```

This makes the score simple and transparent.

---

# 6. Severity Weights

Each severity has a base penalty.

| Severity | Base Penalty |
| -------- | -----------: |
| CRITICAL |           25 |
| WARNING  |           10 |
| INFO     |            0 |

Therefore:

```text
CRITICAL → -25
WARNING  → -10
INFO     →  0
```

INFO findings provide context but do not reduce reproducibility.

---

# 7. Why INFO Has Zero Penalty

An INFO finding is not necessarily a problem.

Example:

```text
INFO

Next.js detected.
```

There is no reason to reduce the score.

Similarly:

```text
INFO

Git repository detected.
```

should not affect the score.

The score measures **risk**, not the amount of information WOMM discovered.

---

# 8. Rule-Specific Penalties

Severity provides the default penalty.

However, certain findings can have a more precise rule-specific penalty.

V1 should support:

```text
Rule penalty
      ↓
If defined → use rule penalty
Otherwise  → severity penalty
```

This allows important distinctions between different warnings.

Example:

```text
Missing lockfile:
10

Dirty working tree:
5

Hardcoded local database:
15
```

The rule itself owns the penalty.

---

# 9. Recommended V1 Penalties

Initial rule penalties:

## Runtime

| Rule                      | Severity | Penalty |
| ------------------------- | -------- | ------: |
| `runtime.node.unpinned`   | WARNING  |      10 |
| `runtime.node.mismatch`   | CRITICAL |      25 |
| `runtime.node.conflict`   | WARNING  |      10 |
| `runtime.python.unpinned` | WARNING  |      10 |
| `runtime.python.mismatch` | CRITICAL |      25 |

---

## Dependencies

| Rule                              | Severity | Penalty |
| --------------------------------- | -------- | ------: |
| `dependencies.lockfile.missing`   | WARNING  |      10 |
| `dependencies.lockfile.multiple`  | WARNING  |      10 |
| `dependencies.manager.conflict`   | WARNING  |      10 |
| `dependencies.lockfile.untracked` | WARNING  |      10 |

---

## Environment

| Rule                                | Severity | Penalty |
| ----------------------------------- | -------- | ------: |
| `environment.env.template-missing`  | WARNING  |      10 |
| `environment.variable.undocumented` | WARNING  |      10 |
| `environment.localhost.dependency`  | WARNING  |      15 |
| `environment.absolute-path`         | WARNING  |      15 |
| `environment.hardcoded-local-ip`    | WARNING  |      15 |

---

## Configuration

| Rule                                     | Severity | Penalty |
| ---------------------------------------- | -------- | ------: |
| `configuration.script.platform-specific` | WARNING  |      10 |
| `configuration.runtime-metadata.missing` | WARNING  |      10 |

---

## Git

| Rule                     | Severity | Penalty |
| ------------------------ | -------- | ------: |
| `git.env.tracked`        | CRITICAL |      25 |
| `git.working-tree.dirty` | WARNING  |       5 |
| `git.gitignore.missing`  | WARNING  |       5 |
| `git.lockfile.untracked` | WARNING  |      10 |

These values are initial V1 defaults and should be adjusted only through an explicit scoring change.

---

# 10. Why Rule-Specific Penalties Exist

Not all warnings have equal reproducibility impact.

Consider:

```text
Missing .gitignore
```

versus:

```text
Database hardcoded to localhost:5432
```

Both may technically be warnings, but the second has a much greater chance of preventing another developer from running the project.

Therefore:

```text
Severity
```

communicates urgency while:

```text
Penalty
```

communicates scoring impact.

---

# 11. Score Calculation Example

Suppose WOMM detects:

```text
Node version mismatch       CRITICAL  -25
Missing lockfile            WARNING   -10
Local PostgreSQL dependency WARNING   -15
Dirty working tree          WARNING   -5
```

Calculation:

```text
100
- 25
- 10
- 15
- 5
────
45
```

Result:

```text
Reproducibility Score: 45/100
```

Interpretation:

> Significant reproducibility risks detected.

---

# 12. Multiple Critical Findings

Critical findings are intentionally expensive.

Example:

```text
Tracked .env                -25
Node mismatch               -25
Python mismatch             -25
```

Score:

```text
100 - 25 - 25 - 25 = 25
```

Result:

```text
25/100
```

This communicates that multiple severe issues exist.

---

# 13. Score Floor

The score must never become negative.

Formula:

```text
score = max(0, 100 - totalPenalty)
```

Example:

```text
100 - 140 = -40
```

becomes:

```text
0
```

---

# 14. Score Ceiling

The score must never exceed 100.

Formula:

```text
score = min(100, max(0, calculatedScore))
```

Normally this is unnecessary because V1 starts at 100 and only deducts penalties, but explicit clamping makes the scoring contract robust.

---

# 15. Duplicate Findings

Duplicate findings must not be counted twice.

Example:

```text
Detector A:
runtime.node.mismatch

Detector B:
runtime.node.mismatch
```

After aggregation:

```text
One finding
```

Therefore:

```text
One penalty
```

This prevents inflated penalties.

---

# 16. Related Findings

Related findings may legitimately receive separate penalties.

Example:

```text
environment.variable.undocumented
environment.localhost.dependency
```

These represent different risks.

One indicates:

```text
Required configuration is undocumented.
```

The other indicates:

```text
A local service is expected.
```

Both can therefore contribute to the score.

---

# 17. Category Contribution

The score is calculated globally rather than assigning each category an independent score.

This keeps the model simple:

```text
All findings
     ↓
Penalty calculation
     ↓
Global score
```

However, the reporter should still display category status.

Example:

```text
Runtime          ⚠
Dependencies     ⚠
Environment      ⚠
Configuration    ✓
Git              ✓
```

---

# 18. Why Not Average Category Scores?

WOMM should not calculate:

```text
Runtime       80
Dependencies  90
Environment   50
Configuration 100
Git           100

Average = 84
```

This can hide severe individual problems.

For example:

```text
Tracked .env
```

should have meaningful impact even if every other category is clean.

The deduction model keeps serious findings visible.

---

# 19. Severity and Score Are Different

Severity answers:

> **"How serious is this finding?"**

Score answers:

> **"How much reproducibility risk did WOMM detect overall?"**

Example:

```text
CRITICAL:
Node runtime mismatch

Score:
75/100
```

A single critical finding does not necessarily mean the entire project is unusable.

Conversely:

```text
Several WARNING findings
```

can collectively produce a low score.

---

# 20. Score Bands

The terminal renderer should translate the numeric score into a human-readable status.

```text
90–100 → Excellent
75–89  → Good
50–74  → Moderate
25–49  → Risky
0–24   → Poor
```

Example:

```text
Reproducibility Score: 82/100
Status: Good
```

---

# 21. Score Output

The score should always be shown after successful analysis.

Example:

```text
┌─────────────────────────────────────┐
│ Reproducibility Score: 72/100       │
│ Status: Moderate                    │
└─────────────────────────────────────┘
```

The renderer may use colors, but the numerical value must remain readable without color.

---

# 22. No Score on Fatal Execution Failure

If WOMM itself cannot perform the analysis:

```text
WOMM failed to analyze the project.
```

Do not produce:

```text
Reproducibility Score: 0/100
```

A WOMM execution failure does not mean the project has zero reproducibility.

The correct distinction is:

```text
Analysis succeeded → score available
Analysis failed    → score unavailable
```

---

# 23. Partial Analysis

If some detectors fail but the analysis can continue, a score may still be produced.

Example:

```text
Runtime          ✓
Dependencies     ✓
Environment      ✓
Configuration    ✓
Git              unavailable
```

The result may be:

```text
Reproducibility Score: 86/100

Note:
Git analysis was unavailable.
The score reflects the checks that completed.
```

The report should clearly communicate incomplete coverage.

---

# 24. Unsupported Projects

For unsupported projects, WOMM should not automatically assign a poor score simply because it cannot fully analyze the ecosystem.

Example:

```text
Rust project detected.

Advanced Rust runtime analysis is unavailable.
```

If no reproducibility issues were detected:

```text
Score: 100/100
```

may technically be valid within the implemented checks.

However, the report should make the analysis scope clear.

Future versions may introduce a coverage indicator.

---

# 25. Score vs Coverage

V1 keeps:

```text
Score
```

and:

```text
Analysis Coverage
```

conceptually separate.

Score:

```text
How many known risks were detected?
```

Coverage:

```text
How much of the project's environment could WOMM understand?
```

Coverage is not required as a numerical value in V1.

---

# 26. Avoiding Score Gaming

The scoring engine must not encourage users to hide problems merely to increase the score.

For example:

```text
Deleting package.json
```

must not make the project appear cleaner.

Therefore, absence of project metadata should itself be considered when there is sufficient evidence that the project requires it.

Example:

```text
Node project detected
+
No runtime metadata
```

can produce:

```text
runtime.node.unpinned
```

---

# 27. Missing Evidence vs No Evidence

This distinction is critical.

### No evidence of a problem

```text
No hardcoded localhost dependency found.
```

This is a pass.

### Missing information

```text
Project uses Node.js,
but no runtime version is declared.
```

This is a warning.

WOMM must not treat:

```text
"We couldn't find evidence"
```

as:

```text
"Everything is definitely correct."
```

---

# 28. Rule Penalty Configuration

Penalties should be centralized.

Do not scatter numbers throughout detector code.

Recommended conceptual structure:

```typescript
interface RuleMetadata {
  id: string;
  severity: Severity;
  penalty: number;
}
```

Example:

```text
runtime.node.mismatch
severity = CRITICAL
penalty = 25
```

This makes scoring easy to audit and modify.

---

# 29. Scoring Engine Contract

Conceptual interface:

```typescript
interface ScoringEngine {
  calculate(findings: Finding[]): ScoreResult;
}
```

Result:

```typescript
interface ScoreResult {
  score: number;
  totalPenalty: number;
  status: ScoreStatus;
}
```

Possible statuses:

```text
EXCELLENT
GOOD
MODERATE
RISKY
POOR
```

---

# 30. Scoring Should Be Pure

The scoring engine should not access:

```text
Filesystem
Git
Environment
Network
CLI
Project source
```

It should only receive findings.

Conceptually:

```text
Finding[]
    ↓
ScoringEngine
    ↓
ScoreResult
```

This makes it extremely easy to unit test.

---

# 31. Scoring Algorithm

Reference implementation:

```text
function calculateScore(findings):

    totalPenalty = 0

    for finding in findings:

        penalty = getPenalty(finding)

        totalPenalty += penalty

    score = 100 - totalPenalty

    score = max(0, score)
    score = min(100, score)

    status = classify(score)

    return {
        score,
        totalPenalty,
        status
    }
```

---

# 32. Deterministic Ordering

The order in which findings are processed must not change the final score.

For:

```text
[A, B, C]
```

and:

```text
[C, A, B]
```

the score must be identical.

Therefore:

```text
Score(A + B + C)
=
Score(C + A + B)
```

---

# 33. Score Invariants

The following properties must always hold.

### Invariant 1

```text
0 ≤ score ≤ 100
```

### Invariant 2

```text
No findings → score = 100
```

### Invariant 3

```text
Adding a finding cannot increase the score.
```

### Invariant 4

```text
Duplicate findings do not produce duplicate penalties.
```

### Invariant 5

```text
Finding order does not affect score.
```

### Invariant 6

```text
INFO findings do not decrease score.
```

### Invariant 7

```text
Same findings → same score.
```

These invariants should have automated tests.

---

# 34. Important Edge Cases

## No findings

```text
Input:
[]

Output:
100
```

---

## One warning

```text
Input:
[WARNING -10]

Output:
90
```

---

## One critical

```text
Input:
[CRITICAL -25]

Output:
75
```

---

## Many findings

```text
100 - 25 - 25 - 15 - 15 - 10 - 10
= 0
```

Score is clamped to:

```text
0
```

---

## INFO only

```text
Input:
[INFO, INFO, INFO]

Output:
100
```

---

# 35. Example Scoring Scenarios

## Scenario A — Clean project

Findings:

```text
None
```

Score:

```text
100/100
```

Status:

```text
Excellent
```

---

## Scenario B — Minor risk

Findings:

```text
Missing .gitignore → -5
Dirty working tree → -5
```

Score:

```text
90/100
```

Status:

```text
Excellent
```

---

## Scenario C — Moderate risk

Findings:

```text
Missing lockfile → -10
Unpinned Node → -10
Undocumented environment variables → -10
```

Score:

```text
70/100
```

Status:

```text
Moderate
```

---

## Scenario D — Significant risk

Findings:

```text
Node mismatch → -25
Local database dependency → -15
Absolute path → -15
Missing lockfile → -10
```

Score:

```text
35/100
```

Status:

```text
Risky
```

---

## Scenario E — Severe risk

Findings:

```text
Tracked .env → -25
Node mismatch → -25
Python mismatch → -25
Hardcoded local dependency → -15
Absolute path → -15
```

Score:

```text
100 - 105
```

Clamped:

```text
0/100
```

Status:

```text
Poor
```

---

# 36. Score Interpretation

The CLI should avoid language such as:

```text
"Your project will fail."
```

Instead:

```text
"3 issues may prevent reproducibility."
```

or:

```text
"Significant reproducibility risks detected."
```

The score represents detected risk, not certainty.

---

# 37. Score and Exit Codes

Score and exit code are related but not identical.

Exit codes are determined by finding severity.

Recommended behavior:

```text
No WARNING/CRITICAL
→ exit 0

At least one WARNING
→ exit 1

At least one CRITICAL
→ exit 2
```

Therefore:

```text
Score: 60/100
Exit: 1
```

is valid.

Likewise:

```text
Score: 85/100
Exit: 2
```

is possible if one critical finding has a relatively contained scoring penalty.

The score should never replace severity-based exit codes.

---

# 38. Why Score and Exit Code Are Separate

The score is for humans.

Exit codes are for automation.

Humans may care about:

```text
72/100
```

while CI cares about:

```text
exit 1
```

This separation allows future CI integration without changing the scoring system.

---

# 39. Future Scoring Extensions

Future versions may introduce:

```text
Category scores
Confidence weighting
Project-size normalization
Ecosystem-specific scoring
Coverage percentage
Historical score comparison
Custom rule weights
CI-specific thresholds
```

These should not be added to V1 unless real usage demonstrates a need.

---

# 40. Custom Thresholds

V1 should not support user-defined scoring thresholds.

Do not introduce:

```text
womm --minimum-score 85
```

until the scoring model has been validated through real-world usage.

Future versions may support:

```text
womm ci --min-score 80
```

or equivalent configuration.

---

# 41. Scoring Transparency

The user should be able to understand why the score is what it is.

Example:

```text
Reproducibility Score: 55/100

Score breakdown:

Node version mismatch        -25
Missing dependency lockfile  -10
Local PostgreSQL dependency  -15
Dirty working tree            -5
                              ───
Total penalty                -55
```

This may initially be available under:

```text
womm check --verbose
```

or the detailed output mode.

---

# 42. No Hidden Multipliers

V1 should not use opaque formulas such as:

```text
score × confidence × project-size-factor × ecosystem-factor
```

unless there is strong evidence that such complexity is necessary.

The initial model should be understandable by reading this document.

A developer should be able to manually calculate the score.

---

# 43. No AI Scoring

AI must never determine:

```text
severity
penalty
score
```

in V1.

For example, the system must not ask an LLM:

```text
"How reproducible is this project?"
```

and then trust the response.

The score must come from deterministic rule output.

Future AI functionality may explain the score, but it should not own the underlying calculation.

---

# 44. Score Stability

Once a rule is released, changing its penalty changes the meaning of historical scores.

Therefore:

```text
Rule penalty changes
```

should be treated as a meaningful product change.

If future WOMM versions significantly alter scoring, release notes should explicitly document the change.

---

# 45. Testing the Scoring Engine

Minimum tests:

```text
No findings → 100
INFO only → 100
One warning → expected deduction
One critical → expected deduction
Multiple findings → correct sum
Score floor → 0
Score ceiling → 100
Duplicate findings → one penalty
Finding order → identical score
Unknown rule → safe fallback
```

---

# 46. Unknown Rules

If the scoring engine encounters an unknown rule ID, it should use the finding's severity default.

Example:

```text
Unknown rule
severity = WARNING
```

Fallback:

```text
Penalty = 10
```

This makes the engine forward-compatible.

However, unknown-rule situations should be visible during development/testing.

---

# 47. Penalty Precedence

Penalty selection should follow:

```text
1. Explicit rule penalty
2. Severity default
3. Safe fallback
```

Conceptually:

```text
if rule has penalty:
    use rule penalty

else if severity has default:
    use severity penalty

else:
    use 0
```

---

# 48. Recommended Constants

Centralize scoring constants.

Conceptually:

```typescript
const BASE_SCORE = 100;

const DEFAULT_PENALTIES = {
  CRITICAL: 25,
  WARNING: 10,
  INFO: 0,
};
```

Rule-specific overrides should live in rule metadata.

Do not hardcode numeric penalties inside terminal rendering or detector logic.

---

# 49. Score Calculation Architecture

```text
                    Finding[]
                        │
                        ▼
                ┌───────────────┐
                │ Deduplication │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Penalty Lookup│
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Penalty Sum   │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Clamp 0–100   │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Status Band   │
                └───────┬───────┘
                        │
                        ▼
                  ScoreResult
```

---

# 50. Final V1 Scoring Contract

The WOMM V1 scoring contract is:

```text
Base Score:
100

Critical:
-25 default

Warning:
-10 default

Info:
0

Final:
max(0, min(100, 100 - totalPenalty))
```

Rule-specific penalties may override the severity default.

Duplicate findings are removed before scoring.

The score is deterministic and independent of:

```text
AI
Network
CLI rendering
Filesystem order
Finding order
```

---

# 51. Final Principle

The WOMM score should never try to look smarter than it is.

A developer should be able to see:

```text
72/100
```

and immediately ask:

> "Why 72?"

WOMM should have a simple answer:

```text
Because these detected risks cost 28 points.
```

That transparency is more valuable than a complicated scoring algorithm.

**Works on my machine. Let's prove it.**
