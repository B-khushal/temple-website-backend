import { Schema, model } from 'mongoose';

const BudgetSchema = new Schema(
  {
    category: {
      type: String,
      required: [true, 'Budget category is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Allocated budget amount is required'],
      min: [0, 'Budget cannot be negative'],
    },
    year: {
      type: Number,
      required: [true, 'Budget year is required'],
    },
    month: {
      type: Number, // 1-12 (Optional, if undefined it represents an annual budget)
    },
    spent: {
      type: Number,
      default: 0,
      min: [0, 'Spent amount cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a single budget entry per category/year/month combination
BudgetSchema.index({ category: 1, year: 1, month: 1 }, { unique: true });

export const Budget = model('Budget', BudgetSchema);
export default Budget;
