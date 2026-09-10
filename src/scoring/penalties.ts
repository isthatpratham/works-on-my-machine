import type { Finding } from '../domain/finding.js';
import type { Severity } from '../domain/severity.js';

export const BASE_SCORE = 100;

export const DEFAULT_SEVERITY_PENALTIES: Record<Severity, number> = {
  critical: 25,
  warning: 10,
  info: 0,
};

/**
 * Authoritative rule-specific penalties defined in docs/SCORING.md.
 */
export const RULE_PENALTIES: Record<string, number> = {
  // Runtime
  'runtime.node.unpinned': 10,
  'runtime.node.mismatch': 25,
  'runtime.node.conflict': 10,
  'runtime.python.unpinned': 10,
  'runtime.python.mismatch': 25,

  // Dependencies
  'dependencies.lockfile.missing': 10,
  'dependencies.lockfile.multiple': 10,
  'dependencies.manager.conflict': 10,
  'dependencies.lockfile.untracked': 10,

  // Environment
  'environment.env.template-missing': 10,
  'environment.variable.undocumented': 10,
  'environment.localhost.dependency': 15,
  'environment.absolute-path': 15,
  'environment.hardcoded-local-ip': 15,

  // Configuration
  'configuration.script.platform-specific': 10,
  'configuration.runtime-metadata.missing': 10,

  // Git
  'git.env.tracked': 25,
  'git.working-tree.dirty': 5,
  'git.gitignore.missing': 5,
  'git.lockfile.untracked': 10,
};

/**
 * Resolves the deterministic penalty for a given Finding.
 *
 * Precedence:
 * 1. Explicit rule penalty from RULE_PENALTIES
 * 2. Severity default penalty from DEFAULT_SEVERITY_PENALTIES
 * 3. Fallback to 0
 */
export function getFindingPenalty(finding: Finding): number {
  if (finding.id in RULE_PENALTIES) {
    return RULE_PENALTIES[finding.id]!;
  }

  if (finding.severity in DEFAULT_SEVERITY_PENALTIES) {
    return DEFAULT_SEVERITY_PENALTIES[finding.severity]!;
  }

  return 0;
}
