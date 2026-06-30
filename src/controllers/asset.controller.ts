import { Response } from 'express';
import { Asset } from '../models/Asset';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import logger from '../config/logger';

// List Assets
export const getAssets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, category, status } = req.query;
    const filter: any = {};

    if (search) {
      filter.$or = [
        { assetName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    const assets = await Asset.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, assets, data: assets });
  } catch (error: any) {
    logger.error(`Error in getAssets: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Asset
export const createAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const asset = new Asset(req.body);
    await asset.save();

    await logActivity(req, 'CREATE_ASSET', 'Asset', asset._id.toString(), null, asset.toObject());

    res.status(201).json({ success: true, asset, data: asset });
  } catch (error: any) {
    logger.error(`Error in createAsset: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Asset
export const updateAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const asset = await Asset.findById(id);
    if (!asset) {
      res.status(404).json({ success: false, message: 'Asset not found' });
      return;
    }

    const original = asset.toObject();
    Object.assign(asset, req.body);
    await asset.save();

    await logActivity(req, 'UPDATE_ASSET', 'Asset', id, original, asset.toObject());

    res.json({ success: true, asset, data: asset });
  } catch (error: any) {
    logger.error(`Error in updateAsset: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Asset
export const deleteAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const asset = await Asset.findById(id);
    if (!asset) {
      res.status(404).json({ success: false, message: 'Asset not found' });
      return;
    }

    const original = asset.toObject();
    await asset.deleteOne();

    await logActivity(req, 'DELETE_ASSET', 'Asset', id, original, null);

    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error: any) {
    logger.error(`Error in deleteAsset: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Revalue Asset (valuate history)
export const revalueAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { value, notes } = req.body;

  try {
    const asset = await Asset.findById(id);
    if (!asset) {
      res.status(404).json({ success: false, message: 'Asset not found' });
      return;
    }

    const original = asset.toObject();

    // Update currentValue/currentValuation
    asset.currentValue = value;
    asset.currentValuation = value;
    asset.valuationDate = new Date();

    // Push to history
    asset.valuationHistory.push({
      date: new Date(),
      value,
      notes,
    });

    await asset.save();

    await logActivity(req, 'REVALUE_ASSET', 'Asset', id, original, asset.toObject());

    res.json({ success: true, asset });
  } catch (error: any) {
    logger.error(`Error in revalueAsset: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
