import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

/** Elements that can hold focus inside the dialog. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal shell.
 *
 * Implemented in React rather than with the native `<dialog>` element, which
 * would provide the focus trap, Escape handling and focus restoration for
 * free: jsdom does not implement `showModal()`, so a native dialog could not
 * be covered by this project's tests.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const focusable = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
  }, []);

  // Move focus into the dialog on open, and back to the trigger on close.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Skip the close button, which is first in DOM order: landing on a form
    // field is what the reader actually wants, and it is what the individual
    // modals used to do with autoFocus.
    const elements = focusable();
    const target =
      elements.find((el) => el.dataset.modalDismiss === undefined) ??
      elements[0] ??
      panelRef.current;
    target?.focus();

    return () => previouslyFocused?.focus?.();
  }, [isOpen, focusable]);

  // Escape closes; Tab cycles within the dialog.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const elements = focusable();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      // Browsers move focus themselves; the trap only handles the two edges.
      // jsdom moves nothing, so the tests exercise exactly this branch.
      if (
        event.shiftKey &&
        (active === first || !panelRef.current?.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose, focusable]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={(event) => {
        // Only a press that both starts and ends on the backdrop closes, so a
        // drag that began inside the dialog does not dismiss it.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 id={titleId} className="text-xl font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            data-modal-dismiss=""
            onClick={onClose}
            aria-label="Close dialog"
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
        {footer && (
          <div className="p-4 border-t border-neutral-200 flex justify-end gap-3 bg-neutral-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
