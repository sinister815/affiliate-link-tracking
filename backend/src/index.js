import express from 'express';
import dotenv from "dotenv";
import { connectDB } from './config/db.js';

dotenv.config({
    path: '.env'
});

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

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

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
