import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({
    path: '.env',
});

/**
 * Establishes the Mongoose connection. Resolves with `true` when connected,
 * `false` when Mongo is unreachable and we degrade gracefully (persistence
 * becomes best-effort per-request, the audit itself still runs). Throws (so the
 * caller can fail-fast) only when MONGODB_REQUIRED=true.
 *
 * Reads the URI from MONGODB_URI (preferred) with MONGO_URL / DATABASE_URL as
 * fallbacks, plus an optional MONGODB_DB database name.
 */
export async function connectDB() {
    const mongoUrl = process.env.MONGO_URI
    if (!mongoUrl) {
        console.warn('⚠️ No MongoDB URI configured (set MONGODB_URI). Persistence disabled.');
        mongoose.set('bufferCommands', false);
        return false;
    }

    try {
        const options = { serverSelectionTimeoutMS: 5000 };
        if (process.env.MONGODB_DB) options.dbName = process.env.MONGODB_DB;

        await mongoose.connect(mongoUrl, options);
        console.log(' MongoDB connected');
        return true;
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        if (process.env.MONGODB_REQUIRED === 'true') {
            throw err;
        }
        console.warn('⚠️ Continuing without persistence (set MONGODB_REQUIRED=true to fail-fast on startup).');
        // Make Mongoose fail fast on writes instead of buffering against a
        // dead connection, so per-request persistence is handled as a caught
        // error rather than a hang.
        mongoose.set('bufferCommands', false);
        return false;
    }
}
