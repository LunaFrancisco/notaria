'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useContractStore, FIELD_LABEL_MAP } from '@/store/contract-store';
import { TEMPLATE_FIELD_PATHS } from './contract-template';
import {
  PLACEHOLDER_FOCUS_EVENT,
  dispatchSidebarItemClick,
} from '@/lib/events';
import type { PlaceholderFocusDetail } from '@/lib/events';
import {
  getFieldDocumentSlot,
  getSlotAbbreviation,
  getSlotColor,
} from '@/lib/canonical/field-source-map';
import { DocumentThumbnailStrip } from '@/components/documents/document-thumbnail-strip';
import { toast } from 'sonner';

/**
 * Groups template field paths by section for organized display.
 */
const FIELD_SECTIONS: { label: string; fields: string[] }[] = [
  {
    label: 'Tramite',
    fields: TEMPLATE_FIELD_PATHS.filter((f) => f.startsWith('tramite.')),
  },
  {
    label: 'Vendedor',
    fields: TEMPLATE_FIELD_PATHS.filter((f) => f.startsWith('vendedor.')),
  },
  {
    label: 'Comprador',
    fields: TEMPLATE_FIELD_PATHS.filter((f) => f.startsWith('comprador.')),
  },
  {
    label: 'Vehiculo',
    fields: TEMPLATE_FIELD_PATHS.filter((f) => f.startsWith('vehiculo.')),
  },
  {
    label: 'Negocio',
    fields: TEMPLATE_FIELD_PATHS.filter((f) => f.startsWith('negocio.')),
  },
  {
    label: 'Deuda alimentaria',
    fields: TEMPLATE_FIELD_PATHS.filter((f) => f.startsWith('deuda.')),
  },
];

/**
 * AccordionSidebar replaces ExtractedDataList with collapsible sections,
 * source badges, and a document thumbnail strip at the bottom.
 */
export function AccordionSidebar() {
  const fields = useContractStore((state) => state.fields);
  const openDocumentViewer = useContractStore((s) => s.openDocumentViewer);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // First section open by default
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 0: true });

  const toggleSection = useCallback((idx: number) => {
    setOpenSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  // Listen for placeholder focus events from contract editor
  useEffect(() => {
    function handlePlaceholderFocus(event: Event) {
      const { fieldPath } = (event as CustomEvent<PlaceholderFocusDetail>).detail;
      const itemEl = itemRefs.current[fieldPath];
      if (!itemEl) return;

      // Find which section this field belongs to and open it
      const sectionIdx = FIELD_SECTIONS.findIndex((s) =>
        s.fields.includes(fieldPath),
      );
      if (sectionIdx >= 0) {
        setOpenSections((prev) => ({ ...prev, [sectionIdx]: true }));
      }

      // Scroll sidebar item into view
      setTimeout(() => {
        itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);

      itemEl.dataset.highlighted = 'true';

      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        itemEl.dataset.highlighted = 'false';
      }, 2400);
    }

    window.addEventListener(PLACEHOLDER_FOCUS_EVENT, handlePlaceholderFocus);
    return () => {
      window.removeEventListener(PLACEHOLDER_FOCUS_EVENT, handlePlaceholderFocus);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const handleItemClick = useCallback((fieldPath: string) => {
    const label = FIELD_LABEL_MAP[fieldPath] ?? fieldPath;

    if (!TEMPLATE_FIELD_PATHS.includes(fieldPath)) {
      toast.info(`Campo "${label}" no esta mapeado en el contrato`);
      return;
    }

    dispatchSidebarItemClick(fieldPath);
  }, []);

  const handleSourceBadgeClick = useCallback(
    (e: React.MouseEvent, slotKey: string) => {
      e.stopPropagation();
      openDocumentViewer(slotKey);
    },
    [openDocumentViewer],
  );

  const filledCount = TEMPLATE_FIELD_PATHS.filter((fp) => {
    const f = fields[fp];
    return f?.value !== null && f?.value !== undefined && f.value !== '';
  }).length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Datos extraidos</h3>
        <Badge variant="secondary" className="text-xs">
          {filledCount}/{TEMPLATE_FIELD_PATHS.length}
        </Badge>
      </div>

      {/* Scrollable accordion sections */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {FIELD_SECTIONS.map((section, sectionIdx) => {
            const isOpen = !!openSections[sectionIdx];
            const sectionFilled = section.fields.filter((fp) => {
              const f = fields[fp];
              return f?.value !== null && f?.value !== undefined && f.value !== '';
            }).length;

            return (
              <div key={section.label} className="mb-1">
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggleSection(sectionIdx)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60"
                >
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                      isOpen && 'rotate-90',
                    )}
                  />
                  <span className="flex-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {sectionFilled}/{section.fields.length}
                  </Badge>
                </button>

                {/* Accordion content with CSS grid animation */}
                <div
                  className="accordion-content"
                  data-open={isOpen ? 'true' : 'false'}
                >
                  <div>
                    <div className="flex flex-col gap-0.5 py-1">
                      {section.fields.map((fieldPath) => {
                        const fieldState = fields[fieldPath];
                        const hasValue =
                          fieldState?.value !== null &&
                          fieldState?.value !== undefined &&
                          fieldState.value !== '';
                        const label = FIELD_LABEL_MAP[fieldPath] ?? fieldPath;
                        const displayValue = hasValue
                          ? fieldState.value!.length > 20
                            ? fieldState.value!.slice(0, 20) + '...'
                            : fieldState.value!
                          : '\u2014';
                        const slotKey = getFieldDocumentSlot(fieldPath);

                        return (
                          <button
                            key={fieldPath}
                            ref={(el) => {
                              itemRefs.current[fieldPath] = el;
                            }}
                            type="button"
                            data-sidebar-field={fieldPath}
                            data-highlighted="false"
                            onClick={() => handleItemClick(fieldPath)}
                            className="group flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-all hover:bg-muted/60 data-[highlighted=true]:border-l-4 data-[highlighted=true]:border-[var(--notary-accent)] data-[highlighted=true]:bg-[var(--notary-accent)]/10"
                          >
                            <div className="flex flex-col gap-0.5 overflow-hidden">
                              <span className="text-xs text-muted-foreground">
                                {label}
                              </span>
                              <span
                                className={
                                  hasValue
                                    ? 'truncate text-sm font-medium'
                                    : 'truncate text-sm text-muted-foreground/50 italic'
                                }
                              >
                                {displayValue}
                              </span>
                            </div>
                            {slotKey && (
                              <span
                                role="link"
                                tabIndex={-1}
                                onClick={(e) => handleSourceBadgeClick(e, slotKey)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSourceBadgeClick(e as unknown as React.MouseEvent, slotKey);
                                }}
                                title={`Ver documento: ${slotKey}`}
                                className="source-badge ml-2 flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-opacity hover:opacity-80"
                              >
                                <span className={cn('h-1.5 w-1.5 rounded-full', getSlotColor(slotKey))} />
                                <span className="text-muted-foreground">{getSlotAbbreviation(slotKey)}</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thumbnail strip at bottom */}
      <DocumentThumbnailStrip />
    </div>
  );
}
