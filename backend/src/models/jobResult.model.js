import mongoose from 'mongoose';

// Subdocument Schema for individual hop data
const redirectHopSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true },
    statusCode: { type: Number, required: true }, // 301, 302, 200, etc.
    url: { type: String, required: true },
    headers: { type: Map, of: String }, // Maps dynamic key-value HTTP response headers
    // TargetLocation captures the redirect destination emitted by the checker
    // (e.g. a 302 'location' header value). Kept alongside headers for fidelity.
    targetLocation: { type: String, default: null }
  },
  { _id: false } // Prevents unnecessary subdocument IDs
);

const auditResultSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true
    },
    inputUrl: { 
      type: String, 
      required: true 
    },
    finalUrl: { 
      type: String 
    },
    isValid: {          //job passed/failed
      type: Boolean, 
      default: false,
      index: true 
    },
    clickIdFound: { 
      type: String, 
      default: null 
    },
    redirectCount: { 
      type: Number, 
      default: 0 
    },
    chain: [redirectHopSchema], // Array of execution steps captured during network interception
    errorMessage: { 
      type: String, 
      default: null 
    },
    createdAt: { 
      type: Date, 
      default: Date.now, 
      expires: '30d' // Auto-deletes old records after 30 days to optimize VPS disk space
    }
  }
);

// Compound Index: Optimizes bulk job status queries
auditResultSchema.index({ jobId: 1, isValid: 1 });

export const AuditResult = mongoose.model('AuditResult', auditResultSchema);