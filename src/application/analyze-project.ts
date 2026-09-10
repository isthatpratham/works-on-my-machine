import type { DetectionResult } from '../detection/detection-result.js';
import { DetectionEngine } from '../detection/detection-engine.js';
import { createDefaultDetectorRegistry } from '../detection/default-registry.js';
import type { ScoreResult } from '../scoring/score-result.js';
import { ScoringEngine } from '../scoring/scoring-engine.js';
import {
  buildProjectContext,
  type ContextBuilderOptions,
} from './context-builder.js';

export interface AnalyzeProjectOptions extends ContextBuilderOptions {
  readonly engine?: DetectionEngine;
}

export interface EvaluateProjectOptions extends AnalyzeProjectOptions {
  readonly scoringEngine?: ScoringEngine;
}

/**
 * Coordinates project discovery and execution of registered detectors,
 * returning the final validated DetectionResult snapshot.
 *
 * Does NOT perform scoring or terminal rendering.
 */
export async function analyzeProject(
  targetInput?: string,
  options: AnalyzeProjectOptions = {},
): Promise<DetectionResult> {
  const context = await buildProjectContext(targetInput, options);
  const engine =
    options.engine ??
    new DetectionEngine({ registry: createDefaultDetectorRegistry() });
  return engine.run(context);
}

/**
 * Executes the complete discovery, detection, evaluation, and scoring pipeline,
 * returning the structured ScoreResult.
 *
 * Does NOT render terminal output.
 */
export async function evaluateProject(
  targetInput?: string,
  options: EvaluateProjectOptions = {},
): Promise<ScoreResult> {
  const detectionResult = await analyzeProject(targetInput, options);
  const scoringEngine = options.scoringEngine ?? new ScoringEngine();
  return scoringEngine.evaluate(detectionResult);
}
