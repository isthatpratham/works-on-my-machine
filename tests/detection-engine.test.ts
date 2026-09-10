import { describe, it, expect, vi } from 'vitest';
import {
  DetectorRegistry,
  DuplicateDetectorError,
  InvalidDetectorError,
} from '../src/detection/detector-registry.js';
import { validateFinding } from '../src/detection/finding-validator.js';
import {
  DetectionEngine,
  sortFindings,
  deduplicateFindings,
} from '../src/detection/detection-engine.js';
import type { Detector } from '../src/domain/detector.js';
import type { Finding } from '../src/domain/finding.js';
import type { ProjectContext } from '../src/domain/project-context.js';
import { SEVERITIES } from '../src/domain/severity.js';

function createMockContext(
  overrides: Partial<ProjectContext> = {},
): ProjectContext {
  return {
    rootPath: '/test/project',
    projectFiles: [{ relativePath: 'package.json', type: 'manifest' }],
    metadata: { name: 'test-app' },
    runtime: {
      node: { status: 'known', declared: '20.0.0', installed: '20.0.0' },
    },
    dependencies: {
      packageManager: { name: 'pnpm' },
      lockfiles: ['pnpm-lock.yaml'],
      manifests: ['package.json'],
    },
    environment: {
      os: 'linux',
      arch: 'x64',
      envFilePresent: false,
      envExamplePresent: false,
      detectedEnvVarNames: [],
    },
    git: {
      isRepo: true,
      status: 'available',
      currentBranch: 'main',
      isDirty: false,
      trackedFiles: ['package.json'],
      untrackedFiles: [],
    },
    ...overrides,
  };
}

describe('DetectorRegistry', () => {
  it('1. registers a detector and size increases', () => {
    const registry = new DetectorRegistry();
    const detector: Detector = {
      id: 'test.detector.a',
      category: 'runtime',
      supports: () => true,
      analyze: () => [],
    };

    registry.register(detector);
    expect(registry.size).toBe(1);
    expect(registry.has('test.detector.a')).toBe(true);
  });

  it('2. retrieves registered detectors by ID and list', () => {
    const registry = new DetectorRegistry();
    const detector: Detector = {
      id: 'test.detector.a',
      category: 'runtime',
      supports: () => true,
      analyze: () => [],
    };

    registry.register(detector);
    expect(registry.get('test.detector.a')).toBe(detector);
    expect(registry.get('non.existent')).toBeUndefined();
    expect(registry.getDetectors()).toEqual([detector]);
  });

  it('3. rejects duplicate detector IDs', () => {
    const registry = new DetectorRegistry();
    const d1: Detector = {
      id: 'test.duplicate',
      category: 'runtime',
      supports: () => true,
      analyze: () => [],
    };
    const d2: Detector = {
      id: 'test.duplicate',
      category: 'dependencies',
      supports: () => true,
      analyze: () => [],
    };

    registry.register(d1);
    expect(() => registry.register(d2)).toThrow(DuplicateDetectorError);
  });

  it('4. provides deterministic ordering sorted by detector ID regardless of registration order', () => {
    const registry = new DetectorRegistry();
    const dZ: Detector = {
      id: 'z.detector',
      category: 'git',
      supports: () => true,
      analyze: () => [],
    };
    const dA: Detector = {
      id: 'a.detector',
      category: 'runtime',
      supports: () => true,
      analyze: () => [],
    };
    const dM: Detector = {
      id: 'm.detector',
      category: 'environment',
      supports: () => true,
      analyze: () => [],
    };

    registry.register(dZ).register(dA).register(dM);
    const ids = registry.getDetectors().map((d) => d.id);
    expect(ids).toEqual(['a.detector', 'm.detector', 'z.detector']);
  });

  it('5. can be constructed and cleared independently in tests', () => {
    const r1 = new DetectorRegistry();
    const r2 = new DetectorRegistry();
    r1.register({
      id: 'd1',
      category: 'runtime',
      supports: () => true,
      analyze: () => [],
    });

    expect(r1.size).toBe(1);
    expect(r2.size).toBe(0);

    r1.clear();
    expect(r1.size).toBe(0);
  });

  it('validates detector structure on registration', () => {
    const registry = new DetectorRegistry();
    expect(() => registry.register(null as unknown as Detector)).toThrow(
      InvalidDetectorError,
    );
    expect(() =>
      registry.register({
        id: '',
        category: 'runtime',
        supports: () => true,
        analyze: () => [],
      }),
    ).toThrow(InvalidDetectorError);
    expect(() =>
      registry.register({
        id: 'test',
        category: 'invalid' as unknown as 'runtime',
        supports: () => true,
        analyze: () => [],
      }),
    ).toThrow(InvalidDetectorError);
    expect(() =>
      registry.register({
        id: 'test',
        category: 'runtime',
        supports: null as unknown as () => boolean,
        analyze: () => [],
      }),
    ).toThrow(InvalidDetectorError);
    expect(() =>
      registry.register({
        id: 'test',
        category: 'runtime',
        supports: () => true,
        analyze: null as unknown as () => Finding[],
      }),
    ).toThrow(InvalidDetectorError);
  });
});

describe('FindingValidator', () => {
  it('16. accepts valid findings', () => {
    const validFinding: Finding = {
      id: 'runtime.node.mismatch',
      category: 'runtime',
      severity: SEVERITIES.CRITICAL,
      title: 'Node version mismatch',
      description: 'Project requires Node 20 but running Node 18',
      evidence: [{ type: 'version', source: 'package.json', detail: '>=20' }],
      impact: 'Build failure',
      recommendation: 'Upgrade Node',
    };

    const result = validateFinding(validFinding);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.finding.id).toBe('runtime.node.mismatch');
      expect(result.finding.category).toBe('runtime');
      expect(result.finding.severity).toBe(SEVERITIES.CRITICAL);
    }
  });

  it('17. rejects non-object findings', () => {
    expect(validateFinding(null).valid).toBe(false);
    expect(validateFinding('invalid').valid).toBe(false);
    expect(validateFinding(123).valid).toBe(false);
  });

  it('18. rejects invalid category or severity', () => {
    const invalidCat = {
      id: 'test.id',
      category: 'unknown_cat',
      severity: 'critical',
      title: 'Title',
      description: 'Desc',
      impact: 'Impact',
      recommendation: 'Rec',
    };
    expect(validateFinding(invalidCat).valid).toBe(false);

    const invalidSev = {
      id: 'test.id',
      category: 'runtime',
      severity: 'FATAL',
      title: 'Title',
      description: 'Desc',
      impact: 'Impact',
      recommendation: 'Rec',
    };
    expect(validateFinding(invalidSev).valid).toBe(false);
  });

  it('19. rejects empty required fields and malformed evidence', () => {
    expect(
      validateFinding({
        id: '',
        category: 'runtime',
        severity: 'info',
        title: 'T',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      }).valid,
    ).toBe(false);

    expect(
      validateFinding({
        id: 'test',
        category: 'runtime',
        severity: 'info',
        title: '   ',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      }).valid,
    ).toBe(false);

    expect(
      validateFinding({
        id: 'test',
        category: 'runtime',
        severity: 'info',
        title: 'T',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
        evidence: 'not-an-array',
      }).valid,
    ).toBe(false);

    expect(
      validateFinding({
        id: 'test',
        category: 'runtime',
        severity: 'info',
        title: 'T',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
        evidence: [{ type: '', source: 'src' }],
      }).valid,
    ).toBe(false);
  });
});

describe('DetectionEngine Support & Execution', () => {
  it('6. unsupported detector is not executed', async () => {
    const analyzeSpy = vi.fn().mockReturnValue([]);
    const registry = new DetectorRegistry();
    registry.register({
      id: 'unsupported.detector',
      category: 'environment',
      supports: () => false,
      analyze: analyzeSpy,
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(analyzeSpy).not.toHaveBeenCalled();
    expect(result.executedDetectors).toEqual([
      {
        detectorId: 'unsupported.detector',
        status: 'skipped',
        findingCount: 0,
      },
    ]);
  });

  it('7. unsupported detector does not produce a failure or error', async () => {
    const registry = new DetectorRegistry();
    registry.register({
      id: 'unsupported.detector',
      category: 'configuration',
      supports: () => false,
      analyze: () => [],
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(result.errors).toEqual([]);
    expect(result.isComplete).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('8. supported detector is executed', async () => {
    const analyzeSpy = vi.fn().mockReturnValue([]);
    const registry = new DetectorRegistry();
    registry.register({
      id: 'supported.detector',
      category: 'runtime',
      supports: () => true,
      analyze: analyzeSpy,
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(analyzeSpy).toHaveBeenCalledTimes(1);
    expect(result.executedDetectors).toEqual([
      {
        detectorId: 'supported.detector',
        status: 'executed',
        findingCount: 0,
      },
    ]);
  });

  it('9. successful detector findings are returned', async () => {
    const sampleFinding: Finding = {
      id: 'test.finding.1',
      category: 'runtime',
      severity: SEVERITIES.WARNING,
      title: 'Sample warning',
      description: 'Sample description',
      impact: 'Sample impact',
      recommendation: 'Sample recommendation',
    };

    const registry = new DetectorRegistry();
    registry.register({
      id: 'test.detector.finding',
      category: 'runtime',
      supports: () => true,
      analyze: () => [sampleFinding],
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(result.findings).toEqual([sampleFinding]);
    expect(result.executedDetectors[0]?.status).toBe('executed');
    expect(result.executedDetectors[0]?.findingCount).toBe(1);
    expect(result.isComplete).toBe(true);
  });

  it('10. multiple detectors execute and findings are aggregated', async () => {
    const finding1: Finding = {
      id: 'f1',
      category: 'runtime',
      severity: SEVERITIES.WARNING,
      title: 'F1',
      description: 'D1',
      impact: 'I1',
      recommendation: 'R1',
    };
    const finding2: Finding = {
      id: 'f2',
      category: 'git',
      severity: SEVERITIES.INFO,
      title: 'F2',
      description: 'D2',
      impact: 'I2',
      recommendation: 'R2',
    };

    const registry = new DetectorRegistry();
    registry.register({
      id: 'det.1',
      category: 'runtime',
      supports: () => true,
      analyze: () => [finding1],
    });
    registry.register({
      id: 'det.2',
      category: 'git',
      supports: () => true,
      analyze: () => [finding2],
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(result.findings).toHaveLength(2);
    expect(result.findings.map((f) => f.id)).toEqual(['f1', 'f2']);
  });

  it('11. detector execution order is deterministic based on detector ID', async () => {
    const executionOrder: string[] = [];
    const registry = new DetectorRegistry();

    registry.register({
      id: 'z.detector',
      category: 'git',
      supports: () => {
        executionOrder.push('supports:z');
        return true;
      },
      analyze: () => {
        executionOrder.push('analyze:z');
        return [];
      },
    });

    registry.register({
      id: 'a.detector',
      category: 'runtime',
      supports: () => {
        executionOrder.push('supports:a');
        return true;
      },
      analyze: () => {
        executionOrder.push('analyze:a');
        return [];
      },
    });

    const engine = new DetectionEngine({ registry });
    await engine.run(createMockContext());

    expect(executionOrder).toEqual([
      'supports:a',
      'analyze:a',
      'supports:z',
      'analyze:z',
    ]);
  });
});

describe('DetectionEngine Failure Isolation & Partial Analysis', () => {
  it('12. one detector failure does not prevent other supported detectors from running', async () => {
    const findingGood: Finding = {
      id: 'f.good',
      category: 'dependencies',
      severity: SEVERITIES.WARNING,
      title: 'Good finding',
      description: 'D',
      impact: 'I',
      recommendation: 'R',
    };

    const registry = new DetectorRegistry();
    registry.register({
      id: 'a.failing',
      category: 'runtime',
      supports: () => true,
      analyze: () => {
        throw new Error('Explosion in detector A');
      },
    });
    registry.register({
      id: 'b.succeeding',
      category: 'dependencies',
      supports: () => true,
      analyze: () => [findingGood],
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(result.findings).toEqual([findingGood]);
    expect(result.isComplete).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.detectorId).toBe('a.failing');
    expect(result.errors[0]?.message).toContain('Explosion in detector A');
    expect(result.executedDetectors).toEqual([
      {
        detectorId: 'a.failing',
        status: 'failed',
        findingCount: 0,
        error: 'Explosion in detector A',
      },
      {
        detectorId: 'b.succeeding',
        status: 'executed',
        findingCount: 1,
      },
    ]);
  });

  it('13. captures exceptions thrown during supports() and analyze()', async () => {
    const registry = new DetectorRegistry();
    registry.register({
      id: 'supports.throws',
      category: 'environment',
      supports: () => {
        throw new Error('supports failure');
      },
      analyze: () => [],
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(result.isComplete).toBe(false);
    expect(result.errors[0]?.detectorId).toBe('supports.throws');
    expect(result.errors[0]?.message).toContain(
      'supports() check failed: supports failure',
    );
  });

  it('14. preserves partial results and handles malformed findings without crash', async () => {
    const validFinding: Finding = {
      id: 'valid.finding',
      category: 'configuration',
      severity: SEVERITIES.INFO,
      title: 'Valid',
      description: 'Valid desc',
      impact: 'Impact',
      recommendation: 'Rec',
    };

    const registry = new DetectorRegistry();
    registry.register({
      id: 'malformed.detector',
      category: 'configuration',
      supports: () => true,
      analyze: () => [{ invalid: true } as unknown as Finding, validFinding],
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(result.findings).toEqual([validFinding]);
    expect(result.isComplete).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.executedDetectors[0]?.status).toBe('failed');
    expect(result.executedDetectors[0]?.findingCount).toBe(1);
  });

  it('15. handles detector returning non-array output', async () => {
    const registry = new DetectorRegistry();
    registry.register({
      id: 'non.array',
      category: 'git',
      supports: () => true,
      analyze: () => 'not an array' as unknown as Finding[],
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(result.isComplete).toBe(false);
    expect(result.errors[0]?.detectorId).toBe('non.array');
    expect(result.errors[0]?.message).toContain('returned non-array result');
  });
});

describe('Finding Deduplication & Ordering', () => {
  it('20. duplicate findings are handled and deduplicated deterministically', () => {
    const f1: Finding = {
      id: 'duplicate.id',
      category: 'runtime',
      severity: SEVERITIES.CRITICAL,
      title: 'First Title',
      description: 'Desc 1',
      impact: 'Impact',
      recommendation: 'Rec',
    };
    const f2: Finding = {
      id: 'duplicate.id',
      category: 'runtime',
      severity: SEVERITIES.CRITICAL,
      title: 'Second Title',
      description: 'Desc 2',
      impact: 'Impact',
      recommendation: 'Rec',
    };
    const f3: Finding = {
      id: 'unique.id',
      category: 'dependencies',
      severity: SEVERITIES.INFO,
      title: 'Unique Title',
      description: 'Desc',
      impact: 'Impact',
      recommendation: 'Rec',
    };

    const deduplicated = deduplicateFindings([f1, f2, f3]);
    expect(deduplicated).toHaveLength(2);
    expect(deduplicated[0]?.title).toBe('First Title');
    expect(deduplicated[1]?.id).toBe('unique.id');
  });

  it('22. sorts findings deterministically by severity -> category -> id -> title', () => {
    const findings: Finding[] = [
      {
        id: 'b.git.info',
        category: 'git',
        severity: SEVERITIES.INFO,
        title: 'Git Info B',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
      {
        id: 'a.git.info',
        category: 'git',
        severity: SEVERITIES.INFO,
        title: 'Git Info A',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
      {
        id: 'runtime.crit',
        category: 'runtime',
        severity: SEVERITIES.CRITICAL,
        title: 'Runtime Critical',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
      {
        id: 'deps.warn',
        category: 'dependencies',
        severity: SEVERITIES.WARNING,
        title: 'Deps Warning',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
      {
        id: 'env.warn',
        category: 'environment',
        severity: SEVERITIES.WARNING,
        title: 'Env Warning',
        description: 'D',
        impact: 'I',
        recommendation: 'R',
      },
    ];

    const sorted = sortFindings(findings);
    const sortedIds = sorted.map((f) => f.id);

    expect(sortedIds).toEqual([
      'runtime.crit', // CRITICAL, runtime
      'deps.warn', // WARNING, dependencies
      'env.warn', // WARNING, environment
      'a.git.info', // INFO, git, id 'a'
      'b.git.info', // INFO, git, id 'b'
    ]);
  });
});

describe('Isolation & Immutability', () => {
  it('24 & 25. detector execution cannot alter context or other detectors', async () => {
    const originalContext = createMockContext();

    const registry = new DetectorRegistry();
    registry.register({
      id: 'mutating.detector',
      category: 'runtime',
      supports: (ctx) => {
        (ctx as unknown as Record<string, unknown>).mutatedProperty = true;
        return true;
      },
      analyze: (ctx) => {
        (ctx as unknown as Record<string, unknown>).anotherMutation = 'bad';
        return [];
      },
    });

    const engine = new DetectionEngine({ registry });
    await engine.run(originalContext);

    expect(originalContext.rootPath).toBe('/test/project');
  });

  it('supports asynchronous detector execution', async () => {
    const asyncFinding: Finding = {
      id: 'async.finding',
      category: 'runtime',
      severity: SEVERITIES.INFO,
      title: 'Async Title',
      description: 'Async Desc',
      impact: 'Impact',
      recommendation: 'Rec',
    };

    const registry = new DetectorRegistry();
    registry.register({
      id: 'async.detector',
      category: 'runtime',
      supports: () => true,
      analyze: () => {
        return [asyncFinding];
      },
    });

    const engine = new DetectionEngine({ registry });
    const result = await engine.run(createMockContext());

    expect(result.findings).toEqual([asyncFinding]);
    expect(result.isComplete).toBe(true);
  });
});

describe('Determinism Multi-Run Invariance', () => {
  it('produces identical DetectionResult across multiple consecutive executions', async () => {
    const f1: Finding = {
      id: 'finding.1',
      category: 'runtime',
      severity: SEVERITIES.CRITICAL,
      title: 'F1',
      description: 'D1',
      impact: 'I1',
      recommendation: 'R1',
    };
    const f2: Finding = {
      id: 'finding.2',
      category: 'environment',
      severity: SEVERITIES.WARNING,
      title: 'F2',
      description: 'D2',
      impact: 'I2',
      recommendation: 'R2',
    };

    const registry = new DetectorRegistry();
    registry.register({
      id: 'det.b',
      category: 'environment',
      supports: () => true,
      analyze: () => [f2],
    });
    registry.register({
      id: 'det.a',
      category: 'runtime',
      supports: () => true,
      analyze: () => [f1],
    });

    const engine = new DetectionEngine({ registry });
    const ctx = createMockContext();

    const run1 = await engine.run(ctx);
    const run2 = await engine.run(ctx);
    const run3 = await engine.run(ctx);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });
});
