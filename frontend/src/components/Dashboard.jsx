import { useEffect, useState, useCallback } from "react";
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
import { listJobs, createBatch } from "@/api/auditApi";
import CreateBatchModal from "@/components/CreateBatchModal";
import JobSummaryModal from "@/components/JobSummaryModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

export default function Dashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);

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

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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
        <div>
          <h2 className="text-lg font-bold text-slate-900">Your Job Batch</h2>
          <p className="mt-1 text-sm text-slate-500">
            View and manage all your link tracking job batches.
          </p>
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
            <TableHead className="text-center">TOTAL LINKS</TableHead>
            <TableHead className="text-center">PROCESSED</TableHead>
            <TableHead className="text-center w-20">INFO</TableHead>
            <TableHead className="text-center w-20">ACTION</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                Loading…
              </TableCell>
            </TableRow>
          ) : jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
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
                <TableCellCenter>{job.totalLinks}</TableCellCenter>
                <TableCellCenter>{job.completedLinks}</TableCellCenter>
                <TableCellCenter>
                  <button
                    type="button"
                    onClick={() => handleDetailsOpen(job._id)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="View details"
                  >
                    <Info className="h-4 w-4" />
                  </button>
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

      {/* Footer */}
      {/* <p className="text-sm text-slate-500">
        Showing 1 to {jobs.length} of {jobs.length} batches
      </p> */}

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