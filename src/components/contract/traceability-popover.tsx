'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Clock,
  Shield,
  Pencil,
  X,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useContractStore, FIELD_LABEL_MAP } from '@/store/contract-store';
import type { CanonicalFieldState, FieldEditEntry } from '@/lib/types/canonical';

interface PopoverPosition {
  top: number;
  left: number;
}

interface TraceabilityPopoverState {
  fieldPath: string;
  position: PopoverPosition;
}

function confidenceBadgeClass(level: string): string {
  switch (level) {
    case 'high':
      return 'border-[var(--notary-confidence-high)] text-[var(--notary-confidence-high)]';
    case 'medium':
      return 'border-[var(--notary-confidence-medium)] text-[var(--notary-confidence-medium)]';
    case 'low':
      return 'border-[var(--notary-confidence-low)] text-[var(--notary-confidence-low)]';
    default:
      return '';
  }
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function confidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function EditHistorySection({ entry }: { entry: FieldEditEntry }) {
  return (
    <div className="rounded-md border border-muted p-2 text-xs space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatTimestamp(entry.editedAt)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Valor anterior: </span>
        <span className="line-through">
          {entry.previousValue ?? '(vacío)'}
        </span>
      </div>
      {entry.previousConfidence !== null && (
        <div>
          <span className="text-muted-foreground">Confianza previa: </span>
          <span>{confidencePercent(entry.previousConfidence)}</span>
        </div>
      )}
      <div>
        <span className="text-muted-foreground">Origen: </span>
        <span>{entry.previousSource === 'extracted' ? 'Extraído' : 'Manual'}</span>
      </div>
    </div>
  );
}

function PopoverPanel({
  fieldPath,
  fieldState,
  position,
  onClose,
  onEdit,
}: {
  fieldPath: string;
  fieldState: CanonicalFieldState;
  position: PopoverPosition;
  onClose: () => void;
  onEdit: () => void;
}) {
  const label = FIELD_LABEL_MAP[fieldPath] ?? fieldPath;
  const trace = fieldState.traceability;
  const hasEditHistory = fieldState.editHistory.length > 0;

  return (
    <div
      className="fixed z-[100] w-80 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">
            {fieldState.value ?? '(sin valor)'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className={confidenceBadgeClass(fieldState.confidenceLevel)}
          >
            {confidencePercent(fieldState.confidence)}
          </Badge>
          <button
            onClick={onClose}
            className="rounded-sm p-0.5 hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Separator />

      {/* Source document */}
      {trace ? (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Documento fuente
          </p>
          <div className="text-xs space-y-0.5 pl-5">
            <div>
              <span className="text-muted-foreground">Archivo: </span>
              <span className="font-medium">{trace.filename}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo: </span>
              <span>{trace.documentType}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Confianza clasificación: </span>
              <span>{confidencePercent(trace.classificationConfidence)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Procesado: </span>
              <span>{formatTimestamp(trace.processedAt)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          {fieldState.source === 'manual'
            ? 'Campo ingresado manualmente'
            : 'Sin trazabilidad disponible'}
        </div>
      )}

      <Separator className="my-2" />

      {/* Evidence / extraction info */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          Evidencia
        </p>
        {trace ? (
          <div className="text-xs pl-5 space-y-0.5">
            <div>
              <span className="text-muted-foreground">Campo extraído: </span>
              <span>{trace.sourceFieldKey}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Valor: </span>
              <span className="font-medium">{fieldState.value ?? '(vacío)'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Confianza: </span>
              <span>{confidencePercent(fieldState.confidence)}</span>
            </div>
            {trace.evidence ? (
              <div className="mt-1 rounded bg-muted/50 p-1.5 text-[11px] leading-relaxed">
                <span className="text-muted-foreground">Texto OCR: </span>
                {trace.evidence}
              </div>
            ) : (
              <p className="text-muted-foreground italic mt-1">
                Evidencia OCR raw no disponible en MVP
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pl-5 italic">
            No disponible para campos manuales
          </p>
        )}
      </div>

      {/* Edit history */}
      {hasEditHistory && (
        <>
          <Separator className="my-2" />
          <div className="space-y-1.5">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Historial de ediciones
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {fieldState.editHistory.map((entry, idx) => (
                <EditHistorySection key={idx} entry={entry} />
              ))}
            </div>
          </div>
        </>
      )}

      <Separator className="my-2" />

      {/* Footer */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook that provides traceability popover state and handlers.
 *
 * The popover is triggered on filled placeholders only (not during editing).
 * When a placeholder has no value, click goes to inline editing instead.
 */
export function useTraceabilityPopover() {
  const [popoverState, setPopoverState] = useState<TraceabilityPopoverState | null>(null);
  const [editRequest, setEditRequest] = useState<string | null>(null);
  const fields = useContractStore((state) => state.fields);

  const openPopover = useCallback((fieldPath: string, anchorEl: HTMLElement) => {
    const rect = anchorEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const popoverWidth = 320;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 8) left = 8;
    if (left + popoverWidth > viewportWidth - 8) left = viewportWidth - popoverWidth - 8;

    setPopoverState({
      fieldPath,
      position: {
        top: rect.bottom + 8,
        left,
      },
    });
  }, []);

  const closePopover = useCallback(() => {
    setPopoverState(null);
  }, []);

  const consumeEditRequest = useCallback(() => {
    const req = editRequest;
    setEditRequest(null);
    return req;
  }, [editRequest]);

  const renderPopover = useCallback(
    () => {
      if (!popoverState) return null;

      const fieldState = fields[popoverState.fieldPath];
      if (!fieldState) return null;

      return createPortal(
        <>
          <div
            className="fixed inset-0 z-[99]"
            onClick={closePopover}
          />
          <PopoverPanel
            fieldPath={popoverState.fieldPath}
            fieldState={fieldState}
            position={popoverState.position}
            onClose={closePopover}
            onEdit={() => {
              const fp = popoverState.fieldPath;
              closePopover();
              setEditRequest(fp);
            }}
          />
        </>,
        document.body,
      );
    },
    [popoverState, fields, closePopover],
  );

  return { popoverState, openPopover, closePopover, renderPopover, editRequest, consumeEditRequest };
}
