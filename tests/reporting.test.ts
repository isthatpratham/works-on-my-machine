import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import {
  renderTerminalReport,
  formatScoreBar,
  formatCategoryHealth,
  formatEvidence,
} from '../src/reporting/index.js';
import { ScoringEngine } from '../src/scoring/index.js';
import type { DetectionResult } from '../src/detection/detection-result.js';
import type { Finding } from '../src/domain/finding.js';
import type { ProjectContext } from '../src/domain/project-context.js';
import { SEVERITIES } from '../src/domain/severity.js';
import { DETECTION_CATEGORIES } from '../src/domain/categories.js';

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

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

describe('Terminal Reporting & CLI Presentation', () => {
  const scoringEngine = new ScoringEngine();
  let initialChalkLevel: typeof chalk.level;

  beforeEach(() => {
    initialChalkLevel = chalk.level;
  });

  afterEach(() => {
    chalk.level = initialChalkLevel;
  });

  it('1. Clean project (0 findings) produces clean report with score 100', () => {
    const detectionResult = createDetectionResult([]);
    const scoreResult = scoringEngine.evaluate(detectionResult);
    const report = renderTerminalReport(scoreResult);
    const plain = stripAnsi(report);

    expect(plain).toContain('WORKS ON MY MACHINE');
    expect(plain).toContain("Let's prove it.");
    expect(plain).not.toContain("Works on my machine. Let's prove it.");
    expect(plain).toContain('REPRODUCIBILITY');
    expect(plain).toContain('100 / 100');
    expect(plain).toContain('EXCELLENT');
    expect(plain).toContain('Highly reproducible');
    expect(plain).toContain('CATEGORY HEALTH');
    expect(plain).toContain('Runtime');
    expect(plain).toContain('Dependencies');
    expect(plain).toContain('Environment');
    expect(plain).toContain('Configuration');
    expect(plain).toContain('Git');
    expect(plain).toContain('PASS');
    expect(plain).toContain('No reproducibility issues detected.');
    expect(plain).toContain('0 critical, 0 warnings, 0 informational');
    expect(plain).toContain('Analysis complete.');
  });

  it('2. Single INFO finding is rendered with distinct INFO badge and 0 penalty', () => {
    const infoFinding: Finding = {
      id: 'runtime.info.note',
      category: DETECTION_CATEGORIES.RUNTIME,
      severity: SEVERITIES.INFO,
      title: 'Informational Note',
      description: 'Project uses Node.js LTS.',
      impact: 'Informational only.',
      recommendation: 'No action required.',
    };

    const scoreResult = scoringEngine.evaluate(
      createDetectionResult([infoFinding]),
    );
    const report = renderTerminalReport(scoreResult);
    const plain = stripAnsi(report);

    expect(plain).toContain('INFO');
    expect(plain).toContain('runtime.info.note');
    expect(plain).toContain('Informational Note');
    expect(plain).toContain('Project uses Node.js LTS.');
    expect(plain).toContain('Impact');
    expect(plain).toContain('Informational only.');
    expect(plain).toContain('Recommendation');
    expect(plain).toContain('No action required.');
    expect(plain).toContain('0 critical, 0 warnings, 1 informational');
    expect(plain).toContain('100 / 100');
  });

  it('3. Single WARNING finding displays warning card, penalty, and recommendations', () => {
    const warningFinding: Finding = {
      id: 'env.example.missing',
      category: DETECTION_CATEGORIES.ENVIRONMENT,
      severity: SEVERITIES.WARNING,
      title: '.env.example is missing',
      description: 'No template environment file found in the project root.',
      evidence: [
        {
          type: 'file',
          source: '.env',
          detail: 'present but no template',
        },
      ],
      impact:
        'New developers may not know which environment variables are required.',
      recommendation: 'Create a .env.example template file with dummy values.',
    };

    const scoreResult = scoringEngine.evaluate(
      createDetectionResult([warningFinding]),
    );
    const report = renderTerminalReport(scoreResult);
    const plain = stripAnsi(report);

    expect(plain).toContain('WARNING');
    expect(plain).toContain('env.example.missing');
    expect(plain).toContain('.env.example is missing');
    expect(plain).toContain('Evidence');
    expect(plain).toContain('.env');
    expect(plain).toContain('Impact');
    expect(plain).toContain('Recommendation');
    expect(plain).toContain('Create a .env.example');
    expect(plain).toContain('0 critical, 1 warning, 0 informational');
    expect(plain).toContain('90 / 100');
  });

  it('4. Single CRITICAL finding displays critical card and impacts score status', () => {
    const criticalFinding: Finding = {
      id: 'git.env.tracked',
      category: DETECTION_CATEGORIES.GIT,
      severity: SEVERITIES.CRITICAL,
      title: 'Environment secret file is tracked by Git',
      description: 'The .env file is tracked in git version control.',
      evidence: [
        {
          type: 'git_state',
          source: '.env',
          detail: 'tracked in index',
        },
      ],
      impact: 'Secrets may be leaked across machines or public repositories.',
      recommendation: 'Remove .env from git tracking and add it to .gitignore.',
    };

    const scoreResult = scoringEngine.evaluate(
      createDetectionResult([criticalFinding]),
    );
    const report = renderTerminalReport(scoreResult);
    const plain = stripAnsi(report);

    expect(plain).toContain('CRITICAL');
    expect(plain).toContain('git.env.tracked');
    expect(plain).toContain('Environment secret file is tracked by Git');
    expect(plain).toContain('1 critical, 0 warnings, 0 informational');
    expect(plain).toContain('75 / 100');
    expect(plain).toContain('GOOD');
  });

  it('5. Mixed findings render correctly with summary counts and category statuses', () => {
    const crit: Finding = {
      id: 'git.env.tracked',
      category: DETECTION_CATEGORIES.GIT,
      severity: SEVERITIES.CRITICAL,
      title: 'Secret tracked',
      description: '.env tracked in git',
      impact: 'Secrets leak',
      recommendation: 'Untrack .env',
    };
    const warn: Finding = {
      id: 'deps.lockfile.missing',
      category: DETECTION_CATEGORIES.DEPENDENCIES,
      severity: SEVERITIES.WARNING,
      title: 'No lockfile',
      description: 'Missing package lockfile',
      impact: 'Inconsistent versions',
      recommendation: 'Run install and commit lockfile',
    };
    const info: Finding = {
      id: 'runtime.node.info',
      category: DETECTION_CATEGORIES.RUNTIME,
      severity: SEVERITIES.INFO,
      title: 'Node runtime info',
      description: 'Node 22 detected',
      impact: 'None',
      recommendation: 'None',
    };

    const scoreResult = scoringEngine.evaluate(
      createDetectionResult([crit, warn, info]),
    );
    const report = renderTerminalReport(scoreResult);
    const plain = stripAnsi(report);

    expect(plain).toContain('1 critical, 1 warning, 1 informational');
    expect(plain).toContain('65 / 100');
    expect(plain).toContain('MODERATE');
  });

  it('6. Displays compact scannable ProjectContext metadata when provided', () => {
    const scoreResult = scoringEngine.evaluate(createDetectionResult([]));
    const context: ProjectContext = {
      rootPath: '/projects/my-awesome-app',
      projectFiles: [],
      metadata: {
        name: 'my-awesome-app',
        framework: 'Next.js',
      },
      runtime: {
        node: {
          status: 'known',
          installed: '22.14.0',
        },
      },
      dependencies: {
        packageManager: {
          name: 'pnpm',
          version: '9.1.0',
        },
        lockfiles: ['pnpm-lock.yaml'],
        manifests: ['package.json'],
      },
      environment: {
        os: 'darwin',
        arch: 'arm64',
        envFilePresent: true,
        envExamplePresent: true,
        detectedEnvVarNames: ['DATABASE_URL'],
      },
      git: {
        isRepo: true,
        status: 'available',
      },
    };

    const report = renderTerminalReport(scoreResult, { context });
    const plain = stripAnsi(report);

    expect(plain).toContain('PROJECT');
    expect(plain).toContain('my-awesome-app');
    expect(plain).toContain('Next.js · Node.js 22.14.0 · pnpm 9.1.0');
    expect(plain).toContain('Path: /projects/my-awesome-app');
  });

  it('7. Handles incomplete analysis and detector errors safely', () => {
    const detectionResult = createDetectionResult([], {
      isComplete: false,
      errors: [
        {
          detectorId: 'git',
          message: 'Git CLI is not installed on this machine.',
        },
      ],
    });
    const scoreResult = scoringEngine.evaluate(detectionResult);
    const report = renderTerminalReport(scoreResult, {
      errors: detectionResult.errors,
    });
    const plain = stripAnsi(report);

    expect(plain).toContain('Analysis Notice');
    expect(plain).toContain('Some checks could not be completed.');
    expect(plain).toContain('[git] Git CLI is not installed on this machine.');
    expect(plain).toContain('Analysis completed with warnings.');
  });

  it('8. Output is 100% deterministic across multiple runs', () => {
    const finding: Finding = {
      id: 'runtime.node.mismatch',
      category: DETECTION_CATEGORIES.RUNTIME,
      severity: SEVERITIES.WARNING,
      title: 'Node version mismatch',
      description: 'Found v18, requires v20',
      evidence: [
        { type: 'manifest', source: 'package.json', detail: 'engines.node' },
      ],
      impact: 'Build may fail',
      recommendation: 'Upgrade Node',
    };
    const scoreResult = scoringEngine.evaluate(
      createDetectionResult([finding]),
    );

    const report1 = renderTerminalReport(scoreResult);
    const report2 = renderTerminalReport(scoreResult);
    const report3 = renderTerminalReport(scoreResult);

    expect(report1).toBe(report2);
    expect(report2).toBe(report3);
  });

  it('9. formatScoreBar generates exact 20 character visual bar', () => {
    expect(stripAnsi(formatScoreBar(100))).toBe('████████████████████');
    expect(stripAnsi(formatScoreBar(50))).toBe('██████████░░░░░░░░░░');
    expect(stripAnsi(formatScoreBar(0))).toBe('░░░░░░░░░░░░░░░░░░░░');
    expect(stripAnsi(formatScoreBar(75))).toBe('███████████████░░░░░');
  });

  it('10. Sensitive environment values are never logged by formatEvidence', () => {
    const evidence = [
      {
        type: 'env_var',
        source: 'DATABASE_URL',
        detail: 'key declared in .env',
      },
    ];
    const formatted = formatEvidence(evidence);
    const plain = stripAnsi(formatted);

    expect(plain).toContain('DATABASE_URL');
    expect(plain).toContain('key declared in .env');
    // Ensure no passwords or values appear
    expect(plain).not.toContain('postgres://');
    expect(plain).not.toContain('password');
  });

  it('11. formatCategoryHealth renders all 5 categories in order', () => {
    const detectionResult = createDetectionResult([]);
    const scoreResult = scoringEngine.evaluate(detectionResult);
    const output = stripAnsi(formatCategoryHealth(scoreResult));
    const lines = output.split('\n').filter((l) => l.trim().length > 0);

    expect(lines[0]).toBe('CATEGORY HEALTH');
    expect(lines[1]).toContain('Runtime');
    expect(lines[2]).toContain('Dependencies');
    expect(lines[3]).toContain('Environment');
    expect(lines[4]).toContain('Configuration');
    expect(lines[5]).toContain('Git');
  });

  it('12. End-to-end consistency: all findings in ScoreResult are rendered with correct score, penalties, and summary counts', () => {
    const f1: Finding = {
      id: 'runtime.node.mismatch',
      category: DETECTION_CATEGORIES.RUNTIME,
      severity: SEVERITIES.CRITICAL,
      title: 'Node.js version mismatch',
      description: 'Current Node is v22, requires v20',
      impact: 'Runtime crash',
      recommendation: 'Install Node 20',
    };
    const f2: Finding = {
      id: 'environment.localhost.dependency',
      category: DETECTION_CATEGORIES.ENVIRONMENT,
      severity: SEVERITIES.WARNING,
      title: 'Local service dependency',
      description: 'Requires postgres on localhost',
      impact: 'Service unavailable',
      recommendation: 'Provide docker or instructions',
    };
    const f3: Finding = {
      id: 'git.gitignore.missing',
      category: DETECTION_CATEGORIES.GIT,
      severity: SEVERITIES.WARNING,
      title: 'No .gitignore file detected',
      description: 'Missing gitignore',
      impact: 'Secrets leak',
      recommendation: 'Add gitignore',
    };
    const f4: Finding = {
      id: 'git.working-tree.dirty',
      category: DETECTION_CATEGORIES.GIT,
      severity: SEVERITIES.WARNING,
      title: 'Working tree contains uncommitted changes',
      description: 'Uncommitted files present',
      impact: 'State mismatch',
      recommendation: 'Commit changes',
    };

    const scoreResult = scoringEngine.evaluate(
      createDetectionResult([f1, f2, f3, f4]),
    );

    expect(scoreResult.score).toBe(50);
    expect(scoreResult.totalPenalty).toBe(50);
    expect(scoreResult.summary.totalFindings).toBe(4);
    expect(scoreResult.summary.criticalCount).toBe(1);
    expect(scoreResult.summary.warningCount).toBe(3);
    expect(scoreResult.summary.infoCount).toBe(0);

    const report = renderTerminalReport(scoreResult);
    const plain = stripAnsi(report);

    // Verify all 4 findings are rendered
    expect(plain).toContain('runtime.node.mismatch');
    expect(plain).toContain('Node.js version mismatch');
    expect(plain).toContain('environment.localhost.dependency');
    expect(plain).toContain('Local service dependency');
    expect(plain).toContain('git.gitignore.missing');
    expect(plain).toContain('No .gitignore file detected');
    expect(plain).toContain('git.working-tree.dirty');
    expect(plain).toContain('Working tree contains uncommitted changes');

    // Verify score and summary
    expect(plain).toContain('50 / 100');
    expect(plain).toContain('1 critical, 3 warnings, 0 informational');

    // Category health check
    expect(plain).toContain('Runtime          ✖ CRITICAL');
    expect(plain).toContain('Environment      ⚠ WARNING');
    expect(plain).toContain('Git              ⚠ WARNING');
  });

  it('13. Finding and summary invariant: rendered finding count and severities match ScoreResult exactly', () => {
    const findings: Finding[] = [
      {
        id: 'git.env.tracked',
        category: DETECTION_CATEGORIES.GIT,
        severity: SEVERITIES.CRITICAL,
        title: 'Secret tracked',
        description: '.env tracked in git',
        impact: 'Secrets leak',
        recommendation: 'Untrack .env',
      },
      {
        id: 'deps.lockfile.missing',
        category: DETECTION_CATEGORIES.DEPENDENCIES,
        severity: SEVERITIES.WARNING,
        title: 'No lockfile',
        description: 'Missing package lockfile',
        impact: 'Inconsistent versions',
        recommendation: 'Run install and commit lockfile',
      },
      {
        id: 'runtime.node.unpinned',
        category: DETECTION_CATEGORIES.RUNTIME,
        severity: SEVERITIES.WARNING,
        title: 'Node version not pinned',
        description: 'Range used instead of exact',
        impact: 'Discrepancies',
        recommendation: 'Pin version',
      },
      {
        id: 'runtime.node.info',
        category: DETECTION_CATEGORIES.RUNTIME,
        severity: SEVERITIES.INFO,
        title: 'Node runtime info',
        description: 'Node 22 detected',
        impact: 'None',
        recommendation: 'None',
      },
    ];

    const scoreResult = scoringEngine.evaluate(createDetectionResult(findings));
    const report = renderTerminalReport(scoreResult);
    const plain = stripAnsi(report);

    for (const f of findings) {
      expect(plain).toContain(f.id);
      expect(plain).toContain(f.title);
    }

    // Summary line must strictly match
    expect(plain).toContain(
      `${scoreResult.summary.criticalCount} critical, ${scoreResult.summary.warningCount} warnings, ${scoreResult.summary.infoCount} informational`,
    );

    // Score line must strictly match
    expect(plain).toContain(`${scoreResult.score} / 100`);
  });

  it('14. Renders distinct rectangular cards for findings', () => {
    const critFinding: Finding = {
      id: 'runtime.node.mismatch',
      category: DETECTION_CATEGORIES.RUNTIME,
      severity: SEVERITIES.CRITICAL,
      title: 'Node.js version mismatch',
      description: 'Requires Node 20',
      evidence: [{ type: 'manifest', source: '.nvmrc', detail: '20.19.0' }],
      impact: 'Will fail to run',
      recommendation: 'Switch to Node 20',
    };
    const scoreResult = scoringEngine.evaluate(
      createDetectionResult([critFinding]),
    );
    const report = renderTerminalReport(scoreResult);
    const plain = stripAnsi(report);

    // Assert rectangular box drawing characters are present
    expect(plain).toMatch(/┌[─\s\S]*CRITICAL[─\s\S]*┐/);
    expect(plain).toMatch(/│[\s\S]*Node\.js version mismatch[\s\S]*│/);
    expect(plain).toMatch(/└[─\s\S]*┘/);
  });
});
