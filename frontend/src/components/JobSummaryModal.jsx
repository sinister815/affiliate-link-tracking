import { useEffect, useState } from "react";
import { ExternalLink, ShieldCheck, AlertTriangle, X, XCircle } from "lucide-react";
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
import { getJobSummary } from "@/api/auditApi";

export default function JobSummaryModal({ open, onClose, jobId, onGetFullInfo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !jobId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const d = await getJobSummary(jobId);
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

  const handleGetFullInfo = () => {
    if (onGetFullInfo) onGetFullInfo(jobId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Job Summary</DialogTitle>
            <DialogClose>
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
          <DialogDescription>
            Quick overview of batch results and any detected issues.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
        ) : data?.error ? (
          <p className="py-6 text-center text-sm text-red-600">{data.error}</p>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xs font-medium text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {data.summary.totalLinks}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xs font-medium text-emerald-600">Healthy</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {data.summary.healthyLinks}
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xs font-medium text-red-600">Broken</p>
                <p className="mt-1 text-2xl font-bold text-red-700">
                  {data.summary.brokenLinks}
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xs font-medium text-amber-600">Missing Tracking</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {data.summary.missingTrackingLinks}
                </p>
              </div>
            </div>

            {/* Issues List */}
            {data.issuesOnly.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                  Issues ({data.issuesOnly.length})
                </h4>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {data.issuesOnly.map((issue, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-slate-200 bg-white p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        {issue.issueType === "BROKEN_LINK" ? (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="break-all font-mono text-xs text-slate-800">
                            {issue.inputUrl}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {issue.issueType === "BROKEN_LINK"
                              ? issue.errorMessage
                              : `Missing click ID`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.issuesOnly.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                All links passed validation.
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleGetFullInfo}
            className="gap-1.5"
          >
            <ExternalLink className="h-4 w-4" />
            Get Full Info
          </Button>
          <Button variant="outline" onClick={() => onClose()}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}