import { Schema, model } from 'mongoose';

const ReportSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Monthly', 'Yearly', 'Audit', 'Custom'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalIncome: {
      type: Number,
      default: 0,
    },
    totalExpense: {
      type: Number,
      default: 0,
    },
    netCashFlow: {
      type: Number,
      default: 0,
    },
    categoryBreakdown: [
      {
        category: String,
        type: { type: String, enum: ['Income', 'Expense'] },
        totalAmount: Number,
      },
    ],
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    fileUrl: {
      type: String, // Path to PDF copy of the report, if uploaded
    },
  },
  {
    timestamps: true,
  }
);

export const Report = model('Report', ReportSchema);
export default Report;
