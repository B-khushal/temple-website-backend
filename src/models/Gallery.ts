import { Schema, model } from 'mongoose';

const GallerySchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
    },
    thumbnailUrl: {
      type: String,
    },
    album: {
      type: String,
      default: 'General',
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Gallery = model('Gallery', GallerySchema);
export default Gallery;
