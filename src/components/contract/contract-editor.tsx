'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useContractStore } from '@/store/contract-store';
import { ContractToolbar } from './contract-toolbar';
import { getContractTemplate, TEMPLATE_FIELD_PATHS } from './contract-template';
import { useTraceabilityPopover } from './traceability-popover';
import {
  SIDEBAR_ITEM_CLICK_EVENT,
  dispatchPlaceholderFocus,
} from './extracted-data-list';

/**
 * ContractEditor renders the contract template with live placeholders
 * bound to the Zustand store.
 *
 * Placeholder interaction:
 * - Autocomplete from pipeline fills fields with confidence colors
 * - Extracted values render bold; manual values render normal + blue
 * - Click on placeholder enables inline editing
 * - Enter saves, Escape cancels, blur saves
 * - Highlight animation (1.5s) on new autocomplete fill
 * - Multiple instances of same field stay synchronized
 */
export function ContractEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const prevFieldValuesRef = useRef<Record<string, string | null>>({});
  const fields = useContractStore((state) => state.fields);
  const updateField = useContractStore((state) => state.updateField);
  const { openPopover, closePopover, renderPopover, editRequest, consumeEditRequest } = useTraceabilityPopover();

  // Sync all placeholders with field state via DOM
  const syncPlaceholders = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const prevValues = prevFieldValuesRef.current;

    for (const fieldPath of TEMPLATE_FIELD_PATHS) {
      const placeholders = editor.querySelectorAll<HTMLSpanElement>(
        `[data-field="${fieldPath}"]`,
      );

      const fieldState = fields[fieldPath];
      const hasValue = fieldState?.value !== null
        && fieldState?.value !== undefined
        && fieldState.value !== '';
      const prevValue = prevValues[fieldPath] ?? null;
      const isNewFill = hasValue && !prevValue;

      placeholders.forEach((el) => {
        // Skip elements currently being edited
        if (el.dataset.editing === 'true') return;

        if (hasValue) {
          el.textContent = fieldState.value;
          el.dataset.filled = 'true';
          el.dataset.confidence = fieldState.confidenceLevel;
          el.dataset.source = fieldState.source;

          // Trigger highlight animation on first fill
          if (isNewFill) {
            el.classList.remove('animate-highlight-fill');
            void el.offsetWidth; // force reflow to restart animation
            el.classList.add('animate-highlight-fill');
          }
        } else {
          const label = el.getAttribute('data-label') ?? fieldPath;
          el.textContent = `[${label}]`;
          el.dataset.filled = 'false';
          el.dataset.confidence = 'low';
          el.dataset.source = 'manual';
        }
      });

      prevValues[fieldPath] = fieldState?.value ?? null;
    }
  }, [fields]);

  // ---------------------------------------------------------------------------
  // Inline editing helpers
  // ---------------------------------------------------------------------------

  const startEditing = useCallback((el: HTMLSpanElement) => {
    const fieldPath = el.dataset.field;
    if (!fieldPath) return;

    el.dataset.editing = 'true';
    el.contentEditable = 'true';

    const fieldState = fields[fieldPath];
    const hasValue = fieldState?.value !== null
      && fieldState?.value !== undefined
      && fieldState.value !== '';

    // Clear placeholder text for empty fields so user types on clean slate
    if (!hasValue) {
      el.textContent = '';
    }

    el.focus();

    // Select all text for easy replacement
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [fields]);

  const saveEditing = useCallback((el: HTMLSpanElement) => {
    const fieldPath = el.dataset.field;
    if (!fieldPath) return;

    el.dataset.editing = 'false';
    el.contentEditable = 'false';

    const newValue = (el.textContent ?? '').trim();
    if (newValue) {
      updateField(fieldPath, newValue);
    }
    // syncPlaceholders will update all instances on next render cycle
  }, [updateField]);

  const cancelEditing = useCallback((el: HTMLSpanElement) => {
    el.dataset.editing = 'false';
    el.contentEditable = 'false';
    // Restore display from store
    syncPlaceholders();
  }, [syncPlaceholders]);

  // ---------------------------------------------------------------------------
  // Bidirectional navigation: sidebar → contract placeholder
  // ---------------------------------------------------------------------------

  const scrollToPlaceholder = useCallback((fieldPath: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const el = editor.querySelector<HTMLSpanElement>(`[data-field="${fieldPath}"]`);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Gold pulsating highlight for 2.4s
    el.classList.remove('animate-scroll-highlight');
    void el.offsetWidth; // force reflow
    el.classList.add('animate-scroll-highlight');
    setTimeout(() => {
      el.classList.remove('animate-scroll-highlight');
    }, 2400);
  }, []);

  useEffect(() => {
    function handleSidebarClick(event: Event) {
      const { fieldPath } = (event as CustomEvent<{ fieldPath: string }>).detail;
      scrollToPlaceholder(fieldPath);
    }

    window.addEventListener(SIDEBAR_ITEM_CLICK_EVENT, handleSidebarClick);
    return () => {
      window.removeEventListener(SIDEBAR_ITEM_CLICK_EVENT, handleSidebarClick);
    };
  }, [scrollToPlaceholder]);

  // ---------------------------------------------------------------------------
  // Event handlers (delegated from editor container)
  // ---------------------------------------------------------------------------

  // Process edit requests from the traceability popover
  useEffect(() => {
    if (!editRequest) return;
    const fieldPath = consumeEditRequest();
    if (!fieldPath) return;
    const editor = editorRef.current;
    if (!editor) return;
    const el = editor.querySelector<HTMLSpanElement>(`[data-field="${fieldPath}"]`);
    if (el) startEditing(el);
  }, [editRequest, consumeEditRequest, startEditing]);

  const handleEditorClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('contract-placeholder')) return;
    if (target.dataset.editing === 'true') return;

    event.preventDefault();
    event.stopPropagation();

    const fieldPath = target.dataset.field;
    if (!fieldPath) return;

    // Notify sidebar to highlight corresponding item
    dispatchPlaceholderFocus(fieldPath);

    const fieldState = fields[fieldPath];
    const hasValue = fieldState?.value !== null
      && fieldState?.value !== undefined
      && fieldState.value !== '';

    if (hasValue) {
      // Show traceability popover for filled fields
      closePopover();
      openPopover(fieldPath, target);
    } else {
      // Go directly to inline editing for empty fields
      startEditing(target as HTMLSpanElement);
    }
  }, [startEditing, fields, openPopover, closePopover]);

  const handleEditorKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('contract-placeholder')) return;
    if (target.dataset.editing !== 'true') return;

    if (event.key === 'Enter') {
      event.preventDefault();
      saveEditing(target as HTMLSpanElement);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing(target as HTMLSpanElement);
    }
  }, [saveEditing, cancelEditing]);

  const handleEditorBlur = useCallback((event: FocusEvent) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('contract-placeholder')) return;
    if (target.dataset.editing !== 'true') return;

    saveEditing(target as HTMLSpanElement);
  }, [saveEditing]);

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  // Initial render of template
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.innerHTML = getContractTemplate();

    // Store original labels in data-label for later restoration
    const placeholders = editor.querySelectorAll<HTMLSpanElement>('.contract-placeholder');
    placeholders.forEach((el) => {
      const text = el.textContent ?? '';
      const label = text.startsWith('[') && text.endsWith(']')
        ? text.slice(1, -1)
        : text;
      el.setAttribute('data-label', label);
    });
  }, []);

  // Attach delegated event listeners
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.addEventListener('click', handleEditorClick);
    editor.addEventListener('keydown', handleEditorKeyDown);
    editor.addEventListener('focusout', handleEditorBlur);

    return () => {
      editor.removeEventListener('click', handleEditorClick);
      editor.removeEventListener('keydown', handleEditorKeyDown);
      editor.removeEventListener('focusout', handleEditorBlur);
    };
  }, [handleEditorClick, handleEditorKeyDown, handleEditorBlur]);

  // Sync on field changes
  useEffect(() => {
    syncPlaceholders();
  }, [syncPlaceholders]);

  return (
    <div className="flex flex-col gap-3">
      <ContractToolbar editorRef={editorRef} />

      <Card className="bg-[var(--notary-parchment)]">
        <CardContent className="p-6 md:p-10">
          <div
            ref={editorRef}
            className="contract-editor-content prose max-w-none"
            style={{
              fontFamily: 'var(--font-contract)',
              lineHeight: 2,
            }}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-sm text-muted-foreground">Leyenda:</span>
        <Separator orientation="vertical" className="h-4" />
        <Badge
          variant="outline"
          className="border-[var(--notary-confidence-high)] text-[var(--notary-confidence-high)]"
        >
          Alta confianza
        </Badge>
        <Badge
          variant="outline"
          className="border-[var(--notary-confidence-medium)] text-[var(--notary-confidence-medium)]"
        >
          Media confianza
        </Badge>
        <Badge
          variant="outline"
          className="border-[var(--notary-confidence-low)] text-[var(--notary-confidence-low)]"
        >
          Baja confianza
        </Badge>
        <Separator orientation="vertical" className="h-4" />
        <Badge variant="outline" className="border-blue-500 text-blue-500">
          Edición manual
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          Sin completar
        </Badge>
      </div>

      {renderPopover()}
    </div>
  );
}
