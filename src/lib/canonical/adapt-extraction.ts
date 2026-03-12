import type { ExtractionResult } from '@/lib/types';
import type { CanonicalFieldState, FieldTraceability } from '@/lib/types';
import { mapConfidenceToLevel } from './confidence';

/**
 * Mapping from (documentType, rawFieldKey) → canonical dot-notated path.
 *
 * This bridges the gap between CLI extraction field keys (e.g. "inscripcion")
 * and the UI template paths (e.g. "vehiculo.inscripcion").
 *
 * Role-dependent documents (certificado_no_deuda, cedula_identidad) use
 * the slotKey parameter to determine vendedor vs comprador mapping.
 */
const FIELD_KEY_MAP: Record<string, Record<string, string>> = {
  certificado_rvm: {
    inscripcion: 'vehiculo.inscripcion',
    tipo_vehiculo: 'vehiculo.tipo',
    anio: 'vehiculo.anio',
    marca: 'vehiculo.marca',
    modelo: 'vehiculo.modelo',
    nro_motor: 'vehiculo.nro_motor',
    nro_chasis: 'vehiculo.nro_chasis',
    color: 'vehiculo.color',
    propietario_nombre: 'vendedor.nombre',
    propietario_run: 'vendedor.rut',
  },
  permiso_circulacion: {
    comuna: 'tramite.comuna_permiso_circulacion',
  },
};

/** Role-dependent mappings keyed by role prefix (vendedor/comprador). */
const DEUDA_FIELD_MAP: Record<string, Record<string, string>> = {
  vendedor: {
    nombre_completo: 'vendedor.nombre',
    run: 'vendedor.rut',
    estado_deuda: 'deuda.vendedor_sin_deuda',
    fecha_certificado: 'deuda.fecha_consulta_vendedor',
  },
  comprador: {
    nombre_completo: 'comprador.nombre',
    run: 'comprador.rut',
    estado_deuda: 'deuda.comprador_sin_deuda',
    fecha_certificado: 'deuda.fecha_consulta_comprador',
  },
};

const CEDULA_FIELD_MAP: Record<string, Record<string, string>> = {
  vendedor: {
    nombre_completo: 'vendedor.nombre',
    run: 'vendedor.rut',
    nacionalidad: 'vendedor.nacionalidad',
  },
  comprador: {
    nombre_completo: 'comprador.nombre',
    run: 'comprador.rut',
    nacionalidad: 'comprador.nacionalidad',
  },
};

/**
 * Resolves the role (vendedor/comprador) from the document slot key.
 * Slot keys like "deuda_alimentaria_vendedor" → "vendedor".
 */
function resolveRole(slotKey: string): 'vendedor' | 'comprador' | null {
  if (slotKey.includes('vendedor')) return 'vendedor';
  if (slotKey.includes('comprador')) return 'comprador';
  return null;
}

/**
 * Returns the canonical field path for a given document type, raw field key,
 * and optional slot key (for role disambiguation).
 */
function resolveCanonicalPath(
  documentType: string,
  fieldKey: string,
  slotKey?: string,
): string | null {
  // Direct mapping for non-role-dependent documents
  const directMap = FIELD_KEY_MAP[documentType];
  if (directMap?.[fieldKey]) {
    return directMap[fieldKey];
  }

  // Role-dependent documents
  const role = slotKey ? resolveRole(slotKey) : null;

  if (documentType === 'certificado_no_deuda' && role) {
    return DEUDA_FIELD_MAP[role]?.[fieldKey] ?? null;
  }

  if (documentType === 'cedula_identidad' && role) {
    return CEDULA_FIELD_MAP[role]?.[fieldKey] ?? null;
  }

  return null;
}

/**
 * Converts a single ExtractionResult from the CLI into a Record of
 * CanonicalFieldState entries, one per extracted field.
 *
 * Field keys are mapped to canonical dot-notated paths (e.g. "vehiculo.inscripcion")
 * using the document type and optional slot key for role disambiguation.
 *
 * Each field gets full traceability pointing back to its source document.
 * The `processedAt` timestamp is injected here since ExtractionResult
 * does not carry it natively.
 *
 * @param extraction - Raw extraction result from the pipeline
 * @param processedAt - ISO timestamp of when processing completed
 * @param slotKey - Document slot key (e.g. "deuda_alimentaria_vendedor") for role disambiguation
 */
export function adaptExtractionToCanonical(
  extraction: ExtractionResult,
  processedAt?: string,
  slotKey?: string,
): Record<string, CanonicalFieldState> {
  const timestamp = processedAt ?? new Date().toISOString();
  const result: Record<string, CanonicalFieldState> = {};

  for (const [fieldKey, field] of Object.entries(extraction.fields)) {
    const canonicalPath = resolveCanonicalPath(
      extraction.documentType,
      fieldKey,
      slotKey,
    );

    // Use canonical path if mapped, otherwise keep raw key as fallback
    const outputKey = canonicalPath ?? fieldKey;

    const traceability: FieldTraceability = {
      documentKey: `${extraction.documentType}:${extraction.file}`,
      documentType: extraction.documentType,
      filename: extraction.file,
      processedAt: timestamp,
      evidence: null, // OCR raw evidence not available in MVP
      classificationConfidence: extraction.classificationConfidence,
      sourceFieldKey: fieldKey,
    };

    result[outputKey] = {
      value: field.value || null,
      confidence: field.confidence,
      confidenceLevel: mapConfidenceToLevel(field.confidence),
      source: 'extracted',
      traceability,
      editHistory: [],
    };
  }

  return result;
}
