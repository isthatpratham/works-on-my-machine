import chalk from 'chalk';
import type { Evidence } from '../../domain/evidence.js';

/**
 * Formats a list of evidence items for human-readable terminal display.
 */
export function formatEvidence(evidence?: readonly Evidence[]): string {
  if (!evidence || evidence.length === 0) {
    return '';
  }

  const lines: string[] = [`  ${chalk.dim('Evidence:')}`];

  for (const item of evidence) {
    let entry = `    • ${item.source}`;
    if (item.type && item.type !== 'file') {
      entry = `    • [${item.type}] ${item.source}`;
    }
    if (item.detail) {
      entry += `: ${item.detail}`;
    }
    lines.push(chalk.dim(entry));
  }

  return lines.join('\n');
}
