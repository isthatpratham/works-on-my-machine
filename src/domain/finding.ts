import type { DetectionCategory } from './categories.js';
import type { Severity } from './severity.js';
import type { Evidence } from './evidence.js';

/**
 * Standardized observation produced by WOMM analysis rules and detectors.
 *
 * A Finding represents a single identified reproducibility condition,
 * its severity, impact, actionable recommendation, and supporting evidence.
 */
export interface Finding {
  /**
   * Unique stable identifier for the finding rule (e.g. 'runtime.node.mismatch', 'git.env.tracked').
   */
  readonly id: string;

  /**
   * Category of the finding.
   */
  readonly category: DetectionCategory;

  /**
   * Severity level of the finding.
   */
  readonly severity: Severity;

  /**
   * Short, human-readable title summarizing the condition.
   */
  readonly title: string;

  /**
   * Detailed explanation of what was observed.
   */
  readonly description: string;

  /**
   * Supporting sanitized evidence items explaining why this finding exists.
   */
  readonly evidence?: readonly Evidence[];

  /**
   * Explanation of how this condition impacts portability / reproducibility.
   */
  readonly impact: string;

  /**
   * Actionable step the developer should take to resolve or improve the condition.
   */
  readonly recommendation: string;
}
