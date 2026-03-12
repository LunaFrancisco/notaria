'use client';

import { useState } from 'react';
import { List } from 'lucide-react';

import { ContractEditor } from '@/components/contract/contract-editor';
import { AccordionSidebar } from '@/components/contract/accordion-sidebar';
import { DocumentViewerPane } from '@/components/documents/document-viewer-pane';
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
import { useContractStore } from '@/store/contract-store';

export function CompraventaVehiculoWorkspace() {
  const [sidebarSheetOpen, setSidebarSheetOpen] = useState(false);
  const activeDocumentKey = useContractStore((s) => s.activeDocumentKey);

  return (
    <>
      <ServiceInitializer />
      <div className="flex min-h-screen flex-col">
        <WorkspaceHeader />
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop sidebar (fixed 300px) */}
          <aside className="hidden lg:flex w-[300px] shrink-0 border-r bg-background">
            <div className="flex h-[calc(100vh-52px)] w-full flex-col">
              <AccordionSidebar />
            </div>
          </aside>

          {/* Main area: viewer + contract */}
          <div className="flex flex-1 min-w-0">
            {/* Document viewer pane (45% when active) */}
            {activeDocumentKey && (
              <div className="viewer-pane hidden md:flex w-[45%] shrink-0 border-r">
                <div className="h-[calc(100vh-52px)] w-full">
                  <DocumentViewerPane />
                </div>
              </div>
            )}

            {/* Contract editor area */}
            <main className="flex-1 min-w-0">
              <ScrollArea className="h-[calc(100vh-52px)]">
                <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
                  <ContractEditor />
                  <div className="mt-6">
                    <ValidationAlerts />
                  </div>
                </div>
              </ScrollArea>
            </main>
          </div>

          {/* Mobile: floating sidebar button */}
          <div className="fixed bottom-4 left-4 lg:hidden z-40">
            <Sheet open={sidebarSheetOpen} onOpenChange={setSidebarSheetOpen}>
              <SheetTrigger
                render={
                  <Button size="lg" className="rounded-full shadow-lg h-14 w-14">
                    <List className="h-6 w-6" />
                    <span className="sr-only">Datos extraidos</span>
                  </Button>
                }
              />
              <SheetContent side="left" className="w-[300px] sm:w-[320px] p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Datos extraidos</SheetTitle>
                </SheetHeader>
                <AccordionSidebar />
              </SheetContent>
            </Sheet>
          </div>

          {/* Mobile: document viewer as sheet overlay */}
          {activeDocumentKey && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="h-full w-full">
                <DocumentViewerPane />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
