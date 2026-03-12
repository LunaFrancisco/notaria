/**
 * Contract definition for Compraventa de Vehículo.
 * Mirrored from cli/src/tramites/vehiculos/compraventa/ — keep in sync.
 *
 * Contains document type definitions, required/manual fields,
 * classification prompt, system prompt, merge logic, and validation rules.
 */
import type { ExtractionResult, ExtractedField } from '@/lib/types/extraction';
import type { CompraventaVehiculoData } from '@/lib/types/contract';
import type { ValidationIssue } from '@/lib/types/validation';
import { emptyCompraventaData } from '@/lib/types/contract';
import { normalizeRut, isValidRutFormat } from './rut';

// ---------------------------------------------------------------------------
// Document type definitions
// ---------------------------------------------------------------------------

export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
}

export interface DocumentTypeDef {
  id: string;
  label: string;
  required: boolean;
  minOccurs: number;
  maxOccurs: number;
  fields: FieldDef[];
  extractionPrompt: string;
  filenameHints: Array<{ pattern: string; confidence: number }>;
  textHints: Array<{ pattern: string; confidence: number }>;
  normalize?: (fields: Record<string, ExtractedField>) => Record<string, ExtractedField>;
}

const CERTIFICADO_RVM: DocumentTypeDef = {
  id: 'certificado_rvm',
  label: 'Certificado del Registro Nacional de Vehículos Motorizados',
  required: true,
  minOccurs: 1,
  maxOccurs: 1,
  fields: [
    { key: 'inscripcion', label: 'Inscripción/patente', required: true },
    { key: 'tipo_vehiculo', label: 'Tipo de vehículo', required: true },
    { key: 'anio', label: 'Año', required: true },
    { key: 'marca', label: 'Marca', required: true },
    { key: 'modelo', label: 'Modelo', required: true },
    { key: 'nro_motor', label: 'N° motor', required: true },
    { key: 'nro_chasis', label: 'N° chasis', required: true },
    { key: 'color', label: 'Color', required: true },
    { key: 'propietario_nombre', label: 'Nombre propietario', required: true },
    { key: 'propietario_run', label: 'RUN propietario', required: true },
    { key: 'fecha_adquisicion', label: 'Fecha de adquisición', required: false },
    { key: 'gravamenes', label: 'Gravámenes', required: false },
  ],
  extractionPrompt: `Extrae los siguientes campos de este Certificado del Registro Nacional de Vehículos Motorizados:

- inscripcion: Número de inscripción/patente del vehículo
- tipo_vehiculo: Tipo de vehículo (automóvil, camioneta, moto, etc.)
- anio: Año de fabricación
- marca: Marca del vehículo
- modelo: Modelo del vehículo
- nro_motor: Número de motor
- nro_chasis: Número de chasis/VIN
- color: Color del vehículo
- propietario_nombre: Nombre completo del propietario actual
- propietario_run: RUN/RUT del propietario (formato: XX.XXX.XXX-X)
- fecha_adquisicion: Fecha de adquisición por el propietario actual
- gravamenes: Si tiene gravámenes o prohibiciones vigentes

Responde SOLO con JSON:
{
  "documentType": "certificado_rvm",
  "confidence": 0.95,
  "fields": {
    "inscripcion": { "value": "...", "confidence": 0.99 },
    "tipo_vehiculo": { "value": "...", "confidence": 0.95 },
    ...
  }
}`,
  filenameHints: [
    { pattern: 'veh_', confidence: 0.9 },
    { pattern: 'vehiculo', confidence: 0.9 },
    { pattern: 'rvm', confidence: 0.9 },
  ],
  textHints: [
    { pattern: 'registro de vehículos motorizados', confidence: 0.95 },
    { pattern: 'registro nacional de vehiculos', confidence: 0.95 },
  ],
};

const CERTIFICADO_NO_DEUDA: DocumentTypeDef = {
  id: 'certificado_no_deuda',
  label: 'Certificado de No Deuda de Pensiones de Alimentos',
  required: true,
  minOccurs: 2,
  maxOccurs: 2,
  fields: [
    { key: 'nombre_completo', label: 'Nombre completo', required: true },
    { key: 'run', label: 'RUN/RUT', required: true },
    { key: 'estado_deuda', label: 'Estado de deuda', required: true },
    { key: 'fecha_certificado', label: 'Fecha del certificado', required: false },
  ],
  extractionPrompt: `Extrae los siguientes campos de este Certificado de No Deuda de Pensiones de Alimentos chileno:

- nombre_completo: Nombre completo de la persona certificada
- run: RUN/RUT (formato: XX.XXX.XXX-X)
- estado_deuda: Estado de deuda ("sin deuda vigente" o descripción de la deuda)
- fecha_certificado: Fecha de emisión del certificado

Responde SOLO con JSON:
{
  "documentType": "certificado_no_deuda",
  "confidence": 0.95,
  "fields": {
    "nombre_completo": { "value": "...", "confidence": 0.95 },
    "run": { "value": "...", "confidence": 0.99 },
    "estado_deuda": { "value": "...", "confidence": 0.95 },
    "fecha_certificado": { "value": "...", "confidence": 0.90 }
  }
}`,
  filenameHints: [
    { pattern: 'certificado_de_deuda', confidence: 0.9 },
    { pattern: 'no_deuda', confidence: 0.9 },
    { pattern: 'deudor', confidence: 0.9 },
  ],
  textHints: [
    { pattern: 'registro nacional de deudores', confidence: 0.95 },
    { pattern: 'pensiones de alimentos', confidence: 0.95 },
  ],
};

const CEDULA_IDENTIDAD: DocumentTypeDef = {
  id: 'cedula_identidad',
  label: 'Cédula de Identidad',
  required: false,
  minOccurs: 0,
  maxOccurs: 2,
  fields: [
    { key: 'nombre_completo', label: 'Nombre completo', required: true },
    { key: 'run', label: 'RUN/RUT', required: true },
    { key: 'nacionalidad', label: 'Nacionalidad', required: false },
    { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', required: false },
    { key: 'sexo', label: 'Sexo', required: false },
    { key: 'fecha_emision', label: 'Fecha de emisión', required: false },
    { key: 'fecha_vencimiento', label: 'Fecha de vencimiento', required: false },
  ],
  extractionPrompt: `Extrae los siguientes campos de esta Cédula de Identidad chilena:

- nombre_completo: Nombre completo (nombres y apellidos)
- run: RUN/RUT (formato: XX.XXX.XXX-X)
- nacionalidad: Nacionalidad
- fecha_nacimiento: Fecha de nacimiento
- sexo: Sexo (M/F)
- fecha_emision: Fecha de emisión
- fecha_vencimiento: Fecha de vencimiento

Responde SOLO con JSON:
{
  "documentType": "cedula_identidad",
  "confidence": 0.95,
  "fields": {
    "nombre_completo": { "value": "...", "confidence": 0.99 },
    "run": { "value": "...", "confidence": 0.99 },
    ...
  }
}`,
  filenameHints: [
    { pattern: 'cedula', confidence: 0.85 },
    { pattern: 'ci_', confidence: 0.85 },
    { pattern: 'identidad', confidence: 0.85 },
  ],
  textHints: [
    { pattern: 'cédula de identidad', confidence: 0.9 },
  ],
};

const PERMISO_CIRCULACION: DocumentTypeDef = {
  id: 'permiso_circulacion',
  label: 'Permiso de Circulación',
  required: false,
  minOccurs: 0,
  maxOccurs: 1,
  fields: [
    { key: 'patente', label: 'Patente', required: true },
    { key: 'comuna', label: 'Comuna', required: true },
    { key: 'periodo', label: 'Período', required: false },
    { key: 'propietario_nombre', label: 'Nombre propietario', required: false },
    { key: 'domicilio', label: 'Domicilio', required: false },
    { key: 'marca_modelo', label: 'Marca y modelo', required: false },
    { key: 'anio_vehiculo', label: 'Año vehículo', required: false },
    { key: 'color', label: 'Color', required: false },
    { key: 'fecha_emision', label: 'Fecha de emisión', required: false },
  ],
  extractionPrompt: `Extrae los siguientes campos de este Permiso de Circulación chileno:

- patente: Patente/placa del vehículo
- comuna: Comuna que emitió el permiso
- periodo: Período/año de vigencia
- propietario_nombre: Nombre del propietario en el permiso
- domicilio: Domicilio registrado
- marca_modelo: Marca y modelo del vehículo (si visible)
- anio_vehiculo: Año del vehículo (si visible)
- color: Color del vehículo (si visible)
- fecha_emision: Fecha de emisión del permiso

Responde SOLO con JSON:
{
  "documentType": "permiso_circulacion",
  "confidence": 0.95,
  "fields": {
    "patente": { "value": "...", "confidence": 0.99 },
    "comuna": { "value": "...", "confidence": 0.95 },
    ...
  }
}`,
  filenameHints: [
    { pattern: 'permiso', confidence: 0.85 },
    { pattern: 'circulacion', confidence: 0.85 },
  ],
  textHints: [
    { pattern: 'permiso de circulación', confidence: 0.9 },
  ],
};

export const ALL_DOC_TYPES: DocumentTypeDef[] = [
  CERTIFICADO_RVM,
  CERTIFICADO_NO_DEUDA,
  CEDULA_IDENTIDAD,
  PERMISO_CIRCULACION,
];

// ---------------------------------------------------------------------------
// Contract definition interface (subset needed by pipeline)
// ---------------------------------------------------------------------------

export interface ContractDefinition {
  id: string;
  label: string;
  documentTypes: DocumentTypeDef[];
  emptyData: () => CompraventaVehiculoData;
  merge: (extractions: ExtractionResult[]) => CompraventaVehiculoData;
  evaluate: (ctx: { contractData: Record<string, unknown>; extractions: ExtractionResult[] }) => ValidationIssue[];
  requiredFields: Array<{ path: string; label: string }>;
  manualFields: Array<{ path: string; label: string }>;
  classificationPrompt: string;
  systemPrompt: string;
}

// ---------------------------------------------------------------------------
// Merge logic (mirrored from cli/src/tramites/vehiculos/compraventa/merge.ts)
// ---------------------------------------------------------------------------

function getField(result: ExtractionResult, fieldName: string): string | null {
  const field = result.fields[fieldName];
  if (!field || !field.value || field.value.trim() === '') return null;
  return field.value.trim();
}

function isSinDeuda(estadoDeuda: string | null): boolean | null {
  if (!estadoDeuda) return null;
  const lower = estadoDeuda.toLowerCase();
  return lower.includes('sin inscripción') ||
         lower.includes('sin inscripcion') ||
         lower.includes('sin deuda') ||
         lower.includes('no registra') ||
         lower.includes('no tiene');
}

function assignRoles(
  extractions: ExtractionResult[],
): { vendedorRun: string | null; compradorRun: string | null } {
  const rvm = extractions.find(e => e.documentType === 'certificado_rvm');
  const propietarioRun = rvm ? getField(rvm, 'propietario_run') : null;

  const deudas = extractions.filter(e => e.documentType === 'certificado_no_deuda');
  const deudaRuns = deudas.map(d => getField(d, 'run')).filter(Boolean) as string[];

  if (!propietarioRun) {
    return {
      vendedorRun: deudaRuns[0] || null,
      compradorRun: deudaRuns[1] || null,
    };
  }

  const propNorm = normalizeRut(propietarioRun);
  const compradorRun = deudaRuns.find(r => normalizeRut(r) !== propNorm) || null;

  return { vendedorRun: propietarioRun, compradorRun };
}

function mergeExtractions(extractions: ExtractionResult[]): CompraventaVehiculoData {
  const contract = emptyCompraventaData();
  const { vendedorRun, compradorRun } = assignRoles(extractions);

  for (const ext of extractions) {
    switch (ext.documentType) {
      case 'certificado_rvm': {
        contract.vehiculo.inscripcion = getField(ext, 'inscripcion');
        contract.vehiculo.tipo = getField(ext, 'tipo_vehiculo');
        contract.vehiculo.anio = getField(ext, 'anio');
        contract.vehiculo.marca = getField(ext, 'marca');
        contract.vehiculo.modelo = getField(ext, 'modelo');
        contract.vehiculo.nro_motor = getField(ext, 'nro_motor');
        contract.vehiculo.nro_chasis = getField(ext, 'nro_chasis');
        contract.vehiculo.color = getField(ext, 'color');
        contract.vendedor.nombre = getField(ext, 'propietario_nombre');
        contract.vendedor.rut = getField(ext, 'propietario_run');
        break;
      }

      case 'certificado_no_deuda': {
        const run = getField(ext, 'run');
        if (!run) break;

        const isVendedor = vendedorRun && normalizeRut(run) === normalizeRut(vendedorRun);
        const isComprador = compradorRun && normalizeRut(run) === normalizeRut(compradorRun);

        if (isVendedor) {
          contract.vendedor.nombre ??= getField(ext, 'nombre_completo');
          contract.vendedor.rut ??= run;
          contract.deuda.vendedor_sin_deuda = isSinDeuda(getField(ext, 'estado_deuda'));
          contract.deuda.fecha_consulta_vendedor = getField(ext, 'fecha_certificado');
        } else if (isComprador) {
          contract.comprador.nombre = getField(ext, 'nombre_completo');
          contract.comprador.rut = run;
          contract.deuda.comprador_sin_deuda = isSinDeuda(getField(ext, 'estado_deuda'));
          contract.deuda.fecha_consulta_comprador = getField(ext, 'fecha_certificado');
        } else {
          if (contract.comprador.rut === null) {
            contract.comprador.nombre = getField(ext, 'nombre_completo');
            contract.comprador.rut = run;
            contract.deuda.comprador_sin_deuda = isSinDeuda(getField(ext, 'estado_deuda'));
            contract.deuda.fecha_consulta_comprador = getField(ext, 'fecha_certificado');
          }
        }
        break;
      }

      case 'permiso_circulacion': {
        contract.tramite.comuna_permiso_circulacion = getField(ext, 'comuna');
        break;
      }

      case 'cedula_identidad': {
        const run = getField(ext, 'run');
        if (!run) break;

        const isVendedor = vendedorRun && normalizeRut(run) === normalizeRut(vendedorRun);

        if (isVendedor) {
          contract.vendedor.nombre ??= getField(ext, 'nombre_completo');
          contract.vendedor.rut ??= run;
          contract.vendedor.nacionalidad = getField(ext, 'nacionalidad');
        } else {
          contract.comprador.nombre ??= getField(ext, 'nombre_completo');
          contract.comprador.rut ??= run;
          contract.comprador.nacionalidad = getField(ext, 'nacionalidad');
        }
        break;
      }
    }
  }

  return contract;
}

// ---------------------------------------------------------------------------
// Validation logic (mirrored from cli/src/tramites/vehiculos/compraventa/validation.ts)
// ---------------------------------------------------------------------------

function evaluate(ctx: { contractData: Record<string, unknown>; extractions: ExtractionResult[] }): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const contract = ctx.contractData as unknown as CompraventaVehiculoData;

  if (contract.vendedor.rut && !isValidRutFormat(contract.vendedor.rut)) {
    issues.push({
      code: 'RUT_FORMAT_VENDEDOR',
      severity: 'warning',
      message: `RUT vendedor formato inesperado: ${contract.vendedor.rut}`,
      path: 'vendedor.rut',
      evidence: contract.vendedor.rut,
      suggestedFix: 'Formato esperado: XX.XXX.XXX-X',
    });
  }
  if (contract.comprador.rut && !isValidRutFormat(contract.comprador.rut)) {
    issues.push({
      code: 'RUT_FORMAT_COMPRADOR',
      severity: 'warning',
      message: `RUT comprador formato inesperado: ${contract.comprador.rut}`,
      path: 'comprador.rut',
      evidence: contract.comprador.rut,
      suggestedFix: 'Formato esperado: XX.XXX.XXX-X',
    });
  }

  const rvm = ctx.extractions.find(e => e.documentType === 'certificado_rvm');
  const permiso = ctx.extractions.find(e => e.documentType === 'permiso_circulacion');

  if (rvm && permiso) {
    const patenteRvm = rvm.fields.inscripcion?.value?.replace(/[.\-\s]/g, '').toUpperCase();
    const patentePermiso = permiso.fields.patente?.value?.replace(/[.\-\s]/g, '').toUpperCase();

    if (patenteRvm && patentePermiso && patenteRvm !== patentePermiso) {
      issues.push({
        code: 'PATENTE_MISMATCH',
        severity: 'error',
        message: `Patente no coincide: RVM dice "${rvm.fields.inscripcion?.value}" pero permiso dice "${permiso.fields.patente?.value}"`,
        path: 'vehiculo.inscripcion',
        evidence: `RVM: ${rvm.fields.inscripcion?.value}, Permiso: ${permiso.fields.patente?.value}`,
        suggestedFix: 'Verificar patente en ambos documentos originales',
      });
    }
  }

  if (rvm && contract.vendedor.nombre) {
    const propietario = rvm.fields.propietario_nombre?.value?.toUpperCase() || '';
    const vendedor = contract.vendedor.nombre.toUpperCase();
    if (propietario && vendedor && !propietario.includes(vendedor.split(' ')[0])) {
      issues.push({
        code: 'PROPIETARIO_VENDEDOR_MISMATCH',
        severity: 'warning',
        message: `Nombre propietario RVM ("${rvm.fields.propietario_nombre?.value}") podría no coincidir con vendedor ("${contract.vendedor.nombre}")`,
        path: 'vendedor.nombre',
        evidence: `RVM: ${rvm.fields.propietario_nombre?.value}, Vendedor: ${contract.vendedor.nombre}`,
      });
    }
  }

  if (contract.deuda.vendedor_sin_deuda === null) {
    issues.push({ code: 'MISSING_DEUDA_VENDEDOR', severity: 'warning', message: 'Falta certificado de no deuda del vendedor', path: 'deuda.vendedor_sin_deuda' });
  } else if (!contract.deuda.vendedor_sin_deuda) {
    issues.push({ code: 'VENDEDOR_CON_DEUDA', severity: 'error', message: 'Vendedor tiene deuda de pensiones alimenticias', path: 'deuda.vendedor_sin_deuda' });
  }

  if (contract.deuda.comprador_sin_deuda === null) {
    issues.push({ code: 'MISSING_DEUDA_COMPRADOR', severity: 'warning', message: 'Falta certificado de no deuda del comprador', path: 'deuda.comprador_sin_deuda' });
  } else if (!contract.deuda.comprador_sin_deuda) {
    issues.push({ code: 'COMPRADOR_CON_DEUDA', severity: 'error', message: 'Comprador tiene deuda de pensiones alimenticias', path: 'deuda.comprador_sin_deuda' });
  }

  if (contract.vendedor.rut && contract.comprador.rut) {
    if (normalizeRut(contract.vendedor.rut) === normalizeRut(contract.comprador.rut)) {
      issues.push({
        code: 'SAME_RUT',
        severity: 'error',
        message: 'Vendedor y comprador tienen el mismo RUT',
        path: 'comprador.rut',
        evidence: `Vendedor: ${contract.vendedor.rut}, Comprador: ${contract.comprador.rut}`,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// System / classification prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer datos de documentos notariales chilenos.
Siempre responde SOLO con JSON válido, sin texto adicional ni markdown code fences.
Cada campo extraído debe tener "value" (string) y "confidence" (number 0.0-1.0).
Si no puedes leer un campo, usa value: "" y confidence: 0.`;

const CLASSIFICATION_PROMPT = `Analiza este documento chileno e identifica su tipo.

Tipos posibles:
- cedula_identidad: Cédula de identidad chilena (documento de identificación personal)
- certificado_no_deuda: Certificado del Registro Nacional de Deudores de Pensiones de Alimentos (indica si la persona tiene deuda de pensión alimenticia)
- certificado_rvm: Certificado del Registro Nacional de Vehículos Motorizados (datos del vehículo y propietario)
- permiso_circulacion: Permiso de circulación vehicular (autorización municipal para circular)

Responde SOLO con JSON:
{
  "documentType": "tipo_aqui",
  "confidence": 0.95,
  "reasoning": "breve explicación"
}`;

// ---------------------------------------------------------------------------
// Assembled contract definition
// ---------------------------------------------------------------------------

export const compraventaVehiculo: ContractDefinition = {
  id: 'compraventa',
  label: 'Compraventa de Vehículo',
  documentTypes: ALL_DOC_TYPES,
  emptyData: emptyCompraventaData,
  merge: mergeExtractions,
  evaluate,
  requiredFields: [
    { path: 'vendedor.nombre', label: 'Nombre vendedor' },
    { path: 'vendedor.rut', label: 'RUT vendedor' },
    { path: 'comprador.nombre', label: 'Nombre comprador' },
    { path: 'comprador.rut', label: 'RUT comprador' },
    { path: 'vehiculo.inscripcion', label: 'Inscripción/patente' },
    { path: 'vehiculo.tipo', label: 'Tipo vehículo' },
    { path: 'vehiculo.anio', label: 'Año vehículo' },
    { path: 'vehiculo.marca', label: 'Marca vehículo' },
    { path: 'vehiculo.modelo', label: 'Modelo vehículo' },
    { path: 'vehiculo.nro_motor', label: 'N° motor' },
    { path: 'vehiculo.nro_chasis', label: 'N° chasis' },
    { path: 'vehiculo.color', label: 'Color vehículo' },
  ],
  manualFields: [
    { path: 'vendedor.estado_civil', label: 'Estado civil vendedor' },
    { path: 'comprador.estado_civil', label: 'Estado civil comprador' },
    { path: 'vendedor.domicilio', label: 'Domicilio vendedor' },
    { path: 'comprador.domicilio', label: 'Domicilio comprador' },
    { path: 'vendedor.telefono', label: 'Teléfonos' },
    { path: 'negocio.precio_numero', label: 'Precio' },
    { path: 'negocio.modalidad_pago', label: 'Modalidad de pago' },
    { path: 'tramite.repertorio', label: 'Repertorio' },
    { path: 'tramite.ciudad', label: 'Fecha y ciudad' },
  ],
  classificationPrompt: CLASSIFICATION_PROMPT,
  systemPrompt: SYSTEM_PROMPT,
};
