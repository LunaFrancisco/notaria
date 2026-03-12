/**
 * Central Zustand store for contract workflow state.
 *
 * Manages: documents, extraction fields, canonical field states,
 * contract data, and validation results.
 */
import { create } from 'zustand';
import type {
  CanonicalFieldState,
  DocumentProcessingState,
  CompraventaVehiculoData,
  ValidationResult,
  FieldEditEntry,
} from '@/lib/types';
import { emptyCompraventaData } from '@/lib/types';
import {
  adaptExtractionToCanonical,
  flattenContractToFields,
  deriveCanonicalExtensions,
} from '@/lib/canonical';
import { mapConfidenceToLevel } from '@/lib/canonical';
import type { DocumentProcessingService, EnrichedExtractionResult, ClassificationResult } from '@/lib/services/processing-service';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// UI reference data ported from index.html
// ---------------------------------------------------------------------------

export interface DocumentMeta {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

export const DOCUMENT_META: DocumentMeta[] = [
  { key: 'certificado_rvm', label: 'Certificado RVM', description: 'Registro de vehículos motorizados', required: true },
  { key: 'permiso_circulacion', label: 'Permiso de circulación', description: 'Permiso de circulación vigente', required: true },
  { key: 'deuda_alimentaria_vendedor', label: 'Cert. deuda alimentaria (vendedor)', description: 'Certificado del Registro Civil', required: true },
  { key: 'deuda_alimentaria_comprador', label: 'Cert. deuda alimentaria (comprador)', description: 'Certificado del Registro Civil', required: true },
  { key: 'cedula_identidad_vendedor', label: 'Cédula de identidad (vendedor)', description: 'Carnet de identidad del vendedor', required: true },
  { key: 'cedula_identidad_comprador', label: 'Cédula de identidad (comprador)', description: 'Carnet de identidad del comprador', required: true },
];

export const FIELD_LABEL_MAP: Record<string, string> = {
  'vendedor.nombre': 'Nombre vendedor',
  'vendedor.rut': 'RUT vendedor',
  'vendedor.estado_civil': 'Estado civil vendedor',
  'vendedor.domicilio': 'Domicilio vendedor',
  'vendedor.telefono': 'Teléfono vendedor',
  'vendedor.nacionalidad': 'Nacionalidad vendedor',
  'comprador.nombre': 'Nombre comprador',
  'comprador.rut': 'RUT comprador',
  'comprador.estado_civil': 'Estado civil comprador',
  'comprador.domicilio': 'Domicilio comprador',
  'comprador.telefono': 'Teléfono comprador',
  'comprador.correo': 'Correo comprador',
  'comprador.nacionalidad': 'Nacionalidad comprador',
  'vehiculo.inscripcion': 'Inscripción vehículo',
  'vehiculo.tipo': 'Tipo vehículo',
  'vehiculo.anio': 'Año vehículo',
  'vehiculo.marca': 'Marca',
  'vehiculo.modelo': 'Modelo',
  'vehiculo.nro_motor': 'N° motor',
  'vehiculo.nro_chasis': 'N° chasis',
  'vehiculo.color': 'Color',
  'negocio.precio_numero': 'Precio (número)',
  'negocio.precio_palabras': 'Precio (palabras)',
  'negocio.modalidad_pago': 'Modalidad de pago',
  'tramite.ciudad': 'Ciudad',
  'tramite.dia': 'Día',
  'tramite.mes': 'Mes',
  'tramite.anio': 'Año trámite',
  'tramite.repertorio': 'Repertorio',
  'tramite.fecha_certificado_dominio': 'Fecha cert. dominio',
  'tramite.comuna_permiso_circulacion': 'Comuna permiso',
  'deuda.vendedor_sin_deuda': 'Vendedor sin deuda',
  'deuda.comprador_sin_deuda': 'Comprador sin deuda',
  'deuda.fecha_consulta_vendedor': 'Fecha consulta vendedor',
  'deuda.fecha_consulta_comprador': 'Fecha consulta comprador',
  // Canonical extensions
  'vehiculo.patente': 'Patente',
  'vehiculo.propietario': 'Propietario',
  'tramite.permiso_periodo': 'Período permiso',
  'tramite.permiso_vigencia': 'Vigencia permiso',
};

// ---------------------------------------------------------------------------
// Classification → slot mapping
// ---------------------------------------------------------------------------

/** Maps a classified document type to the best available document slot key. */
export function mapDocumentTypeToSlot(
  documentType: string,
  documents: Record<string, DocumentProcessingState>,
): string | null {
  switch (documentType) {
    case 'certificado_rvm':
      return documents['certificado_rvm']?.file ? null : 'certificado_rvm';

    case 'permiso_circulacion':
      return documents['permiso_circulacion']?.file ? null : 'permiso_circulacion';

    case 'certificado_no_deuda':
      if (!documents['deuda_alimentaria_vendedor']?.file) return 'deuda_alimentaria_vendedor';
      if (!documents['deuda_alimentaria_comprador']?.file) return 'deuda_alimentaria_comprador';
      return null;

    case 'cedula_identidad':
      if (!documents['cedula_identidad_vendedor']?.file) return 'cedula_identidad_vendedor';
      if (!documents['cedula_identidad_comprador']?.file) return 'cedula_identidad_comprador';
      return null;

    default:
      return null;
  }
}

/** Human-readable label for a classified document type. */
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  certificado_rvm: 'Certificado RVM',
  permiso_circulacion: 'Permiso de Circulación',
  certificado_no_deuda: 'Cert. Deuda Alimentaria',
  cedula_identidad: 'Cédula de Identidad',
};

export function getDocumentTypeLabel(documentType: string): string {
  return DOCUMENT_TYPE_LABELS[documentType] ?? documentType;
}

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

interface ContractStoreState {
  // Document processing states keyed by document key
  documents: Record<string, DocumentProcessingState>;
  // Flat canonical field states for all contract fields
  fields: Record<string, CanonicalFieldState>;
  // Per-extraction field states keyed by "docType:filename"
  extractionFieldStates: Record<string, Record<string, CanonicalFieldState>>;
  // Successful extraction results
  extractions: EnrichedExtractionResult[];
  // Merged contract data
  contractData: CompraventaVehiculoData;
  // Latest validation result
  validationResult: ValidationResult | null;
  // True while files are being classified for slot assignment
  isClassifying: boolean;
  // Global processing flag
  isProcessing: boolean;
}

/** Result of classifying and assigning a single file */
export interface FileClassificationResult {
  file: File;
  classification: ClassificationResult;
  assignedSlot: string | null;
}

interface ContractStoreActions {
  /** Add a document to the store with pending status */
  addDocument(key: string, file: File): void;
  /** Remove a document and its state */
  removeDocument(key: string): void;
  /** Classify files and auto-assign them to the correct document slots */
  classifyAndAssignFiles(files: File[]): Promise<FileClassificationResult[]>;
  /** Process a single document through the pipeline */
  processDocument(key: string): Promise<void>;
  /** Process all pending documents, merge, and derive extensions */
  processAllDocuments(): Promise<void>;
  /** Update a field manually, preserving edit history */
  updateField(fieldPath: string, newValue: string): void;
  /** Merge extractions into contract data and overlay traceability */
  mergeExtractions(): Promise<void>;
  /** Validate the current contract data */
  validateContractData(): Promise<void>;
  /** Reset store to initial state */
  reset(): void;
}

export type ContractStore = ContractStoreState & ContractStoreActions;

// ---------------------------------------------------------------------------
// Service injection
// ---------------------------------------------------------------------------

let processingService: DocumentProcessingService | null = null;

export function setProcessingService(service: DocumentProcessingService): void {
  processingService = service;
}

export function getProcessingService(): DocumentProcessingService {
  if (!processingService) {
    throw new Error('ProcessingService not initialized. Call setProcessingService() first.');
  }
  return processingService;
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

function createInitialState(): ContractStoreState {
  return {
    documents: {},
    fields: flattenContractToFields(emptyCompraventaData()),
    extractionFieldStates: {},
    extractions: [],
    contractData: emptyCompraventaData(),
    validationResult: null,
    isClassifying: false,
    isProcessing: false,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useContractStore = create<ContractStore>((set, get) => ({
  ...createInitialState(),

  addDocument(key: string, file: File) {
    set((state) => ({
      documents: {
        ...state.documents,
        [key]: { status: 'pending', file, error: null, extractionResult: null },
      },
    }));
  },

  removeDocument(key: string) {
    set((state) => {
      const remainingDocs = Object.fromEntries(
        Object.entries(state.documents).filter(([k]) => k !== key),
      );
      // Remove associated extraction
      const remainingExtFields = Object.fromEntries(
        Object.entries(state.extractionFieldStates).filter(([k]) => k !== key),
      );
      const remainingExtractions = state.extractions.filter(
        (e) => `${e.documentType}:${e.file}` !== key,
      );
      return {
        documents: remainingDocs,
        extractionFieldStates: remainingExtFields,
        extractions: remainingExtractions,
      };
    });
  },

  async classifyAndAssignFiles(files: File[]): Promise<FileClassificationResult[]> {
    set({ isClassifying: true });
    const service = getProcessingService();
    const results: FileClassificationResult[] = [];

    for (const file of files) {
      try {
        logger.info('document:classifying', { filename: file.name, size: file.size });

        const classification = await service.classifyDocument(file);
        const currentDocs = get().documents;
        const slot = mapDocumentTypeToSlot(classification.documentType, currentDocs);

        logger.info('document:classified-auto', {
          filename: file.name,
          type: classification.documentType,
          confidence: classification.confidence,
          assignedSlot: slot,
        });

        if (slot) {
          get().addDocument(slot, file);
        }

        results.push({ file, classification, assignedSlot: slot });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Classification failed';
        logger.error('document:classify-error', { filename: file.name, error: message });

        // Fallback: assign to first empty slot
        const currentDocs = get().documents;
        const emptySlot = DOCUMENT_META.find(
          (meta) => !currentDocs[meta.key]?.file,
        );

        const fallbackSlot = emptySlot?.key ?? null;
        if (fallbackSlot) {
          get().addDocument(fallbackSlot, file);
        }

        results.push({
          file,
          classification: { file: file.name, documentType: 'unknown', confidence: 0 },
          assignedSlot: fallbackSlot,
        });
      }
    }

    set({ isClassifying: false });
    return results;
  },

  async processDocument(key: string) {
    const state = get();
    const doc = state.documents[key];
    if (!doc?.file) return;

    const service = getProcessingService();

    // Set status to processing
    set((prev) => ({
      documents: {
        ...prev.documents,
        [key]: { ...prev.documents[key], status: 'processing', error: null },
      },
    }));

    logger.info('document:upload', { filename: doc.file.name, size: doc.file.size, docKey: key });

    try {
      const result = await service.processDocument(doc.file);

      logger.info('document:classified', {
        filename: result.file,
        type: result.documentType,
        confidence: result.classificationConfidence,
      });

      const fieldCount = Object.keys(result.fields).length;
      const avgConfidence = fieldCount > 0
        ? Object.values(result.fields).reduce((sum, f) => sum + f.confidence, 0) / fieldCount
        : 0;
      logger.info('document:extracted', {
        filename: result.file,
        fieldCount,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
      });

      // Convert extraction to canonical field states (pass slot key for role disambiguation)
      const fieldStates = adaptExtractionToCanonical(result, result.processedAt, key);
      const docKey = `${result.documentType}:${result.file}`;

      set((prev) => {
        // Overlay extracted fields onto existing fields (only higher confidence)
        const updatedFields = { ...prev.fields };
        for (const [fieldPath, extractedField] of Object.entries(fieldStates)) {
          const existing = updatedFields[fieldPath];
          // Only overwrite if new confidence is higher or field has no value
          if (
            !existing ||
            existing.source === 'manual' ||
            !existing.value ||
            extractedField.confidence >= existing.confidence
          ) {
            // Preserve manual edits — never overwrite manual source
            if (existing?.source === 'manual' && existing.value) {
              continue;
            }
            updatedFields[fieldPath] = extractedField;
          }
        }

        return {
          documents: {
            ...prev.documents,
            [key]: {
              status: 'uploaded',
              file: doc.file,
              error: null,
              extractionResult: result,
            },
          },
          extractions: [...prev.extractions, result],
          extractionFieldStates: {
            ...prev.extractionFieldStates,
            [docKey]: fieldStates,
          },
          fields: updatedFields,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed';
      logger.error('document:process-error', { docKey: key, error: message });
      set((prev) => ({
        documents: {
          ...prev.documents,
          [key]: { ...prev.documents[key], status: 'error', error: message },
        },
      }));
    }
  },

  async processAllDocuments() {
    const state = get();
    set({ isProcessing: true });

    // Process pending documents sequentially
    const pendingKeys = Object.entries(state.documents)
      .filter(([, doc]) => doc.status === 'pending')
      .map(([key]) => key);

    for (const key of pendingKeys) {
      await get().processDocument(key);
    }

    // Merge if we have any successful extractions
    const currentState = get();
    if (currentState.extractions.length > 0) {
      await get().mergeExtractions();

      // Derive canonical extensions
      const afterMerge = get();
      const extensions = deriveCanonicalExtensions(
        afterMerge.fields,
        afterMerge.extractionFieldStates,
      );
      set((prev) => ({
        fields: { ...prev.fields, ...extensions },
      }));
    }

    set({ isProcessing: false });
  },

  updateField(fieldPath: string, newValue: string) {
    set((state) => {
      const existing = state.fields[fieldPath];
      const editEntry: FieldEditEntry = {
        previousValue: existing?.value ?? null,
        previousConfidence: existing?.confidence ?? null,
        previousSource: existing?.source ?? 'manual',
        previousTraceability: existing?.traceability ?? null,
        editedAt: new Date().toISOString(),
      };

      const updatedField: CanonicalFieldState = {
        value: newValue || null,
        confidence: 1.0,
        confidenceLevel: 'high',
        source: 'manual',
        traceability: existing?.traceability ?? null,
        editHistory: [...(existing?.editHistory ?? []), editEntry],
      };

      return {
        fields: { ...state.fields, [fieldPath]: updatedField },
      };
    });
  },

  async mergeExtractions() {
    const state = get();
    if (state.extractions.length === 0) return;

    const service = getProcessingService();

    try {
      const contractData = await service.mergeResults(state.extractions);
      const mergedFields = flattenContractToFields(contractData);

      // Overlay extraction traceability onto merged fields
      set((prev) => {
        const updatedFields = { ...mergedFields };

        // Overlay per-extraction field states (traceability preservation)
        for (const docFields of Object.values(prev.extractionFieldStates)) {
          for (const [fieldPath, extractionField] of Object.entries(docFields)) {
            if (updatedFields[fieldPath] && extractionField.traceability) {
              updatedFields[fieldPath] = {
                ...updatedFields[fieldPath],
                traceability: extractionField.traceability,
                source: 'extracted',
                confidence: extractionField.confidence,
                confidenceLevel: mapConfidenceToLevel(extractionField.confidence),
              };
            }
          }
        }

        // Preserve manual edits
        for (const [fieldPath, prevField] of Object.entries(prev.fields)) {
          if (prevField.source === 'manual' && prevField.value) {
            updatedFields[fieldPath] = prevField;
          }
        }

        return {
          contractData,
          fields: updatedFields,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Merge failed';
      throw new Error(message);
    }
  },

  async validateContractData() {
    const state = get();
    const service = getProcessingService();

    try {
      const result = await service.validateContract(
        state.contractData,
        state.extractions,
      );

      const severityCounts = result.issues.reduce<Record<string, number>>((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
        return acc;
      }, {});
      logger.info('validation:completed', {
        issueCount: result.issues.length,
        ...severityCounts,
        readiness: result.completeness.readiness,
      });

      set({ validationResult: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      throw new Error(message);
    }
  },

  reset() {
    set(createInitialState());
  },
}));
