import { EXIT_CODES, type ExitCode } from './exit-codes.js';

export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode = EXIT_CODES.FATAL,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export class InvalidUsageError extends CliError {
  constructor(message: string) {
    super(message, EXIT_CODES.INVALID_USAGE);
    this.name = 'InvalidUsageError';
  }
}
