// Keyboard shortcuts hook for accessibility
import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
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

