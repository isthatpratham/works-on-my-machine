export interface GlobalOptions {
  verbose?: boolean;
  color?: boolean;
}

// CheckOptions extends GlobalOptions; reserved for future check-specific options
export type CheckOptions = GlobalOptions;
