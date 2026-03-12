import { describe, it, expect } from 'vitest';
import { adaptExtractionToCanonical } from '../adapt-extraction';
import type { ExtractionResult } from '@/lib/types';

const TIMESTAMP = '2026-03-11T12:00:00.000Z';

function makeExtraction(overrides?: Partial<ExtractionResult>): ExtractionResult {
  return {
    file: 'doc.pdf',
    documentType: 'certificado_rvm',
    classificationConfidence: 0.95,
    fields: {
      inscripcion: { value: 'ABCD-12', confidence: 0.99 },
      marca: { value: 'Toyota', confidence: 0.88 },
    },
    ...overrides,
  };
}

describe('adaptExtractionToCanonical', () => {
  it('converts fields to CanonicalFieldState with canonical paths and traceability', () => {
    const result = adaptExtractionToCanonical(makeExtraction(), TIMESTAMP);

    // inscripcion → vehiculo.inscripcion for certificado_rvm
    expect(result['vehiculo.inscripcion']).toEqual({
      value: 'ABCD-12',
      confidence: 0.99,
      confidenceLevel: 'high',
      source: 'extracted',
      traceability: {
        documentKey: 'certificado_rvm:doc.pdf',
        documentType: 'certificado_rvm',
        filename: 'doc.pdf',
        processedAt: TIMESTAMP,
        evidence: null,
        classificationConfidence: 0.95,
        sourceFieldKey: 'inscripcion',
      },
      editHistory: [],
    });

    // marca → vehiculo.marca for certificado_rvm
    expect(result['vehiculo.marca']).toBeDefined();
    expect(result['vehiculo.marca'].value).toBe('Toyota');
  });

  it('maps confidence levels correctly', () => {
    const extraction = makeExtraction({
      fields: {
        low: { value: 'x', confidence: 0.3 },
        medium: { value: 'y', confidence: 0.7 },
        high: { value: 'z', confidence: 0.9 },
      },
    });

    // These keys have no mapping for certificado_rvm, so they stay as raw keys
    const result = adaptExtractionToCanonical(extraction, TIMESTAMP);
    expect(result.low.confidenceLevel).toBe('low');
    expect(result.medium.confidenceLevel).toBe('medium');
    expect(result.high.confidenceLevel).toBe('high');
  });

  it('treats empty string value as null', () => {
    const extraction = makeExtraction({
      fields: {
        empty: { value: '', confidence: 0.5 },
      },
    });

    const result = adaptExtractionToCanonical(extraction, TIMESTAMP);
    expect(result.empty.value).toBeNull();
  });

  it('uses current time if no timestamp provided', () => {
    const result = adaptExtractionToCanonical(makeExtraction());
    expect(result['vehiculo.inscripcion'].traceability?.processedAt).toBeTruthy();
  });

  it('maps certificado_no_deuda fields using slotKey for role disambiguation', () => {
    const extraction: ExtractionResult = {
      file: 'deuda_vendedor.pdf',
      documentType: 'certificado_no_deuda',
      classificationConfidence: 0.92,
      fields: {
        nombre_completo: { value: 'Juan Pérez', confidence: 0.95 },
        run: { value: '12.345.678-9', confidence: 0.99 },
        estado_deuda: { value: 'Sin deuda', confidence: 0.90 },
        fecha_certificado: { value: '2026-03-01', confidence: 0.88 },
      },
    };

    const result = adaptExtractionToCanonical(extraction, TIMESTAMP, 'deuda_alimentaria_vendedor');

    expect(result['vendedor.nombre']?.value).toBe('Juan Pérez');
    expect(result['vendedor.rut']?.value).toBe('12.345.678-9');
    expect(result['deuda.vendedor_sin_deuda']?.value).toBe('Sin deuda');
    expect(result['deuda.fecha_consulta_vendedor']?.value).toBe('2026-03-01');
  });

  it('maps permiso_circulacion comuna to tramite.comuna_permiso_circulacion', () => {
    const extraction: ExtractionResult = {
      file: 'permiso.pdf',
      documentType: 'permiso_circulacion',
      classificationConfidence: 0.90,
      fields: {
        comuna: { value: 'Santiago', confidence: 0.95 },
        patente: { value: 'ABCD-12', confidence: 0.88 },
      },
    };

    const result = adaptExtractionToCanonical(extraction, TIMESTAMP);

    expect(result['tramite.comuna_permiso_circulacion']?.value).toBe('Santiago');
    // patente has no mapping for permiso_circulacion, stays as raw key
    expect(result['patente']?.value).toBe('ABCD-12');
  });
});
