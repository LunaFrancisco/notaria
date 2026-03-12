/**
 * RUT/RUN normalization and validation utilities.
 * Mirrored from cli/src/utils/rut.ts — keep in sync.
 */

export function normalizeRut(rut: string): string {
  return rut.replace(/[.\-]/g, '').toUpperCase();
}

export function isValidRutFormat(rut: string): boolean {
  return /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(rut);
}
