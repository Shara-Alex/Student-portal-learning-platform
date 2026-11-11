import { X } from "lucide-react";
import type { ReactNode } from "react";

/** A simple pop-up window. Render it only while it should be open. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4">
      <div className="mt-10 w-full max-w-lg rounded-lg bg-raised p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-sm p-1 text-ink-muted hover:bg-sunken" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
