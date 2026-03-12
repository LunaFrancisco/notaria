/**
 * CLI-compatible validation types.
 * Mirror of cli/src/registry/types.ts (validation subset)
 */

export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
  evidence?: string;
  suggestedFix?: string;
}

export interface CompletenessReport {
  extraction: number;
  manual: number;
  readiness: number;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  completeness: CompletenessReport;
}
