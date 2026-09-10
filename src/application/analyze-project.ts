import type { DetectionResult } from '../detection/detection-result.js';
import { DetectionEngine } from '../detection/detection-engine.js';
import { createDefaultDetectorRegistry } from '../detection/default-registry.js';
import {
  buildProjectContext,
  type ContextBuilderOptions,
} from './context-builder.js';

export interface AnalyzeProjectOptions extends ContextBuilderOptions {
  readonly engine?: DetectionEngine;
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
