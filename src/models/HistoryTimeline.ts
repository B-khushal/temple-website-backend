import { Schema, model } from 'mongoose';

const HistoryTimelineSchema = new Schema(
  {
    year: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    type: {
      type: String,
      enum: ['Foundation', 'Milestone', 'Expansion', 'Renovation', 'Event'],
      default: 'Milestone',
      required: true,
    },
    order: { type: Number, default: 0, index: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const HistoryTimeline = model('HistoryTimeline', HistoryTimelineSchema);
export default HistoryTimeline;
