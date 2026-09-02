import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Parse a raw input string into a deduplicated, trimmed URL list.
// Accepts both newline-separated and comma-separated values.
function parseUrls(raw) {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CreateBatchModal({ open, onClose, onSuccess }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm({ defaultValues: { urls: "" } });

  const urlsValue = watch("urls") || "";
  const urlCount = parseUrls(urlsValue).length;

  const onSubmit = async (data) => {
    const list = parseUrls(data.urls);
    if (list.length === 0) return;
    await onSuccess(list);
    reset({ urls: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="contents">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogClose>
                <X className="h-5 w-5" />
              </DialogClose>
            </div>
            <DialogDescription>
              Paste one or more tracking URLs (separated by commas or new lines) to audit them.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <textarea
              {...register("urls", { required: "Enter at least one URL" })}
              rows={6}
              placeholder="https://example.com/go/abc123"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <p className="mt-2 text-xs text-slate-500">
              {urlCount} URL{urlCount === 1 ? "" : "s"} detected
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Auditing…" : "Create & Audit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
