/**
 * Standalone background worker process.
 *
 * This runs independently from the web server. It pulls jobs from the BullMQ
 * queue (backed by Redis) and runs Puppeteer checks against affiliate links.
 *
 * Deploy this as a separate Render Background Worker (or any process manager).
 * The web API enqueues jobs; this worker consumes them.
 *
 *   npm run worker   (or: node src/worker.js)
 */

import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connection } from './config/redis.js';
import { AuditResult } from './models/jobResult.model.js';
import { Job } from './models/job.model.js';
import { proxyManager } from './services/proxy.service.js';
import { runCheckWithRetry } from './services/runner.service.js';

dotenv.config({ path: '.env' });

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 2;

// ── Connect to MongoDB ──────────────────────────────────────────────────────
async function connectDB() {
  const mongoUrl = process.env.MONGO_URI;
  if (!mongoUrl) {
    console.warn('⚠️ No MongoDB URI configured. Worker persistence disabled.');
    return false;
  }
  try {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Worker: MongoDB connected');
    return true;
  } catch (err) {
    console.error('❌ Worker: MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

// ── Graceful shutdown ────────────────────────────────────────────────────────
let isShuttingDown = false;
let activeWorker = null;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${signal} received. Shutting down worker gracefully...`);

  if (activeWorker) {
    await activeWorker.close();
  }
  await mongoose.connection.close(false);
  await connection.quit();
  console.log('✅ Worker shut down cleanly.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Worker logic ─────────────────────────────────────────────────────────────
function startWorker() {
  const workerConnection = connection.duplicate();

  activeWorker = new Worker(
    'audit-queue',
    async (job) => {
      const { jobId, url, index } = job.data;
      console.log(`[worker] Processing job ${jobId} (${index}): ${url}`);

      const result = await runCheckWithRetry(url, proxyManager, 3);

      // Persist individual result (best-effort)
      try {
        await AuditResult.create({
          jobId,
          inputUrl: result.inputUrl || url,
          finalUrl: result.finalUrl || null,
          isValid: !!result.success,
          clickIdFound: result.clickIdFound || null,
          redirectCount: result.redirectCount || 0,
          chain: result.chain || [],
          errorMessage: result.error || null
        });
      } catch (err) {
        console.warn(`[worker] Failed to persist result for ${url}:`, err.message);
      }

      // Update job progress
      try {
        const inc = result.success ? { completedLinks: 1 } : { failedLinks: 1 };
        await Job.findByIdAndUpdate(jobId, { $inc: inc });
      } catch (err) {
        console.warn(`[worker] Failed to update job progress:`, err.message);
      }

      return result;
    },
    {
      connection: workerConnection,
      concurrency: CONCURRENCY,
      stalledInterval: 30000,
      maxStalledCount: 2
    }
  );

  // When all jobs for a batch are done, mark the job completed
  activeWorker.on('completed', async (job) => {
    const { jobId } = job.data;
    try {
      const jobDoc = await Job.findById(jobId);
      if (!jobDoc) return;

      const processed = (jobDoc.completedLinks || 0) + (jobDoc.failedLinks || 0);
      if (processed >= jobDoc.totalLinks && jobDoc.status === 'processing') {
        jobDoc.status = 'completed';
        await jobDoc.save();
        console.log(`[worker] Job ${jobId} completed (${processed}/${jobDoc.totalLinks})`);
      }
    } catch (err) {
      console.warn(`[worker] Error marking job complete:`, err.message);
    }
  });

  activeWorker.on('failed', (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  console.log(`🚀 Worker started (concurrency: ${CONCURRENCY})`);

  // ── Drain detection ────────────────────────────────────────────────────
  // When running inside GitHub Actions the worker should process all pending
  // jobs and then exit cleanly instead of polling forever.
  const drainCheck = setInterval(async () => {
    try {
      const counts = await activeWorker.getJobCounts('waiting', 'active', 'delayed');
      const total = counts.waiting + counts.active + counts.delayed;
      if (total === 0) {
        console.log('📭 Queue drained. Shutting down...');
        clearInterval(drainCheck);
        await shutdown('DRAIN');
      } else {
        console.log(`⏳ ${total} job(s) remaining (waiting: ${counts.waiting}, active: ${counts.active}, delayed: ${counts.delayed})`);
      }
    } catch (err) {
      console.warn('[drain-check] Error:', err.message);
    }
  }, 5000);  // check every 5 seconds
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  await connectDB();
  startWorker();
})();
