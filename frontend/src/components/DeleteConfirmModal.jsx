import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
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
import { deleteJob } from "@/api/auditApi";

export default function DeleteConfirmModal({ open, onClose, jobId, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteJob(jobId);
      onDeleted();
      onClose();
    } catch (e) {
      setError(e.message || "Failed to delete batch");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-start gap-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <DialogTitle>Delete Batch</DialogTitle>
              <DialogClose>
                <X className="h-5 w-5 text-slate-400" />
              </DialogClose>
            </div>
            <DialogDescription className="mt-1">
              Are you sure you want to delete this batch? This action cannot be
              undone.
            </DialogDescription>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
