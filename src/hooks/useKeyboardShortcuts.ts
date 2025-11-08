/**
 * useKeyboardShortcuts Hook
 * Enables keyboard shortcuts for improved accessibility and power user UX
 *
 * Features:
 * - Multi-key combination support (Ctrl, Shift, Alt, Meta)
 * - Automatic event listener cleanup
 * - Prevents default browser behavior
 * - Common shortcuts constant available
 *
 * @example
 * ```typescript
 * useKeyboardShortcuts([
 *   {
 *     key: '/',
 *     action: () => focusSearchInput(),
 *     description: 'Focus search'
 *   },
 *   {
 *     key: 'c',
 *     ctrl: true,
 *     action: () => openCreateModal(),
 *     description: 'Create token (Ctrl+C)'
 *   },
 *   {
 *     key: 'Escape',
 *     action: () => closeModal(),
 *     description: 'Close modal'
 *   }
 * ]);
 *
 * // Use predefined shortcuts
 * import { COMMON_SHORTCUTS } from './useKeyboardShortcuts';
 * ```
 *
 * @param shortcuts - Array of keyboard shortcut configurations
 */

import { useEffect, useCallback } from 'react';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /** Key to trigger (e.g., '/', 'Escape', 'ArrowUp') */
  key: string;
  /** Require Ctrl key */
  ctrl?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt key */
  alt?: boolean;
  /** Require Meta/Command key */
  meta?: boolean;
  /** Function to call when shortcut triggered */
  action: () => void;
  /** Optional description for help menus */
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const matchesKey = 
        event.key === shortcut.key ||
        event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (!matchesKey) continue;

      const matchesModifiers = 
        (shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl) &&
        (shortcut.shift === undefined || event.shiftKey === shortcut.shift) &&
        (shortcut.alt === undefined || event.altKey === shortcut.alt) &&
        (shortcut.meta === undefined || event.metaKey === shortcut.meta);

      if (matchesModifiers) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Common keyboard shortcuts
export const COMMON_SHORTCUTS = {
  FOCUS_SEARCH: '/',
  OPEN_CREATE: 'c',
  CLOSE_MODAL: 'Escape',
  NAVIGATE_UP: 'ArrowUp',
  NAVIGATE_DOWN: 'ArrowDown',
  NAVIGATE_LEFT: 'ArrowLeft',
  NAVIGATE_RIGHT: 'ArrowRight',
  SUBMIT: 'Enter',
  CANCEL: 'Escape',
} as const;

