import { Schema, model } from 'mongoose';

const FounderSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, default: 'Founder' },
    imageUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    period: { type: String, required: true },
    order: { type: Number, default: 0 },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const Founder = model('Founder', FounderSchema);
export default Founder;
