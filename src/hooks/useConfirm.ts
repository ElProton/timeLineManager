import { useCallback, useRef, useState } from "react";
import type { ConfirmDialogProps } from "../components/ConfirmDialog";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in red. */
  destructive?: boolean;
}

type Pending = ConfirmOptions & { resolve: (confirmed: boolean) => void };

/**
 * Promise-based confirmation, so call sites keep reading top to bottom:
 *
 *     if (!(await confirm({ title, message }))) return;
 *
 * Confirmation deliberately lives here rather than inside `useProjectManager`:
 * an in-app dialog is asynchronous, and pushing that into the state hook would
 * make every mutation async and couple it to a component.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    pendingRef.current?.resolve(confirmed);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        // A second request while one is open resolves the first as cancelled,
        // so no caller is left awaiting a promise that never settles.
        pendingRef.current?.resolve(false);
        const next = { ...options, resolve };
        pendingRef.current = next;
        setPending(next);
      }),
    [],
  );

  const confirmProps: ConfirmDialogProps = {
    isOpen: pending !== null,
    title: pending?.title ?? "",
    message: pending?.message ?? "",
    confirmLabel: pending?.confirmLabel ?? "Confirm",
    cancelLabel: pending?.cancelLabel ?? "Cancel",
    destructive: pending?.destructive ?? false,
    onConfirm: () => settle(true),
    onCancel: () => settle(false),
  };

  return { confirm, confirmProps };
}
