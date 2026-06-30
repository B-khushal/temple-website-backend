import { Schema, model } from 'mongoose';

const CommitteeMemberSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
    },
    tenureStart: {
      type: String,
      trim: true,
    },
    periodStart: {
      type: String,
      trim: true,
    },
    tenureEnd: {
      type: String,
      trim: true,
    },
    periodEnd: {
      type: String,
      trim: true,
    },
    biography: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    },
    contactDetails: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    category: {
      type: String,
      enum: ['Current Committee', 'Past Member'],
      default: 'Current Committee',
    },
  },
  {
    timestamps: true,
  }
);

CommitteeMemberSchema.pre('save', function (next) {
  const doc = this as any;
  // Sync designation and role
  if (doc.designation && !doc.role) doc.role = doc.designation;
  if (doc.role && !doc.designation) doc.designation = doc.role;

  // Sync tenureStart and periodStart
  if (doc.tenureStart && !doc.periodStart) doc.periodStart = doc.tenureStart;
  if (doc.periodStart && !doc.tenureStart) doc.tenureStart = doc.periodStart;

  // Sync tenureEnd and periodEnd
  if (doc.tenureEnd && !doc.periodEnd) doc.periodEnd = doc.tenureEnd;
  if (doc.periodEnd && !doc.tenureEnd) doc.tenureEnd = doc.periodEnd;

  // Sync biography and bio
  if (doc.biography && !doc.bio) doc.bio = doc.biography;
  if (doc.bio && !doc.biography) doc.biography = doc.bio;

  // Sync contact details
  if (!doc.contactDetails) doc.contactDetails = { email: '', phone: '' };
  if (doc.email && !doc.contactDetails.email) doc.contactDetails.email = doc.email;
  if (doc.contactDetails.email && !doc.email) doc.email = doc.contactDetails.email;

  if (doc.phone && !doc.contactDetails.phone) doc.contactDetails.phone = doc.phone;
  if (doc.contactDetails.phone && !doc.phone) doc.phone = doc.contactDetails.phone;

  next();
});

export const CommitteeMember = model('CommitteeMember', CommitteeMemberSchema);
