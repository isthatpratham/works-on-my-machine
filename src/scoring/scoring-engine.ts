import type { Finding } from '../domain/finding.js';
import {
  ALL_DETECTION_CATEGORIES,
  type DetectionCategory,
} from '../domain/categories.js';
import type { DetectionResult } from '../detection/detection-result.js';
import { BASE_SCORE, getFindingPenalty } from './penalties.js';
import { classifyScore, type ScoreStatus } from './score-status.js';
import type {
  CategoryEvaluation,
  CategoryStatus,
  EvaluatedFinding,
  ScoreResult,
  ScoreSummary,
} from './score-result.js';

/**
 * Pure, deterministic scoring engine that converts findings and detection results
 * into a Reproducibility Score (0–100) and structured category evaluations.
 */
export class ScoringEngine {
  /**
   * Evaluates a full DetectionResult snapshot into a comprehensive ScoreResult.
   */
  evaluate(detectionResult: DetectionResult): ScoreResult {
    const evaluatedFindings: EvaluatedFinding[] = [];
    let totalPenalty = 0;

    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    const seenIds = new Set<string>();

    for (const finding of detectionResult.findings) {
      if (seenIds.has(finding.id)) {
        continue; // Prevent duplicate penalties
      }
      seenIds.add(finding.id);

      const penalty = getFindingPenalty(finding);
      totalPenalty += penalty;

      if (finding.severity === 'critical') {
        criticalCount++;
      } else if (finding.severity === 'warning') {
        warningCount++;
      } else if (finding.severity === 'info') {
        infoCount++;
      }

      evaluatedFindings.push({
        finding,
        penalty,
      });
    }

    const score = Math.max(0, Math.min(BASE_SCORE, BASE_SCORE - totalPenalty));
    const status: ScoreStatus = classifyScore(score);

    // Map detector execution status by detector ID/category
    const detectorStatusMap = new Map<
      string,
      'executed' | 'skipped' | 'failed'
    >();
    for (const exec of detectionResult.executedDetectors) {
      detectorStatusMap.set(exec.detectorId, exec.status);
    }

    // Build category evaluations
    const categories = {} as Record<DetectionCategory, CategoryEvaluation>;

    for (const category of ALL_DETECTION_CATEGORIES) {
      const categoryFindings = evaluatedFindings
        .filter((ef) => ef.finding.category === category)
        .map((ef) => ef.finding);

      let catCritCount = 0;
      let catWarnCount = 0;
      let catInfoCount = 0;
      let catPenalty = 0;

      for (const ef of evaluatedFindings) {
        if (ef.finding.category === category) {
          catPenalty += ef.penalty;
          if (ef.finding.severity === 'critical') catCritCount++;
          else if (ef.finding.severity === 'warning') catWarnCount++;
          else if (ef.finding.severity === 'info') catInfoCount++;
        }
      }

      const execStatus = detectorStatusMap.get(category);

      let catStatus: CategoryStatus;
      if (execStatus === 'failed') {
        catStatus = 'unavailable';
      } else if (execStatus === 'skipped' && categoryFindings.length === 0) {
        catStatus = 'skipped';
      } else if (catCritCount > 0) {
        catStatus = 'critical';
      } else if (catWarnCount > 0) {
        catStatus = 'warning';
      } else {
        catStatus = 'passed';
      }

      categories[category] = {
        category,
        status: catStatus,
        findingCount: categoryFindings.length,
        criticalCount: catCritCount,
        warningCount: catWarnCount,
        infoCount: catInfoCount,
        totalPenalty: catPenalty,
        findings: categoryFindings,
      };
    }

    const summary: ScoreSummary = {
      totalFindings: evaluatedFindings.length,
      criticalCount,
      warningCount,
      infoCount,
    };

    return {
      score,
      totalPenalty,
      status,
      isComplete: detectionResult.isComplete,
      findings: evaluatedFindings,
      categories,
      summary,
    };
  }

  /**
   * Helper to compute score and penalties directly from an array of findings.
   */
  calculateScore(findings: readonly Finding[]): {
    score: number;
    totalPenalty: number;
    status: ScoreStatus;
  } {
    const dummyResult: DetectionResult = {
      findings,
      executedDetectors: [],
      errors: [],
      isComplete: true,
    };
    const evalResult = this.evaluate(dummyResult);
    return {
      score: evalResult.score,
      totalPenalty: evalResult.totalPenalty,
      status: evalResult.status,
    };
  }
}

/**
 * Convenient standalone evaluator function.
 */
export function evaluateFindings(
  detectionResult: DetectionResult,
): ScoreResult {
  const engine = new ScoringEngine();
  return engine.evaluate(detectionResult);
}
