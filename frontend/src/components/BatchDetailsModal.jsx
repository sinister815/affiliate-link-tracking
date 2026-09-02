import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
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
import { getJobDetails } from "@/api/auditApi";

export default function BatchDetailsModal({ open, onClose, jobId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !jobId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const d = await getJobDetails(jobId);
        if (active) setData(d);
      } catch (e) {
        if (active) setData({ error: e.message });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, jobId]);

  const jsonText = data ? JSON.stringify(data, null, 2) : "";
  const lines = jsonText ? jsonText.split("\n") : [];
  const lineNumbers = lines.map((_, i) => i + 1).join("\n");

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle>Batch Details</DialogTitle>
            <DialogClose>
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
          <DialogDescription>
            Detailed information about this job batch in JSON format.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Loading…
            </p>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!data || copied}
                className="absolute top-2 right-3 z-10 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-3 w-3 inline" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3 inline" />
                    Copy JSON
                  </>
                )}
              </button>
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-[60vh] overflow-auto">
                <div className="flex gap-3">
                  <pre className="select-none text-right text-xs text-slate-400/70 leading-relaxed">
                    {lineNumbers}
                  </pre>
                  <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-800 leading-relaxed">
                    {jsonText || "No data"}
                  </pre>
                </div>
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
