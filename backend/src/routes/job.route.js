import { Router } from 'express';
import {
  createBatchAudit,
  listJobs,
  getJobResults,
  getJobSummary,
  deleteJob
} from '../controllers/job.controller.js';

const router = Router();

// Audits are processed synchronously; the full result set (plus a jobId) is
// returned directly in the POST response.
router.post('/', createBatchAudit);

// List all persisted jobs (powers the dashboard table).
router.get('/', listJobs);

// Retrieve a computed summary of a job (counts + issuesOnly).
// Placed before /:jobId to avoid route conflict.
router.get('/summary/:jobId', getJobSummary);

// Retrieve a persisted job + its audit results by id.
router.get('/:jobId', getJobResults);

// Delete a job and its audit results (cascade).
router.delete('/jobs/:jobId', deleteJob);

export default router;
