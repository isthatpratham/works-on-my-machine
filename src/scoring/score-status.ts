/**
 * Human-readable status bands for the reproducibility score.
 */
export const SCORE_STATUSES = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  MODERATE: 'moderate',
  RISKY: 'risky',
  POOR: 'poor',
} as const;

export type ScoreStatus = (typeof SCORE_STATUSES)[keyof typeof SCORE_STATUSES];

/**
 * Classifies a numerical reproducibility score (0–100) into a standard ScoreStatus.
 */
export function classifyScore(score: number): ScoreStatus {
  if (score >= 90) {
    return SCORE_STATUSES.EXCELLENT;
  }
  if (score >= 75) {
    return SCORE_STATUSES.GOOD;
  }
  if (score >= 50) {
    return SCORE_STATUSES.MODERATE;
  }
  if (score >= 25) {
    return SCORE_STATUSES.RISKY;
  }
  return SCORE_STATUSES.POOR;
}
