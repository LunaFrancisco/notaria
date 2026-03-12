'use client';

import { useMemo } from 'react';
import { FileText, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContractStore, DOCUMENT_META } from '@/store/contract-store';
import { DropZone } from './drop-zone';
import { useDocumentUpload } from './use-document-upload';

/** Abbreviations for thumbnail labels. */
const SLOT_ABBR: Record<string, string> = {
  certificado_rvm: 'RVM',
  permiso_circulacion: 'P.Circ',
  deuda_alimentaria_vendedor: 'D.A.V',
  deuda_alimentaria_comprador: 'D.A.C',
  cedula_identidad_vendedor: 'C.I.V',
  cedula_identidad_comprador: 'C.I.C',
};

/**
 * Horizontal scrollable strip of document thumbnails.
 * Shows each document slot as a 56x72 thumbnail.
 * Includes a drop zone for uploading new documents.
 */
export function DocumentThumbnailStrip() {
  const documents = useContractStore((s) => s.documents);
  const activeDocumentKey = useContractStore((s) => s.activeDocumentKey);
  const openDocumentViewer = useContractStore((s) => s.openDocumentViewer);
  const { handleFilesSelected, isBusy } = useDocumentUpload();

  const thumbnailUrls = useMemo(() => {
    const urls: Record<string, string | null> = {};
    for (const meta of DOCUMENT_META) {
      const doc = documents[meta.key];
      if (doc?.file && doc.file.type.startsWith('image/')) {
        urls[meta.key] = URL.createObjectURL(doc.file);
      } else {
        urls[meta.key] = null;
      }
    }
    return urls;
  }, [documents]);

  return (
    <div className="border-t px-3 py-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Documentos
      </p>
      <div className="thumbnail-strip flex gap-2 overflow-x-auto pb-1">
        {DOCUMENT_META.map((meta) => {
          const doc = documents[meta.key];
          const hasFfile = !!doc?.file;
          const isActive = activeDocumentKey === meta.key;
          const isPdf = doc?.file?.type === 'application/pdf';
          const thumbUrl = thumbnailUrls[meta.key];
          const abbr = SLOT_ABBR[meta.key] ?? meta.key.slice(0, 3).toUpperCase();

          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => openDocumentViewer(meta.key)}
              title={meta.label}
              className={cn(
                'thumbnail-item group relative flex shrink-0 flex-col items-center justify-center rounded-md transition-all',
                'h-[72px] w-[56px]',
                hasFfile
                  ? 'border bg-muted/30 hover:bg-muted/60'
                  : 'border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50',
                isActive && 'ring-2 ring-[var(--notary-accent)] ring-offset-1',
              )}
            >
              {hasFfile ? (
                thumbUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={thumbUrl}
                    alt={meta.label}
                    className="h-full w-full rounded-md object-cover"
                  />
                ) : isPdf ? (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <FileImage className="h-5 w-5 text-muted-foreground" />
                )
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground/50" />
              )}
              <span className="absolute -bottom-0.5 left-0 right-0 truncate text-center text-[8px] font-medium text-muted-foreground">
                {abbr}
              </span>
              {doc?.status === 'uploaded' && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--notary-confidence-high)]" />
              )}
              {doc?.status === 'error' && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
              )}
              {doc?.status === 'processing' && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2">
        <DropZone onFilesSelected={handleFilesSelected} disabled={isBusy} />
      </div>
    </div>
  );
}
