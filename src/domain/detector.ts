import type { DetectionCategory } from './categories.js';
import type { Finding } from './finding.js';
import type { ProjectContext } from './project-context.js';

/**
 * Contract for a WOMM detector.
 *
 * A detector inspects a normalized ProjectContext and returns a list of
 * zero or more Findings. Detectors are pure, read-only diagnostic components
 * that do not perform scoring, terminal rendering, CLI argument parsing,
 * or project file mutations.
 */
export interface Detector {
  /**
   * Unique identifier for the detector (e.g. 'runtime.node', 'git.tracking').
   */
  readonly id: string;

  /**
   * Primary category of risks this detector addresses.
   */
  readonly category: DetectionCategory;

  /**
   * Evaluates whether this detector is applicable given the project context.
   *
   * @param context The collected project snapshot.
   * @returns `true` if the detector should execute on this project, `false` otherwise.
   */
  supports(context: ProjectContext): boolean;

  /**
   * Analyzes the project context and returns any identified findings.
   *
   * @param context The collected project snapshot.
   * @returns An array of findings discovered during analysis.
   */
  analyze(context: ProjectContext): Finding[];
}
