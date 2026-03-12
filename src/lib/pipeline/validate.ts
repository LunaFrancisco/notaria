/**
 * Contract validation engine.
 * Mirrored from cli/src/pipeline/validate.ts — keep in sync.
 */
import type { ExtractionResult } from '@/lib/types/extraction';
import type { ValidationResult, ValidationIssue, CompletenessReport } from '@/lib/types/validation';
import type { ContractDefinition } from './contract-def';

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  let val: unknown = obj;
  for (const p of path.split('.')) {
    val = (val as Record<string, unknown>)?.[p];
  }
  return val;
}

function computeCompleteness(
  contractDef: ContractDefinition,
  contractData: Record<string, unknown>,
): CompletenessReport {
  let requiredFilled = 0;
  for (const { path } of contractDef.requiredFields) {
    if (getNestedValue(contractData, path)) requiredFilled++;
  }
  const extraction = contractDef.requiredFields.length > 0
    ? Math.round((requiredFilled / contractDef.requiredFields.length) * 100) / 100
    : 1;

  let manualFilled = 0;
  for (const { path } of contractDef.manualFields) {
    if (getNestedValue(contractData, path)) manualFilled++;
  }
  const manual = contractDef.manualFields.length > 0
    ? Math.round((manualFilled / contractDef.manualFields.length) * 100) / 100
    : 1;

  const totalFields = contractDef.requiredFields.length + contractDef.manualFields.length;
  const totalFilled = requiredFilled + manualFilled;
  const readiness = totalFields > 0
    ? Math.round((totalFilled / totalFields) * 100) / 100
    : 1;

  return { extraction, manual, readiness };
}

/**
 * Generic validation: contract-specific rules + document cardinality + field completeness.
 */
export function validateContract(
  contractDef: ContractDefinition,
  contractData: Record<string, unknown>,
  extractions: ExtractionResult[],
): ValidationResult {
  const ctx = { contractData, extractions };

  // Contract-specific validation rules
  const issues: ValidationIssue[] = contractDef.evaluate(ctx);

  // Document cardinality checks
  for (const docType of contractDef.documentTypes) {
    const occurrences = extractions.filter(e => e.documentType === docType.id).length;
    if (docType.required && occurrences < docType.minOccurs) {
      issues.push({
        code: 'MISSING_REQUIRED_DOC',
        severity: 'error',
        message: `Falta documento requerido: ${docType.label} (mínimo ${docType.minOccurs}, recibidos ${occurrences})`,
      });
    }
    if (occurrences > docType.maxOccurs) {
      issues.push({
        code: 'EXCESS_DOC',
        severity: 'warning',
        message: `Exceso de documentos: ${docType.label} (máximo ${docType.maxOccurs}, recibidos ${occurrences})`,
      });
    }
  }

  // Required field warnings
  for (const { path, label } of contractDef.requiredFields) {
    if (!getNestedValue(contractData, path)) {
      issues.push({
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'warning',
        message: `Campo pendiente: ${label}`,
        path,
      });
    }
  }

  // Manual field info
  for (const { path, label } of contractDef.manualFields) {
    if (!getNestedValue(contractData, path)) {
      issues.push({
        code: 'MANUAL_FIELD',
        severity: 'info',
        message: `Campo manual requerido: ${label}`,
        path,
      });
    }
  }

  const completeness = computeCompleteness(contractDef, contractData);

  return { issues, completeness };
}
