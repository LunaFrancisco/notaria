'use client';

import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useContractStore, FIELD_LABEL_MAP } from '@/store/contract-store';
import type { ExtractionResult } from '@/lib/types/extraction';
import { mapConfidenceToLevel } from '@/lib/canonical';

function confidenceBadgeClass(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'border-[var(--notary-confidence-high)] text-[var(--notary-confidence-high)]';
    case 'medium':
      return 'border-[var(--notary-confidence-medium)] text-[var(--notary-confidence-medium)]';
    case 'low':
      return 'border-[var(--notary-confidence-low)] text-[var(--notary-confidence-low)]';
  }
}

/**
 * Maps extraction field keys back to canonical field paths.
 * For example, for certificado_rvm: inscripcion → vehiculo.inscripcion
 */
function extractionFieldToCanonicalPath(
  docType: string,
  fieldKey: string,
): string | null {
  const mapping: Record<string, Record<string, string>> = {
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
      patente: 'vehiculo.patente',
      comuna: 'tramite.comuna_permiso_circulacion',
      periodo: 'tramite.permiso_periodo',
      propietario_nombre: 'vehiculo.propietario',
    },
    certificado_no_deuda: {
      nombre_completo: null as unknown as string, // role-dependent, handled by merge
      run: null as unknown as string,
      estado_deuda: null as unknown as string,
      fecha_certificado: null as unknown as string,
    },
    cedula_identidad: {
      nombre_completo: null as unknown as string,
      run: null as unknown as string,
      nacionalidad: null as unknown as string,
    },
  };

  return mapping[docType]?.[fieldKey] ?? null;
}

interface DocumentFieldEditorProps {
  extraction: ExtractionResult;
  docKey: string;
  highlightedField: string | null;
  onFieldHover: (fieldKey: string | null) => void;
}

/**
 * Right panel of the validation split view.
 * Shows editable Input fields for each extracted field.
 * Changes propagate to the contract store for re-validation.
 */
export function DocumentFieldEditor({
  extraction,
  docKey,
  highlightedField,
  onFieldHover,
}: DocumentFieldEditorProps) {
  const fields = useContractStore((s) => s.fields);
  const updateField = useContractStore((s) => s.updateField);

  const fieldEntries = Object.entries(extraction.fields);

  const handleFieldChange = useCallback(
    (fieldKey: string, newValue: string) => {
      const canonicalPath = extractionFieldToCanonicalPath(
        extraction.documentType,
        fieldKey,
      );
      if (canonicalPath) {
        updateField(canonicalPath, newValue);
      }
    },
    [extraction.documentType, updateField],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Editar campos — {docKey}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {fieldEntries.map(([key, field]) => {
              const canonicalPath = extractionFieldToCanonicalPath(
                extraction.documentType,
                key,
              );
              const level = mapConfidenceToLevel(field.confidence);
              const isHighlighted = highlightedField === key;
              const label = canonicalPath
                ? FIELD_LABEL_MAP[canonicalPath] ?? key
                : key;

              // Use canonical field value if available, else extraction value
              const currentValue = canonicalPath
                ? fields[canonicalPath]?.value ?? field.value
                : field.value;

              return (
                <div
                  key={key}
                  className={`flex flex-col gap-1 rounded-md p-2 transition-colors ${
                    isHighlighted ? 'bg-[var(--notary-accent)]/10' : ''
                  }`}
                  onMouseEnter={() => onFieldHover(key)}
                  onMouseLeave={() => onFieldHover(null)}
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`field-${docKey}-${key}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      {label}
                    </label>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${confidenceBadgeClass(level)}`}
                    >
                      {Math.round(field.confidence * 100)}%
                    </Badge>
                  </div>
                  <Input
                    id={`field-${docKey}-${key}`}
                    defaultValue={currentValue}
                    onBlur={(e) => {
                      const val = e.currentTarget.value.trim();
                      if (val !== field.value) {
                        handleFieldChange(key, val);
                      }
                    }}
                    disabled={!canonicalPath}
                    className={!canonicalPath ? 'opacity-60' : ''}
                  />
                  {!canonicalPath && (
                    <p className="text-[10px] text-muted-foreground">
                      Campo no mapeado al contrato (asignación depende del rol)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
