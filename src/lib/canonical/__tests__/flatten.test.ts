import { describe, it, expect } from 'vitest';
import { flattenContractToFields, fieldsToContractData, deriveCanonicalExtensions } from '../flatten';
import type { CanonicalFieldState } from '@/lib/types';
import { emptyCompraventaData } from '@/lib/types';

function makeFieldState(value: string | null, confidence = 1.0): CanonicalFieldState {
  return {
    value,
    confidence,
    confidenceLevel: confidence >= 0.85 ? 'high' : confidence >= 0.6 ? 'medium' : 'low',
    source: value ? 'extracted' : 'manual',
    traceability: null,
    editHistory: [],
  };
}

describe('flattenContractToFields', () => {
  it('flattens nested data to dot-notation keys', () => {
    const data = emptyCompraventaData();
    data.vendedor.nombre = 'Juan Pérez';
    data.vendedor.rut = '12.345.678-9';

    const fields = flattenContractToFields(data);

    expect(fields['vendedor.nombre'].value).toBe('Juan Pérez');
    expect(fields['vendedor.nombre'].confidence).toBe(1.0);
    expect(fields['vendedor.nombre'].source).toBe('extracted');
    expect(fields['vendedor.rut'].value).toBe('12.345.678-9');
  });

  it('creates low-confidence entries for null fields', () => {
    const data = emptyCompraventaData();
    const fields = flattenContractToFields(data);

    expect(fields['vendedor.nombre'].value).toBeNull();
    expect(fields['vendedor.nombre'].confidence).toBe(0);
    expect(fields['vendedor.nombre'].confidenceLevel).toBe('low');
  });

  it('converts boolean fields to string', () => {
    const data = emptyCompraventaData();
    data.deuda.vendedor_sin_deuda = true;
    data.deuda.comprador_sin_deuda = false;

    const fields = flattenContractToFields(data);

    expect(fields['deuda.vendedor_sin_deuda'].value).toBe('true');
    expect(fields['deuda.comprador_sin_deuda'].value).toBe('false');
  });

  it('includes all sections', () => {
    const fields = flattenContractToFields(emptyCompraventaData());
    const sections = new Set(Object.keys(fields).map(k => k.split('.')[0]));
    expect(sections).toEqual(new Set(['vendedor', 'comprador', 'vehiculo', 'negocio', 'tramite', 'deuda']));
  });
});

describe('fieldsToContractData', () => {
  it('reconstructs nested structure from flat fields', () => {
    const fields: Record<string, CanonicalFieldState> = {
      'vendedor.nombre': makeFieldState('Juan Pérez'),
      'vendedor.rut': makeFieldState('12.345.678-9'),
      'vehiculo.marca': makeFieldState('Toyota'),
      'deuda.vendedor_sin_deuda': makeFieldState('true'),
    };

    const data = fieldsToContractData(fields);

    expect(data.vendedor.nombre).toBe('Juan Pérez');
    expect(data.vendedor.rut).toBe('12.345.678-9');
    expect(data.vehiculo.marca).toBe('Toyota');
    expect(data.deuda.vendedor_sin_deuda).toBe(true);
  });

  it('preserves null values', () => {
    const fields: Record<string, CanonicalFieldState> = {
      'vendedor.nombre': makeFieldState(null),
    };

    const data = fieldsToContractData(fields);
    expect(data.vendedor.nombre).toBeNull();
  });

  it('parses boolean deuda fields correctly', () => {
    const fields: Record<string, CanonicalFieldState> = {
      'deuda.vendedor_sin_deuda': makeFieldState('false'),
      'deuda.comprador_sin_deuda': makeFieldState('true'),
    };

    const data = fieldsToContractData(fields);
    expect(data.deuda.vendedor_sin_deuda).toBe(false);
    expect(data.deuda.comprador_sin_deuda).toBe(true);
  });

  it('roundtrips with flattenContractToFields', () => {
    const original = emptyCompraventaData();
    original.vendedor.nombre = 'María García';
    original.vendedor.rut = '9.876.543-2';
    original.vehiculo.inscripcion = 'XXYZ-99';
    original.deuda.vendedor_sin_deuda = true;
    original.deuda.comprador_sin_deuda = false;

    const fields = flattenContractToFields(original);
    const reconstructed = fieldsToContractData(fields);

    expect(reconstructed.vendedor.nombre).toBe(original.vendedor.nombre);
    expect(reconstructed.vendedor.rut).toBe(original.vendedor.rut);
    expect(reconstructed.vehiculo.inscripcion).toBe(original.vehiculo.inscripcion);
    expect(reconstructed.deuda.vendedor_sin_deuda).toBe(original.deuda.vendedor_sin_deuda);
    expect(reconstructed.deuda.comprador_sin_deuda).toBe(original.deuda.comprador_sin_deuda);
  });
});

describe('deriveCanonicalExtensions', () => {
  it('derives vehiculo.patente from RVM inscripcion (canonical path)', () => {
    // After adaptExtractionToCanonical, RVM fields use canonical paths
    const extractionFieldStates: Record<string, Record<string, CanonicalFieldState>> = {
      'certificado_rvm:rvm.pdf': {
        'vehiculo.inscripcion': makeFieldState('ABCD-12', 0.95),
        'vendedor.nombre': makeFieldState('Juan', 0.9),
      },
    };

    const extensions = deriveCanonicalExtensions({}, extractionFieldStates);
    expect(extensions['vehiculo.patente'].value).toBe('ABCD-12');
    expect(extensions['vehiculo.propietario'].value).toBe('Juan');
  });

  it('falls back to permiso_circulacion for patente', () => {
    // permiso_circulacion fields: patente, propietario_nombre, periodo stay as raw keys
    const extractionFieldStates: Record<string, Record<string, CanonicalFieldState>> = {
      'permiso_circulacion:permiso.pdf': {
        patente: makeFieldState('WXYZ-34', 0.88),
        propietario_nombre: makeFieldState('María', 0.85),
        periodo: makeFieldState('2026', 0.9),
      },
    };

    const extensions = deriveCanonicalExtensions({}, extractionFieldStates);
    expect(extensions['vehiculo.patente'].value).toBe('WXYZ-34');
    expect(extensions['vehiculo.propietario'].value).toBe('María');
    expect(extensions['tramite.permiso_periodo'].value).toBe('2026');
    expect(extensions['tramite.permiso_vigencia'].value).toBe('Vigente período 2026');
  });

  it('prefers RVM over permiso for patente', () => {
    const extractionFieldStates: Record<string, Record<string, CanonicalFieldState>> = {
      'certificado_rvm:rvm.pdf': {
        'vehiculo.inscripcion': makeFieldState('ABCD-12', 0.95),
      },
      'permiso_circulacion:permiso.pdf': {
        patente: makeFieldState('WXYZ-34', 0.88),
      },
    };

    const extensions = deriveCanonicalExtensions({}, extractionFieldStates);
    expect(extensions['vehiculo.patente'].value).toBe('ABCD-12');
  });

  it('returns empty fields when no documents available', () => {
    const extensions = deriveCanonicalExtensions({}, {});
    expect(extensions['vehiculo.patente'].value).toBeNull();
    expect(extensions['vehiculo.propietario'].value).toBeNull();
    expect(extensions['tramite.permiso_periodo'].value).toBeNull();
    expect(extensions['tramite.permiso_vigencia'].value).toBeNull();
    expect(extensions['tramite.permiso_vigencia'].source).toBe('manual');
  });
});
