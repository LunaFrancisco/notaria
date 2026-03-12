'use client';

import { useState } from 'react';
import { FileText, List } from 'lucide-react';

import { ContractEditor } from '@/components/contract/contract-editor';
import { ExtractedDataList } from '@/components/contract/extracted-data-list';
import { DocumentPanel } from '@/components/documents/document-panel';
import { ServiceInitializer } from '@/components/documents/service-initializer';
import { ValidationAlerts } from '@/components/validation/validation-alerts';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function CompraventaVehiculoWorkspace() {
  const [docsSheetOpen, setDocsSheetOpen] = useState(false);
  const [dataSheetOpen, setDataSheetOpen] = useState(false);

  return (
    <>
      <ServiceInitializer />
      <div className="flex min-h-screen flex-col">
        <WorkspaceHeader />
        <div className="flex flex-1">
        {/* Desktop: extracted data sidebar (left) */}
        <aside className="hidden xl:flex w-[280px] border-r bg-background">
          <ExtractedDataList />
        </aside>

        {/* Main content area */}
        <main className="flex-1 min-w-0 px-4 py-6 md:px-8">
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="mx-auto max-w-4xl overflow-x-hidden">
              <ContractEditor />
              <div className="mt-6">
                <ValidationAlerts />
              </div>
            </div>
          </ScrollArea>
        </main>

        {/* Desktop: fixed right panel */}
        <aside className="hidden lg:flex w-auto border-l bg-background">
          <DocumentPanel />
        </aside>

        {/* Mobile: floating action buttons */}
        <div className="fixed bottom-4 left-4 xl:hidden z-40">
          <Sheet open={dataSheetOpen} onOpenChange={setDataSheetOpen}>
            <SheetTrigger
              render={
                <Button size="lg" className="rounded-full shadow-lg h-14 w-14">
                  <List className="h-6 w-6" />
                  <span className="sr-only">Datos extraídos</span>
                </Button>
              }
            />
            <SheetContent side="left" className="w-[300px] sm:w-[320px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Datos extraídos</SheetTitle>
              </SheetHeader>
              <ExtractedDataList />
            </SheetContent>
          </Sheet>
        </div>

        <div className="fixed bottom-4 right-4 lg:hidden z-40">
          <Sheet open={docsSheetOpen} onOpenChange={setDocsSheetOpen}>
            <SheetTrigger
              render={
                <Button size="lg" className="rounded-full shadow-lg h-14 w-14">
                  <FileText className="h-6 w-6" />
                  <span className="sr-only">Documentos</span>
                </Button>
              }
            />
            <SheetContent side="right" className="w-[340px] sm:w-[380px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Panel de documentos</SheetTitle>
              </SheetHeader>
              <DocumentPanel />
            </SheetContent>
          </Sheet>
        </div>
        </div>
      </div>
    </>
  );
}
