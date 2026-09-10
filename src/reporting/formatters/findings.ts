import boxen from 'boxen';
import chalk from 'chalk';
import type { Finding } from '../../domain/finding.js';
import { SEVERITIES } from '../../domain/severity.js';
import type { EvaluatedFinding } from '../../scoring/score-result.js';

function getSeverityDetails(severity: string): {
  title: string;
  borderColor: 'red' | 'yellow' | 'cyan' | 'gray';
} {
  switch (severity) {
    case SEVERITIES.CRITICAL:
      return {
        title: chalk.red.bold(' ✖ CRITICAL '),
        borderColor: 'red',
      };
    case SEVERITIES.WARNING:
      return {
        title: chalk.yellow.bold(' ⚠ WARNING '),
        borderColor: 'yellow',
      };
    case SEVERITIES.INFO:
      return {
        title: chalk.cyan.bold(' ℹ INFO '),
        borderColor: 'cyan',
      };
    default:
      return {
        title: chalk.dim(` ${severity.toUpperCase()} `),
        borderColor: 'gray',
      };
  }
}

/**
 * Formats an individual evaluated finding into a distinct rectangular card.
 */
export function formatFinding(
  evaluatedFinding: EvaluatedFinding | Finding,
): string {
  const finding: Finding =
    'finding' in evaluatedFinding ? evaluatedFinding.finding : evaluatedFinding;
  const penalty =
    'penalty' in evaluatedFinding ? evaluatedFinding.penalty : undefined;

  const { title, borderColor } = getSeverityDetails(finding.severity);

  const contentLines: string[] = [];

  contentLines.push(chalk.bold(finding.title));
  contentLines.push(chalk.dim(finding.id));
  contentLines.push('');
  contentLines.push(finding.description);

  if (finding.evidence && finding.evidence.length > 0) {
    contentLines.push('');
    contentLines.push(chalk.bold('Evidence'));
    for (const item of finding.evidence) {
      const src =
        item.type && item.type !== 'file'
          ? `[${item.type}] ${item.source}`
          : item.source;
      contentLines.push(`  › ${chalk.cyan(src)}`);
      if (item.detail) {
        contentLines.push(`    ${chalk.dim(item.detail)}`);
      }
    }
  }

  if (finding.impact) {
    contentLines.push('');
    contentLines.push(chalk.bold('Impact'));
    contentLines.push(`  ${finding.impact}`);
  }

  if (finding.recommendation) {
    contentLines.push('');
    contentLines.push(chalk.bold('Recommendation'));
    contentLines.push(`  ${finding.recommendation}`);
  }

  if (penalty !== undefined && penalty > 0) {
    contentLines.push('');
    contentLines.push(chalk.red.dim(`-${penalty} points`));
  }

  return boxen(contentLines.join('\n'), {
    title,
    titleAlignment: 'left',
    borderStyle: 'single',
    borderColor,
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
  });
}

/**
 * Formats the complete findings section.
 */
export function formatFindings(
  findings: readonly (EvaluatedFinding | Finding)[],
): string {
  const lines: string[] = [chalk.bold('FINDINGS'), ''];

  if (findings.length === 0) {
    lines.push(`  ${chalk.green('✓')} No reproducibility issues detected.`);
    return lines.join('\n');
  }

  for (let i = 0; i < findings.length; i++) {
    const item = findings[i];
    if (!item) continue;
    const findingCard = formatFinding(item);
    lines.push(findingCard);
    if (i < findings.length - 1) {
      lines.push('');
    }
  }

  return lines.join('\n');
}
