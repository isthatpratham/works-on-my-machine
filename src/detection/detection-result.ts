import type { Finding } from '../domain/finding.js';

/**
 * Information regarding a detector failure during execution.
 */
export interface DetectorError {
  /**
   * ID of the detector that failed.
   */
  readonly detectorId: string;

  /**
   * Sanitized error message explaining the failure.
   */
  readonly message: string;
}

/**
 * Execution status for an individual detector.
 */
export interface DetectorExecutionResult {
  readonly detectorId: string;
  readonly status: 'executed' | 'skipped' | 'failed';
  readonly findingCount: number;
  readonly error?: string;
}

/**
 * Output of the detection engine.
 *
 * Contains validated, deduplicated, and deterministically sorted findings,
 * along with detector execution status and any non-fatal detector errors.
 */
export interface DetectionResult {
  /**
   * Clean, deduplicated, sorted list of findings produced by all executed detectors.
   */
  readonly findings: readonly Finding[];

  /**
   * Individual execution result and status for each registered detector.
   */
  readonly executedDetectors: readonly DetectorExecutionResult[];

  /**
   * Execution errors or malformed output errors encountered during analysis.
   */
  readonly errors: readonly DetectorError[];

  /**
   * Indicates whether all supported detectors executed successfully without errors.
   */
  readonly isComplete: boolean;
}
