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
    role_category: {
      type: String,
      enum: ['CHAIRMAN', 'GENERAL_SECRETARY', 'TREASURER', 'VICE_CHAIRMAN', 'JOINT_SECRETARY', 'ORGANISING_SECRETARY', 'EXECUTIVE_MEMBER', 'ADVISOR', 'PAST_MEMBER'],
      default: 'EXECUTIVE_MEMBER',
    },
    roleCategory: {
      type: String,
    },
    display_order: {
      type: Number,
      default: 0,
    },
    displayOrder: {
      type: Number,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
    },
    photo_url: {
      type: String,
    },
    photoUrl: {
      type: String,
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

  // Sync roleCategory and role_category
  if (doc.roleCategory && !doc.get('role_category')) doc.set('role_category', doc.roleCategory);
  if (doc.get('role_category') && !doc.roleCategory) doc.roleCategory = doc.get('role_category');

  // Sync displayOrder and display_order
  if (doc.displayOrder !== undefined && doc.get('display_order') === undefined) doc.set('display_order', doc.displayOrder);
  if (doc.get('display_order') !== undefined && doc.displayOrder === undefined) doc.displayOrder = doc.get('display_order');

  // Sync isActive and is_active
  if (doc.isActive !== undefined && doc.get('is_active') === undefined) doc.set('is_active', doc.isActive);
  if (doc.get('is_active') !== undefined && doc.isActive === undefined) doc.isActive = doc.get('is_active');

  // Sync photoUrl, photo_url, imageUrl, and image
  if (doc.photoUrl && !doc.get('photo_url')) doc.set('photo_url', doc.photoUrl);
  if (doc.get('photo_url') && !doc.photoUrl) doc.photoUrl = doc.get('photo_url');
  if (doc.imageUrl && !doc.get('photo_url')) doc.set('photo_url', doc.imageUrl);
  if (doc.get('photo_url') && !doc.imageUrl) doc.imageUrl = doc.get('photo_url');
  if (doc.image && !doc.get('photo_url')) doc.set('photo_url', doc.image);
  if (doc.get('photo_url') && !doc.image) doc.image = doc.get('photo_url');

  // Sync contact details
  if (!doc.contactDetails) doc.contactDetails = { email: '', phone: '' };
  if (doc.email && !doc.contactDetails.email) doc.contactDetails.email = doc.email;
  if (doc.contactDetails.email && !doc.email) doc.email = doc.contactDetails.email;

  if (doc.phone && !doc.contactDetails.phone) doc.contactDetails.phone = doc.phone;
  if (doc.contactDetails.phone && !doc.phone) doc.phone = doc.contactDetails.phone;

  next();
});

export const CommitteeMember = model('CommitteeMember', CommitteeMemberSchema);
