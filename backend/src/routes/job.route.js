import { Router } from 'express';
import {
  createBatchAudit,
  listJobs,
  getJobResults,
  getJobSummary,
  getJobQueueStatus,
  deleteJob
} from '../controllers/job.controller.js';

const router = Router();

// Enqueues a batch of URLs for background processing by the worker.
// Returns immediately with a jobId to poll for status.
router.post('/', createBatchAudit);

// List all persisted jobs (powers the dashboard table).
router.get('/', listJobs);

// Retrieve a computed summary of a job (counts + issuesOnly).
router.get('/summary/:jobId', getJobSummary);

// Retrieve the current processing status of a background job.
router.get('/status/:jobId', getJobQueueStatus);

// Retrieve a persisted job + its audit results by id.
router.get('/:jobId', getJobResults);

// Delete a job and its audit results (cascade).
router.delete('/jobs/:jobId', deleteJob);

export default router;
