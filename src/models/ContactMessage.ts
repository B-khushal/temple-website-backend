import { Schema, model } from 'mongoose';

const ContactMessageSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['New', 'Read', 'Replied', 'Archived'],
      default: 'New',
    },
  },
  {
    timestamps: true,
  }
);

ContactMessageSchema.pre('save', function (next) {
  const doc = this as any;
  if (doc.mobile && !doc.phone) doc.phone = doc.mobile;
  if (doc.phone && !doc.mobile) doc.mobile = doc.phone;
  next();
});

export const ContactMessage = model('ContactMessage', ContactMessageSchema);
export default ContactMessage;
