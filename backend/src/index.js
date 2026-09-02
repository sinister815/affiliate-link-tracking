import express from 'express'
import cors from 'cors';
import dotenv from "dotenv";
import { connectDB } from './config/db.js';
import { initSSEBroadcaster, addSSEClient, removeSSEClient } from './services/events.js';

dotenv.config({
    path: '.env'
});

const app = express();
const PORT = process.env.PORT || 5000;

// Allow requests from the deployed frontend
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ── SSE: real-time job completion events ─────────────────────────────────────
app.get('/api/audit/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  addSSEClient(res);

  // Send a keepalive comment every 30 s so proxies/browsers don't close
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 30000);

  req.on('close', () => {
    clearInterval(keepalive);
    removeSSEClient(res);
  });
});

import auditRouter from './routes/job.route.js';
app.use('/api/audit', auditRouter);

// Establish the database connection before serving traffic. When Mongo is
// unreachable the app starts in degraded mode (audits still run; persistence
// is best-effort per-request). Set MONGODB_REQUIRED=true to fail-fast instead.
const dbReady = await connectDB().catch((err) => {
    if (process.env.MONGODB_REQUIRED === 'true') {
        console.error('FATAL: MongoDB required but connection failed:', err.message);
        process.exit(1);
    }
    return false;
});

console.log(dbReady)

// Start SSE broadcaster (subscribes to Redis job-events channel)
initSSEBroadcaster();

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
