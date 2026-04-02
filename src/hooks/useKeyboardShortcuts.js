/**
 * hooks/useKeyboardShortcuts.js
 * Keyboard shortcut bindings for the simulator.
 */

import { useEffect } from 'react';

/**
 * @param {object} handlers
 *   onTogglePlay  — Space
 */
export function useKeyboardShortcuts({ onTogglePlay }) {
  useEffect(() => {
    const handler = (e) => {
      // Don't intercept when focus is in an input/textarea/select
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (document.activeElement?.contentEditable === 'true') return;

      if (e.key === ' ') {
        e.preventDefault();
        onTogglePlay?.();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTogglePlay]);
}
