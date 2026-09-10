import { safeExecFile, type ExecResult } from './process.js';
import type { GitContext } from '../domain/project-context.js';

export type GitExecutor = (
  file: string,
  args: readonly string[],
  options?: { cwd?: string; timeoutMs?: number },
) => Promise<ExecResult>;

/**
 * Safely collects Git repository state for a given project directory.
 *
 * Uses structured Git commands without shell interpolation.
 * If Git is not installed or the target is not a Git repository,
 * it returns a graceful degraded GitContext without throwing.
 */
export async function collectGitContext(
  projectRoot: string,
  exec: GitExecutor = safeExecFile,
): Promise<GitContext> {
  // Check if Git CLI is accessible
  const versionRes = await exec('git', ['--version'], {
    cwd: projectRoot,
    timeoutMs: 3000,
  });

  if (versionRes.exitCode !== 0) {
    return {
      isRepo: false,
      status: 'unavailable',
    };
  }

  // Check if target directory is inside a Git work tree
  const insideRes = await exec('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: projectRoot,
    timeoutMs: 3000,
  });

  if (insideRes.exitCode !== 0 || insideRes.stdout.trim() !== 'true') {
    return {
      isRepo: false,
      status: 'not_a_repository',
    };
  }

  // Target is a valid Git repository. Collect branch and status facts.
  let currentBranch: string | undefined;
  const branchRes = await exec('git', ['branch', '--show-current'], {
    cwd: projectRoot,
    timeoutMs: 3000,
  });

  if (branchRes.exitCode === 0 && branchRes.stdout.trim()) {
    currentBranch = branchRes.stdout.trim();
  } else {
    // Fallback for detached HEAD
    const revRes = await exec('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: projectRoot,
      timeoutMs: 3000,
    });
    if (revRes.exitCode === 0 && revRes.stdout.trim()) {
      currentBranch = `detached@${revRes.stdout.trim()}`;
    }
  }

  // Check working-tree status
  let isDirty = false;
  const untrackedFiles: string[] = [];

  const statusRes = await exec('git', ['status', '--porcelain'], {
    cwd: projectRoot,
    timeoutMs: 5000,
  });

  if (statusRes.exitCode === 0) {
    const lines = statusRes.stdout
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    if (lines.length > 0) {
      isDirty = true;
    }

    for (const line of lines) {
      if (line.startsWith('??')) {
        const rawPath = line.substring(3).trim();
        untrackedFiles.push(rawPath);
      }
    }
  }

  // Collect tracked files list
  let trackedFiles: string[] | undefined;
  const lsRes = await exec('git', ['ls-files'], {
    cwd: projectRoot,
    timeoutMs: 5000,
  });

  if (lsRes.exitCode === 0) {
    trackedFiles = lsRes.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .sort();
  }

  return {
    isRepo: true,
    status: 'available',
    currentBranch,
    isDirty,
    untrackedFiles: untrackedFiles.sort(),
    trackedFiles,
  };
}
