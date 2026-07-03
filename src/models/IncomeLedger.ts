import { Schema, model } from 'mongoose';

const IncomeLedgerSchema = new Schema(
  {
    ledgerType: {
      type: String,
      required: true,
      default: 'income',
      enum: ['income'],
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Due', 'Partial'],
      required: true,
      default: 'Paid',
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: [0, 'Due amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

IncomeLedgerSchema.index({ source: 1, sourceId: 1 }, { unique: true });
IncomeLedgerSchema.index({ transactionDate: -1 });
IncomeLedgerSchema.index({ paymentStatus: 1 });

export const IncomeLedger = model('IncomeLedger', IncomeLedgerSchema);
export default IncomeLedger;
