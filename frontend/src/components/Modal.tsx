import { useEffect } from "react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
};

export function Modal({ open, title, onClose, children, maxWidthClassName = "max-w-4xl" }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 animate-[fadeIn_180ms_ease-out]">
      <div className="absolute inset-0 bg-black/60 opacity-100 transition-opacity" onClick={onClose} />
      <div className="absolute inset-0 overflow-y-auto px-4 py-10">
        <div
          className={`mx-auto w-full ${maxWidthClassName} animate-[modalIn_190ms_ease-out] scale-100 rounded-2xl bg-white shadow-soft ring-1 ring-black/10 transition-all`}
        >
          {title ? (
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <div className="font-heading text-xl text-neutral-900">{title}</div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          ) : null}
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

