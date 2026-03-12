/**
 * CLI-compatible extraction types.
 * Mirror of cli/src/documents/types.ts — kept in sync manually
 * to avoid cross-project imports that break bundling.
 */

export interface ExtractedField {
  value: string;
  confidence: number;
}

export interface ExtractionResult {
  file: string;
  documentType: string;
  classificationConfidence: number;
  fields: Record<string, ExtractedField>;
}
