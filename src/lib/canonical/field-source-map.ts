/**
 * Field → document slot mapping.
 *
 * Inverts the extraction mappings from adapt-extraction.ts so the accordion
 * sidebar can show which document each field came from (source badge).
 */

/**
 * Maps each canonical field path to the document slot key(s) that typically provide it.
 * For role-dependent fields, both vendedor and comprador variants are mapped.
 */
export const FIELD_TO_DOCUMENT_SLOT: Record<string, string> = {
  // certificado_rvm fields
  'vehiculo.inscripcion': 'certificado_rvm',
  'vehiculo.tipo': 'certificado_rvm',
  'vehiculo.anio': 'certificado_rvm',
  'vehiculo.marca': 'certificado_rvm',
  'vehiculo.modelo': 'certificado_rvm',
  'vehiculo.nro_motor': 'certificado_rvm',
  'vehiculo.nro_chasis': 'certificado_rvm',
  'vehiculo.color': 'certificado_rvm',
  'vehiculo.patente': 'certificado_rvm',
  'vehiculo.propietario': 'certificado_rvm',

  // permiso_circulacion fields
  'tramite.comuna_permiso_circulacion': 'permiso_circulacion',
  'tramite.permiso_periodo': 'permiso_circulacion',
  'tramite.permiso_vigencia': 'permiso_circulacion',

  // deuda_alimentaria fields (vendedor)
  'deuda.vendedor_sin_deuda': 'deuda_alimentaria_vendedor',
  'deuda.fecha_consulta_vendedor': 'deuda_alimentaria_vendedor',

  // deuda_alimentaria fields (comprador)
  'deuda.comprador_sin_deuda': 'deuda_alimentaria_comprador',
  'deuda.fecha_consulta_comprador': 'deuda_alimentaria_comprador',

  // cedula_identidad fields (vendedor)
  'vendedor.nombre': 'cedula_identidad_vendedor',
  'vendedor.rut': 'cedula_identidad_vendedor',
  'vendedor.nacionalidad': 'cedula_identidad_vendedor',

  // cedula_identidad fields (comprador)
  'comprador.nombre': 'cedula_identidad_comprador',
  'comprador.rut': 'cedula_identidad_comprador',
  'comprador.nacionalidad': 'cedula_identidad_comprador',
};

/** Abbreviations for document slot labels in source badges. */
const SLOT_ABBREVIATIONS: Record<string, string> = {
  certificado_rvm: 'RVM',
  permiso_circulacion: 'PC',
  deuda_alimentaria_vendedor: 'DAV',
  deuda_alimentaria_comprador: 'DAC',
  cedula_identidad_vendedor: 'CIV',
  cedula_identidad_comprador: 'CIC',
};

/** Badge color classes for each document slot. */
const SLOT_COLORS: Record<string, string> = {
  certificado_rvm: 'bg-blue-500',
  permiso_circulacion: 'bg-emerald-500',
  deuda_alimentaria_vendedor: 'bg-amber-500',
  deuda_alimentaria_comprador: 'bg-orange-500',
  cedula_identidad_vendedor: 'bg-violet-500',
  cedula_identidad_comprador: 'bg-pink-500',
};

/**
 * Returns the document slot key for a given field path, or null if not mapped.
 */
export function getFieldDocumentSlot(fieldPath: string): string | null {
  return FIELD_TO_DOCUMENT_SLOT[fieldPath] ?? null;
}

/**
 * Returns the abbreviation for a document slot key.
 */
export function getSlotAbbreviation(slotKey: string): string {
  return SLOT_ABBREVIATIONS[slotKey] ?? slotKey.slice(0, 3).toUpperCase();
}

/**
 * Returns the badge color class for a document slot key.
 */
export function getSlotColor(slotKey: string): string {
  return SLOT_COLORS[slotKey] ?? 'bg-gray-500';
}
