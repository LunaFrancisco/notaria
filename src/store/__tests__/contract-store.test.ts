import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useContractStore, setProcessingService } from '../contract-store';
import type { DocumentProcessingService, EnrichedExtractionResult } from '@/lib/services/processing-service';
import type { CompraventaVehiculoData, ValidationResult } from '@/lib/types';
import { emptyCompraventaData } from '@/lib/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockFile(name: string): File {
  return new File(['test content'], name, { type: 'application/pdf' });
}

function createMockExtractionResult(
  overrides: Partial<EnrichedExtractionResult> = {},
): EnrichedExtractionResult {
  return {
    file: 'test.pdf',
    documentType: 'certificado_rvm',
    classificationConfidence: 0.95,
    fields: {
      inscripcion: { value: 'ABCD-12', confidence: 0.92 },
      propietario_nombre: { value: 'Juan Pérez', confidence: 0.88 },
    },
    processedAt: '2026-03-11T00:00:00.000Z',
    ...overrides,
  };
}

function createMockService(
  overrides: Partial<DocumentProcessingService> = {},
): DocumentProcessingService {
  return {
    processDocument: vi.fn().mockResolvedValue(createMockExtractionResult()),
    mergeResults: vi.fn().mockResolvedValue(emptyCompraventaData()),
    validateContract: vi.fn().mockResolvedValue({
      issues: [],
      completeness: { extraction: 0, manual: 0, readiness: 0 },
    } satisfies ValidationResult),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('contract-store', () => {
  beforeEach(() => {
    // Reset store between tests
    useContractStore.getState().reset();
  });

  describe('addDocument / removeDocument', () => {
    it('adds a document with pending status', () => {
      const store = useContractStore.getState();
      const file = createMockFile('rvm.pdf');
      store.addDocument('certificado_rvm', file);

      const doc = useContractStore.getState().documents['certificado_rvm'];
      expect(doc).toBeDefined();
      expect(doc.status).toBe('pending');
      expect(doc.file).toBe(file);
      expect(doc.error).toBeNull();
      expect(doc.extractionResult).toBeNull();
    });

    it('removes a document and cleans up related state', () => {
      const store = useContractStore.getState();
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));

      useContractStore.getState().removeDocument('certificado_rvm');

      const state = useContractStore.getState();
      expect(state.documents['certificado_rvm']).toBeUndefined();
    });
  });

  describe('processDocument', () => {
    it('processes a document successfully and updates state', async () => {
      const mockResult = createMockExtractionResult();
      const service = createMockService({
        processDocument: vi.fn().mockResolvedValue(mockResult),
      });
      setProcessingService(service);

      const store = useContractStore.getState();
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));

      await useContractStore.getState().processDocument('certificado_rvm');

      const state = useContractStore.getState();
      expect(state.documents['certificado_rvm'].status).toBe('uploaded');
      expect(state.documents['certificado_rvm'].extractionResult).toEqual(mockResult);
      expect(state.extractions).toHaveLength(1);
      // Fields should have extraction data overlaid with canonical paths
      expect(state.fields['vehiculo.inscripcion']?.value).toBe('ABCD-12');
      expect(state.fields['vehiculo.inscripcion']?.source).toBe('extracted');
      expect(state.fields['vehiculo.inscripcion']?.traceability).toBeDefined();
      expect(state.fields['vehiculo.inscripcion']?.traceability?.documentType).toBe('certificado_rvm');
    });

    it('handles processing errors gracefully', async () => {
      const service = createMockService({
        processDocument: vi.fn().mockRejectedValue(new Error('LLM timeout')),
      });
      setProcessingService(service);

      const store = useContractStore.getState();
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));

      await useContractStore.getState().processDocument('certificado_rvm');

      const state = useContractStore.getState();
      expect(state.documents['certificado_rvm'].status).toBe('error');
      expect(state.documents['certificado_rvm'].error).toBe('LLM timeout');
      expect(state.extractions).toHaveLength(0);
    });

    it('does not overwrite higher confidence fields', async () => {
      // Both docs extract a field that maps to the same canonical path via extensions
      // RVM inscripcion → vehiculo.inscripcion, permiso comuna → tramite.comuna_permiso_circulacion
      // For this test, use two RVM results to test same-key overwrite behavior
      const highConfResult = createMockExtractionResult({
        fields: { inscripcion: { value: 'FIRST-99', confidence: 0.95 } },
      });
      const lowConfResult = createMockExtractionResult({
        file: 'rvm2.pdf',
        documentType: 'certificado_rvm',
        fields: { inscripcion: { value: 'SECOND-11', confidence: 0.60 } },
        processedAt: '2026-03-11T00:01:00.000Z',
      });

      let callCount = 0;
      const service = createMockService({
        processDocument: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve(callCount === 1 ? highConfResult : lowConfResult);
        }),
      });
      setProcessingService(service);

      const store = useContractStore.getState();
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));
      await useContractStore.getState().processDocument('certificado_rvm');

      store.addDocument('permiso_circulacion', createMockFile('rvm2.pdf'));
      await useContractStore.getState().processDocument('permiso_circulacion');

      const state = useContractStore.getState();
      // Higher confidence field should be kept (vehiculo.inscripcion from first RVM)
      expect(state.fields['vehiculo.inscripcion']?.value).toBe('FIRST-99');
      expect(state.fields['vehiculo.inscripcion']?.confidence).toBe(0.95);
    });
  });

  describe('updateField', () => {
    it('updates a field with manual source and preserves edit history', () => {
      const store = useContractStore.getState();

      // First update
      store.updateField('vendedor.nombre', 'María López');
      let state = useContractStore.getState();
      expect(state.fields['vendedor.nombre']?.value).toBe('María López');
      expect(state.fields['vendedor.nombre']?.source).toBe('manual');
      expect(state.fields['vendedor.nombre']?.confidence).toBe(1.0);
      expect(state.fields['vendedor.nombre']?.editHistory).toHaveLength(1);

      // Second update — history should chain
      useContractStore.getState().updateField('vendedor.nombre', 'María García');
      state = useContractStore.getState();
      expect(state.fields['vendedor.nombre']?.value).toBe('María García');
      expect(state.fields['vendedor.nombre']?.editHistory).toHaveLength(2);
      expect(state.fields['vendedor.nombre']?.editHistory[1].previousValue).toBe('María López');
    });

    it('preserves original traceability in edit history', async () => {
      const mockResult = createMockExtractionResult();
      const service = createMockService({
        processDocument: vi.fn().mockResolvedValue(mockResult),
      });
      setProcessingService(service);

      const store = useContractStore.getState();
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));
      await useContractStore.getState().processDocument('certificado_rvm');

      // Now manually edit extracted field (canonical path)
      useContractStore.getState().updateField('vehiculo.inscripcion', 'MANUAL-99');

      const state = useContractStore.getState();
      const field = state.fields['vehiculo.inscripcion'];
      expect(field?.source).toBe('manual');
      expect(field?.editHistory).toHaveLength(1);
      expect(field?.editHistory[0].previousValue).toBe('ABCD-12');
      expect(field?.editHistory[0].previousSource).toBe('extracted');
      expect(field?.editHistory[0].previousTraceability?.documentType).toBe('certificado_rvm');
    });
  });

  describe('mergeExtractions', () => {
    it('merges extractions and preserves traceability', async () => {
      const mergedData: CompraventaVehiculoData = {
        ...emptyCompraventaData(),
        vehiculo: {
          ...emptyCompraventaData().vehiculo,
          inscripcion: 'ABCD-12',
        },
      };
      const service = createMockService({
        processDocument: vi.fn().mockResolvedValue(createMockExtractionResult()),
        mergeResults: vi.fn().mockResolvedValue(mergedData),
      });
      setProcessingService(service);

      const store = useContractStore.getState();
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));
      await useContractStore.getState().processDocument('certificado_rvm');
      await useContractStore.getState().mergeExtractions();

      const state = useContractStore.getState();
      expect(state.contractData.vehiculo.inscripcion).toBe('ABCD-12');
    });

    it('preserves manual edits after merge', async () => {
      const service = createMockService({
        processDocument: vi.fn().mockResolvedValue(createMockExtractionResult()),
        mergeResults: vi.fn().mockResolvedValue(emptyCompraventaData()),
      });
      setProcessingService(service);

      const store = useContractStore.getState();
      // Manual edit first
      store.updateField('vendedor.nombre', 'Manual Edit');

      // Then process document
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));
      await useContractStore.getState().processDocument('certificado_rvm');
      await useContractStore.getState().mergeExtractions();

      const state = useContractStore.getState();
      expect(state.fields['vendedor.nombre']?.value).toBe('Manual Edit');
      expect(state.fields['vendedor.nombre']?.source).toBe('manual');
    });
  });

  describe('processAllDocuments', () => {
    it('processes all pending documents, merges, and derives extensions', async () => {
      const rvmResult = createMockExtractionResult();
      const permisoResult = createMockExtractionResult({
        file: 'permiso.pdf',
        documentType: 'permiso_circulacion',
        classificationConfidence: 0.90,
        fields: {
          patente: { value: 'ABCD-12', confidence: 0.88 },
          periodo: { value: '2026', confidence: 0.85 },
        },
        processedAt: '2026-03-11T00:01:00.000Z',
      });

      let callCount = 0;
      const service = createMockService({
        processDocument: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve(callCount === 1 ? rvmResult : permisoResult);
        }),
        mergeResults: vi.fn().mockResolvedValue(emptyCompraventaData()),
      });
      setProcessingService(service);

      const store = useContractStore.getState();
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));
      store.addDocument('permiso_circulacion', createMockFile('permiso.pdf'));

      await useContractStore.getState().processAllDocuments();

      const state = useContractStore.getState();
      expect(state.isProcessing).toBe(false);
      expect(state.extractions).toHaveLength(2);
      // Canonical extensions should be derived
      expect(state.fields['vehiculo.patente']?.value).toBe('ABCD-12');
      expect(state.fields['vehiculo.propietario']?.value).toBe('Juan Pérez');
      expect(state.fields['tramite.permiso_periodo']?.value).toBe('2026');
    });

    it('handles partial failures — error in one doc does not block others', async () => {
      let callCount = 0;
      const service = createMockService({
        processDocument: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('OCR failed'));
          }
          return Promise.resolve(createMockExtractionResult({
            file: 'permiso.pdf',
            documentType: 'permiso_circulacion',
            fields: { patente: { value: 'OK-99', confidence: 0.9 } },
          }));
        }),
        mergeResults: vi.fn().mockResolvedValue(emptyCompraventaData()),
      });
      setProcessingService(service);

      const store = useContractStore.getState();
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));
      store.addDocument('permiso_circulacion', createMockFile('permiso.pdf'));

      await useContractStore.getState().processAllDocuments();

      const state = useContractStore.getState();
      expect(state.documents['certificado_rvm'].status).toBe('error');
      expect(state.documents['certificado_rvm'].error).toBe('OCR failed');
      expect(state.documents['permiso_circulacion'].status).toBe('uploaded');
      expect(state.extractions).toHaveLength(1);
    });
  });

  describe('validateContractData', () => {
    it('calls validation service and stores result', async () => {
      const validationResult: ValidationResult = {
        issues: [{ code: 'RUT_FORMAT_VENDEDOR', severity: 'error', message: 'RUT inválido' }],
        completeness: { extraction: 0.5, manual: 0.3, readiness: 0.4 },
      };
      const service = createMockService({
        validateContract: vi.fn().mockResolvedValue(validationResult),
      });
      setProcessingService(service);

      await useContractStore.getState().validateContractData();

      const state = useContractStore.getState();
      expect(state.validationResult).toEqual(validationResult);
      expect(state.validationResult?.issues).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('resets store to initial state', () => {
      const store = useContractStore.getState();
      store.addDocument('certificado_rvm', createMockFile('rvm.pdf'));
      store.updateField('vendedor.nombre', 'Test');

      useContractStore.getState().reset();

      const state = useContractStore.getState();
      expect(Object.keys(state.documents)).toHaveLength(0);
      expect(state.extractions).toHaveLength(0);
      expect(state.contractData).toEqual(emptyCompraventaData());
      expect(state.validationResult).toBeNull();
      expect(state.isProcessing).toBe(false);
    });
  });
});
