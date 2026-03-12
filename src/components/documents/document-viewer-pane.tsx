'use client';

import { useMemo } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContractStore, DOCUMENT_META } from '@/store/contract-store';

const ZOOM_LEVELS = [
  { label: 'Ajustar', scale: 1 },
  { label: 'Mediano', scale: 1.5 },
  { label: 'Completo', scale: 2 },
];

/**
 * Split-pane document viewer.
 * Takes up 45% of the main area when a document is selected.
 */
export function DocumentViewerPane() {
  const activeDocumentKey = useContractStore((s) => s.activeDocumentKey);
  const viewerZoom = useContractStore((s) => s.viewerZoom);
  const documents = useContractStore((s) => s.documents);
  const closeDocumentViewer = useContractStore((s) => s.closeDocumentViewer);
  const setViewerZoom = useContractStore((s) => s.setViewerZoom);

  const doc = activeDocumentKey ? documents[activeDocumentKey] : null;
  const meta = DOCUMENT_META.find((m) => m.key === activeDocumentKey);

  const docFile = doc?.file ?? null;
  const objectUrl = useMemo(() => {
    if (!docFile) return null;
    return URL.createObjectURL(docFile);
  }, [docFile]);

  if (!activeDocumentKey || !doc?.file) return null;

  const isImage = doc.file.type.startsWith('image/');
  const isPdf = doc.file.type === 'application/pdf';
  const zoomScale = ZOOM_LEVELS[viewerZoom]?.scale ?? 1;

  const handleZoomIn = () => {
    setViewerZoom(Math.min(viewerZoom + 1, ZOOM_LEVELS.length - 1));
  };

  const handleZoomOut = () => {
    setViewerZoom(Math.max(viewerZoom - 1, 0));
  };

  return (
    <div className="viewer-pane flex h-full flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
        <span className="truncate text-sm font-medium text-zinc-200">
          {meta?.label ?? activeDocumentKey}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
            onClick={handleZoomOut}
            disabled={viewerZoom <= 0}
            title="Reducir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[4ch] text-center text-xs text-zinc-400">
            {ZOOM_LEVELS[viewerZoom]?.label}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
            onClick={handleZoomIn}
            disabled={viewerZoom >= ZOOM_LEVELS.length - 1}
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
            onClick={closeDocumentViewer}
            title="Cerrar visor"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isImage && objectUrl && (
          <div className="flex items-start justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, next/image can't optimize */}
            <img
              src={objectUrl}
              alt={meta?.label ?? 'Documento'}
              className="max-w-full rounded-md object-contain transition-transform duration-300"
              style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
            />
          </div>
        )}
        {isPdf && objectUrl && (
          <iframe
            src={objectUrl}
            title={meta?.label ?? 'Documento PDF'}
            className="h-full w-full rounded-md border-0"
            style={{ minHeight: '500px' }}
          />
        )}
        {!isImage && !isPdf && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Formato no soportado para previsualización
          </div>
        )}
      </div>
    </div>
  );
}
