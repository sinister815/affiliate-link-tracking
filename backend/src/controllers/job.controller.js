import { runCheckWithRetry } from '../services/runner.service.js';
import { proxyManager } from '../services/proxy.service.js';
import { Job } from '../models/job.model.js';
import { AuditResult } from '../models/jobResult.model.js';
import { enqueueBatch, getQueueJobStatus } from '../services/auditQueue.js';

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_RETRIES = 3;

// Run async tasks with a fixed concurrency cap, preserving input order in the
// returned results array. Bounds the number of parallel Chromium instances so
// we don't oversubscribe the machine.
async function runWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;

  const runner = async () => {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx]);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runner()
  );
  await Promise.all(workers);
  return results;
}

// Map the redirect checker's hop shape to the persisted subdocument shape.
function mapChain(hops) {
  if (!Array.isArray(hops)) return [];
  return hops.map((h) => ({
    step: h.step,
    statusCode: h.statusCode,
    url: h.url,
    headers: h.headers || null,
    targetLocation: h.targetLocation || null
  }));
}

// Persist results for a job (best-effort: a DB failure must not fail the
// audit response). Inserts an AuditResult per URL and updates the Job's
// status/ counts.
async function persistResults(job, results) {
  const docs = results.map((r) => ({
    jobId: job._id,
    inputUrl: r.inputUrl,
    finalUrl: r.finalUrl || null,
    isValid: !!r.success,
    clickIdFound: r.clickIdFound || null,
    redirectCount: r.redirectCount || 0,
    chain: mapChain(r.chain),
    errorMessage: r.error || null
  }));

  if (docs.length > 0) {
    try {
      await AuditResult.insertMany(docs, { ordered: false });
    } catch (err) {
      console.warn(`⚠️ Partial AuditResult insert for job ${job._id}:`, err.message);
    }
  }

  const completedLinks = results.filter((r) => r.success).length;
  const failedLinks = results.length - completedLinks;

  job.completedLinks = completedLinks;
  job.failedLinks = failedLinks;
  job.status = completedLinks > 0 ? 'completed' : 'failed';

  try {
    await job.save();
  } catch (err) {
    console.warn(`⚠️ Job update failed for job ${job._id}:`, err.message);
  }
}

/**
 * Enqueues a batch of URLs for background processing by the worker.
 * Returns immediately with a jobId that can be polled for status.
 *
 * The worker (src/worker.js) picks up jobs from the BullMQ queue and runs
 * Puppeteer checks, persisting results to MongoDB as it goes.
 */
export async function createBatchAudit(req, res) {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: 'Invalid payload. "urls" must be a non-empty array of URL strings.'
      });
    }

    const { jobId, totalLinks } = await enqueueBatch(urls);

    return res.json({
      jobId,
      totalLinks,
      message: 'Batch enqueued for processing. Poll /api/audit/:jobId/status for progress.'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Returns the current processing status of a background job.
 * Useful for polling progress after submitting a batch.
 */
export async function getJobQueueStatus(req, res) {
  try {
    const { jobId } = req.params;
    const status = await getQueueJobStatus(jobId);
    if (!status) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Lists all persisted jobs (ordered by most recent first).
 */
export async function listJobs(req, res) {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).lean();
    return res.json(jobs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Retrieves a persisted job and its audit results by id.
 */
export async function getJobResults(req, res) {
  try {
    const { jobId: jobIdParam } = req.params;

    let job;
    try {
      job = await Job.findById(jobIdParam).lean();
    } catch {
      return res.status(400).json({ error: 'Invalid job id.' });
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const results = await AuditResult.find({ jobId: job._id }).lean();

    return res.json({ job, results });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * Returns a computed summary of a job: total/healthy/broken/missing-tracking
 * counts plus an issuesOnly array highlighting problem URLs.
 */
export async function getJobSummary(req, res) {
  try {
    const { jobId: jobIdParam } = req.params;

    let job;
    try {
      job = await Job.findById(jobIdParam).lean();
    } catch {
      return res.status(400).json({ error: 'Invalid job id.' });
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const results = await AuditResult.find({ jobId: job._id }).lean();

    const brokenLinks = results.filter((r) => !r.isValid);
    const missingTrackingLinks = results.filter((r) => r.isValid && !r.clickIdFound);
    const healthyLinks = results.filter((r) => r.isValid && r.clickIdFound);

    const issuesOnly = [
      ...brokenLinks.map((r) => ({
        inputUrl: r.inputUrl,
        issueType: 'BROKEN_LINK',
        errorMessage: r.errorMessage || null
      })),
      ...missingTrackingLinks.map((r) => ({
        inputUrl: r.inputUrl,
        issueType: 'MISSING_CLICK_ID',
        finalUrl: r.finalUrl || null,
        clickIdFound: null
      }))
    ];

    return res.json({
      jobId: job._id,
      summary: {
        totalLinks: results.length,
        healthyLinks: healthyLinks.length,
        brokenLinks: brokenLinks.length,
        missingTrackingLinks: missingTrackingLinks.length
      },
      issuesOnly
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Deletes a job and its audit results (cascade).
 */
export async function deleteJob(req, res) {
  try {
    const { jobId: jobIdParam } = req.params;

    let job;
    try {
      job = await Job.findById(jobIdParam);
    } catch {
      return res.status(400).json({ error: 'Invalid job id.' });
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    await AuditResult.deleteMany({ jobId: job._id });
    await job.deleteOne();

    return res.json({ ok: true, deletedId: job._id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
