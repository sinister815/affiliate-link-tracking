import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    totalLinks: { 
      type: Number, 
      required: true 
    },
    completedLinks: { 
      type: Number, 
      default: 0 
    },
    failedLinks: { 
      type: Number, 
      default: 0 
    }
  },
  { 
    timestamps: true 
  }
);

export const Job = mongoose.model('Job', jobSchema);