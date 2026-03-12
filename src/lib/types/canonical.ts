/**
 * Canonical model: unified frontend/backend types.
 * Bridges the CLI ExtractionResult with what the UI needs to display.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type FieldSource = 'extracted' | 'manual' | 'manual-demo';

export interface FieldTraceability {
  documentKey: string;
  documentType: string;
  filename: string;
  processedAt: string; // ISO timestamp
  evidence: string | null; // OCR raw text — null in MVP
  classificationConfidence: number;
  sourceFieldKey: string;
}

export interface FieldEditEntry {
  previousValue: string | null;
  previousConfidence: number | null;
  previousSource: FieldSource;
  previousTraceability: FieldTraceability | null;
  editedAt: string; // ISO timestamp
}

export interface CanonicalFieldState {
  value: string | null;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  source: FieldSource;
  traceability: FieldTraceability | null;
  editHistory: FieldEditEntry[];
}

export type DocumentProcessingStatus = 'pending' | 'processing' | 'uploaded' | 'error';

export interface DocumentProcessingState {
  status: DocumentProcessingStatus;
  file: File | null;
  error: string | null;
  extractionResult: import('./extraction').ExtractionResult | null;
}

/**
 * CanonicalContractData extends CompraventaVehiculoData with UI-specific
 * canonical fields derived from multiple document sources.
 *
 * These fields resolve the desalineaciones documented in the PRD:
 * - vehiculo.patente: from certificado_rvm.inscripcion or permiso_circulacion.patente
 * - vehiculo.propietario: from certificado_rvm.propietario_nombre or permiso_circulacion.propietario_nombre
 * - tramite.permiso_periodo: from permiso_circulacion.periodo
 * - tramite.permiso_vigencia: derived from periodo/fecha, or marked as manual-pending
 */
export interface CanonicalExtensions {
  'vehiculo.patente': CanonicalFieldState;
  'vehiculo.propietario': CanonicalFieldState;
  'tramite.permiso_periodo': CanonicalFieldState;
  'tramite.permiso_vigencia': CanonicalFieldState;
}
