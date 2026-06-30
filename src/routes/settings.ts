import { Router, Request, Response } from 'express';
import { Setting } from '../models/Setting';
import { AuditLog } from '../models/AuditLog';
import { Donation } from '../models/Donation';
import { Asset } from '../models/Asset';
import { CommitteeMember } from '../models/CommitteeMember';
import { authenticateJWT, requireRoles, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import { exportDatabase, restoreDatabase, listBackups } from '../utils/backup';
import logger from '../config/logger';

const router = Router();

// 1. Get Settings (Public)
router.get('/', async (req: Request, res: Response) => {
  try {
    let settings = await Setting.findOne({ key: 'general' });
    if (!settings) {
      settings = new Setting({ key: 'general' });
      await settings.save();
    }
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Update Settings (Admin Only)
router.put(
  '/', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager', 'Committee Member']), 
  async (req: AuthRequest, res: Response) => {
    try {
      let settings = await Setting.findOne({ key: 'general' });
      if (!settings) {
        settings = new Setting({ key: 'general' });
      }

      const original = settings.toObject();
      Object.assign(settings, req.body);

      await settings.save();

      await logActivity(req, 'UPDATE_SETTINGS', 'Setting', settings._id.toString(), original, settings.toObject());

      res.json({ success: true, data: settings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// 3. Get Audit Logs (Super Admin Only)
router.get(
  '/logs', 
  authenticateJWT, 
  requireRoles(['Super Admin']), 
  async (req: AuthRequest, res: Response) => {
    try {
      const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(100);
      res.json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// 4. Trigger Backup (Super Admin Only)
router.post(
  '/backup/export', 
  authenticateJWT, 
  requireRoles(['Super Admin']), 
  async (req: AuthRequest, res: Response) => {
    try {
      const backupResult = await exportDatabase();
      await logActivity(req, 'EXPORT_DATABASE_BACKUP', 'Backup', 'N/A', null, backupResult);
      res.json(backupResult);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// 5. List Backups (Super Admin Only)
router.get(
  '/backup/list', 
  authenticateJWT, 
  requireRoles(['Super Admin']), 
  async (req: AuthRequest, res: Response) => {
    try {
      const backups = listBackups();
      res.json({ success: true, backups });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// 6. Trigger Restore (Super Admin Only)
router.post(
  '/backup/restore', 
  authenticateJWT, 
  requireRoles(['Super Admin']), 
  async (req: AuthRequest, res: Response) => {
    const { backupFolderName } = req.body;

    if (!backupFolderName) {
      res.status(400).json({ success: false, message: 'backupFolderName is required' });
      return;
    }

    try {
      const restoreResult = await restoreDatabase(backupFolderName);
      if (!restoreResult.success) {
        res.status(400).json(restoreResult);
        return;
      }
      
      await logActivity(req, 'RESTORE_DATABASE_BACKUP', 'Backup', 'N/A', { backupFolderName }, restoreResult);
      res.json(restoreResult);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// 7. Get Public Statistics (Public)
router.get('/public-stats', async (req: Request, res: Response) => {
  try {
    // Sum total monetary donations
    const donationSum = await Donation.aggregate([
      { 
        $match: { 
          $or: [{ type: 'Monetary' }, { donationType: 'Monetary' }],
          status: 'Verified' 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDonations = donationSum.length > 0 ? donationSum[0].total : 0;

    // Sum total assets valuation
    const assetSum = await Asset.aggregate([
      { $match: { status: { $ne: 'Disposed' } } },
      { $group: { _id: null, total: { $sum: '$currentValue' } } }
    ]);
    const totalAssetsValuation = assetSum.length > 0 ? assetSum[0].total : 0;

    // Years of Heritage since 1984
    const yearsOfHeritage = new Date().getFullYear() - 1984;

    // Registered Devotees (base 25000 + distinct donors)
    const uniqueDonors = await Donation.distinct('donorName');
    const registeredDevotees = 25000 + uniqueDonors.length;

    // Active Committee Members
    const activeCommitteeCount = await CommitteeMember.countDocuments({ status: 'Active', category: 'Current Committee' });

    res.json({
      success: true,
      data: {
        totalDonations,
        totalAssetsValuation,
        yearsOfHeritage,
        registeredDevotees,
        activeCommitteeCount,
      }
    });
  } catch (error: any) {
    logger.error(`Error in public stats: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
