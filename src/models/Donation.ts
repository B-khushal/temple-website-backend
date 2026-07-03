import { Schema, model } from 'mongoose';

const premiumDonationTypes = [
  'General Donation',
  'Annadanam',
  'Temple Construction',
  'Hundi Collection',
  'Festival Donation',
  'Pooja Donation',
  'Seva Donation',
  'Corpus Fund',
  'Maintenance Fund',
  'Special Event Donation',
  'Other',
];

const legacyDonationTypes = ['Monetary', 'Gold', 'Silver', 'Asset', 'Construction', 'Community Service'];

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
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
    },
    aadhaarNumber: {
      type: String,
      trim: true,
    },
    existingDonor: {
      type: Boolean,
      default: false,
    },
    memberType: {
      type: String,
      enum: ['Member', 'Non-member'],
      default: 'Non-member',
    },
    donationType: {
      type: String,
      required: [true, 'Donation type is required'],
      enum: [...premiumDonationTypes, ...legacyDonationTypes],
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Donation amount is required'],
      default: 0,
      min: [0, 'Donation amount cannot be negative'],
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
      trim: true,
      default: 'Cash',
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
    upiReferenceNumber: {
      type: String,
      trim: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    receiptNumber: {
      type: String,
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
    donationDate: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    chequeNumber: {
      type: String,
      trim: true,
    },
    notes: {
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

DonationSchema.pre('validate', function (next) {
  const doc = this as any;

  if (doc.donationType && !doc.type) doc.type = doc.donationType;
  if (doc.type && !doc.donationType) doc.donationType = doc.type;

  if (doc.itemDescription && !doc.itemDetails) doc.itemDetails = doc.itemDescription;
  if (doc.itemDetails && !doc.itemDescription) doc.itemDescription = doc.itemDetails;

  if (!doc.paymentMethod) doc.paymentMethod = 'Cash';
  if (doc.donationDate && !doc.date) doc.date = doc.donationDate;
  if (doc.date && !doc.donationDate) doc.donationDate = doc.date;

  if (doc.transactionId && !doc.transactionReference) doc.transactionReference = doc.transactionId;
  if (doc.transactionReference && !doc.transactionId) doc.transactionId = doc.transactionReference;

  const amount = Math.max(0, Number(doc.amount || 0));
  const enteredPaidAmount = Math.max(0, Number(doc.paidAmount || 0));

  if (doc.paymentStatus === 'Due') {
    doc.paidAmount = 0;
    doc.dueAmount = amount;
  } else if (doc.paymentStatus === 'Partial') {
    doc.paidAmount = Math.min(amount, enteredPaidAmount);
    doc.dueAmount = Math.max(0, amount - doc.paidAmount);
  } else {
    doc.paymentStatus = 'Paid';
    doc.paidAmount = amount;
    doc.dueAmount = 0;
  }

  next();
});

export const Donation = model('Donation', DonationSchema);
