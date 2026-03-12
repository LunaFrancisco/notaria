'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Scan,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { DropZone } from './drop-zone';
import { useContractStore, DOCUMENT_META, getDocumentTypeLabel } from '@/store/contract-store';
import type { DocumentProcessingState } from '@/lib/types';

// ---------------------------------------------------------------------------
// Document item component
// ---------------------------------------------------------------------------

interface DocumentItemProps {
  docKey: string;
  label: string;
  description: string;
  state: DocumentProcessingState | undefined;
  onRetry: (key: string) => void;
  onVerify: (key: string) => void;
}

function DocumentItem({
  docKey,
  label,
  description,
  state,
  onRetry,
  onVerify,
}: DocumentItemProps) {
  const status = state?.status ?? 'pending';

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="mt-0.5">
        {status === 'pending' && (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
        {status === 'processing' && <Spinner className="h-5 w-5" />}
        {status === 'uploaded' && (
          <CheckCircle2 className="h-5 w-5 text-notary-confidence-high" />
        )}
        {status === 'error' && (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{label}</span>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {state?.file && (
          <p className="text-xs text-muted-foreground/70 mt-1 truncate">
            {state.file.name}
          </p>
        )}
        {status === 'error' && state?.error && (
          <p className="text-xs text-destructive mt-1">{state.error}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          {status === 'error' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onRetry(docKey)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Reintentar
            </Button>
          )}
          {status === 'uploaded' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onVerify(docKey)}
            >
              <Eye className="mr-1 h-3 w-3" />
              Verificar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          Pendiente
        </Badge>
      );
    case 'processing':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-200">
          Procesando
        </Badge>
      );
    case 'uploaded':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-notary-confidence-high/10 text-notary-confidence-high border-notary-confidence-high/20">
          Completado
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          Error
        </Badge>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main DocumentPanel
// ---------------------------------------------------------------------------

export function DocumentPanel() {
  const router = useRouter();
  const documents = useContractStore((s) => s.documents);
  const isProcessing = useContractStore((s) => s.isProcessing);
  const isClassifying = useContractStore((s) => s.isClassifying);
  const classifyAndAssignFiles = useContractStore((s) => s.classifyAndAssignFiles);
  const processDocument = useContractStore((s) => s.processDocument);
  const processAllDocuments = useContractStore((s) => s.processAllDocuments);

  // Count uploaded documents
  const uploadedCount = Object.values(documents).filter(
    (d) => d.status === 'uploaded',
  ).length;
  const totalRequired = DOCUMENT_META.length;
  const completionPercent = Math.round((uploadedCount / totalRequired) * 100);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const toastId = toast.loading(
        `Clasificando ${files.length} documento${files.length > 1 ? 's' : ''}...`,
        { icon: <Scan className="h-4 w-4 animate-pulse" /> },
      );

      const results = await classifyAndAssignFiles(files);

      toast.dismiss(toastId);

      for (const result of results) {
        if (result.assignedSlot) {
          const typeLabel = getDocumentTypeLabel(result.classification.documentType);
          const slotMeta = DOCUMENT_META.find((m) => m.key === result.assignedSlot);
          const confidence = Math.round(result.classification.confidence * 100);
          toast.success(
            `${result.file.name} → ${slotMeta?.label ?? result.assignedSlot} (${typeLabel}, ${confidence}%)`,
          );
        } else {
          toast.error(`No se pudo asignar: ${result.file.name}`);
        }
      }

      // Auto-process all pending documents after classification
      const hasPending = Object.values(useContractStore.getState().documents).some(
        (d) => d.status === 'pending',
      );
      if (hasPending) {
        const processToastId = toast.loading('Procesando documentos...');
        await processAllDocuments();
        toast.dismiss(processToastId);

        const state = useContractStore.getState();
        const errors = Object.values(state.documents).filter(
          (d) => d.status === 'error',
        );
        if (errors.length > 0) {
          toast.error(
            `${errors.length} documento(s) con errores. Revise y reintente.`,
          );
        } else {
          toast.success('Todos los documentos procesados correctamente');
        }
      }
    },
    [classifyAndAssignFiles, processAllDocuments],
  );

  const handleRetry = useCallback(
    async (key: string) => {
      const toastId = toast.loading('Reintentando procesamiento...');
      await processDocument(key);
      const doc = useContractStore.getState().documents[key];
      if (doc?.status === 'error') {
        toast.error(doc.error ?? 'Error al procesar documento', { id: toastId });
      } else {
        toast.success('Documento procesado correctamente', { id: toastId });
      }
    },
    [processDocument],
  );

  const handleVerify = useCallback(
    (key: string) => {
      router.push(`/tramite/compraventa-vehiculo/validacion?doc=${encodeURIComponent(key)}`);
    },
    [router],
  );

  const handleProcessAll = useCallback(async () => {
    const toastId = toast.loading('Procesando documentos...');
    await processAllDocuments();
    toast.dismiss(toastId);
    const state = useContractStore.getState();
    const errors = Object.values(state.documents).filter(
      (d) => d.status === 'error',
    );
    if (errors.length > 0) {
      toast.error(
        `${errors.length} documento(s) con errores. Revise y reintente.`,
      );
    } else {
      toast.success('Todos los documentos procesados correctamente');
    }
  }, [processAllDocuments]);

  const hasPendingDocs = Object.values(documents).some(
    (d) => d.status === 'pending',
  );
  const isBusy = isProcessing || isClassifying;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Documentos</h2>
          <Badge variant="secondary" className="text-xs">
            {uploadedCount}/{totalRequired}
          </Badge>
        </div>
        {hasPendingDocs && (
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleProcessAll}
            disabled={isBusy}
          >
            {isProcessing ? (
              <>
                <Spinner className="mr-1 h-3 w-3" />
                Procesando
              </>
            ) : (
              'Procesar todo'
            )}
          </Button>
        )}
      </div>

      {/* Document list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          <DropZone
            onFilesSelected={handleFilesSelected}
            disabled={isBusy}
          />

          <Separator />

          {DOCUMENT_META.map((meta) => (
            <DocumentItem
              key={meta.key}
              docKey={meta.key}
              label={meta.label}
              description={meta.description}
              state={documents[meta.key]}
              onRetry={handleRetry}
              onVerify={handleVerify}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer with progress */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Completitud del expediente</span>
          <span>{completionPercent}%</span>
        </div>
        <Progress value={completionPercent} className="h-2" />
      </div>
    </div>
  );
}

