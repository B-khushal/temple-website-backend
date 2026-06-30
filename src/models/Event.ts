import { Schema, model } from 'mongoose';

const ActivitySchema = new Schema({
  time: { type: String, required: true },
  activity: { type: String, required: true },
});

const EventSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
    },
    banner: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    location: {
      type: String,
      default: 'Temple Premises',
      trim: true,
    },
    registrationEnabled: {
      type: Boolean,
      default: true,
    },
    isFestival: {
      type: Boolean,
      default: false,
      index: true,
    },
    schedule: [ActivitySchema],
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

EventSchema.pre('save', function (next) {
  const doc = this as any;
  if (doc.banner && !doc.imageUrl) doc.imageUrl = doc.banner;
  if (doc.imageUrl && !doc.banner) doc.banner = doc.imageUrl;
  next();
});

export const Event = model('Event', EventSchema);
export default Event;
