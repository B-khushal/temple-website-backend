import { Schema, model } from 'mongoose';

const DonationSchema = new Schema(
  {
    donorName: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    donationType: {
      type: String,
      required: [true, 'Donation type is required'],
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    itemDescription: {
      type: String,
      trim: true,
    },
    itemDetails: {
      type: String,
      trim: true,
    },
    purpose: {
      type: String,
      default: 'General Donation',
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      trim: true,
    },
    receiptNumber: {
      type: String,
      required: [true, 'Receipt number is required'],
      unique: true,
      trim: true,
    },
    transactionReference: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Cancelled'],
      default: 'Pending',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

DonationSchema.pre('save', function (next) {
  const doc = this as any;
  if (doc.donationType && !doc.type) doc.type = doc.donationType;
  if (doc.type && !doc.donationType) doc.donationType = doc.type;

  if (doc.itemDescription && !doc.itemDetails) doc.itemDetails = doc.itemDescription;
  if (doc.itemDetails && !doc.itemDescription) doc.itemDescription = doc.itemDetails;

  next();
});

export const Donation = model('Donation', DonationSchema);
