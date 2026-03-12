import type { CompraventaVehiculoData, CanonicalFieldState } from '@/lib/types';
import { mapConfidenceToLevel } from './confidence';

/**
 * Converts a nested CompraventaVehiculoData into a flat Record<string, CanonicalFieldState>
 * for use in the UI. Each key uses dot notation (e.g., "vendedor.nombre").
 *
 * Fields with non-null values get confidence 1.0 and source 'extracted' by default,
 * since we don't have per-field metadata when coming from merged data alone.
 * When used with real pipeline data, the caller should overlay field states
 * from adaptExtractionToCanonical which carry proper traceability.
 */
export function flattenContractToFields(
  data: CompraventaVehiculoData,
): Record<string, CanonicalFieldState> {
  const result: Record<string, CanonicalFieldState> = {};

  for (const [section, fields] of Object.entries(data)) {
    if (typeof fields !== 'object' || fields === null) continue;

    for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
      const path = `${section}.${key}`;
      const stringValue = valueToString(value);
      const hasValue = stringValue !== null;

      result[path] = {
        value: stringValue,
        confidence: hasValue ? 1.0 : 0,
        confidenceLevel: hasValue ? 'high' : 'low',
        source: hasValue ? 'extracted' : 'manual',
        traceability: null,
        editHistory: [],
      };
    }
  }

  return result;
}

function valueToString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value || null;
  return String(value);
}

/**
 * Converts a flat Record<string, CanonicalFieldState> back into
 * a CompraventaVehiculoData structure for validation.
 *
 * Boolean fields (deuda.*_sin_deuda) are parsed back from string.
 */
export function fieldsToContractData(
  fields: Record<string, CanonicalFieldState>,
): CompraventaVehiculoData {
  const data: Record<string, Record<string, unknown>> = {};

  for (const [path, fieldState] of Object.entries(fields)) {
    const dotIndex = path.indexOf('.');
    if (dotIndex === -1) continue;

    const section = path.substring(0, dotIndex);
    const key = path.substring(dotIndex + 1);

    if (!data[section]) {
      data[section] = {};
    }

    data[section][key] = parseFieldValue(path, fieldState.value);
  }

  return data as unknown as CompraventaVehiculoData;
}

const BOOLEAN_FIELDS = new Set([
  'deuda.vendedor_sin_deuda',
  'deuda.comprador_sin_deuda',
]);

function parseFieldValue(path: string, value: string | null): string | boolean | null {
  if (value === null) return null;

  if (BOOLEAN_FIELDS.has(path)) {
    return value === 'true';
  }

  return value;
}

/**
 * Derives canonical extension fields from extraction results.
 * These resolve desalineaciones between CLI fields and UI needs:
 * - vehiculo.patente from certificado_rvm.inscripcion or permiso_circulacion.patente
 * - vehiculo.propietario from certificado_rvm.propietario_nombre or permiso_circulacion.propietario_nombre
 * - tramite.permiso_periodo from permiso_circulacion.periodo
 * - tramite.permiso_vigencia derived from periodo or marked as pending
 */
export function deriveCanonicalExtensions(
  _fieldStates: Record<string, CanonicalFieldState>,
  extractionFieldStates: Record<string, Record<string, CanonicalFieldState>>,
): Record<string, CanonicalFieldState> {
  const extensions: Record<string, CanonicalFieldState> = {};

  // vehiculo.patente: prefer RVM inscripcion, fallback to permiso patente
  // Field keys are canonical paths (e.g. "vehiculo.inscripcion") after adapt-extraction mapping
  const rvmInscripcion = findFieldFromDocType(extractionFieldStates, 'certificado_rvm', 'vehiculo.inscripcion');
  const permisoPatente = findFieldFromDocType(extractionFieldStates, 'permiso_circulacion', 'patente');
  extensions['vehiculo.patente'] = rvmInscripcion ?? permisoPatente ?? emptyField();

  // vehiculo.propietario: prefer RVM, fallback to permiso
  const rvmPropietario = findFieldFromDocType(extractionFieldStates, 'certificado_rvm', 'vendedor.nombre');
  const permisoPropietario = findFieldFromDocType(extractionFieldStates, 'permiso_circulacion', 'propietario_nombre');
  extensions['vehiculo.propietario'] = rvmPropietario ?? permisoPropietario ?? emptyField();

  // tramite.permiso_periodo: from permiso_circulacion.periodo
  const permisoPeriodo = findFieldFromDocType(extractionFieldStates, 'permiso_circulacion', 'periodo');
  extensions['tramite.permiso_periodo'] = permisoPeriodo ?? emptyField();

  // tramite.permiso_vigencia: derived from periodo if available
  if (permisoPeriodo?.value) {
    extensions['tramite.permiso_vigencia'] = {
      value: `Vigente período ${permisoPeriodo.value}`,
      confidence: permisoPeriodo.confidence * 0.8, // lower confidence for derived
      confidenceLevel: mapConfidenceToLevel(permisoPeriodo.confidence * 0.8),
      source: 'extracted',
      traceability: permisoPeriodo.traceability,
      editHistory: [],
    };
  } else {
    extensions['tramite.permiso_vigencia'] = {
      ...emptyField(),
      source: 'manual',
    };
  }

  return extensions;
}

function findFieldFromDocType(
  extractionFieldStates: Record<string, Record<string, CanonicalFieldState>>,
  documentType: string,
  fieldKey: string,
): CanonicalFieldState | null {
  for (const [docKey, fields] of Object.entries(extractionFieldStates)) {
    if (docKey.startsWith(`${documentType}:`)) {
      const field = fields[fieldKey];
      if (field?.value) return field;
    }
  }
  return null;
}

function emptyField(): CanonicalFieldState {
  return {
    value: null,
    confidence: 0,
    confidenceLevel: 'low',
    source: 'manual',
    traceability: null,
    editHistory: [],
  };
}
