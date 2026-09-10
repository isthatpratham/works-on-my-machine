import chalk from 'chalk';
import {
  ALL_DETECTION_CATEGORIES,
  type DetectionCategory,
} from '../../domain/categories.js';
import type {
  CategoryEvaluation,
  CategoryStatus,
  ScoreResult,
} from '../../scoring/score-result.js';

const CATEGORY_NAMES: Record<DetectionCategory, string> = {
  runtime: 'Runtime',
  dependencies: 'Dependencies',
  environment: 'Environment',
  configuration: 'Configuration',
  git: 'Git',
};

function formatCategoryStatus(status: CategoryStatus): string {
  switch (status) {
    case 'passed':
      return `${chalk.green('✓')} ${chalk.green('PASS')}`;
    case 'warning':
      return `${chalk.yellow('⚠')} ${chalk.yellow('WARNING')}`;
    case 'critical':
      return `${chalk.red('✖')} ${chalk.red('CRITICAL')}`;
    case 'unavailable':
      return `${chalk.dim('?')} ${chalk.dim('UNAVAILABLE')}`;
    case 'skipped':
      return `${chalk.dim('?')} ${chalk.dim('SKIPPED')}`;
    default:
      return chalk.dim(status);
  }
}

/**
 * Formats the Category Health overview table in deterministic category order.
 */
export function formatCategoryHealth(scoreResult: ScoreResult): string {
  const lines: string[] = [chalk.bold('CATEGORY HEALTH'), ''];

  for (const cat of ALL_DETECTION_CATEGORIES) {
    const categoryEval: CategoryEvaluation | undefined =
      scoreResult.categories[cat];
    const name = CATEGORY_NAMES[cat];
    const paddedName = name.padEnd(16, ' ');

    if (!categoryEval) {
      lines.push(`  ${paddedName} ${chalk.dim('? UNAVAILABLE')}`);
      continue;
    }

    const statusStr = formatCategoryStatus(categoryEval.status);
    lines.push(`  ${paddedName} ${statusStr}`);
  }

  return lines.join('\n');
}
