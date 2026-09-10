import type { ProjectContext } from '../domain/project-context.js';
import type { Finding } from '../domain/finding.js';
import type { DetectionCategory } from '../domain/categories.js';
import type { Severity } from '../domain/severity.js';
import { createDefaultDetectorRegistry } from './default-registry.js';
import { DetectorRegistry } from './detector-registry.js';
import { validateFinding } from './finding-validator.js';
import type {
  DetectionResult,
  DetectorError,
  DetectorExecutionResult,
} from './detection-result.js';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 1,
  warning: 2,
  info: 3,
};

const CATEGORY_ORDER: Record<DetectionCategory, number> = {
  runtime: 1,
  dependencies: 2,
  environment: 3,
  configuration: 4,
  git: 5,
};

/**
 * Deterministically sorts findings according to:
 * 1. Severity (CRITICAL -> WARNING -> INFO)
 * 2. Category (runtime -> dependencies -> environment -> configuration -> git)
 * 3. Finding ID (alphabetical)
 * 4. Title (alphabetical)
 */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.severity] ?? 99;
    const sevB = SEVERITY_ORDER[b.severity] ?? 99;
    if (sevA !== sevB) {
      return sevA - sevB;
    }

    const catA = CATEGORY_ORDER[a.category] ?? 99;
    const catB = CATEGORY_ORDER[b.category] ?? 99;
    if (catA !== catB) {
      return catA - catB;
    }

    const idComp = a.id.localeCompare(b.id, 'en');
    if (idComp !== 0) {
      return idComp;
    }

    return a.title.localeCompare(b.title, 'en');
  });
}

/**
 * Deduplicates findings deterministically by finding ID.
 * When duplicate IDs occur, the first encountered valid finding is retained.
 */
export function deduplicateFindings(findings: readonly Finding[]): Finding[] {
  const seenIds = new Set<string>();
  const unique: Finding[] = [];

  for (const finding of findings) {
    if (!seenIds.has(finding.id)) {
      seenIds.add(finding.id);
      unique.push(finding);
    }
  }

  return unique;
}

export interface DetectionEngineOptions {
  readonly registry?: DetectorRegistry;
}

/**
 * Deterministic detection engine that consumes a ProjectContext snapshot,
 * checks detector support, isolates detector execution, validates findings,
 * handles failures, deduplicates, and deterministically orders results.
 */
export class DetectionEngine {
  private readonly registry: DetectorRegistry;

  constructor(options: DetectionEngineOptions = {}) {
    this.registry = options.registry ?? createDefaultDetectorRegistry();
  }

  /**
   * Returns the detector registry used by this engine.
   */
  getRegistry(): DetectorRegistry {
    return this.registry;
  }

  /**
   * Executes all registered detectors against the provided ProjectContext snapshot.
   */
  async run(context: ProjectContext): Promise<DetectionResult> {
    const detectors = this.registry.getDetectors();
    const rawFindings: Finding[] = [];
    const executionResults: DetectorExecutionResult[] = [];
    const errors: DetectorError[] = [];

    for (const detector of detectors) {
      // 1. Evaluate detector.supports(context) with isolation
      let isSupported: boolean;
      try {
        isSupported = detector.supports(context);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({
          detectorId: detector.id,
          message: `supports() check failed: ${message}`,
        });
        executionResults.push({
          detectorId: detector.id,
          status: 'failed',
          findingCount: 0,
          error: message,
        });
        continue;
      }

      if (!isSupported) {
        executionResults.push({
          detectorId: detector.id,
          status: 'skipped',
          findingCount: 0,
        });
        continue;
      }

      // 2. Invoke detector.analyze(context) with isolation
      let candidateFindings: unknown;
      try {
        candidateFindings = await detector.analyze(context);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({
          detectorId: detector.id,
          message: `analyze() execution failed: ${message}`,
        });
        executionResults.push({
          detectorId: detector.id,
          status: 'failed',
          findingCount: 0,
          error: message,
        });
        continue;
      }

      // 3. Validate returned findings structure
      if (!Array.isArray(candidateFindings)) {
        const message = `Detector '${detector.id}' returned non-array result.`;
        errors.push({
          detectorId: detector.id,
          message,
        });
        executionResults.push({
          detectorId: detector.id,
          status: 'failed',
          findingCount: 0,
          error: message,
        });
        continue;
      }

      let hasMalformedFinding = false;
      const validDetectorFindings: Finding[] = [];

      for (let i = 0; i < candidateFindings.length; i++) {
        const item = candidateFindings[i];
        const validation = validateFinding(item);
        if (!validation.valid) {
          hasMalformedFinding = true;
          errors.push({
            detectorId: detector.id,
            message: `Malformed finding at index ${i}: ${validation.reason}`,
          });
        } else {
          validDetectorFindings.push(validation.finding);
        }
      }

      if (hasMalformedFinding) {
        executionResults.push({
          detectorId: detector.id,
          status: 'failed',
          findingCount: validDetectorFindings.length,
          error: `Detector '${detector.id}' returned one or more malformed findings.`,
        });
      } else {
        executionResults.push({
          detectorId: detector.id,
          status: 'executed',
          findingCount: validDetectorFindings.length,
        });
      }

      rawFindings.push(...validDetectorFindings);
    }

    // 4. Deduplicate and sort findings deterministically
    const deduplicated = deduplicateFindings(rawFindings);
    const sorted = sortFindings(deduplicated);

    return {
      findings: sorted,
      executedDetectors: executionResults,
      errors,
      isComplete: errors.length === 0,
    };
  }
}
