/**
 * Represents evidence supporting a detection finding.
 *
 * Evidence explains why a finding was produced without exposing sensitive
 * data (such as secret values or environment variable values).
 */
export interface Evidence {
  /**
   * Type of evidence (e.g. 'file', 'manifest', 'env_var', 'runtime_declaration', 'git_state').
   */
  readonly type: string;

  /**
   * Source file or origin identifier where the evidence was observed (e.g. 'package.json', '.nvmrc', '.env').
   */
  readonly source: string;

  /**
   * Optional sanitized detail or extracted reference explaining the evidence.
   * Must never contain sensitive secret values.
   */
  readonly detail?: string;
}
