import boxen from 'boxen';
import chalk from 'chalk';
import type { ProjectContext } from '../../domain/project-context.js';

/**
 * Formats the WOMM header banner with a sharp, rectangular developer-tool aesthetic.
 */
export function formatHeader(): string {
  const title = chalk.bold('WORKS ON MY MACHINE');
  const subtitle = chalk.dim("Let's prove it.");

  const box = boxen(`${title}\n${subtitle}`, {
    padding: { top: 0, bottom: 0, left: 4, right: 4 },
    borderStyle: 'single',
    textAlignment: 'center',
  });

  return box;
}

/**
 * Formats compact, scannable project metadata.
 */
export function formatProjectSummary(context: ProjectContext): string {
  const lines: string[] = [chalk.bold('PROJECT')];

  const projectName = context.metadata.name ?? 'Unknown';
  lines.push(chalk.bold(projectName));

  const tags: string[] = [];
  if (context.metadata.framework) {
    tags.push(context.metadata.framework);
  }

  if (context.runtime.node?.status === 'known') {
    const version =
      context.runtime.node.installed ??
      context.runtime.node.declared ??
      'detected';
    tags.push(`Node.js ${version}`);
  } else if (context.runtime.python?.status === 'known') {
    const version =
      context.runtime.python.installed ??
      context.runtime.python.declared ??
      'detected';
    tags.push(`Python ${version}`);
  }

  if (context.dependencies.packageManager?.name) {
    const pm = context.dependencies.packageManager;
    const pmStr = pm.version ? `${pm.name} ${pm.version}` : pm.name;
    tags.push(pmStr);
  }

  if (tags.length > 0) {
    lines.push(chalk.dim(tags.join(' · ')));
  }

  if (context.rootPath) {
    lines.push('');
    lines.push(`${chalk.dim('Path:')} ${context.rootPath}`);
  }

  return lines.join('\n');
}
