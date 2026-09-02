import { Queue, Worker } from 'bullmq';
import { runCheckWithRetry } from './runner.service.js';
import { proxyManager } from './proxy.service.js';
import { connection } from '../config/redis.js';
import dotenv from 'dotenv';

dotenv.config({
    path: '.env',
});

// NOTE: The synchronous /api/audit endpoint (job.controller.js) now processes
// URLs inline and no longer requires Redis/queue. The queue + worker below are
// retained for optional background/durable processing.

export const auditQueue = new Queue('audit-queue', { connection });

// Temporary storage for completed results (used by the background worker path)
export const jobResultsStore = new Map();

export function initWorker() {
  
    const workerConnection = connection.duplicate();

    new Worker(
        'audit-queue',
        async (job) => {
            const { batchId, targetUrl, index } = job.data;
            
            if (!jobResultsStore.has(batchId)) jobResultsStore.set(batchId, []);
            const results = jobResultsStore.get(batchId);

            try {
                const result = await runCheckWithRetry(targetUrl, proxyManager, 3);
                // Preserve input order within the batch
                results[index] = result;
            } catch (err) {
                // Never let a job disappear silently: record the failure so the
                // batch always reflects every enqueued URL.
                results[index] = {
                    success: false,
                    inputUrl: targetUrl,
                    error: `Worker error: ${err?.message || String(err)}`,
                    chain: []
                };
            }
        },
        { connection: workerConnection, concurrency: 3 }
    );
}
