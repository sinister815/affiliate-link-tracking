import { connection } from '../config/redis.js';

const CHANNEL = 'job-events';

/** Set of active SSE client responses. */
const sseClients = new Set();

let subscriber = null;

/**
 * Publish a job event to the Redis channel so the Express SSE broadcaster
 * can forward it to connected browser clients.
 */
export function publishJobEvent(event) {
  try {
    connection.publish(CHANNEL, JSON.stringify(event));
  } catch (err) {
    console.warn('[events] Failed to publish job event:', err.message);
  }
}

/**
 * Start a Redis subscriber that listens for job events and forwards them
 * to all connected SSE clients. Call once when the Express server boots.
 */
export function initSSEBroadcaster() {
  subscriber = connection.duplicate();

  subscriber.subscribe(CHANNEL, (err) => {
    if (err) {
      console.error('[events] Redis subscribe error:', err.message);
    } else {
      console.log('[events] Subscribed to', CHANNEL);
    }
  });

  subscriber.on('message', (_channel, message) => {
    for (const res of sseClients) {
      try {
        res.write(`data: ${message}\n\n`);
      } catch {
        // Client likely disconnected — will be cleaned up on 'close'
        sseClients.delete(res);
      }
    }
  });
}

/** Register an SSE response as a listener. */
export function addSSEClient(res) {
  sseClients.add(res);
}

/** Unregister an SSE response. */
export function removeSSEClient(res) {
  sseClients.delete(res);
}
