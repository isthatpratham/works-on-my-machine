import { DetectorRegistry } from './detector-registry.js';
import { RuntimeDetector } from './detectors/runtime-detector.js';
import { DependencyDetector } from './detectors/dependency-detector.js';
import { EnvironmentDetector } from './detectors/environment-detector.js';
import { ConfigurationDetector } from './detectors/configuration-detector.js';
import { GitDetector } from './detectors/git-detector.js';

/**
 * Registers all standard V1 detectors to a given DetectorRegistry.
 */
export function registerDefaultDetectors(
  registry: DetectorRegistry,
): DetectorRegistry {
  registry.register(new RuntimeDetector());
  registry.register(new DependencyDetector());
  registry.register(new EnvironmentDetector());
  registry.register(new ConfigurationDetector());
  registry.register(new GitDetector());
  return registry;
}

/**
 * Creates and returns a DetectorRegistry populated with all standard V1 detectors.
 */
export function createDefaultDetectorRegistry(): DetectorRegistry {
  const registry = new DetectorRegistry();
  return registerDefaultDetectors(registry);
}
