import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { getCliVersion, createProgram } from '../src/cli/index.js';
import pkg from '../package.json' with { type: 'json' };

const projectRoot = resolve(__dirname, '..');
const distIndexPath = join(projectRoot, 'dist', 'index.js');
const tempFixtureDir = join(
  projectRoot,
  'tests',
  'fixtures',
  'tmp-version-fixture',
);

describe('CLI runtime version resolution', () => {
  it('should dynamically read the version from package.json at runtime', () => {
    const version = getCliVersion();
    expect(version).toBe(pkg.version);
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('should initialize commander program with dynamic runtime version', () => {
    const program = createProgram();
    expect(program.version()).toBe(pkg.version);
    expect(program.version()).toBe(getCliVersion());
  });

  it('should resolve version from an arbitrary module URL traversing upwards', () => {
    const fakeDistDir = join(
      projectRoot,
      'tests',
      'fixtures',
      'fake-pkg',
      'dist',
    );
    const fakePkgDir = join(projectRoot, 'tests', 'fixtures', 'fake-pkg');
    mkdirSync(fakeDistDir, { recursive: true });
    writeFileSync(
      join(fakePkgDir, 'package.json'),
      JSON.stringify({ name: '@isthatpratham/womm', version: '2.3.4' }),
    );

    try {
      const fakeModuleUrl = pathToFileURL(join(fakeDistDir, 'index.js')).href;
      const resolvedVersion = getCliVersion(fakeModuleUrl);
      expect(resolvedVersion).toBe('2.3.4');
    } finally {
      rmSync(fakePkgDir, { recursive: true, force: true });
    }
  });

  it('should fallback to 0.0.0 when no package.json is found in traversal', () => {
    const nonExistentPath = resolve(
      '/',
      'non_existent_folder_xyz_9999',
      'nested',
      'index.js',
    );
    const fakeUrl = pathToFileURL(nonExistentPath).href;
    const version = getCliVersion(fakeUrl);
    expect(version).toBe('0.0.0');
  });

  describe('Post-build version bump regression test', () => {
    beforeAll(() => {
      // Ensure dist/index.js exists
      if (!existsSync(distIndexPath)) {
        spawnSync('pnpm', ['build'], { cwd: projectRoot, shell: true });
      }
      mkdirSync(join(tempFixtureDir, 'dist'), { recursive: true });
      copyFileSync(distIndexPath, join(tempFixtureDir, 'dist', 'index.js'));
    });

    afterAll(() => {
      rmSync(tempFixtureDir, { recursive: true, force: true });
    });

    it('should reflect package.json version changes after the bundle was already built', () => {
      // Step 1: Set package.json to simulated version 0.1.1
      writeFileSync(
        join(tempFixtureDir, 'package.json'),
        JSON.stringify({
          name: '@isthatpratham/womm',
          version: '0.1.1',
          type: 'module',
        }),
      );

      const run1 = spawnSync(
        process.execPath,
        [join(tempFixtureDir, 'dist', 'index.js'), '--version'],
        { encoding: 'utf-8', cwd: tempFixtureDir },
      );

      expect(run1.status).toBe(0);
      expect(run1.stdout.trim()).toBe('0.1.1');

      // Step 2: Simulate semantic-release bumping package.json to 0.1.2 WITHOUT rebuilding dist/index.js
      writeFileSync(
        join(tempFixtureDir, 'package.json'),
        JSON.stringify({
          name: '@isthatpratham/womm',
          version: '0.1.2',
          type: 'module',
        }),
      );

      const run2 = spawnSync(
        process.execPath,
        [join(tempFixtureDir, 'dist', 'index.js'), '--version'],
        { encoding: 'utf-8', cwd: tempFixtureDir },
      );

      expect(run2.status).toBe(0);
      expect(run2.stdout.trim()).toBe('0.1.2');

      // Step 3: Simulate major version bump to 1.0.0 WITHOUT rebuilding dist/index.js
      writeFileSync(
        join(tempFixtureDir, 'package.json'),
        JSON.stringify({
          name: '@isthatpratham/womm',
          version: '1.0.0',
          type: 'module',
        }),
      );

      const run3 = spawnSync(
        process.execPath,
        [join(tempFixtureDir, 'dist', 'index.js'), '--version'],
        { encoding: 'utf-8', cwd: tempFixtureDir },
      );

      expect(run3.status).toBe(0);
      expect(run3.stdout.trim()).toBe('1.0.0');
    });
  });
});
