import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellCenter,
} from "@/components/ui/table";
import { listJobs, createBatch, getJobQueueStatus } from "@/api/auditApi";
import CreateBatchModal from "@/components/CreateBatchModal";
import JobSummaryModal from "@/components/JobSummaryModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

// Build the SSE endpoint URL from the same base the axios API uses.
const SSE_URL = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE}/api/audit/events`
  : "/api/audit/events";

const POLL_INTERVAL_MS = 3000;

export default function Dashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Track per-job poll timers so we can clean them up individually
  const pollTimersRef = useRef({});

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listJobs();
      setJobs(data);
    } catch (e) {
      console.error("Failed to fetch jobs:", e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ── SSE: subscribe to real-time job completion events ───────────────────
  useEffect(() => {
    const es = new EventSource(SSE_URL);

    es.onopen = () => setSseConnected(true);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if (event.type === "job-completed") {
          // Update only the specific row that completed
          setJobs((prev) =>
            prev.map((j) =>
              j._id === event.jobId
                ? {
                    ...j,
                    status: event.status,
                    completedLinks: event.completedLinks,
                    failedLinks: event.failedLinks,
                  }
                : j
            )
          );
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    es.onerror = () => {
      setSseConnected(false);
      console.warn("SSE connection lost, reconnecting…");
    };

    return () => es.close();
  }, []);

  // ── Per-job polling: poll individual processing jobs every 3s ───────────
  // This serves two purposes:
  //   1. Shows live progress (completedLinks) while a job is processing
  //   2. Acts as a fallback when SSE/Redis is unavailable
  useEffect(() => {
    const processingJobs = jobs.filter((j) => j.status === "processing");

    // Start a poll timer for each processing job that doesn't already have one
    for (const job of processingJobs) {
      if (pollTimersRef.current[job._id]) continue;

      pollTimersRef.current[job._id] = setInterval(async () => {
        try {
          const status = await getJobQueueStatus(job._id);
          if (!status) return;

          // If the job finished, update the row and stop polling
          if (status.status !== "processing") {
            setJobs((prev) =>
              prev.map((j) =>
                j._id === status.jobId
                  ? {
                      ...j,
                      status: status.status,
                      completedLinks: status.completedLinks,
                      failedLinks: status.failedLinks,
                    }
                  : j
              )
            );
            clearInterval(pollTimersRef.current[status.jobId]);
            delete pollTimersRef.current[status.jobId];
          } else {
            // Still processing — update progress counts only
            setJobs((prev) =>
              prev.map((j) =>
                j._id === status.jobId
                  ? { ...j, completedLinks: status.completedLinks }
                  : j
              )
            );
          }
        } catch (err) {
          console.error(`Poll failed for job ${job._id}:`, err);
        }
      }, POLL_INTERVAL_MS);
    }

    // Clean up timers for jobs that are no longer processing
    for (const id of Object.keys(pollTimersRef.current)) {
      if (!processingJobs.some((j) => j._id === id)) {
        clearInterval(pollTimersRef.current[id]);
        delete pollTimersRef.current[id];
      }
    }

    // Cleanup all timers on unmount
    return () => {
      for (const id of Object.keys(pollTimersRef.current)) {
        clearInterval(pollTimersRef.current[id]);
        delete pollTimersRef.current[id];
      }
    };
  }, [jobs]);

  const handleCreateSuccess = async (urls) => {
    await createBatch(urls);
    await fetchJobs();
  };

  const handleDetailsOpen = (jobId) => {
    setSelectedJobId(jobId);
    setSummaryOpen(true);
  };

  const handleDeleteOpen = (jobId) => {
    setSelectedJobId(jobId);
    setDeleteOpen(true);
  };

  const handleDeleted = () => {
    fetchJobs();
  };

  const handleGetFullInfo = (jobId) => {
    setSummaryOpen(false);
    navigate(`/job/${jobId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Job Batch</h2>
            <p className="mt-1 text-sm text-slate-500">
              View and manage all your link tracking job batches.
            </p>
          </div>
          {/* SSE connection status indicator */}
          {/* <div
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1"
            title={
              sseConnected
                ? "Real-time updates active"
                : "Reconnecting to real-time updates…"
            }
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                sseConnected ? "bg-green-500" : "bg-red-400 animate-pulse"
              }`}
            />
            <span className="text-xs text-slate-500">
              {sseConnected ? "Live" : "Offline"}
            </span>
          </div> */}
        </div>
        <Button
          variant="outline"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Create New Batch
        </Button>
      </div>

      {/* Jobs Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">S.No.</TableHead>
            <TableHead>JOB ID</TableHead>
            <TableHead className="text-center">STATUS</TableHead>
            <TableHead className="text-center">TOTAL LINKS</TableHead>
            <TableHead className="text-center">PROCESSED</TableHead>
            <TableHead className="text-center w-20">INFO</TableHead>
            <TableHead className="text-center w-20">ACTION</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                Loading…
              </TableCell>
            </TableRow>
          ) : jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                No batches yet. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            jobs.map((job, idx) => (
              <TableRow key={job._id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell className="font-mono text-slate-800">
                  {job._id}
                </TableCell>
                <TableCellCenter>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      job.status === "completed"
                        ? "bg-green-50 text-green-700"
                        : job.status === "processing"
                        ? "bg-yellow-50 text-yellow-700"
                        : job.status === "failed"
                        ? "bg-red-50 text-red-700"
                        : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    {job.status}
                  </span>
                </TableCellCenter>
                <TableCellCenter>{job.totalLinks}</TableCellCenter>
                <TableCellCenter>{job.completedLinks}</TableCellCenter>
                <TableCellCenter>
                  {job.status === "processing" ? (
                    <span className="text-xs text-yellow-600 font-medium">
                      processing
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDetailsOpen(job._id)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="View details"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  )}
                </TableCellCenter>
                <TableCellCenter>
                  <button
                    type="button"
                    onClick={() => handleDeleteOpen(job._id)}
                    className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete batch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCellCenter>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Modals */}
      <CreateBatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />
      <JobSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        jobId={selectedJobId}
        onGetFullInfo={handleGetFullInfo}
      />
      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        jobId={selectedJobId}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
