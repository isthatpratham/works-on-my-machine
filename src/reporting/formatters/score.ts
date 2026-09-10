import chalk from 'chalk';
import type { ScoreResult } from '../../scoring/score-result.js';
import {
  SCORE_STATUSES,
  type ScoreStatus,
} from '../../scoring/score-status.js';

const STATUS_DESCRIPTIONS: Record<ScoreStatus, string> = {
  [SCORE_STATUSES.EXCELLENT]: 'Highly reproducible',
  [SCORE_STATUSES.GOOD]: 'Mostly reproducible',
  [SCORE_STATUSES.MODERATE]: 'Reproducibility risks detected',
  [SCORE_STATUSES.RISKY]: 'Significant reproducibility problems',
  [SCORE_STATUSES.POOR]: 'Highly environment-dependent',
};

/**
 * Generates a 20-character visual progress bar for a 0-100 score.
 */
export function formatScoreBar(score: number): string {
  const totalBlocks = 20;
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const filledBlocks = Math.round((clampedScore / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;

  const filledStr = '█'.repeat(filledBlocks);
  const emptyStr = '░'.repeat(emptyBlocks);

  if (clampedScore >= 75) {
    return `${chalk.green(filledStr)}${chalk.dim(emptyStr)}`;
  }
  if (clampedScore >= 50) {
    return `${chalk.yellow(filledStr)}${chalk.dim(emptyStr)}`;
  }
  return `${chalk.red(filledStr)}${chalk.dim(emptyStr)}`;
}

/**
 * Formats the reproducibility score section with clear visual hierarchy.
 */
export function formatScore(scoreResult: ScoreResult): string {
  const { score, status } = scoreResult;
  const bar = formatScoreBar(score);
  const statusLabel = status.toUpperCase();
  const description = STATUS_DESCRIPTIONS[status] ?? '';

  let styledStatus: string;
  if (score >= 75) {
    styledStatus = chalk.green.bold(statusLabel);
  } else if (score >= 50) {
    styledStatus = chalk.yellow.bold(statusLabel);
  } else {
    styledStatus = chalk.red.bold(statusLabel);
  }

  const lines: string[] = [
    chalk.bold('REPRODUCIBILITY'),
    '',
    `${bar}  ${chalk.bold(`${score} / 100`)}`,
    '',
    styledStatus,
    chalk.dim(description),
  ];

  return lines.join('\n');
}
