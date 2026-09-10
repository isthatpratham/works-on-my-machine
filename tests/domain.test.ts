import { describe, expect, it } from 'vitest';
import {
  ALL_DETECTION_CATEGORIES,
  ALL_SEVERITIES,
  DETECTION_CATEGORIES,
  SEVERITIES,
  isDetectionCategory,
  isSeverity,
  type Detector,
  type Evidence,
  type Finding,
  type ProjectContext,
} from '../src/domain/index.js';

describe('Domain Contracts', () => {
  describe('DetectionCategory', () => {
    it('should define all required V1 categories', () => {
      expect(DETECTION_CATEGORIES.RUNTIME).toBe('runtime');
      expect(DETECTION_CATEGORIES.DEPENDENCIES).toBe('dependencies');
      expect(DETECTION_CATEGORIES.ENVIRONMENT).toBe('environment');
      expect(DETECTION_CATEGORIES.CONFIGURATION).toBe('configuration');
      expect(DETECTION_CATEGORIES.GIT).toBe('git');
    });

    it('should contain exactly the 5 V1 categories in ALL_DETECTION_CATEGORIES', () => {
      expect(ALL_DETECTION_CATEGORIES).toHaveLength(5);
      expect(ALL_DETECTION_CATEGORIES).toContain('runtime');
      expect(ALL_DETECTION_CATEGORIES).toContain('dependencies');
      expect(ALL_DETECTION_CATEGORIES).toContain('environment');
      expect(ALL_DETECTION_CATEGORIES).toContain('configuration');
      expect(ALL_DETECTION_CATEGORIES).toContain('git');
    });

    it('should correctly validate categories with isDetectionCategory', () => {
      expect(isDetectionCategory('runtime')).toBe(true);
      expect(isDetectionCategory('dependencies')).toBe(true);
      expect(isDetectionCategory('environment')).toBe(true);
      expect(isDetectionCategory('configuration')).toBe(true);
      expect(isDetectionCategory('git')).toBe(true);
      expect(isDetectionCategory('docker')).toBe(false);
      expect(isDetectionCategory('unknown')).toBe(false);
    });
  });

  describe('Severity', () => {
    it('should define CRITICAL, WARNING, and INFO', () => {
      expect(SEVERITIES.CRITICAL).toBe('critical');
      expect(SEVERITIES.WARNING).toBe('warning');
      expect(SEVERITIES.INFO).toBe('info');
    });

    it('should contain all 3 severities in ALL_SEVERITIES', () => {
      expect(ALL_SEVERITIES).toHaveLength(3);
      expect(ALL_SEVERITIES).toContain('critical');
      expect(ALL_SEVERITIES).toContain('warning');
      expect(ALL_SEVERITIES).toContain('info');
    });

    it('should correctly validate severities with isSeverity', () => {
      expect(isSeverity('critical')).toBe(true);
      expect(isSeverity('warning')).toBe(true);
      expect(isSeverity('info')).toBe(true);
      expect(isSeverity('error')).toBe(false);
      expect(isSeverity('low')).toBe(false);
    });
  });

  describe('Evidence', () => {
    it('should represent structured evidence without secrets', () => {
      const evidence: Evidence = {
        type: 'manifest',
        source: 'package.json',
        detail: 'engines.node = "20.x"',
      };

      expect(evidence.type).toBe('manifest');
      expect(evidence.source).toBe('package.json');
      expect(evidence.detail).toBe('engines.node = "20.x"');
    });

    it('should allow evidence without optional detail', () => {
      const evidence: Evidence = {
        type: 'file_presence',
        source: '.env',
      };

      expect(evidence.type).toBe('file_presence');
      expect(evidence.source).toBe('.env');
      expect(evidence.detail).toBeUndefined();
    });
  });

  describe('Finding', () => {
    it('should represent a valid structured finding', () => {
      const finding: Finding = {
        id: 'runtime.node.mismatch',
        category: DETECTION_CATEGORIES.RUNTIME,
        severity: SEVERITIES.CRITICAL,
        title: 'Node.js version mismatch',
        description:
          'Project requires Node.js 20, but running environment has Node.js 18.',
        evidence: [
          {
            type: 'manifest',
            source: 'package.json',
            detail: 'engines.node = ">=20.0.0"',
          },
          {
            type: 'runtime_state',
            source: 'environment',
            detail: 'node version is 18.20.0',
          },
        ],
        impact: 'Build and runtime scripts may fail due to unsupported APIs.',
        recommendation: 'Switch Node.js to version 20 or higher.',
      };

      expect(finding.id).toBe('runtime.node.mismatch');
      expect(finding.category).toBe('runtime');
      expect(finding.severity).toBe('critical');
      expect(finding.title).toBe('Node.js version mismatch');
      expect(finding.evidence).toHaveLength(2);
      expect(finding.impact).toContain('Build and runtime scripts');
      expect(finding.recommendation).toContain('Switch Node.js');
    });
  });

  describe('Detector contract', () => {
    it('should allow implementing a detector conforming to the interface', () => {
      const mockDetector: Detector = {
        id: 'test.stub.detector',
        category: DETECTION_CATEGORIES.ENVIRONMENT,
        supports: (context: ProjectContext) => context.rootPath.length > 0,
        analyze: (_context: ProjectContext) => [
          {
            id: 'test.finding',
            category: DETECTION_CATEGORIES.ENVIRONMENT,
            severity: SEVERITIES.INFO,
            title: 'Test finding',
            description: 'Test finding description',
            impact: 'No impact',
            recommendation: 'None',
          },
        ],
      };

      const mockContext: ProjectContext = {
        rootPath: '/path/to/project',
        projectFiles: [{ relativePath: 'package.json', type: 'manifest' }],
        metadata: { name: 'test-project' },
        runtime: {
          node: { status: 'known', declared: '20.0.0', installed: '20.0.0' },
        },
        dependencies: {
          lockfiles: ['pnpm-lock.yaml'],
          manifests: ['package.json'],
        },
        environment: {
          os: 'linux',
          arch: 'x64',
          envFilePresent: false,
          envExamplePresent: true,
          detectedEnvVarNames: ['NODE_ENV'],
        },
        git: {
          isRepo: true,
          status: 'available',
          currentBranch: 'main',
          isDirty: false,
        },
      };

      expect(mockDetector.id).toBe('test.stub.detector');
      expect(mockDetector.category).toBe('environment');
      expect(mockDetector.supports(mockContext)).toBe(true);

      const findings = mockDetector.analyze(mockContext);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.id).toBe('test.finding');
    });
  });

  describe('ProjectContext', () => {
    it('should represent full project context with unavailable subsystems', () => {
      const partialContext: ProjectContext = {
        rootPath: '/path/to/project',
        projectFiles: [],
        metadata: {},
        runtime: {
          python: { status: 'not_applicable' },
          node: { status: 'unavailable' },
        },
        dependencies: {
          lockfiles: [],
          manifests: [],
        },
        environment: {
          os: 'win32',
          arch: 'x64',
          envFilePresent: false,
          envExamplePresent: false,
          detectedEnvVarNames: [],
        },
        git: {
          isRepo: false,
          status: 'not_a_repository',
        },
      };

      expect(partialContext.runtime.node?.status).toBe('unavailable');
      expect(partialContext.runtime.python?.status).toBe('not_applicable');
      expect(partialContext.git.isRepo).toBe(false);
      expect(partialContext.git.status).toBe('not_a_repository');
    });
  });
});
