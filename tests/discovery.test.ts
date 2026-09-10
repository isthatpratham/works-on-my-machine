import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import {
  resolveTargetPath,
  validateTargetDirectory,
  InvalidTargetError,
  classifyProjectFile,
  discoverProjectFiles,
  extractProjectMetadata,
  extractEnvironmentContext,
  extractDependencyContext,
  extractRuntimeContext,
} from '../src/discovery/index.js';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');
const NODE_PROJECT_DIR = resolve(FIXTURES_DIR, 'node-project');
const PYTHON_PROJECT_DIR = resolve(FIXTURES_DIR, 'python-project');
const IGNORED_DIRS_DIR = resolve(FIXTURES_DIR, 'ignored-dirs-project');

describe('Target Resolver', () => {
  it('should resolve default path to current working directory', () => {
    const res = resolveTargetPath();
    expect(res).toBe(resolve(process.cwd(), '.'));
  });

  it('should resolve relative path correctly', () => {
    const res = resolveTargetPath('./tests/fixtures/node-project');
    expect(res).toBe(NODE_PROJECT_DIR);
  });

  it('should validate an existing directory', () => {
    const validated = validateTargetDirectory(NODE_PROJECT_DIR);
    expect(validated).toBe(NODE_PROJECT_DIR);
  });

  it('should throw InvalidTargetError when directory does not exist', () => {
    expect(() =>
      validateTargetDirectory('./tests/fixtures/non-existent-12345'),
    ).toThrow(InvalidTargetError);
  });

  it('should throw InvalidTargetError when target is a file instead of directory', () => {
    const filePath = resolve(NODE_PROJECT_DIR, 'package.json');
    expect(() => validateTargetDirectory(filePath)).toThrow(InvalidTargetError);
  });
});

describe('File Classifier', () => {
  it('should classify environment files as env', () => {
    expect(classifyProjectFile('.env')).toBe('env');
    expect(classifyProjectFile('.env.example')).toBe('env');
    expect(classifyProjectFile('.env.local')).toBe('env');
    expect(classifyProjectFile('.env.production')).toBe('env');
  });

  it('should classify lockfiles as lockfile', () => {
    expect(classifyProjectFile('pnpm-lock.yaml')).toBe('lockfile');
    expect(classifyProjectFile('package-lock.json')).toBe('lockfile');
    expect(classifyProjectFile('yarn.lock')).toBe('lockfile');
    expect(classifyProjectFile('bun.lockb')).toBe('lockfile');
  });

  it('should classify manifests as manifest', () => {
    expect(classifyProjectFile('package.json')).toBe('manifest');
    expect(classifyProjectFile('pyproject.toml')).toBe('manifest');
    expect(classifyProjectFile('requirements.txt')).toBe('manifest');
    expect(classifyProjectFile('Cargo.toml')).toBe('manifest');
  });

  it('should classify config files as config', () => {
    expect(classifyProjectFile('.nvmrc')).toBe('config');
    expect(classifyProjectFile('.node-version')).toBe('config');
    expect(classifyProjectFile('tsconfig.json')).toBe('config');
    expect(classifyProjectFile('vite.config.ts')).toBe('config');
  });

  it('should classify ignore files as ignore', () => {
    expect(classifyProjectFile('.gitignore')).toBe('ignore');
    expect(classifyProjectFile('.prettierignore')).toBe('ignore');
  });

  it('should classify source files as source', () => {
    expect(classifyProjectFile('src/index.ts')).toBe('source');
    expect(classifyProjectFile('app.py')).toBe('source');
  });
});

describe('Project File Discovery', () => {
  it('should discover all project files with POSIX paths and deterministic ordering', () => {
    const files = discoverProjectFiles(NODE_PROJECT_DIR);
    const relPaths = files.map((f) => f.relativePath);

    expect(relPaths).toContain('.env');
    expect(relPaths).toContain('.env.example');
    expect(relPaths).toContain('.nvmrc');
    expect(relPaths).toContain('package.json');
    expect(relPaths).toContain('pnpm-lock.yaml');
    expect(relPaths).toContain('src/index.ts');

    // Deterministic sorted check
    const sorted = [...relPaths].sort((a, b) => a.localeCompare(b, 'en'));
    expect(relPaths).toEqual(sorted);
  });

  it('should exclude default ignored directories like node_modules, dist, coverage', () => {
    const files = discoverProjectFiles(IGNORED_DIRS_DIR);
    const relPaths = files.map((f) => f.relativePath);

    expect(relPaths).toContain('package.json');
    expect(relPaths).toContain('src/app.js');

    expect(relPaths).not.toContain('node_modules/dummy.js');
    expect(relPaths).not.toContain('dist/bundle.js');
    expect(relPaths).not.toContain('coverage/report.json');
  });
});

describe('Metadata Collectors', () => {
  it('should extract Node project metadata, framework, and packageManager', () => {
    const files = discoverProjectFiles(NODE_PROJECT_DIR);
    const metadata = extractProjectMetadata(NODE_PROJECT_DIR, files);

    expect(metadata.name).toBe('test-node-app');
    expect(metadata.description).toBe('A test Node.js application');
    expect(metadata.framework).toBe('Next.js');

    const deps = extractDependencyContext(NODE_PROJECT_DIR, files);
    expect(deps.packageManager?.name).toBe('pnpm');
    expect(deps.packageManager?.version).toBe('10.18.0');
    expect(deps.lockfiles).toContain('pnpm-lock.yaml');
    expect(deps.manifests).toContain('package.json');
  });

  it('should extract environment variables safely without secret leakage', () => {
    const files = discoverProjectFiles(NODE_PROJECT_DIR);
    const env = extractEnvironmentContext(NODE_PROJECT_DIR, files);

    expect(env.envFilePresent).toBe(true);
    expect(env.envExamplePresent).toBe(true);
    expect(env.detectedEnvVarNames).toEqual([
      'DATABASE_URL',
      'PORT',
      'SECRET_KEY',
    ]);

    // Ensure secret values are not in the collected context
    const serialized = JSON.stringify(env);
    expect(serialized).not.toContain('supersecret123');
    expect(serialized).not.toContain('postgres://');
  });

  it('should extract runtime facts for Node.js', () => {
    const files = discoverProjectFiles(NODE_PROJECT_DIR);
    const runtime = extractRuntimeContext(NODE_PROJECT_DIR, files);

    expect(runtime.node?.status).toBe('known');
    expect(runtime.node?.declared).toBe('20.19.0'); // from .nvmrc
    expect(runtime.node?.source).toBe('.nvmrc');
    expect(runtime.node?.installed).toBeDefined();
    expect(runtime.python?.status).toBe('not_applicable');
  });

  it('should extract Python runtime and dependency facts', () => {
    const files = discoverProjectFiles(PYTHON_PROJECT_DIR);
    const metadata = extractProjectMetadata(PYTHON_PROJECT_DIR, files);
    const runtime = extractRuntimeContext(PYTHON_PROJECT_DIR, files);
    const deps = extractDependencyContext(PYTHON_PROJECT_DIR, files);

    expect(metadata.name).toBeUndefined(); // pyproject has it, package.json absent
    expect(runtime.python?.status).toBe('known');
    expect(runtime.python?.declared).toBe('3.11.4');
    expect(runtime.python?.source).toBe('.python-version');
    expect(deps.manifests).toContain('pyproject.toml');
    expect(deps.manifests).toContain('requirements.txt');
  });

  it('should ignore nested fixture lockfiles, manifests, and .env files during root project analysis', () => {
    const rootPath = resolve(__dirname, '..');
    const files = discoverProjectFiles(rootPath);

    const deps = extractDependencyContext(rootPath, files);
    // Should only contain root lockfile (pnpm-lock.yaml) and not tests/fixtures/node-project/pnpm-lock.yaml
    expect(deps.lockfiles).toEqual(['pnpm-lock.yaml']);
    expect(deps.manifests).toEqual(['package.json']);

    const env = extractEnvironmentContext(rootPath, files);
    // Root repo has no .env
    expect(env.envFilePresent).toBe(false);

    const runtime = extractRuntimeContext(rootPath, files);
    // Root repo is Node/TS, python should be not_applicable despite tests/fixtures/python-project
    expect(runtime.node?.status).toBe('known');
    expect(runtime.python?.status).toBe('not_applicable');
  });
});
