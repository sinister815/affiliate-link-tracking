import { Queue } from 'bullmq';
import { connection } from '../config/redis.js';
import { Job } from '../models/job.model.js';
import { AuditResult } from '../models/jobResult.model.js';
import { runCheckWithRetry } from './runner.service.js';
import { proxyManager } from './proxy.service.js';

let queue = null;

/**
 * Initialize the queue. Returns true if Redis is available, false otherwise.
 * When Redis is unavailable, we fall back to synchronous processing.
 */
function getQueue() {
  if (queue) return queue;
  try {
    queue = new Queue('audit-queue', { connection });
    return queue;
  } catch {
    return null;
  }
}

/**
 * Check if Redis is available by pinging it.
 */
export async function isRedisAvailable() {
  try {
    await connection.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Enqueues a batch of URLs for background processing.
 * If Redis is unavailable, falls back to synchronous processing (old behavior).
 */
export async function enqueueBatch(urls) {
  const queue = getQueue();
  const redisUp = await isRedisAvailable();

  // Create the Job record first
  const job = await Job.create({
    status: 'pending',
    totalLinks: urls.length,
    completedLinks: 0,
    failedLinks: 0
  });

  if (!queue || !redisUp) {
    // Redis unavailable — process synchronously in-process
    console.warn('⚠️ Redis unavailable. Processing batch synchronously.');
    await processBatchSync(job, urls);
    return { jobId: job._id, totalLinks: urls.length };
  }

  // Add one queue entry per URL so the worker can process them individually
  const bulk = urls.map((url, index) => ({
    name: 'audit-url',
    data: { jobId: job._id.toString(), url, index },
    opts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false
    }
  }));

  await queue.addBulk(bulk);

  // Mark as processing once jobs are in the queue
  job.status = 'processing';
  await job.save();

  return { jobId: job._id, totalLinks: urls.length };
}

/**
 * Fallback: process batch synchronously when Redis is not available.
 */
async function processBatchSync(job, urls) {
  job.status = 'processing';
  await job.save();

  let completedLinks = 0;
  let failedLinks = 0;
  const docs = [];

  for (const url of urls) {
    try {
      const result = await runCheckWithRetry(url, proxyManager, 3);
      docs.push({
        jobId: job._id,
        inputUrl: result.inputUrl || url,
        finalUrl: result.finalUrl || null,
        isValid: !!result.success,
        clickIdFound: result.clickIdFound || null,
        redirectCount: result.redirectCount || 0,
        chain: result.chain || [],
        errorMessage: result.error || null
      });
      if (result.success) completedLinks++;
      else failedLinks++;
    } catch (err) {
      docs.push({
        jobId: job._id,
        inputUrl: url,
        finalUrl: null,
        isValid: false,
        clickIdFound: null,
        redirectCount: 0,
        chain: [],
        errorMessage: err.message
      });
      failedLinks++;
    }
  }

  // Persist results
  if (docs.length > 0) {
    try {
      await AuditResult.insertMany(docs, { ordered: false });
    } catch (err) {
      console.warn(`⚠️ Partial AuditResult insert for job ${job._id}:`, err.message);
    }
  }

  job.completedLinks = completedLinks;
  job.failedLinks = failedLinks;
  job.status = 'completed';
  await job.save();
}

/**
 * Returns the current status of a background job.
 */
export async function getQueueJobStatus(jobId) {
  const job = await Job.findById(jobId).lean();
  if (!job) return null;
  return {
    jobId: job._id,
    status: job.status,
    totalLinks: job.totalLinks,
    completedLinks: job.completedLinks,
    failedLinks: job.failedLinks,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}
