import type { Detector } from '../../domain/detector.js';
import type { Finding } from '../../domain/finding.js';
import type { ProjectContext } from '../../domain/project-context.js';
import { SEVERITIES } from '../../domain/severity.js';

const SENSITIVE_ENV_NAMES = new Set([
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
  '.env.staging',
]);

export class GitDetector implements Detector {
  readonly id = 'git';
  readonly category = 'git';

  supports(context: ProjectContext): boolean {
    return context.git.isRepo === true && context.git.status === 'available';
  }

  analyze(context: ProjectContext): Finding[] {
    const findings: Finding[] = [];
    const { trackedFiles, untrackedFiles, isDirty } = context.git;

    // 1. Sensitive environment files tracked by Git
    if (trackedFiles && trackedFiles.length > 0) {
      const trackedEnvFiles = trackedFiles.filter((f) =>
        SENSITIVE_ENV_NAMES.has(f),
      );

      if (trackedEnvFiles.length > 0) {
        findings.push({
          id: 'git.env.tracked',
          category: 'git',
          severity: SEVERITIES.CRITICAL,
          title: 'Environment file is tracked by Git',
          description: `Local environment file (${trackedEnvFiles.join(', ')}) is tracked in version control.`,
          evidence: trackedEnvFiles.map((f) => ({
            type: 'tracked-env-file',
            source: f,
          })),
          impact:
            'Sensitive configuration or secrets may be committed to the repository.',
          recommendation:
            'Remove the environment file from Git tracking and add it to .gitignore.',
        });
      }
    }

    // 2. Dirty working tree
    if (isDirty === true) {
      findings.push({
        id: 'git.working-tree.dirty',
        category: 'git',
        severity: SEVERITIES.WARNING,
        title: 'Working tree contains uncommitted changes',
        description:
          'The Git working tree contains uncommitted modifications or untracked changes.',
        evidence: [
          {
            type: 'git-status',
            source: '.git',
            detail: 'Working tree is dirty (uncommitted changes detected)',
          },
        ],
        impact:
          'The current machine state may contain behavior not represented in the committed repository state.',
        recommendation:
          'Commit or stash all uncommitted changes before verifying reproducibility.',
      });
    }

    // 3. Missing .gitignore
    const hasGitignore = context.projectFiles.some(
      (f) => f.relativePath === '.gitignore',
    );

    if (!hasGitignore) {
      findings.push({
        id: 'git.gitignore.missing',
        category: 'git',
        severity: SEVERITIES.WARNING,
        title: 'No .gitignore file detected',
        description: 'The Git repository does not contain a .gitignore file.',
        evidence: [
          {
            type: 'missing-file',
            source: '.gitignore',
          },
        ],
        impact:
          'Machine-specific files, dependency directories, or secrets may accidentally enter version control.',
        recommendation:
          'Add a .gitignore file appropriate for the project ecosystem.',
      });
    }

    // 4. Untracked lockfile
    if (untrackedFiles && untrackedFiles.length > 0) {
      const untrackedLockfiles = context.dependencies.lockfiles.filter((l) =>
        untrackedFiles.includes(l),
      );

      if (untrackedLockfiles.length > 0) {
        findings.push({
          id: 'git.lockfile.untracked',
          category: 'git',
          severity: SEVERITIES.WARNING,
          title: 'Dependency lockfile is not tracked by Git',
          description: `Dependency lockfile (${untrackedLockfiles.join(', ')}) exists locally but is not tracked by Git.`,
          evidence: untrackedLockfiles.map((l) => ({
            type: 'untracked-lockfile',
            source: l,
          })),
          impact:
            'Other machines and CI environments will not receive locked dependency versions.',
          recommendation: 'Track and commit the dependency lockfile in Git.',
        });
      }
    }

    return findings;
  }
}
