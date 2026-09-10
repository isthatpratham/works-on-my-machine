import type { Detector } from '../../domain/detector.js';
import type { Finding } from '../../domain/finding.js';
import type { ProjectContext } from '../../domain/project-context.js';
import { SEVERITIES } from '../../domain/severity.js';

export class DependencyDetector implements Detector {
  readonly id = 'dependencies';
  readonly category = 'dependencies';

  supports(context: ProjectContext): boolean {
    return (
      context.dependencies.manifests.length > 0 ||
      context.dependencies.lockfiles.length > 0 ||
      context.dependencies.packageManager !== undefined
    );
  }

  analyze(context: ProjectContext): Finding[] {
    const findings: Finding[] = [];
    const { manifests, lockfiles, packageManager } = context.dependencies;

    // 1. Missing lockfile
    if (manifests.length > 0 && lockfiles.length === 0) {
      findings.push({
        id: 'dependencies.lockfile.missing',
        category: 'dependencies',
        severity: SEVERITIES.WARNING,
        title: 'Dependency lockfile is missing',
        description:
          'A package manifest was found but no corresponding lockfile was detected.',
        evidence: manifests.map((m) => ({
          type: 'manifest',
          source: m,
        })),
        impact:
          'Different machines may resolve different dependency versions, resulting in non-reproducible builds.',
        recommendation:
          'Generate and commit a lockfile using your package manager.',
      });
    }

    // 2. Multiple lockfiles
    if (lockfiles.length > 1) {
      findings.push({
        id: 'dependencies.lockfile.multiple',
        category: 'dependencies',
        severity: SEVERITIES.WARNING,
        title: 'Multiple dependency lockfiles detected',
        description:
          'Multiple lockfiles from different package managers were found in the project.',
        evidence: lockfiles.map((l) => ({
          type: 'lockfile',
          source: l,
        })),
        impact:
          'Different developers or CI systems may use different package managers and dependency resolution strategies.',
        recommendation:
          "Keep only the lockfile corresponding to the project's intended package manager.",
      });
    }

    // 3. Package manager conflict
    if (
      packageManager &&
      packageManager.source === 'package.json#packageManager' &&
      lockfiles.length > 0
    ) {
      const pmName = packageManager.name.toLowerCase();
      const lockfileNames = lockfiles.map((l) => l.toLowerCase());

      const lockfileMatchesPm =
        (pmName === 'pnpm' && lockfileNames.includes('pnpm-lock.yaml')) ||
        (pmName === 'npm' && lockfileNames.includes('package-lock.json')) ||
        (pmName === 'yarn' && lockfileNames.includes('yarn.lock')) ||
        (pmName === 'bun' &&
          (lockfileNames.includes('bun.lockb') ||
            lockfileNames.includes('bun.lock')));

      if (!lockfileMatchesPm) {
        findings.push({
          id: 'dependencies.manager.conflict',
          category: 'dependencies',
          severity: SEVERITIES.WARNING,
          title: 'Package manager configuration is inconsistent',
          description: `The declared packageManager '${packageManager.name}' in package.json does not match the detected lockfile(s).`,
          evidence: [
            {
              type: 'packageManager',
              source: 'package.json',
              detail: packageManager.name,
            },
            ...lockfiles.map((l) => ({
              type: 'lockfile',
              source: l,
            })),
          ],
          impact:
            'Developers running the declared package manager may not use the lockfile.',
          recommendation:
            "Ensure the declared packageManager matches the project's committed lockfile.",
        });
      }
    }

    // 4. Untracked lockfile
    if (
      context.git.isRepo &&
      context.git.status === 'available' &&
      context.git.untrackedFiles &&
      context.git.untrackedFiles.length > 0
    ) {
      const untrackedLockfiles = lockfiles.filter((l) =>
        context.git.untrackedFiles?.includes(l),
      );

      if (untrackedLockfiles.length > 0) {
        findings.push({
          id: 'dependencies.lockfile.untracked',
          category: 'dependencies',
          severity: SEVERITIES.WARNING,
          title: 'Dependency lockfile is not tracked by Git',
          description:
            'A dependency lockfile exists locally but is untracked in version control.',
          evidence: untrackedLockfiles.map((l) => ({
            type: 'untracked-lockfile',
            source: l,
          })),
          impact:
            'Other developers and CI environments will not receive locked dependency versions.',
          recommendation: 'Track and commit the dependency lockfile in Git.',
        });
      }
    }

    return findings;
  }
}
