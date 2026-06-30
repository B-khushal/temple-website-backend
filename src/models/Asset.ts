import { Schema, model } from 'mongoose';

const ValuationHistorySchema = new Schema({
  date: { type: Date, default: Date.now },
  value: { type: Number, required: true },
  notes: { type: String, trim: true },
});

const AssetSchema = new Schema(
  {
    assetName: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Asset category is required'],
      trim: true,
    },
    acquisitionDate: {
      type: Date,
      required: [true, 'Acquisition date is required'],
    },
    purchaseValue: {
      type: Number,
      required: [true, 'Purchase value is required'],
      min: [0, 'Purchase value cannot be negative'],
    },
    currentValue: {
      type: Number,
      required: [true, 'Current value is required'],
      min: [0, 'Current value cannot be negative'],
    },
    currentValuation: {
      type: Number,
      min: [0, 'Current valuation cannot be negative'],
    },
    valuationDate: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Disposed'],
      default: 'Good',
    },
    valuationHistory: [ValuationHistorySchema],
  },
  {
    timestamps: true,
  }
);

AssetSchema.pre('save', function (next) {
  const doc = this as any;
  if (doc.assetName && !doc.name) doc.name = doc.assetName;
  if (doc.name && !doc.assetName) doc.assetName = doc.name;

  if (doc.currentValue !== undefined && doc.currentValuation === undefined) doc.currentValuation = doc.currentValue;
  if (doc.currentValuation !== undefined && doc.currentValue === undefined) doc.currentValue = doc.currentValuation;

  if (doc.image && !doc.imageUrl) doc.imageUrl = doc.image;
  if (doc.imageUrl && !doc.image) doc.image = doc.imageUrl;

  if (doc.notes && !doc.description) doc.description = doc.notes;
  if (doc.description && !doc.notes) doc.notes = doc.description;

  // Automatically initialize valuation history if empty
  if (doc.isNew && (!doc.valuationHistory || doc.valuationHistory.length === 0)) {
    doc.valuationHistory = [
      {
        date: doc.valuationDate || new Date(),
        value: doc.currentValue,
        notes: 'Initial Valuation on Acquisition',
      },
    ];
  }

  next();
});

export const Asset = model('Asset', AssetSchema);
export default Asset;
