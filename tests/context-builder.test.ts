import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { buildProjectContext } from '../src/application/context-builder.js';
import type { ExecResult } from '../src/platform/process.js';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');
const NODE_PROJECT_DIR = resolve(FIXTURES_DIR, 'node-project');

describe('Context Builder', () => {
  it('should assemble a complete ProjectContext snapshot for a valid project', async () => {
    const context = await buildProjectContext(NODE_PROJECT_DIR);

    expect(context.rootPath).toBe(NODE_PROJECT_DIR);
    expect(context.projectFiles.length).toBeGreaterThan(0);
    expect(context.metadata.name).toBe('test-node-app');
    expect(context.metadata.framework).toBe('Next.js');
    expect(context.runtime.node?.status).toBe('known');
    expect(context.dependencies.lockfiles).toContain('pnpm-lock.yaml');
    expect(context.environment.envFilePresent).toBe(true);
    expect(context.git).toBeDefined();
  });

  it('should handle Git available and populated via mock executor', async () => {
    const mockGitExecutor = async (
      _file: string,
      args: readonly string[],
    ): Promise<ExecResult> => {
      const cmd = args[0];
      if (cmd === '--version') {
        return { exitCode: 0, stdout: 'git version 2.44.0\n', stderr: '' };
      }
      if (cmd === 'rev-parse' && args[1] === '--is-inside-work-tree') {
        return { exitCode: 0, stdout: 'true\n', stderr: '' };
      }
      if (cmd === 'branch') {
        return { exitCode: 0, stdout: 'feature/womm-p3\n', stderr: '' };
      }
      if (cmd === 'status') {
        return {
          exitCode: 0,
          stdout: ' M package.json\n?? new-untracked-file.ts\n',
          stderr: '',
        };
      }
      if (cmd === 'ls-files') {
        return {
          exitCode: 0,
          stdout: 'package.json\nsrc/index.ts\n',
          stderr: '',
        };
      }
      return { exitCode: 0, stdout: '', stderr: '' };
    };

    const context = await buildProjectContext(NODE_PROJECT_DIR, {
      gitExecutor: mockGitExecutor,
    });

    expect(context.git.isRepo).toBe(true);
    expect(context.git.status).toBe('available');
    expect(context.git.currentBranch).toBe('feature/womm-p3');
    expect(context.git.isDirty).toBe(true);
    expect(context.git.untrackedFiles).toEqual(['new-untracked-file.ts']);
    expect(context.git.trackedFiles).toEqual(['package.json', 'src/index.ts']);
  });

  it('should gracefully handle when Git is unavailable without crashing analysis', async () => {
    const mockGitUnavailable = async (): Promise<ExecResult> => {
      return { exitCode: 127, stdout: '', stderr: 'git: command not found' };
    };

    const context = await buildProjectContext(NODE_PROJECT_DIR, {
      gitExecutor: mockGitUnavailable,
    });

    expect(context.git.isRepo).toBe(false);
    expect(context.git.status).toBe('unavailable');
    expect(context.rootPath).toBe(NODE_PROJECT_DIR);
    expect(context.runtime.node?.status).toBe('known');
  });

  it('should gracefully handle when directory is not a Git repository', async () => {
    const mockNotGitRepo = async (
      _file: string,
      args: readonly string[],
    ): Promise<ExecResult> => {
      if (args[0] === '--version') {
        return { exitCode: 0, stdout: 'git version 2.44.0\n', stderr: '' };
      }
      return {
        exitCode: 128,
        stdout: '',
        stderr: 'fatal: not a git repository',
      };
    };

    const context = await buildProjectContext(NODE_PROJECT_DIR, {
      gitExecutor: mockNotGitRepo,
    });

    expect(context.git.isRepo).toBe(false);
    expect(context.git.status).toBe('not_a_repository');
  });

  it('should maintain strict read-only behavior on the target project', async () => {
    const pkgPath = resolve(NODE_PROJECT_DIR, 'package.json');
    const contentBefore = readFileSync(pkgPath, 'utf-8');
    const statBefore = statSync(pkgPath).mtimeMs;

    await buildProjectContext(NODE_PROJECT_DIR);

    const contentAfter = readFileSync(pkgPath, 'utf-8');
    const statAfter = statSync(pkgPath).mtimeMs;

    expect(contentAfter).toBe(contentBefore);
    expect(statAfter).toBe(statBefore);
  });
});
