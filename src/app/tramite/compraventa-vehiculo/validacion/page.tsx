'use client';

import { useMemo, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Scale } from 'lucide-react';

import { toast } from 'sonner';

import { useContractStore, DOCUMENT_META } from '@/store/contract-store';
import { DocumentExtractionPreview } from '@/components/validation/document-extraction-preview';
import { DocumentFieldEditor } from '@/components/validation/document-field-editor';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Validation split-view page.
 * Route: /tramite/compraventa-vehiculo/validacion?doc=certificado_rvm
 *
 * Shows per-document extraction preview (left) and editable fields (right).
 * Mobile: Tabs to alternate between panels.
 */
export default function ValidacionPage() {
  return (
    <Suspense>
      <ValidacionPageContent />
    </Suspense>
  );
}

function ValidacionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docParam = searchParams.get('doc');

  const documents = useContractStore((s) => s.documents);

  // Documents with successful extractions
  const uploadedDocs = useMemo(() => {
    return DOCUMENT_META.filter((meta) => {
      const doc = documents[meta.key];
      return doc?.status === 'uploaded' && doc.extractionResult;
    });
  }, [documents]);

  const [activeDocKey, setActiveDocKey] = useState<string>(
    docParam ?? uploadedDocs[0]?.key ?? '',
  );

  // Find the extraction for the active document
  const activeExtraction = useMemo(() => {
    const doc = documents[activeDocKey];
    if (!doc?.extractionResult) return null;
    return doc.extractionResult;
  }, [documents, activeDocKey]);

  const activeDocMeta = useMemo(() => {
    return DOCUMENT_META.find((m) => m.key === activeDocKey) ?? null;
  }, [activeDocKey]);

  // Highlighted field for bidirectional highlighting
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  const handleFieldHighlight = useCallback((fieldKey: string | null) => {
    setHighlightedField(fieldKey);
  }, []);

  const handleConfirmAndReturn = useCallback(() => {
    toast.success('Campos confirmados');
    router.push('/tramite/compraventa-vehiculo');
  }, [router]);

  // Mobile panel tab state
  const [mobilePanel, setMobilePanel] = useState<string>('preview');

  if (uploadedDocs.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">
          No hay documentos procesados para validar.
        </p>
        <Button onClick={() => router.push('/tramite/compraventa-vehiculo')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al workspace
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-[var(--notary-parchment)] px-4 py-3 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/tramite/compraventa-vehiculo')}
          aria-label="Volver al workspace"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Scale className="h-5 w-5 text-[var(--notary-accent)]" />
        <span className="text-sm font-semibold">Validación de documentos</span>
        <div className="flex-1" />
        <Button size="sm" onClick={handleConfirmAndReturn}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Confirmar y Volver
        </Button>
      </header>

      {/* Document selector tabs */}
      <div className="border-b bg-background px-4 py-2">
        <Tabs value={activeDocKey} onValueChange={setActiveDocKey}>
          <TabsList>
            {uploadedDocs.map((meta) => (
              <TabsTrigger key={meta.key} value={meta.key}>
                {meta.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {activeExtraction && activeDocMeta ? (
        <>
          {/* Desktop: side-by-side split view */}
          <div className="hidden flex-1 md:flex">
            <ScrollArea className="flex-1 border-r">
              <div className="p-4 md:p-6">
                <DocumentExtractionPreview
                  extraction={activeExtraction}
                  docMeta={activeDocMeta}
                  highlightedField={highlightedField}
                  onFieldHover={handleFieldHighlight}
                />
              </div>
            </ScrollArea>
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-6">
                <DocumentFieldEditor
                  extraction={activeExtraction}
                  docKey={activeDocKey}
                  highlightedField={highlightedField}
                  onFieldHover={handleFieldHighlight}
                />
              </div>
            </ScrollArea>
          </div>

          {/* Mobile: Tab toggle between panels */}
          <div className="flex flex-1 flex-col md:hidden">
            <div className="border-b px-4 py-2">
              <Tabs value={mobilePanel} onValueChange={setMobilePanel}>
                <TabsList className="w-full">
                  <TabsTrigger value="preview" className="flex-1">
                    Datos extraídos
                  </TabsTrigger>
                  <TabsTrigger value="fields" className="flex-1">
                    Editar campos
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 sm:p-4">
                {mobilePanel === 'preview' ? (
                  <DocumentExtractionPreview
                    extraction={activeExtraction}
                    docMeta={activeDocMeta}
                    highlightedField={highlightedField}
                    onFieldHover={handleFieldHighlight}
                  />
                ) : (
                  <DocumentFieldEditor
                    extraction={activeExtraction}
                    docKey={activeDocKey}
                    highlightedField={highlightedField}
                    onFieldHover={handleFieldHighlight}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-muted-foreground">
            Seleccione un documento procesado para revisar.
          </p>
        </div>
      )}
    </div>
  );
}
