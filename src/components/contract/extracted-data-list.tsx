'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useContractStore, FIELD_LABEL_MAP } from '@/store/contract-store';
import { TEMPLATE_FIELD_PATHS } from './contract-template';
import { toast } from 'sonner';

/**
 * Groups template field paths by section for organized display.
 */
const FIELD_SECTIONS: { label: string; fields: string[] }[] = [
  {
    label: 'Trámite',
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
    label: 'Vehículo',
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

/** Custom event dispatched when a sidebar item is clicked, to scroll the contract editor. */
export const SIDEBAR_ITEM_CLICK_EVENT = 'notaryflow:sidebar-item-click';
/** Custom event dispatched when a contract placeholder is clicked, to highlight the sidebar. */
export const PLACEHOLDER_FOCUS_EVENT = 'notaryflow:placeholder-focus';

interface SidebarItemClickDetail {
  fieldPath: string;
}

interface PlaceholderFocusDetail {
  fieldPath: string;
}

export function dispatchSidebarItemClick(fieldPath: string): void {
  window.dispatchEvent(
    new CustomEvent<SidebarItemClickDetail>(SIDEBAR_ITEM_CLICK_EVENT, {
      detail: { fieldPath },
    }),
  );
}

export function dispatchPlaceholderFocus(fieldPath: string): void {
  window.dispatchEvent(
    new CustomEvent<PlaceholderFocusDetail>(PLACEHOLDER_FOCUS_EVENT, {
      detail: { fieldPath },
    }),
  );
}

function confidenceBadgeClasses(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'border-[var(--notary-confidence-high)] text-[var(--notary-confidence-high)]';
    case 'medium':
      return 'border-[var(--notary-confidence-medium)] text-[var(--notary-confidence-medium)]';
    case 'low':
      return 'border-[var(--notary-confidence-low)] text-[var(--notary-confidence-low)]';
  }
}

/**
 * ExtractedDataList renders all contract fields grouped by section.
 * Supports bidirectional click-to-scroll navigation with the contract editor.
 */
export function ExtractedDataList() {
  const fields = useContractStore((state) => state.fields);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for placeholder focus events from contract editor → highlight sidebar item
  useEffect(() => {
    function handlePlaceholderFocus(event: Event) {
      const { fieldPath } = (event as CustomEvent<PlaceholderFocusDetail>).detail;
      const itemEl = itemRefs.current[fieldPath];
      if (!itemEl) return;

      // Scroll sidebar item into view
      itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add highlight class
      itemEl.dataset.highlighted = 'true';

      // Remove after 2.4s
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

  const handleItemClick = useCallback(
    (fieldPath: string) => {
      const label = FIELD_LABEL_MAP[fieldPath] ?? fieldPath;

      // Check if this field exists in the contract template
      if (!TEMPLATE_FIELD_PATHS.includes(fieldPath)) {
        toast.info(`Campo "${label}" no está mapeado en el contrato`);
        return;
      }

      // Dispatch event for contract editor to scroll to placeholder
      dispatchSidebarItemClick(fieldPath);
    },
    [],
  );

  const filledCount = TEMPLATE_FIELD_PATHS.filter((fp) => {
    const f = fields[fp];
    return f?.value !== null && f?.value !== undefined && f.value !== '';
  }).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Datos extraídos</h3>
        <Badge variant="secondary" className="text-xs">
          {filledCount}/{TEMPLATE_FIELD_PATHS.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {FIELD_SECTIONS.map((section, sectionIdx) => (
            <div key={section.label}>
              {sectionIdx > 0 && <Separator className="my-2" />}
              <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.fields.map((fieldPath) => {
                  const fieldState = fields[fieldPath];
                  const hasValue =
                    fieldState?.value !== null &&
                    fieldState?.value !== undefined &&
                    fieldState.value !== '';
                  const label = FIELD_LABEL_MAP[fieldPath] ?? fieldPath;
                  const displayValue = hasValue
                    ? fieldState.value!.length > 24
                      ? fieldState.value!.slice(0, 24) + '…'
                      : fieldState.value!
                    : '—';

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
                              ? 'truncate font-medium'
                              : 'truncate text-muted-foreground/50 italic'
                          }
                        >
                          {displayValue}
                        </span>
                      </div>
                      {hasValue && (
                        <Badge
                          variant="outline"
                          className={`ml-2 shrink-0 text-[10px] ${confidenceBadgeClasses(fieldState.confidenceLevel)}`}
                        >
                          {Math.round(fieldState.confidence * 100)}%
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
