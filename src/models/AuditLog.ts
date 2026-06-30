import { Schema, model } from 'mongoose';

const AuditLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.Mixed, // Can be ObjectId pointing to User, or a String like "Anonymous"
      required: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    targetId: {
      type: String,
    },
    previousState: {
      type: Schema.Types.Mixed,
    },
    newState: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Custom timestamp field is used
  }
);

export const AuditLog = model('AuditLog', AuditLogSchema);
export default AuditLog;
