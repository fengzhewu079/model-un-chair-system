import { useEffect, useRef } from 'react';

/** Keep keyboard interaction inside an open dialog and return to its trigger. */
export function useDialogFocus(isOpen: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], summary, [tabindex]')).filter(el => el.tabIndex >= 0 && !el.hasAttribute('disabled') && el.getClientRects().length > 0);
    (dialog.querySelector<HTMLElement>('[data-initial-focus]') ?? focusable()[0] ?? dialog).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const keepFocus = (event: FocusEvent) => { if (event.target instanceof Node && !dialog.contains(event.target)) (focusable()[0] ?? dialog).focus(); };
    dialog.addEventListener('keydown', keydown);
    document.addEventListener('focusin', keepFocus);
    return () => {
      dialog.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', keepFocus);
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);
  return dialogRef;
}
