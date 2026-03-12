/**
 * Shared custom event constants and dispatch helpers.
 *
 * Moved from extracted-data-list.tsx to avoid circular dependencies
 * between the sidebar and contract editor.
 */

/** Custom event dispatched when a sidebar item is clicked, to scroll the contract editor. */
export const SIDEBAR_ITEM_CLICK_EVENT = 'notaryflow:sidebar-item-click';
/** Custom event dispatched when a contract placeholder is clicked, to highlight the sidebar. */
export const PLACEHOLDER_FOCUS_EVENT = 'notaryflow:placeholder-focus';

export interface SidebarItemClickDetail {
  fieldPath: string;
}

export interface PlaceholderFocusDetail {
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
