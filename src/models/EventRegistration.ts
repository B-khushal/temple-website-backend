import { Schema, model } from 'mongoose';

const EventRegistrationSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
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
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    guestsCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['Attending', 'Maybe', 'Checked In'],
      default: 'Attending',
      index: true,
    },
    attended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const EventRegistration = model('EventRegistration', EventRegistrationSchema);
export default EventRegistration;
