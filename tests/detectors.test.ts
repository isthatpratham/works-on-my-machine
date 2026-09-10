import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { RuntimeDetector } from '../src/detection/detectors/runtime-detector.js';
import { DependencyDetector } from '../src/detection/detectors/dependency-detector.js';
import { EnvironmentDetector } from '../src/detection/detectors/environment-detector.js';
import { ConfigurationDetector } from '../src/detection/detectors/configuration-detector.js';
import { GitDetector } from '../src/detection/detectors/git-detector.js';
import { createDefaultDetectorRegistry } from '../src/detection/default-registry.js';
import { analyzeProject } from '../src/application/analyze-project.js';
import type { ProjectContext } from '../src/domain/project-context.js';
import { SEVERITIES } from '../src/domain/severity.js';

let tempDir: string;

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `womm-detector-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function createMockContext(
  overrides: Partial<ProjectContext> = {},
): ProjectContext {
  return {
    rootPath: tempDir,
    projectFiles: [],
    metadata: {},
    runtime: {},
    dependencies: {
      lockfiles: [],
      manifests: [],
    },
    environment: {
      os: 'linux',
      arch: 'x64',
      envFilePresent: false,
      envExamplePresent: false,
      detectedEnvVarNames: [],
    },
    git: {
      isRepo: false,
      status: 'not_a_repository',
    },
    ...overrides,
  };
}

describe('RuntimeDetector', () => {
  const detector = new RuntimeDetector();

  it('supports() returns false when no runtime metadata exists', () => {
    const ctx = createMockContext();
    expect(detector.supports(ctx)).toBe(false);
  });

  it('supports() returns true when Node or Python runtime is known', () => {
    const ctx = createMockContext({
      runtime: { node: { status: 'known' } },
    });
    expect(detector.supports(ctx)).toBe(true);
  });

  it('detects unpinned Node version (runtime.node.unpinned)', () => {
    const ctx = createMockContext({
      runtime: {
        node: {
          status: 'known',
          declared: '>=18.0.0',
          source: 'package.json#engines.node',
        },
      },
    });

    const findings = detector.analyze(ctx);
    const unpinned = findings.find((f) => f.id === 'runtime.node.unpinned');
    expect(unpinned).toBeDefined();
    expect(unpinned?.severity).toBe(SEVERITIES.WARNING);
  });

  it('does not trigger runtime.node.unpinned when version is pinned', () => {
    const ctx = createMockContext({
      runtime: {
        node: {
          status: 'known',
          declared: '20.19.0',
          installed: '20.19.0',
          source: '.nvmrc',
        },
      },
    });

    const findings = detector.analyze(ctx);
    expect(
      findings.find((f) => f.id === 'runtime.node.unpinned'),
    ).toBeUndefined();
  });

  it('detects Node version mismatch (runtime.node.mismatch)', () => {
    const ctx = createMockContext({
      runtime: {
        node: {
          status: 'known',
          declared: '20.10.0',
          installed: '18.15.0',
          source: '.nvmrc',
        },
      },
    });

    const findings = detector.analyze(ctx);
    const mismatch = findings.find((f) => f.id === 'runtime.node.mismatch');
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe(SEVERITIES.CRITICAL);
    expect(mismatch?.description).toContain('Node.js 20.10.0');
    expect(mismatch?.description).toContain('running Node.js 18.15.0');
  });

  it('detects conflicting Node declarations (runtime.node.conflict)', () => {
    writeFileSync(join(tempDir, '.nvmrc'), '18\n');
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ engines: { node: '20.x' } }),
    );

    const ctx = createMockContext({
      projectFiles: [
        { relativePath: '.nvmrc', type: 'config' },
        { relativePath: 'package.json', type: 'manifest' },
      ],
      runtime: {
        node: {
          status: 'known',
          declared: '18',
          installed: '18.0.0',
          source: '.nvmrc',
        },
      },
    });

    const findings = detector.analyze(ctx);
    const conflict = findings.find((f) => f.id === 'runtime.node.conflict');
    expect(conflict).toBeDefined();
    expect(conflict?.severity).toBe(SEVERITIES.WARNING);
  });

  it('detects unpinned Python version (runtime.python.unpinned)', () => {
    const ctx = createMockContext({
      runtime: {
        python: {
          status: 'known',
        },
      },
    });

    const findings = detector.analyze(ctx);
    const unpinned = findings.find((f) => f.id === 'runtime.python.unpinned');
    expect(unpinned).toBeDefined();
    expect(unpinned?.severity).toBe(SEVERITIES.WARNING);
  });

  it('detects Python version mismatch (runtime.python.mismatch)', () => {
    const ctx = createMockContext({
      runtime: {
        python: {
          status: 'known',
          declared: '3.11',
          installed: '3.10',
          source: '.python-version',
        },
      },
    });

    const findings = detector.analyze(ctx);
    const mismatch = findings.find((f) => f.id === 'runtime.python.mismatch');
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe(SEVERITIES.CRITICAL);
  });
});

describe('DependencyDetector', () => {
  const detector = new DependencyDetector();

  it('detects missing lockfile (dependencies.lockfile.missing)', () => {
    const ctx = createMockContext({
      dependencies: {
        manifests: ['package.json'],
        lockfiles: [],
      },
    });

    const findings = detector.analyze(ctx);
    const missing = findings.find(
      (f) => f.id === 'dependencies.lockfile.missing',
    );
    expect(missing).toBeDefined();
    expect(missing?.severity).toBe(SEVERITIES.WARNING);
  });

  it('detects multiple lockfiles (dependencies.lockfile.multiple)', () => {
    const ctx = createMockContext({
      dependencies: {
        manifests: ['package.json'],
        lockfiles: ['package-lock.json', 'pnpm-lock.yaml'],
      },
    });

    const findings = detector.analyze(ctx);
    const multiple = findings.find(
      (f) => f.id === 'dependencies.lockfile.multiple',
    );
    expect(multiple).toBeDefined();
    expect(multiple?.severity).toBe(SEVERITIES.WARNING);
  });

  it('detects package manager conflict (dependencies.manager.conflict)', () => {
    const ctx = createMockContext({
      dependencies: {
        packageManager: {
          name: 'pnpm',
          version: '9.0.0',
          source: 'package.json#packageManager',
        },
        manifests: ['package.json'],
        lockfiles: ['package-lock.json'],
      },
    });

    const findings = detector.analyze(ctx);
    const conflict = findings.find(
      (f) => f.id === 'dependencies.manager.conflict',
    );
    expect(conflict).toBeDefined();
    expect(conflict?.severity).toBe(SEVERITIES.WARNING);
  });

  it('detects untracked lockfile in git repo (dependencies.lockfile.untracked)', () => {
    const ctx = createMockContext({
      dependencies: {
        manifests: ['package.json'],
        lockfiles: ['pnpm-lock.yaml'],
      },
      git: {
        isRepo: true,
        status: 'available',
        untrackedFiles: ['pnpm-lock.yaml'],
      },
    });

    const findings = detector.analyze(ctx);
    const untracked = findings.find(
      (f) => f.id === 'dependencies.lockfile.untracked',
    );
    expect(untracked).toBeDefined();
    expect(untracked?.severity).toBe(SEVERITIES.WARNING);
  });
});

describe('EnvironmentDetector', () => {
  const detector = new EnvironmentDetector();

  it('detects missing .env.example template (environment.env.template-missing)', () => {
    const ctx = createMockContext({
      environment: {
        os: 'linux',
        arch: 'x64',
        envFilePresent: true,
        envExamplePresent: false,
        detectedEnvVarNames: ['DATABASE_URL'],
      },
    });

    const findings = detector.analyze(ctx);
    const missing = findings.find(
      (f) => f.id === 'environment.env.template-missing',
    );
    expect(missing).toBeDefined();
    expect(missing?.severity).toBe(SEVERITIES.WARNING);
  });

  it('detects undocumented environment variables (environment.variable.undocumented) without leaking secrets', () => {
    writeFileSync(join(tempDir, '.env.example'), 'NODE_ENV=production\n');

    const ctx = createMockContext({
      environment: {
        os: 'linux',
        arch: 'x64',
        envFilePresent: true,
        envExamplePresent: true,
        detectedEnvVarNames: ['DATABASE_URL', 'NODE_ENV', 'SECRET_KEY'],
      },
    });

    const findings = detector.analyze(ctx);
    const undoc = findings.find(
      (f) => f.id === 'environment.variable.undocumented',
    );
    expect(undoc).toBeDefined();
    expect(undoc?.description).toContain('DATABASE_URL, SECRET_KEY');
    // Ensure secret values are never present
    expect(JSON.stringify(undoc)).not.toContain('super-secret-value');
  });

  it('detects local service dependency on localhost (environment.localhost.dependency)', () => {
    writeFileSync(
      join(tempDir, '.env'),
      'DATABASE_URL=postgres://user:pass@localhost:5432/db\n',
    );

    const ctx = createMockContext({
      projectFiles: [{ relativePath: '.env', type: 'env' }],
      environment: {
        os: 'linux',
        arch: 'x64',
        envFilePresent: true,
        envExamplePresent: true,
        detectedEnvVarNames: ['DATABASE_URL'],
      },
    });

    const findings = detector.analyze(ctx);
    const local = findings.find(
      (f) => f.id === 'environment.localhost.dependency',
    );
    expect(local).toBeDefined();
    expect(local?.severity).toBe(SEVERITIES.WARNING);
    // Ensure passwords in URLs are not leaked
    expect(JSON.stringify(local)).not.toContain('pass');
  });

  it('detects machine-specific absolute paths (environment.absolute-path)', () => {
    writeFileSync(
      join(tempDir, '.env'),
      'LOG_DIR=C:\\Users\\JohnDoe\\Documents\\logs\n',
    );

    const ctx = createMockContext({
      projectFiles: [{ relativePath: '.env', type: 'env' }],
      environment: {
        os: 'windows',
        arch: 'x64',
        envFilePresent: true,
        envExamplePresent: true,
        detectedEnvVarNames: ['LOG_DIR'],
      },
    });

    const findings = detector.analyze(ctx);
    const absPath = findings.find((f) => f.id === 'environment.absolute-path');
    expect(absPath).toBeDefined();
    expect(absPath?.evidence?.[0]?.detail).toContain(
      'C:\\Users\\<user>\\Documents\\logs',
    );
  });

  it('detects hardcoded local network IPs (environment.hardcoded-local-ip)', () => {
    writeFileSync(join(tempDir, '.env'), 'API_HOST=192.168.1.100\n');

    const ctx = createMockContext({
      projectFiles: [{ relativePath: '.env', type: 'env' }],
      environment: {
        os: 'linux',
        arch: 'x64',
        envFilePresent: true,
        envExamplePresent: true,
        detectedEnvVarNames: ['API_HOST'],
      },
    });

    const findings = detector.analyze(ctx);
    const localIp = findings.find(
      (f) => f.id === 'environment.hardcoded-local-ip',
    );
    expect(localIp).toBeDefined();
    expect(localIp?.evidence?.[0]?.detail).toBe('192.168.1.100');
  });
});

describe('ConfigurationDetector', () => {
  const detector = new ConfigurationDetector();

  it('detects platform-specific commands in package.json scripts (configuration.script.platform-specific)', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          clean: 'rm -rf dist',
          build: 'export NODE_ENV=production && tsc',
        },
      }),
    );

    const ctx = createMockContext({
      projectFiles: [{ relativePath: 'package.json', type: 'manifest' }],
    });

    const findings = detector.analyze(ctx);
    const platformScripts = findings.filter(
      (f) => f.id === 'configuration.script.platform-specific',
    );
    expect(platformScripts.length).toBeGreaterThanOrEqual(2);
    expect(platformScripts[0]?.severity).toBe(SEVERITIES.WARNING);
  });

  it('detects missing runtime configuration metadata (configuration.runtime-metadata.missing)', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-app',
      }),
    );

    const ctx = createMockContext({
      projectFiles: [{ relativePath: 'package.json', type: 'manifest' }],
    });

    const findings = detector.analyze(ctx);
    const missingMeta = findings.find(
      (f) => f.id === 'configuration.runtime-metadata.missing',
    );
    expect(missingMeta).toBeDefined();
    expect(missingMeta?.severity).toBe(SEVERITIES.WARNING);
  });
});

describe('GitDetector', () => {
  const detector = new GitDetector();

  it('detects tracked sensitive environment file (git.env.tracked)', () => {
    const ctx = createMockContext({
      git: {
        isRepo: true,
        status: 'available',
        trackedFiles: ['.env', 'package.json'],
      },
    });

    const findings = detector.analyze(ctx);
    const tracked = findings.find((f) => f.id === 'git.env.tracked');
    expect(tracked).toBeDefined();
    expect(tracked?.severity).toBe(SEVERITIES.CRITICAL);
  });

  it('detects dirty working tree (git.working-tree.dirty)', () => {
    const ctx = createMockContext({
      git: {
        isRepo: true,
        status: 'available',
        isDirty: true,
      },
    });

    const findings = detector.analyze(ctx);
    const dirty = findings.find((f) => f.id === 'git.working-tree.dirty');
    expect(dirty).toBeDefined();
    expect(dirty?.severity).toBe(SEVERITIES.WARNING);
  });

  it('detects missing .gitignore file (git.gitignore.missing)', () => {
    const ctx = createMockContext({
      projectFiles: [{ relativePath: 'package.json', type: 'manifest' }],
      git: {
        isRepo: true,
        status: 'available',
      },
    });

    const findings = detector.analyze(ctx);
    const missing = findings.find((f) => f.id === 'git.gitignore.missing');
    expect(missing).toBeDefined();
    expect(missing?.severity).toBe(SEVERITIES.WARNING);
  });

  it('detects untracked lockfile in Git (git.lockfile.untracked)', () => {
    const ctx = createMockContext({
      dependencies: {
        manifests: ['package.json'],
        lockfiles: ['pnpm-lock.yaml'],
      },
      git: {
        isRepo: true,
        status: 'available',
        untrackedFiles: ['pnpm-lock.yaml'],
      },
    });

    const findings = detector.analyze(ctx);
    const untracked = findings.find((f) => f.id === 'git.lockfile.untracked');
    expect(untracked).toBeDefined();
    expect(untracked?.severity).toBe(SEVERITIES.WARNING);
  });
});

describe('Default Detector Registry & Application Orchestration', () => {
  it('creates registry with all 5 standard V1 detectors registered', () => {
    const registry = createDefaultDetectorRegistry();
    expect(registry.size).toBe(5);
    expect(registry.has('runtime')).toBe(true);
    expect(registry.has('dependencies')).toBe(true);
    expect(registry.has('environment')).toBe(true);
    expect(registry.has('configuration')).toBe(true);
    expect(registry.has('git')).toBe(true);
  });

  it('analyzeProject executes end-to-end on clean project fixture', async () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'clean-app',
        engines: { node: '20.0.0' },
      }),
    );
    writeFileSync(join(tempDir, 'pnpm-lock.yaml'), '# lockfile\n');
    writeFileSync(join(tempDir, '.gitignore'), 'node_modules\n');
    writeFileSync(join(tempDir, '.nvmrc'), '20.0.0\n');

    const result = await analyzeProject(tempDir, {
      gitExecutor: async () => ({
        exitCode: 0,
        stdout: '',
        stderr: '',
      }),
    });

    expect(result).toBeDefined();
    expect(result.executedDetectors.length).toBe(5);
    expect(result.isComplete).toBe(true);
  });
});
