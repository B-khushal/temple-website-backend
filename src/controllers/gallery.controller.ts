import { Response } from 'express';
import { Gallery } from '../models/Gallery';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import { uploadFile } from '../services/CloudinaryService';
import logger from '../config/logger';

// List Gallery Items
export const getGallery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, album } = req.query;
    const filter: any = {};

    if (category) filter.category = category;
    if (album) filter.album = album;

    const items = await Gallery.find(filter).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, items, data: items });
  } catch (error: any) {
    logger.error(`Error in getGallery: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Gallery Item
export const createGalleryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = new Gallery(req.body);
    await item.save();

    await logActivity(req, 'CREATE_GALLERY_ITEM', 'Gallery', item._id.toString(), null, item.toObject());

    res.status(201).json({ success: true, item, data: item });
  } catch (error: any) {
    logger.error(`Error in createGalleryItem: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Gallery Item
export const deleteGalleryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const item = await Gallery.findById(id);
    if (!item) {
      res.status(404).json({ success: false, message: 'Gallery item not found' });
      return;
    }

    const original = item.toObject();
    await item.deleteOne();

    await logActivity(req, 'DELETE_GALLERY_ITEM', 'Gallery', id, original, null);

    res.json({ success: true, message: 'Gallery item deleted successfully' });
  } catch (error: any) {
    logger.error(`Error in deleteGalleryItem: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Gallery Item
export const updateGalleryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const item = await Gallery.findById(id);
    if (!item) {
      res.status(404).json({ success: false, message: 'Gallery item not found' });
      return;
    }

    const original = item.toObject();
    Object.assign(item, req.body);
    await item.save();

    await logActivity(req, 'UPDATE_GALLERY_ITEM', 'Gallery', id, original, item.toObject());

    res.json({ success: true, item });
  } catch (error: any) {
    logger.error(`Error in updateGalleryItem: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Handles file uploads, dispatches to Cloudinary and returns secure URL metadata
export const handleUpload = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded.' });
      return;
    }

    const uploadResult = await uploadFile(req.file.path);
    
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      url: uploadResult.url,
      key: uploadResult.key,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error: any) {
    logger.error(`Upload controller error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
