import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DialogContext = React.createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogContext.Provider value={{ open: !!open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog primitive must be used within <Dialog>");
  }
  return ctx;
}

export const DialogContent = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const ctx = useDialog();

    // Hook must be called unconditionally (before any early return)
    React.useEffect(() => {
      if (!ctx.open) return;
      const onKey = (e) => {
        if (e.key === "Escape") ctx.onOpenChange(false);
      };
      document.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }, [ctx]);

    if (!ctx.open) return null;

    return createPortal(
      <div
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) ctx.onOpenChange(false);
        }}
      >
        <div
          ref={ref}
          data-slot="dialog-content"
          className={cn(
            "relative w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl",
            className
          )}
          onClick={(e) => e.stopPropagation()}
          aria-modal="true"
          role="dialog"
          {...props}
        >
          {children}
        </div>
      </div>,
      document.body
    );
  }
);
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }) {
  return (
    <h2
      className={cn("text-lg font-bold text-slate-900", className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-sm text-slate-500", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn("mt-4 flex justify-end gap-2", className)}
      {...props}
    />
  );
}

export function DialogClose({ children, className, ...props }) {
  const ctx = useDialog();
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={() => ctx.onOpenChange(false)}
      className={cn(
        "rounded p-1 text-slate-400 hover:text-slate-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
