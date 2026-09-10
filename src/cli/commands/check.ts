import type { CheckOptions } from '../options.js';
import { EXIT_CODES, type ExitCode } from '../exit-codes.js';
import { InvalidUsageError } from '../errors.js';
import { buildProjectContext } from '../../application/index.js';
import { InvalidTargetError } from '../../discovery/index.js';
import { DetectionEngine } from '../../detection/detection-engine.js';
import { createDefaultDetectorRegistry } from '../../detection/default-registry.js';
import { ScoringEngine } from '../../scoring/scoring-engine.js';
import { renderTerminalReport } from '../../reporting/terminal-renderer.js';

export interface CheckResult {
  exitCode: ExitCode;
  targetPath: string;
}

export async function executeCheck(
  targetPath: string = '.',
  options: CheckOptions = {},
): Promise<CheckResult> {
  let context;
  try {
    context = await buildProjectContext(targetPath);
  } catch (error: unknown) {
    if (error instanceof InvalidTargetError) {
      throw new InvalidUsageError(error.message);
    }
    throw error;
  }

  const detectionEngine = new DetectionEngine({
    registry: createDefaultDetectorRegistry(),
  });
  const detectionResult = await detectionEngine.run(context);

  const scoringEngine = new ScoringEngine();
  const scoreResult = scoringEngine.evaluate(detectionResult);

  const report = renderTerminalReport(scoreResult, {
    context,
    errors: detectionResult.errors,
    verbose: options.verbose,
  });

  console.log(report);

  let exitCode: ExitCode = EXIT_CODES.SUCCESS;
  if (scoreResult.summary.criticalCount > 0) {
    exitCode = EXIT_CODES.CRITICAL;
  } else if (scoreResult.summary.warningCount > 0) {
    exitCode = EXIT_CODES.WARNINGS;
  }

  return {
    exitCode,
    targetPath: context.rootPath,
  };
}
