import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getJobDetails } from "@/api/auditApi";

export default function JobDetailsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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
  }, [jobId]);

  const jsonText = data && !data.error ? JSON.stringify(data, null, 2) : "";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Full Job Details</h2>
          <p className="text-sm text-slate-500 font-mono">{jobId}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      ) : data?.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          {data.error}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-xs font-medium text-slate-500">
              {lines.length} lines
            </span>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!data || copied}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
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
          </div>

          {/* JSON Viewer */}
          <div className="max-h-[70vh] overflow-auto p-4">
            <div className="flex gap-3">
              <pre className="select-none text-right text-xs text-slate-400/70 leading-relaxed">
                {lineNumbers}
              </pre>
              <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-800 leading-relaxed">
                {jsonText}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}