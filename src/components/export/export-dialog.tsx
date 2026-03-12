'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  FileText,
  FileDown,
  Printer,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useContractStore, FIELD_LABEL_MAP } from '@/store/contract-store';
import { dispatchSidebarItemClick } from '@/components/contract/extracted-data-list';
import { logger } from '@/lib/logger';

/** Minimum readiness threshold (fraction) to allow export */
const MIN_READINESS_THRESHOLD = 0.15;

/** Essential fields that must be filled for export to be allowed */
const ESSENTIAL_FIELDS = [
  'vendedor.nombre',
  'vendedor.rut',
  'comprador.nombre',
  'comprador.rut',
];

interface ExportDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ExportDialog({ trigger, open: controlledOpen, onOpenChange }: ExportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback((v: boolean) => {
    (onOpenChange ?? setInternalOpen)(v);
  }, [onOpenChange]);
  const [isExporting, setIsExporting] = useState(false);
  const validationResult = useContractStore((s) => s.validationResult);
  const fields = useContractStore((s) => s.fields);

  // Check export eligibility
  const exportCheck = useMemo(() => {
    const missingEssential = ESSENTIAL_FIELDS.filter((fp) => {
      const f = fields[fp];
      return !f?.value;
    });

    const readiness = validationResult?.completeness.readiness ?? 0;
    const belowThreshold = readiness < MIN_READINESS_THRESHOLD;

    const blocked = missingEssential.length > 0 || belowThreshold;

    const errorCount = validationResult?.issues.filter((i) => i.severity === 'error').length ?? 0;
    const warningCount = validationResult?.issues.filter((i) => i.severity === 'warning').length ?? 0;

    return { blocked, missingEssential, readiness, belowThreshold, errorCount, warningCount };
  }, [fields, validationResult]);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const contractEl = document.querySelector('.contract-editor-content');
      if (!contractEl) {
        toast.error('No se encontró el contenido del contrato');
        return;
      }

      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: 'contrato-compraventa-vehiculo.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
        })
        .from(contractEl)
        .save();

      logger.info('export:completed', { format: 'pdf' });
      toast.success('PDF exportado correctamente');
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error generando PDF';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, [setOpen]);

  const handleExportHtml = useCallback(() => {
    const contractEl = document.querySelector('.contract-editor-content');
    if (!contractEl) {
      toast.error('No se encontró el contenido del contrato');
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato de Compraventa de Vehículo</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; line-height: 2; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
    h2 { text-align: center; }
  </style>
</head>
<body>
${contractEl.innerHTML}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contrato-compraventa-vehiculo.html';
    a.click();
    URL.revokeObjectURL(url);

    logger.info('export:completed', { format: 'html' });
    toast.success('HTML exportado correctamente');
    setOpen(false);
  }, [setOpen]);

  const handlePrint = useCallback(() => {
    logger.info('export:completed', { format: 'print' });
    window.print();
    setOpen(false);
  }, [setOpen]);

  const handleNavigateToField = useCallback((fieldPath: string) => {
    setOpen(false);
    setTimeout(() => {
      dispatchSidebarItemClick(fieldPath);
    }, 300);
  }, [setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar contrato</DialogTitle>
          <DialogDescription>
            Seleccione el formato de exportación del contrato.
          </DialogDescription>
        </DialogHeader>

        {/* Validation summary */}
        {exportCheck.blocked && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Exportación bloqueada</AlertTitle>
            <AlertDescription>
              {exportCheck.missingEssential.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs">Faltan datos esenciales:</p>
                  <ul className="mt-1 space-y-1">
                    {exportCheck.missingEssential.map((fp) => (
                      <li key={fp}>
                        <button
                          type="button"
                          className="text-xs underline hover:no-underline"
                          onClick={() => handleNavigateToField(fp)}
                        >
                          {FIELD_LABEL_MAP[fp] ?? fp}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {exportCheck.belowThreshold && (
                <p className="mt-1 text-xs">
                  Preparación del expediente: {Math.round(exportCheck.readiness * 100)}% (mínimo requerido: {Math.round(MIN_READINESS_THRESHOLD * 100)}%)
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!exportCheck.blocked && exportCheck.errorCount > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {exportCheck.errorCount} error{exportCheck.errorCount > 1 ? 'es' : ''} de validación
            </AlertTitle>
            <AlertDescription>
              <p className="text-xs">
                Se recomienda revisar los errores antes de exportar, pero la exportación no está bloqueada.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {!exportCheck.blocked && exportCheck.errorCount === 0 && exportCheck.warningCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4 text-[var(--notary-confidence-medium)]" />
            <AlertTitle>
              {exportCheck.warningCount} advertencia{exportCheck.warningCount > 1 ? 's' : ''}
            </AlertTitle>
            <AlertDescription>
              <p className="text-xs">Revise las advertencias si lo desea.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Export format cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card
            className={`cursor-pointer transition-colors hover:bg-muted/60 ${exportCheck.blocked ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={exportCheck.blocked ? undefined : handleExportPdf}
          >
            <CardContent className="flex flex-col items-center gap-2 p-4">
              {isExporting ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <FileDown className="h-8 w-8 text-red-500" />
              )}
              <span className="text-xs font-medium">PDF</span>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors hover:bg-muted/60 ${exportCheck.blocked ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={exportCheck.blocked ? undefined : handleExportHtml}
          >
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <FileText className="h-8 w-8 text-blue-500" />
              <span className="text-xs font-medium">HTML</span>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors hover:bg-muted/60 ${exportCheck.blocked ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={exportCheck.blocked ? undefined : handlePrint}
          >
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <Printer className="h-8 w-8 text-gray-500" />
              <span className="text-xs font-medium">Imprimir</span>
            </CardContent>
          </Card>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
