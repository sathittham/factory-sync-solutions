import { type RefObject, useEffect, useRef } from 'react';

/**
 * Panel accessibility behavior shared by the chat widget's floating panel:
 * moves focus into the panel on open (restoring it on close), closes on
 * Escape, and traps Tab/Shift+Tab within the panel while it's open.
 */
export function useFocusTrap(
  isOpen: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      panelRef.current?.focus();
    } else {
      previouslyFocused.current?.focus();
    }
  }, [isOpen, panelRef]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'Tab' && panelRef.current) {
        trapTabKey(event, panelRef.current);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, panelRef]);
}

function trapTabKey(event: KeyboardEvent, panel: HTMLElement) {
  const focusable = panel.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
