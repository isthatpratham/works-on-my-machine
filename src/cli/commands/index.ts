import { Command } from 'commander';
import { executeCheck } from './check.js';
import type { GlobalOptions } from '../options.js';
import { EXIT_CODES } from '../exit-codes.js';

export function registerCommands(program: Command): void {
  program
    .command('check')
    .description('Analyze project reproducibility and environment risks')
    .argument('[path]', 'target directory to analyze', '.')
    .action(async (targetPath: string) => {
      const opts = program.opts<GlobalOptions>();
      const result = await executeCheck(targetPath, opts);
      if (result.exitCode !== EXIT_CODES.SUCCESS) {
        process.exitCode = result.exitCode;
      }
    });
}
