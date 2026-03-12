'use client';

import { useCallback } from 'react';
import { Scan } from 'lucide-react';
import { createElement } from 'react';
import { toast } from 'sonner';
import { useContractStore, DOCUMENT_META, getDocumentTypeLabel } from '@/store/contract-store';

/**
 * Hook extracting document upload/classify/process logic from DocumentPanel.
 * Used by the thumbnail strip and any component that handles file uploads.
 */
export function useDocumentUpload() {
  const isProcessing = useContractStore((s) => s.isProcessing);
  const isClassifying = useContractStore((s) => s.isClassifying);
  const classifyAndAssignFiles = useContractStore((s) => s.classifyAndAssignFiles);
  const processDocument = useContractStore((s) => s.processDocument);
  const processAllDocuments = useContractStore((s) => s.processAllDocuments);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const toastId = toast.loading(
        `Clasificando ${files.length} documento${files.length > 1 ? 's' : ''}...`,
        { icon: createElement(Scan, { className: 'h-4 w-4 animate-pulse' }) },
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

  const isBusy = isProcessing || isClassifying;

  return { handleFilesSelected, handleRetry, handleProcessAll, isBusy };
}
