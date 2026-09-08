import chalk from 'chalk';

export function configureColor(enabled: boolean): void {
  if (!enabled) {
    chalk.level = 0;
  }
}

export function formatError(message: string): string {
  return chalk.red(`Error: ${message}`);
}
