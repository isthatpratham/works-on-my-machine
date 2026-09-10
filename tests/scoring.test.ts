import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ScoringEngine,
  evaluateFindings,
  classifyScore,
  getFindingPenalty,
  DEFAULT_SEVERITY_PENALTIES,
  RULE_PENALTIES,
  SCORE_STATUSES,
} from '../src/scoring/index.js';
import { evaluateProject } from '../src/application/analyze-project.js';
import type { DetectionResult } from '../src/detection/detection-result.js';
import type { Finding } from '../src/domain/finding.js';
import { SEVERITIES } from '../src/domain/severity.js';

let tempDir: string;

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `womm-scoring-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function createDetectionResult(
  findings: Finding[] = [],
  overrides: Partial<DetectionResult> = {},
): DetectionResult {
  return {
    findings,
    executedDetectors: [
      {
        detectorId: 'runtime',
        status: 'executed',
        findingCount: findings.filter((f) => f.category === 'runtime').length,
      },
      {
        detectorId: 'dependencies',
        status: 'executed',
        findingCount: findings.filter((f) => f.category === 'dependencies')
          .length,
      },
      {
        detectorId: 'environment',
        status: 'executed',
        findingCount: findings.filter((f) => f.category === 'environment')
          .length,
      },
      {
        detectorId: 'configuration',
        status: 'executed',
        findingCount: findings.filter((f) => f.category === 'configuration')
          .length,
      },
      {
        detectorId: 'git',
        status: 'executed',
        findingCount: findings.filter((f) => f.category === 'git').length,
      },
    ],
    errors: [],
    isComplete: true,
    ...overrides,
  };
}

describe('ScoringEngine & Evaluation', () => {
  const engine = new ScoringEngine();

  it('1 & 2. empty DetectionResult / no findings produces score 100 and status excellent', () => {
    const result = engine.evaluate(createDetectionResult([]));
    expect(result.score).toBe(100);
    expect(result.totalPenalty).toBe(0);
    expect(result.status).toBe(SCORE_STATUSES.EXCELLENT);
    expect(result.findings).toHaveLength(0);
    expect(result.summary.totalFindings).toBe(0);
    expect(result.summary.criticalCount).toBe(0);
    expect(result.summary.warningCount).toBe(0);
    expect(result.summary.infoCount).toBe(0);
  });

  it('3. INFO finding causes 0 penalty and keeps score 100', () => {
    const infoFinding: Finding = {
      id: 'custom.info',
      category: 'runtime',
      severity: SEVERITIES.INFO,
      title: 'Info Finding',
      description: 'Contextual info',
      impact: 'None',
      recommendation: 'None',
    };

    const result = engine.evaluate(createDetectionResult([infoFinding]));
    expect(result.score).toBe(100);
    expect(result.totalPenalty).toBe(0);
    expect(result.status).toBe(SCORE_STATUSES.EXCELLENT);
    expect(result.summary.infoCount).toBe(1);
  });

  it('4. single WARNING finding deducts 10 points and gives score 90', () => {
    const warnFinding: Finding = {
      id: 'dependencies.lockfile.missing',
      category: 'dependencies',
      severity: SEVERITIES.WARNING,
      title: 'Missing lockfile',
      description: 'Lockfile missing',
      impact: 'Different versions',
      recommendation: 'Generate lockfile',
    };

    const result = engine.evaluate(createDetectionResult([warnFinding]));
    expect(result.score).toBe(90);
    expect(result.totalPenalty).toBe(10);
    expect(result.status).toBe(SCORE_STATUSES.EXCELLENT);
    expect(result.summary.warningCount).toBe(1);
  });

  it('5. single CRITICAL finding deducts 25 points and gives score 75', () => {
    const critFinding: Finding = {
      id: 'runtime.node.mismatch',
      category: 'runtime',
      severity: SEVERITIES.CRITICAL,
      title: 'Node mismatch',
      description: 'Mismatch',
      impact: 'Incompatibility',
      recommendation: 'Switch version',
    };

    const result = engine.evaluate(createDetectionResult([critFinding]));
    expect(result.score).toBe(75);
    expect(result.totalPenalty).toBe(25);
    expect(result.status).toBe(SCORE_STATUSES.GOOD);
    expect(result.summary.criticalCount).toBe(1);
  });

  it('6. calculates multi-finding scenario exactly as documented in SCORING.md Section 11', () => {
    const findings: Finding[] = [
      {
        id: 'runtime.node.mismatch',
        category: 'runtime',
        severity: SEVERITIES.CRITICAL,
        title: 'Node mismatch',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      }, // -25
      {
        id: 'dependencies.lockfile.missing',
        category: 'dependencies',
        severity: SEVERITIES.WARNING,
        title: 'Missing lockfile',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      }, // -10
      {
        id: 'environment.localhost.dependency',
        category: 'environment',
        severity: SEVERITIES.WARNING,
        title: 'Local Postgres',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      }, // -15
      {
        id: 'git.working-tree.dirty',
        category: 'git',
        severity: SEVERITIES.WARNING,
        title: 'Dirty git',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      }, // -5
    ];

    const result = engine.evaluate(createDetectionResult(findings));
    expect(result.totalPenalty).toBe(55);
    expect(result.score).toBe(45);
    expect(result.status).toBe(SCORE_STATUSES.RISKY);
  });

  it('7. produces structured category evaluations for all 5 categories', () => {
    const findings: Finding[] = [
      {
        id: 'runtime.node.mismatch',
        category: 'runtime',
        severity: SEVERITIES.CRITICAL,
        title: 'Node mismatch',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
      {
        id: 'dependencies.lockfile.missing',
        category: 'dependencies',
        severity: SEVERITIES.WARNING,
        title: 'Missing lockfile',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
    ];

    const result = engine.evaluate(createDetectionResult(findings));

    expect(result.categories.runtime.status).toBe('critical');
    expect(result.categories.runtime.criticalCount).toBe(1);
    expect(result.categories.runtime.totalPenalty).toBe(25);

    expect(result.categories.dependencies.status).toBe('warning');
    expect(result.categories.dependencies.warningCount).toBe(1);
    expect(result.categories.dependencies.totalPenalty).toBe(10);

    expect(result.categories.environment.status).toBe('passed');
    expect(result.categories.configuration.status).toBe('passed');
    expect(result.categories.git.status).toBe('passed');
  });

  it('8. prevents double counting of duplicate findings', () => {
    const f1: Finding = {
      id: 'duplicate.warn',
      category: 'environment',
      severity: SEVERITIES.WARNING,
      title: 'Duplicate',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };
    const f2: Finding = {
      id: 'duplicate.warn',
      category: 'environment',
      severity: SEVERITIES.WARNING,
      title: 'Duplicate again',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };

    const result = engine.evaluate(createDetectionResult([f1, f2]));
    expect(result.findings).toHaveLength(1);
    expect(result.totalPenalty).toBe(10);
    expect(result.score).toBe(90);
  });

  it('9. preserves isComplete status for partial analyses', () => {
    const incompleteResult = createDetectionResult([], {
      isComplete: false,
      errors: [{ detectorId: 'git', message: 'Git failed' }],
      executedDetectors: [
        { detectorId: 'runtime', status: 'executed', findingCount: 0 },
        {
          detectorId: 'git',
          status: 'failed',
          findingCount: 0,
          error: 'Git failed',
        },
      ],
    });

    const result = engine.evaluate(incompleteResult);
    expect(result.isComplete).toBe(false);
    expect(result.categories.git.status).toBe('unavailable');
  });

  it('10 & 11. handles skipped and failed detectors in category statuses', () => {
    const detectionResult = createDetectionResult([], {
      executedDetectors: [
        { detectorId: 'runtime', status: 'executed', findingCount: 0 },
        { detectorId: 'dependencies', status: 'skipped', findingCount: 0 },
        {
          detectorId: 'environment',
          status: 'failed',
          findingCount: 0,
          error: 'failed',
        },
      ],
    });

    const result = engine.evaluate(detectionResult);
    expect(result.categories.runtime.status).toBe('passed');
    expect(result.categories.dependencies.status).toBe('skipped');
    expect(result.categories.environment.status).toBe('unavailable');
  });

  it('13 & 14. clamps score between 0 and 100', () => {
    // Excessive penalties
    const heavyFindings: Finding[] = [
      {
        id: 'f1',
        category: 'runtime',
        severity: SEVERITIES.CRITICAL,
        title: 'T',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
      {
        id: 'f2',
        category: 'runtime',
        severity: SEVERITIES.CRITICAL,
        title: 'T',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
      {
        id: 'f3',
        category: 'runtime',
        severity: SEVERITIES.CRITICAL,
        title: 'T',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
      {
        id: 'f4',
        category: 'runtime',
        severity: SEVERITIES.CRITICAL,
        title: 'T',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
      {
        id: 'f5',
        category: 'runtime',
        severity: SEVERITIES.CRITICAL,
        title: 'T',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
    ]; // 5 * 25 = 125 penalty

    const result = engine.evaluate(createDetectionResult(heavyFindings));
    expect(result.totalPenalty).toBe(125);
    expect(result.score).toBe(0);
    expect(result.status).toBe(SCORE_STATUSES.POOR);
  });

  it('15. maps exact score boundaries to the correct status bands', () => {
    expect(classifyScore(100)).toBe(SCORE_STATUSES.EXCELLENT);
    expect(classifyScore(90)).toBe(SCORE_STATUSES.EXCELLENT);
    expect(classifyScore(89)).toBe(SCORE_STATUSES.GOOD);
    expect(classifyScore(75)).toBe(SCORE_STATUSES.GOOD);
    expect(classifyScore(74)).toBe(SCORE_STATUSES.MODERATE);
    expect(classifyScore(50)).toBe(SCORE_STATUSES.MODERATE);
    expect(classifyScore(49)).toBe(SCORE_STATUSES.RISKY);
    expect(classifyScore(25)).toBe(SCORE_STATUSES.RISKY);
    expect(classifyScore(24)).toBe(SCORE_STATUSES.POOR);
    expect(classifyScore(0)).toBe(SCORE_STATUSES.POOR);
  });

  it('17 & 18. guarantees determinism and finding order independence', () => {
    const fA: Finding = {
      id: 'dependencies.lockfile.missing',
      category: 'dependencies',
      severity: SEVERITIES.WARNING,
      title: 'A',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };
    const fB: Finding = {
      id: 'git.working-tree.dirty',
      category: 'git',
      severity: SEVERITIES.WARNING,
      title: 'B',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };
    const fC: Finding = {
      id: 'runtime.node.mismatch',
      category: 'runtime',
      severity: SEVERITIES.CRITICAL,
      title: 'C',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };

    const res1 = engine.evaluate(createDetectionResult([fA, fB, fC]));
    const res2 = engine.evaluate(createDetectionResult([fC, fA, fB]));
    const res3 = engine.evaluate(createDetectionResult([fB, fC, fA]));

    expect(res1.score).toBe(res2.score);
    expect(res2.score).toBe(res3.score);
    expect(res1.totalPenalty).toBe(res2.totalPenalty);
    expect(res1.status).toBe(res2.status);
  });

  it('19. tests all documented V1 rule penalty values match SCORING.md Section 9', () => {
    // Runtime
    expect(RULE_PENALTIES['runtime.node.unpinned']).toBe(10);
    expect(RULE_PENALTIES['runtime.node.mismatch']).toBe(25);
    expect(RULE_PENALTIES['runtime.node.conflict']).toBe(10);
    expect(RULE_PENALTIES['runtime.python.unpinned']).toBe(10);
    expect(RULE_PENALTIES['runtime.python.mismatch']).toBe(25);

    // Dependencies
    expect(RULE_PENALTIES['dependencies.lockfile.missing']).toBe(10);
    expect(RULE_PENALTIES['dependencies.lockfile.multiple']).toBe(10);
    expect(RULE_PENALTIES['dependencies.manager.conflict']).toBe(10);
    expect(RULE_PENALTIES['dependencies.lockfile.untracked']).toBe(10);

    // Environment
    expect(RULE_PENALTIES['environment.env.template-missing']).toBe(10);
    expect(RULE_PENALTIES['environment.variable.undocumented']).toBe(10);
    expect(RULE_PENALTIES['environment.localhost.dependency']).toBe(15);
    expect(RULE_PENALTIES['environment.absolute-path']).toBe(15);
    expect(RULE_PENALTIES['environment.hardcoded-local-ip']).toBe(15);

    // Configuration
    expect(RULE_PENALTIES['configuration.script.platform-specific']).toBe(10);
    expect(RULE_PENALTIES['configuration.runtime-metadata.missing']).toBe(10);

    // Git
    expect(RULE_PENALTIES['git.env.tracked']).toBe(25);
    expect(RULE_PENALTIES['git.working-tree.dirty']).toBe(5);
    expect(RULE_PENALTIES['git.gitignore.missing']).toBe(5);
    expect(RULE_PENALTIES['git.lockfile.untracked']).toBe(10);
  });

  it('20. falls back to default severity penalty for unknown rule IDs', () => {
    const unknownWarn: Finding = {
      id: 'custom.unknown.warn',
      category: 'environment',
      severity: SEVERITIES.WARNING,
      title: 'Unknown',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };
    const unknownCrit: Finding = {
      id: 'custom.unknown.crit',
      category: 'environment',
      severity: SEVERITIES.CRITICAL,
      title: 'Unknown',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };

    expect(getFindingPenalty(unknownWarn)).toBe(
      DEFAULT_SEVERITY_PENALTIES.warning,
    );
    expect(getFindingPenalty(unknownCrit)).toBe(
      DEFAULT_SEVERITY_PENALTIES.critical,
    );
  });

  it('21. satisfies scoring invariants: adding finding never increases score', () => {
    const f1: Finding = {
      id: 'f1',
      category: 'runtime',
      severity: SEVERITIES.WARNING,
      title: 'F1',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };
    const f2: Finding = {
      id: 'f2',
      category: 'runtime',
      severity: SEVERITIES.CRITICAL,
      title: 'F2',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };

    const baseRes = engine.evaluate(createDetectionResult([]));
    const resWithOne = engine.evaluate(createDetectionResult([f1]));
    const resWithTwo = engine.evaluate(createDetectionResult([f1, f2]));

    expect(baseRes.score).toBeGreaterThanOrEqual(resWithOne.score);
    expect(resWithOne.score).toBeGreaterThanOrEqual(resWithTwo.score);
  });

  it('22. evaluateProject executes end-to-end and returns ScoreResult', async () => {
    const nodeVer = process.versions.node;
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-pkg',
        engines: { node: nodeVer },
      }),
    );
    writeFileSync(join(tempDir, 'pnpm-lock.yaml'), '# lockfile\n');
    writeFileSync(join(tempDir, '.gitignore'), 'node_modules\n');
    writeFileSync(join(tempDir, '.nvmrc'), `${nodeVer}\n`);

    const scoreResult = await evaluateProject(tempDir, {
      gitExecutor: async () => ({
        exitCode: 0,
        stdout: '',
        stderr: '',
      }),
    });

    expect(scoreResult).toBeDefined();
    expect(scoreResult.score).toBe(100);
    expect(scoreResult.status).toBe(SCORE_STATUSES.EXCELLENT);
    expect(scoreResult.isComplete).toBe(true);
  });

  it('standalone evaluateFindings helper produces identical result to ScoringEngine.evaluate', () => {
    const sampleFinding: Finding = {
      id: 'runtime.node.unpinned',
      category: 'runtime',
      severity: SEVERITIES.WARNING,
      title: 'Unpinned',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };
    const detectionResult = createDetectionResult([sampleFinding]);

    const resClass = engine.evaluate(detectionResult);
    const resFunc = evaluateFindings(detectionResult);

    expect(resClass).toEqual(resFunc);
  });

  it('calculateScore helper computes direct score and penalties', () => {
    const sampleFinding: Finding = {
      id: 'runtime.node.unpinned',
      category: 'runtime',
      severity: SEVERITIES.WARNING,
      title: 'Unpinned',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };

    const calc = engine.calculateScore([sampleFinding]);
    expect(calc.score).toBe(90);
    expect(calc.totalPenalty).toBe(10);
    expect(calc.status).toBe(SCORE_STATUSES.EXCELLENT);
  });
});
