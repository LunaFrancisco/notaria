'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { DocumentMeta } from '@/store/contract-store';
import type { ExtractionResult } from '@/lib/types/extraction';
import { mapConfidenceToLevel } from '@/lib/canonical';

/** ExtractionResult possibly enriched with processedAt from the API */
interface ExtractionWithTimestamp extends ExtractionResult {
  processedAt?: string;
}

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

interface DocumentExtractionPreviewProps {
  extraction: ExtractionWithTimestamp;
  docMeta: DocumentMeta;
  highlightedField: string | null;
  onFieldHover: (fieldKey: string | null) => void;
}

/**
 * Left panel of the validation split view.
 * Shows structured representation of the ExtractionResult:
 * - Document metadata (type, confidence, timestamp)
 * - Field→value table with confidence badges
 * - OCR/plaintext block if available (Fase 3)
 */
export function DocumentExtractionPreview({
  extraction,
  docMeta,
  highlightedField,
  onFieldHover,
}: DocumentExtractionPreviewProps) {
  const classLevel = mapConfidenceToLevel(extraction.classificationConfidence);
  const fieldEntries = Object.entries(extraction.fields);

  return (
    <div className="flex flex-col gap-4">
      {/* Document info card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{docMeta.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Archivo</span>
            <span className="font-mono text-xs">{extraction.file}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tipo clasificado</span>
            <span>{extraction.documentType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Confianza clasificación</span>
            <Badge variant="outline" className={`text-xs ${confidenceBadgeClass(classLevel)}`}>
              {Math.round(extraction.classificationConfidence * 100)}%
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Procesado</span>
            <span className="text-xs">
              {extraction.processedAt
                ? new Date(extraction.processedAt).toLocaleString('es-CL')
                : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Structured extraction table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campos extraídos ({fieldEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {fieldEntries.map(([key, field]) => {
              const level = mapConfidenceToLevel(field.confidence);
              const isHighlighted = highlightedField === key;

              return (
                <div
                  key={key}
                  className={`flex items-start justify-between gap-2 py-2 transition-colors ${
                    isHighlighted ? 'bg-[var(--notary-accent)]/10 rounded px-2 -mx-2' : ''
                  }`}
                  onMouseEnter={() => onFieldHover(key)}
                  onMouseLeave={() => onFieldHover(null)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">{key}</span>
                    <span className="text-sm">{field.value || '—'}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${confidenceBadgeClass(level)}`}
                  >
                    {Math.round(field.confidence * 100)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* OCR/plaintext placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vista previa del documento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            La vista previa de imagen/PDF del documento original no está disponible en esta versión (MVP).
            Los datos mostrados arriba fueron extraídos automáticamente del documento &ldquo;{extraction.file}&rdquo;.
            La vista previa binaria se implementará en Fase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
