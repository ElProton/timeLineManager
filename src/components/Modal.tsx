import { type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
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
