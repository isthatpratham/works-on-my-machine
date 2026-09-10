import type { Finding } from '../domain/finding.js';
import type { DetectionCategory } from '../domain/categories.js';
import type { ScoreStatus } from './score-status.js';

/**
 * A finding paired with its calculated scoring penalty.
 */
export interface EvaluatedFinding {
  readonly finding: Finding;
  readonly penalty: number;
}

/**
 * Health/execution status of an individual category.
 */
export type CategoryStatus =
  'passed' | 'warning' | 'critical' | 'skipped' | 'unavailable';

/**
 * Summary evaluation for an individual detection category.
 */
export interface CategoryEvaluation {
  readonly category: DetectionCategory;
  readonly status: CategoryStatus;
  readonly findingCount: number;
  readonly criticalCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly totalPenalty: number;
  readonly findings: readonly Finding[];
}

/**
 * Overall summary metrics of the evaluation.
 */
export interface ScoreSummary {
  readonly totalFindings: number;
  readonly criticalCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
}

/**
 * Complete evaluation and scoring output.
 */
export interface ScoreResult {
  /**
   * Final reproducibility score clamped between 0 and 100.
   */
  readonly score: number;

  /**
   * Sum of all finding penalties deducted from the base score.
   */
  readonly totalPenalty: number;

  /**
   * Qualitative health status classification of the score.
   */
  readonly status: ScoreStatus;

  /**
   * Indicates whether all detectors executed without errors.
   */
  readonly isComplete: boolean;

  /**
   * Evaluated findings with individual penalty amounts.
   */
  readonly findings: readonly EvaluatedFinding[];

  /**
   * Category-level breakdown and health status for all five detection categories.
   */
  readonly categories: Record<DetectionCategory, CategoryEvaluation>;

  /**
   * High-level finding counts across severity levels.
   */
  readonly summary: ScoreSummary;
}
