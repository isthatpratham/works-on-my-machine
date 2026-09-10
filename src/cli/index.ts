#!/usr/bin/env node

import { Command, CommanderError } from 'commander';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerCommands } from './commands/index.js';
import { executeCheck } from './commands/check.js';
import { configureColor, formatError } from './format.js';
import { CliError } from './errors.js';
import { EXIT_CODES, type ExitCode } from './exit-codes.js';
import type { GlobalOptions } from './options.js';
import { getCliVersion } from './version.js';

export { getCliVersion };

export function createProgram(): Command {
  const program = new Command();

  program
    .name('womm')
    .description("Works on my machine. Let's prove it.")
    .version(getCliVersion(), '-v, --version', 'output the version number')
    .option('--verbose', 'enable verbose diagnostic output')
    .option('--no-color', 'disable colored terminal output')
    .exitOverride()
    .configureOutput({
      writeErr: () => {},
    })
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts<GlobalOptions>();
      if (opts.color === false) {
        configureColor(false);
      }
    });

  registerCommands(program);

  // Default action when invoked without subcommands (e.g. `womm` or `womm --verbose`)
  program.action(async () => {
    const opts = program.opts<GlobalOptions>();
    const result = await executeCheck('.', opts);
    (program as unknown as { exitCode?: ExitCode }).exitCode = result.exitCode;
    if (result.exitCode !== EXIT_CODES.SUCCESS) {
      process.exitCode = result.exitCode;
    }
  });

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<ExitCode> {
  const program = createProgram();

  try {
    await program.parseAsync(argv);
    const code = (program as unknown as { exitCode?: ExitCode }).exitCode;
    return code !== undefined ? code : EXIT_CODES.SUCCESS;
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      if (
        error.code === 'commander.helpDisplayed' ||
        error.code === 'commander.version'
      ) {
        return EXIT_CODES.SUCCESS;
      }

      if (
        error.code === 'commander.unknownCommand' ||
        error.code === 'commander.excessArguments'
      ) {
        const cmdName =
          argv.slice(2).find((a) => !a.startsWith('-')) || argv[2] || '';
        console.error(`Unknown command: ${cmdName}\n`);
        console.error('Run `womm --help` to see available commands.');
        return EXIT_CODES.INVALID_USAGE;
      }

      if (error.code === 'commander.unknownOption') {
        const optName = argv.slice(2).find((a) => a.startsWith('-')) || '';
        console.error(`Unknown option: ${optName}\n`);
        console.error('Run `womm --help` for available options.');
        return EXIT_CODES.INVALID_USAGE;
      }

      console.error(formatError(error.message));
      return EXIT_CODES.INVALID_USAGE;
    }

    if (error instanceof CliError) {
      console.error(formatError(error.message));
      return error.exitCode;
    }

    if (error instanceof Error) {
      console.error(formatError(error.message));
      return EXIT_CODES.FATAL;
    }

    console.error(formatError('An unexpected error occurred.'));
    return EXIT_CODES.FATAL;
  }
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    const scriptPath = realpathSync(process.argv[1]);
    const modulePath = realpathSync(fileURLToPath(import.meta.url));
    return scriptPath === modulePath;
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  runCli().then((code) => {
    process.exit(code);
  });
}
