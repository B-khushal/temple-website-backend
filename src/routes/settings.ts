import { Router, Request, Response } from 'express';
import { Setting } from '../models/Setting';
import { AuditLog } from '../models/AuditLog';
import { Donation } from '../models/Donation';
import { Asset } from '../models/Asset';
import { CommitteeMember } from '../models/CommitteeMember';
import { WebsiteSetting } from '../models/WebsiteSetting';
import { authenticateJWT, requireRoles, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import { exportDatabase, restoreDatabase, listBackups } from '../utils/backup';
import logger from '../config/logger';
import { cache } from '../utils/cache';

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

    // Registered Devotees (distinct donors)
    const uniqueDonors = await Donation.distinct('donorName');
    const registeredDevotees = uniqueDonors.length;

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

// -------------------------------------------------------------
// Website Visibility Control Endpoints (GET, PUT, PATCH)
// -------------------------------------------------------------

// Presets Mapping
const PRESETS: Record<string, Record<string, boolean>> = {
  'Temple Basic Mode': {
    hero_enabled: true,
    statistics_enabled: true,
    stat_heritage_enabled: true,
    stat_devotees_enabled: true,
    stat_assets_enabled: false,
    stat_committee_enabled: true,
    stat_band_devotees_enabled: true,
    stat_band_funds_enabled: true,
    stat_band_ledger_enabled: true,
    welcome_enabled: true,
    highlights_enabled: true,
    featured_sections_enabled: true,
    about_enabled: true,
    temple_history_enabled: true,
    founders_enabled: true,
    founders_history_enabled: true,
    mission_vision_enabled: true,
    committee_enabled: true,
    chairman_card_enabled: true,
    gen_secretary_card_enabled: true,
    treasurer_card_enabled: true,
    advisors_enabled: false,
    executive_members_enabled: false,
    former_members_enabled: false,
    donations_enabled: false,
    donation_progress_enabled: false,
    donation_campaigns_enabled: false,
    donation_qr_enabled: false,
    donation_bank_details_enabled: false,
    donation_upi_enabled: false,
    donation_history_enabled: false,
    sponsors_enabled: false,
    top_donors_enabled: false,
    assets_enabled: false,
    asset_gallery_enabled: false,
    asset_buildings_enabled: false,
    asset_land_enabled: false,
    asset_vehicles_enabled: false,
    asset_gold_enabled: false,
    asset_financial_reports_enabled: false,
    asset_audit_reports_enabled: false,
    asset_annual_statements_enabled: false,
    asset_transparency_dashboard_enabled: false,
    gallery_enabled: true,
    videos_enabled: false,
    temple_videos_enabled: false,
    live_stream_enabled: false,
    youtube_embeds_enabled: false,
    events_enabled: true,
    festival_enabled: false,
    announcements_enabled: true,
    notices_enabled: true,
    celebrations_calendar_enabled: false,
    pooja_enabled: false,
    darshan_enabled: false,
    prasadam_enabled: false,
    seva_enabled: false,
    online_services_enabled: false,
    volunteer_registration_enabled: false,
    testimonials_enabled: true,
    member_registration_enabled: false,
    community_activities_enabled: false,
    newsletter_enabled: false,
    contact_enabled: true,
    map_enabled: true,
    phone_numbers_enabled: true,
    email_addresses_enabled: true,
    social_links_enabled: true,
    whatsapp_button_enabled: true,
    footer_sections_enabled: true,
    copyright_enabled: true,
    quick_links_enabled: true,
    visitor_counter_enabled: true,
    privacy_policy_enabled: true,
    terms_conditions_enabled: true,
  },
  'Temple Full Mode': {
    hero_enabled: true,
    statistics_enabled: true,
    stat_heritage_enabled: true,
    stat_devotees_enabled: true,
    stat_assets_enabled: true,
    stat_committee_enabled: true,
    stat_band_devotees_enabled: true,
    stat_band_funds_enabled: true,
    stat_band_ledger_enabled: true,
    welcome_enabled: true,
    highlights_enabled: true,
    featured_sections_enabled: true,
    about_enabled: true,
    temple_history_enabled: true,
    founders_enabled: true,
    founders_history_enabled: true,
    mission_vision_enabled: true,
    committee_enabled: true,
    chairman_card_enabled: true,
    gen_secretary_card_enabled: true,
    treasurer_card_enabled: true,
    advisors_enabled: true,
    executive_members_enabled: true,
    former_members_enabled: true,
    donations_enabled: true,
    donation_progress_enabled: true,
    donation_campaigns_enabled: true,
    donation_qr_enabled: true,
    donation_bank_details_enabled: true,
    donation_upi_enabled: true,
    donation_history_enabled: true,
    sponsors_enabled: true,
    top_donors_enabled: true,
    assets_enabled: true,
    asset_gallery_enabled: true,
    asset_buildings_enabled: true,
    asset_land_enabled: true,
    asset_vehicles_enabled: true,
    asset_gold_enabled: true,
    asset_financial_reports_enabled: true,
    asset_audit_reports_enabled: true,
    asset_annual_statements_enabled: true,
    asset_transparency_dashboard_enabled: true,
    gallery_enabled: true,
    videos_enabled: true,
    temple_videos_enabled: true,
    live_stream_enabled: true,
    youtube_embeds_enabled: true,
    events_enabled: true,
    festival_enabled: true,
    announcements_enabled: true,
    notices_enabled: true,
    celebrations_calendar_enabled: true,
    pooja_enabled: true,
    darshan_enabled: true,
    prasadam_enabled: true,
    seva_enabled: true,
    online_services_enabled: true,
    volunteer_registration_enabled: true,
    testimonials_enabled: true,
    member_registration_enabled: true,
    community_activities_enabled: true,
    newsletter_enabled: true,
    contact_enabled: true,
    map_enabled: true,
    phone_numbers_enabled: true,
    email_addresses_enabled: true,
    social_links_enabled: true,
    whatsapp_button_enabled: true,
    footer_sections_enabled: true,
    copyright_enabled: true,
    quick_links_enabled: true,
    visitor_counter_enabled: true,
    privacy_policy_enabled: true,
    terms_conditions_enabled: true,
  },
  'Festival Mode': {
    hero_enabled: true,
    statistics_enabled: true,
    stat_heritage_enabled: true,
    stat_devotees_enabled: true,
    stat_assets_enabled: true,
    stat_committee_enabled: true,
    stat_band_devotees_enabled: true,
    stat_band_funds_enabled: true,
    stat_band_ledger_enabled: true,
    welcome_enabled: true,
    highlights_enabled: true,
    featured_sections_enabled: true,
    about_enabled: true,
    temple_history_enabled: true,
    founders_enabled: true,
    founders_history_enabled: true,
    mission_vision_enabled: true,
    committee_enabled: true,
    chairman_card_enabled: true,
    gen_secretary_card_enabled: true,
    treasurer_card_enabled: true,
    advisors_enabled: true,
    executive_members_enabled: true,
    former_members_enabled: false,
    donations_enabled: true,
    donation_progress_enabled: true,
    donation_campaigns_enabled: true,
    donation_qr_enabled: true,
    donation_bank_details_enabled: true,
    donation_upi_enabled: true,
    donation_history_enabled: false,
    sponsors_enabled: true,
    top_donors_enabled: true,
    assets_enabled: false,
    asset_gallery_enabled: false,
    asset_buildings_enabled: false,
    asset_land_enabled: false,
    asset_vehicles_enabled: false,
    asset_gold_enabled: false,
    asset_financial_reports_enabled: false,
    asset_audit_reports_enabled: false,
    asset_annual_statements_enabled: false,
    asset_transparency_dashboard_enabled: false,
    gallery_enabled: true,
    videos_enabled: true,
    temple_videos_enabled: true,
    live_stream_enabled: true,
    youtube_embeds_enabled: true,
    events_enabled: true,
    festival_enabled: true,
    announcements_enabled: true,
    notices_enabled: true,
    celebrations_calendar_enabled: true,
    pooja_enabled: true,
    darshan_enabled: true,
    prasadam_enabled: true,
    seva_enabled: true,
    online_services_enabled: true,
    volunteer_registration_enabled: true,
    testimonials_enabled: true,
    member_registration_enabled: true,
    community_activities_enabled: true,
    newsletter_enabled: true,
    contact_enabled: true,
    map_enabled: true,
    phone_numbers_enabled: true,
    email_addresses_enabled: true,
    social_links_enabled: true,
    whatsapp_button_enabled: true,
    footer_sections_enabled: true,
    copyright_enabled: true,
    quick_links_enabled: true,
    visitor_counter_enabled: true,
    privacy_policy_enabled: true,
    terms_conditions_enabled: true,
  },
  'Navaratri Mode': {
    hero_enabled: true,
    statistics_enabled: true,
    stat_heritage_enabled: true,
    stat_devotees_enabled: true,
    stat_assets_enabled: true,
    stat_committee_enabled: true,
    stat_band_devotees_enabled: true,
    stat_band_funds_enabled: true,
    stat_band_ledger_enabled: true,
    welcome_enabled: true,
    highlights_enabled: true,
    featured_sections_enabled: true,
    about_enabled: true,
    temple_history_enabled: true,
    founders_enabled: true,
    founders_history_enabled: true,
    mission_vision_enabled: true,
    committee_enabled: true,
    chairman_card_enabled: true,
    gen_secretary_card_enabled: true,
    treasurer_card_enabled: true,
    advisors_enabled: true,
    executive_members_enabled: true,
    former_members_enabled: false,
    donations_enabled: true,
    donation_progress_enabled: true,
    donation_campaigns_enabled: true,
    donation_qr_enabled: true,
    donation_bank_details_enabled: true,
    donation_upi_enabled: true,
    donation_history_enabled: false,
    sponsors_enabled: true,
    top_donors_enabled: true,
    assets_enabled: false,
    asset_gallery_enabled: false,
    asset_buildings_enabled: false,
    asset_land_enabled: false,
    asset_vehicles_enabled: false,
    asset_gold_enabled: false,
    asset_financial_reports_enabled: false,
    asset_audit_reports_enabled: false,
    asset_annual_statements_enabled: false,
    asset_transparency_dashboard_enabled: false,
    gallery_enabled: true,
    videos_enabled: true,
    temple_videos_enabled: true,
    live_stream_enabled: true,
    youtube_embeds_enabled: true,
    events_enabled: true,
    festival_enabled: true,
    announcements_enabled: true,
    notices_enabled: true,
    celebrations_calendar_enabled: true,
    pooja_enabled: true,
    darshan_enabled: true,
    prasadam_enabled: true,
    seva_enabled: true,
    online_services_enabled: true,
    volunteer_registration_enabled: true,
    testimonials_enabled: true,
    member_registration_enabled: true,
    community_activities_enabled: true,
    newsletter_enabled: true,
    contact_enabled: true,
    map_enabled: true,
    phone_numbers_enabled: true,
    email_addresses_enabled: true,
    social_links_enabled: true,
    whatsapp_button_enabled: true,
    footer_sections_enabled: true,
    copyright_enabled: true,
    quick_links_enabled: true,
    visitor_counter_enabled: true,
    privacy_policy_enabled: true,
    terms_conditions_enabled: true,
  },
  'Maintenance Mode': {
    hero_enabled: true,
    statistics_enabled: false,
    stat_heritage_enabled: false,
    stat_devotees_enabled: false,
    stat_assets_enabled: false,
    stat_committee_enabled: false,
    stat_band_devotees_enabled: false,
    stat_band_funds_enabled: false,
    stat_band_ledger_enabled: false,
    welcome_enabled: false,
    highlights_enabled: false,
    featured_sections_enabled: false,
    about_enabled: false,
    temple_history_enabled: false,
    founders_enabled: false,
    founders_history_enabled: false,
    mission_vision_enabled: false,
    committee_enabled: false,
    chairman_card_enabled: false,
    gen_secretary_card_enabled: false,
    treasurer_card_enabled: false,
    advisors_enabled: false,
    executive_members_enabled: false,
    former_members_enabled: false,
    donations_enabled: false,
    donation_progress_enabled: false,
    donation_campaigns_enabled: false,
    donation_qr_enabled: false,
    donation_bank_details_enabled: false,
    donation_upi_enabled: false,
    donation_history_enabled: false,
    sponsors_enabled: false,
    top_donors_enabled: false,
    assets_enabled: false,
    asset_gallery_enabled: false,
    asset_buildings_enabled: false,
    asset_land_enabled: false,
    asset_vehicles_enabled: false,
    asset_gold_enabled: false,
    asset_financial_reports_enabled: false,
    asset_audit_reports_enabled: false,
    asset_annual_statements_enabled: false,
    asset_transparency_dashboard_enabled: false,
    gallery_enabled: false,
    videos_enabled: false,
    temple_videos_enabled: false,
    live_stream_enabled: false,
    youtube_embeds_enabled: false,
    events_enabled: false,
    festival_enabled: false,
    announcements_enabled: true,
    notices_enabled: true,
    celebrations_calendar_enabled: false,
    pooja_enabled: false,
    darshan_enabled: false,
    prasadam_enabled: false,
    seva_enabled: false,
    online_services_enabled: false,
    volunteer_registration_enabled: false,
    testimonials_enabled: false,
    member_registration_enabled: false,
    community_activities_enabled: false,
    newsletter_enabled: false,
    contact_enabled: true,
    map_enabled: false,
    phone_numbers_enabled: true,
    email_addresses_enabled: true,
    social_links_enabled: true,
    whatsapp_button_enabled: false,
    footer_sections_enabled: false,
    copyright_enabled: true,
    quick_links_enabled: false,
    visitor_counter_enabled: false,
    privacy_policy_enabled: false,
    terms_conditions_enabled: false,
  },
  'Donation Drive Mode': {
    hero_enabled: true,
    statistics_enabled: true,
    stat_heritage_enabled: true,
    stat_devotees_enabled: true,
    stat_assets_enabled: true,
    stat_committee_enabled: true,
    stat_band_devotees_enabled: true,
    stat_band_funds_enabled: true,
    stat_band_ledger_enabled: true,
    welcome_enabled: true,
    highlights_enabled: true,
    featured_sections_enabled: true,
    about_enabled: true,
    temple_history_enabled: false,
    founders_enabled: false,
    founders_history_enabled: false,
    mission_vision_enabled: true,
    committee_enabled: true,
    chairman_card_enabled: true,
    gen_secretary_card_enabled: true,
    treasurer_card_enabled: true,
    advisors_enabled: false,
    executive_members_enabled: false,
    former_members_enabled: false,
    donations_enabled: true,
    donation_progress_enabled: true,
    donation_campaigns_enabled: true,
    donation_qr_enabled: true,
    donation_bank_details_enabled: true,
    donation_upi_enabled: true,
    donation_history_enabled: true,
    sponsors_enabled: true,
    top_donors_enabled: true,
    assets_enabled: false,
    asset_gallery_enabled: false,
    asset_buildings_enabled: false,
    asset_land_enabled: false,
    asset_vehicles_enabled: false,
    asset_gold_enabled: false,
    asset_financial_reports_enabled: false,
    asset_audit_reports_enabled: false,
    asset_annual_statements_enabled: false,
    asset_transparency_dashboard_enabled: false,
    gallery_enabled: true,
    videos_enabled: false,
    temple_videos_enabled: false,
    live_stream_enabled: false,
    youtube_embeds_enabled: false,
    events_enabled: true,
    festival_enabled: false,
    announcements_enabled: true,
    notices_enabled: true,
    celebrations_calendar_enabled: false,
    pooja_enabled: false,
    darshan_enabled: false,
    prasadam_enabled: false,
    seva_enabled: false,
    online_services_enabled: false,
    volunteer_registration_enabled: true,
    testimonials_enabled: true,
    member_registration_enabled: false,
    community_activities_enabled: false,
    newsletter_enabled: true,
    contact_enabled: true,
    map_enabled: true,
    phone_numbers_enabled: true,
    email_addresses_enabled: true,
    social_links_enabled: true,
    whatsapp_button_enabled: true,
    footer_sections_enabled: true,
    copyright_enabled: true,
    quick_links_enabled: true,
    visitor_counter_enabled: true,
    privacy_policy_enabled: true,
    terms_conditions_enabled: true,
  }
};

// 8. Get Website Visibility Settings (Public, Cached)
router.get('/visibility', async (req: Request, res: Response) => {
  try {
    const cachedData = cache.get('visibility_settings');
    if (cachedData) {
      res.json({ success: true, data: cachedData, source: 'cache' });
      return;
    }

    const settings = await WebsiteSetting.find({}).sort({ category: 1, key: 1 });
    cache.set('visibility_settings', settings, 300000); // 5 min TTL
    res.json({ success: true, data: settings, source: 'db' });
  } catch (error: any) {
    logger.error(`Error in GET /settings/visibility: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. Update Website Visibility Settings (Admin Only)
router.put(
  '/visibility',
  authenticateJWT,
  requireRoles(['Super Admin', 'Content Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { settings, presetName } = req.body;
      const originalSettings = await WebsiteSetting.find({});

      if (presetName) {
        const mapping = PRESETS[presetName];
        if (!mapping) {
          res.status(400).json({ success: false, message: `Preset '${presetName}' not found` });
          return;
        }

        // Apply preset
        for (const [key, enabledValue] of Object.entries(mapping)) {
          await WebsiteSetting.findOneAndUpdate(
            { key },
            { $set: { enabled: enabledValue } },
            { new: true }
          );
        }
      } else if (Array.isArray(settings)) {
        // Bulk update
        for (const s of settings) {
          await WebsiteSetting.findOneAndUpdate(
            { key: s.key },
            {
              $set: {
                enabled: s.enabled,
                visibilityMode: s.visibilityMode,
                showOnlyLoggedIn: s.showOnlyLoggedIn,
                showOnlyHomepage: s.showOnlyHomepage,
                scheduleEnabled: s.scheduleEnabled,
                scheduleStartDate: s.scheduleStartDate ? new Date(s.scheduleStartDate) : null,
                scheduleEndDate: s.scheduleEndDate ? new Date(s.scheduleEndDate) : null,
                festivalOnly: s.festivalOnly,
                navaratriOnly: s.navaratriOnly,
              }
            },
            { new: true }
          );
        }
      } else {
        res.status(400).json({ success: false, message: 'Settings array or presetName is required' });
        return;
      }

      // Clear cache
      cache.del('visibility_settings');

      const updatedSettings = await WebsiteSetting.find({}).sort({ category: 1, key: 1 });

      // Log activity
      await logActivity(
        req,
        'UPDATE_VISIBILITY_SETTINGS',
        'WebsiteSetting',
        'ALL',
        originalSettings.map(s => s.toObject()),
        updatedSettings.map(s => s.toObject())
      );

      res.json({ success: true, data: updatedSettings });
    } catch (error: any) {
      logger.error(`Error in PUT /settings/visibility: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// 10. Update a Single Website Visibility Setting (Admin Only)
router.patch(
  '/visibility/:key',
  authenticateJWT,
  requireRoles(['Super Admin', 'Content Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { key } = req.params;
      const setting = await WebsiteSetting.findOne({ key });
      if (!setting) {
        res.status(404).json({ success: false, message: `Setting with key ${key} not found` });
        return;
      }

      const original = setting.toObject();
      
      const fields = [
        'enabled',
        'visibilityMode',
        'showOnlyLoggedIn',
        'showOnlyHomepage',
        'scheduleEnabled',
        'scheduleStartDate',
        'scheduleEndDate',
        'festivalOnly',
        'navaratriOnly',
      ];
      
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          if ((field === 'scheduleStartDate' || field === 'scheduleEndDate')) {
            (setting as any)[field] = req.body[field] ? new Date(req.body[field]) : null;
          } else {
            (setting as any)[field] = req.body[field];
          }
        }
      });

      await setting.save();
      
      // Clear cache
      cache.del('visibility_settings');

      // Log activity
      await logActivity(
        req,
        'UPDATE_VISIBILITY_SETTING',
        'WebsiteSetting',
        setting._id.toString(),
        original,
        setting.toObject()
      );

      res.json({ success: true, data: setting });
    } catch (error: any) {
      logger.error(`Error in PATCH /settings/visibility/:key: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
