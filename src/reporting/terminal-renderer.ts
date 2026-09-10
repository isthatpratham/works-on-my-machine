import chalk from 'chalk';
import type { ProjectContext } from '../domain/project-context.js';
import type { DetectorError } from '../detection/detection-result.js';
import type { ScoreResult } from '../scoring/score-result.js';
import {
  formatHeader,
  formatProjectSummary,
} from './formatters/project-summary.js';
import { formatScore } from './formatters/score.js';
import { formatCategoryHealth } from './formatters/category-health.js';
import { formatFindings } from './formatters/findings.js';

export interface RenderReportOptions {
  readonly context?: ProjectContext;
  readonly errors?: readonly DetectorError[];
  readonly verbose?: boolean;
}

const DIVIDER = chalk.dim('─'.repeat(50));

/**
 * Renders the complete, deterministic terminal report from a ScoreResult.
 */
export function renderTerminalReport(
  scoreResult: ScoreResult,
  options: RenderReportOptions = {},
): string {
  const sections: string[] = [];

  // 1. Header banner
  sections.push(formatHeader());

  // 2. Project summary (if context provided)
  if (options.context) {
    sections.push(formatProjectSummary(options.context));
    sections.push(DIVIDER);
  }

  // 3. Reproducibility score
  sections.push(formatScore(scoreResult));
  sections.push(DIVIDER);

  // 4. Category health
  sections.push(formatCategoryHealth(scoreResult));
  sections.push(DIVIDER);

  // 5. Findings
  sections.push(formatFindings(scoreResult.findings));

  // 6. Incomplete analysis / Detector errors (if any)
  const hasErrors =
    (options.errors && options.errors.length > 0) || !scoreResult.isComplete;
  if (hasErrors) {
    sections.push(DIVIDER);
    const errorLines: string[] = [
      chalk.yellow.bold('Analysis Notice'),
      '',
      `  ${chalk.yellow('⚠')} Analysis completed with warnings. Some checks could not be completed.`,
    ];

    if (options.errors && options.errors.length > 0) {
      errorLines.push('');
      for (const err of options.errors) {
        errorLines.push(
          `  ${chalk.red('✖')} [${err.detectorId}] ${err.message}`,
        );
      }
    }
    sections.push(errorLines.join('\n'));
  }

  // 7. Summary
  sections.push(DIVIDER);
  const { summary } = scoreResult;
  const countParts: string[] = [
    `${summary.criticalCount} critical`,
    `${summary.warningCount} warning${summary.warningCount === 1 ? '' : 's'}`,
    `${summary.infoCount} informational`,
  ];

  const completionStatus =
    scoreResult.isComplete && (!options.errors || options.errors.length === 0)
      ? chalk.green('Analysis complete.')
      : chalk.yellow('Analysis completed with warnings.');

  const summaryLines: string[] = [
    chalk.bold('Summary'),
    '',
    `  ${countParts.join(', ')}`,
    '',
    `  ${completionStatus}`,
  ];
  sections.push(summaryLines.join('\n'));

  return sections.join('\n\n');
}
