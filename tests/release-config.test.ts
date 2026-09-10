import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Release Configuration & Rules', () => {
  const rootDir = resolve(__dirname, '..');
  const releasercPath = resolve(rootDir, '.releaserc.json');
  const packageJsonPath = resolve(rootDir, 'package.json');
  const releaseWorkflowPath = resolve(rootDir, '.github/workflows/release.yml');

  it('should have a valid .releaserc.json with main branch configured', () => {
    expect(existsSync(releasercPath)).toBe(true);
    const content = JSON.parse(readFileSync(releasercPath, 'utf-8'));

    expect(content.branches).toEqual(['main']);
    expect(Array.isArray(content.plugins)).toBe(true);
  });

  it('should correctly configure commit-analyzer release rules for Conventional Commits', () => {
    const content = JSON.parse(readFileSync(releasercPath, 'utf-8'));
    const commitAnalyzerPlugin = content.plugins.find(
      (p: unknown) =>
        (Array.isArray(p) && p[0] === '@semantic-release/commit-analyzer') ||
        p === '@semantic-release/commit-analyzer',
    );

    expect(commitAnalyzerPlugin).toBeDefined();
    const config = Array.isArray(commitAnalyzerPlugin)
      ? commitAnalyzerPlugin[1]
      : {};
    const rules = config.releaseRules || [];

    // Helper to get rule for a type
    const getRelease = (type: string) => {
      const rule = rules.find(
        (r: { type: string; release: string | boolean }) => r.type === type,
      );
      return rule ? rule.release : undefined;
    };

    // Scenario A: fix commit → patch release
    expect(getRelease('fix')).toBe('patch');
    expect(getRelease('perf')).toBe('patch');
    expect(getRelease('revert')).toBe('patch');

    // Scenario B: feat commit → minor release
    expect(getRelease('feat')).toBe('minor');

    // Scenario D & E: docs, chore, style, refactor, test, ci → no release
    expect(getRelease('docs')).toBe(false);
    expect(getRelease('chore')).toBe(false);
    expect(getRelease('style')).toBe(false);
    expect(getRelease('refactor')).toBe(false);
    expect(getRelease('test')).toBe(false);
    expect(getRelease('ci')).toBe(false);
  });

  it('should configure package.json with public publishConfig and correct metadata', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(pkg.name).toBe('@isthatpratham/womm');
    expect(pkg.bin).toEqual({ womm: 'dist/index.js' });
    expect(pkg.publishConfig).toEqual({ access: 'public' });
    expect(pkg.repository.url).toContain(
      'github.com/isthatpratham/works-on-my-machine',
    );
  });

  it('should configure release.yml with OIDC Trusted Publishing permissions and validation steps', () => {
    expect(existsSync(releaseWorkflowPath)).toBe(true);
    const yaml = readFileSync(releaseWorkflowPath, 'utf-8');

    // Branch trigger only on main
    expect(yaml).toMatch(/branches:\s*-\s*main/);

    // Required OIDC and release permissions
    expect(yaml).toContain('id-token: write');
    expect(yaml).toContain('contents: write');

    // Pre-release validation pipeline steps
    expect(yaml).toContain('pnpm typecheck');
    expect(yaml).toContain('pnpm lint');
    expect(yaml).toContain('pnpm format:check');
    expect(yaml).toContain('pnpm test');
    expect(yaml).toContain('pnpm build');
    expect(yaml).toContain('npm pack --dry-run');

    // Semantic release execution
    expect(yaml).toContain('pnpm exec semantic-release');
  });
});
