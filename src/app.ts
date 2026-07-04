import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import morgan from 'morgan';

import { connectDB } from './config/db';
import logger from './config/logger';
import { setupSwagger } from './docs/swagger';
import { errorHandler } from './middleware/error';
import { rateLimiter, dbSanitizer, xssSanitizer } from './middleware/security';

// Import Routers
import authRoutes from './routes/auth';
import committeeRoutes from './routes/committee';
import donationRoutes from './routes/donations';
import financialRoutes from './routes/financials';
import assetRoutes from './routes/assets';
import eventRoutes from './routes/events';
import galleryRoutes from './routes/gallery';
import contactRoutes from './routes/contact';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import founderRoutes from './routes/founders';
import historyRoutes from './routes/history';
import uploadRoutes from './routes/uploads';

// Models for Seeding
import { User } from './models/User';
import { Setting } from './models/Setting';
import { Asset } from './models/Asset';
import { CommitteeMember } from './models/CommitteeMember';
import { Founder } from './models/Founder';
import { HistoryTimeline } from './models/HistoryTimeline';
import { Gallery } from './models/Gallery';
import { FinancialTransaction } from './models/FinancialTransaction';
import { Donation } from './models/Donation';
import { IncomeLedger } from './models/IncomeLedger';
import { WebsiteSetting } from './models/WebsiteSetting';
import mongoose from 'mongoose';

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Establish Database Connection
connectDB().then(() => {
  bootstrapData();
});

// 2. Logging & Morgan Setup
const morganStream = {
  write: (message: string) => logger.info(message.trim()),
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// 3. Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Prevents asset blocks in combined staging
}));
app.use(cors({
  origin: '*', // Refined to specific clients in production
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(dbSanitizer());
app.use(xssSanitizer);

// Rate Limiting applied to API routes
app.use('/api/', rateLimiter);

// 4. Serve Static uploads folder
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// 5. Setup Swagger Doc Route (/api/docs)
setupSwagger(app);

// 6. Bind API Routes
app.use('/api/auth', authRoutes);
app.use('/api/committee', committeeRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/transactions', financialRoutes); // Compat alias
app.use('/api/assets', assetRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/founders', founderRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/uploads', uploadRoutes);

// 7. Health Check Endpoint
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  if (dbConnected) {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date(),
      database: 'CONNECTED',
    });
  } else {
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date(),
      database: 'DISCONNECTED',
    });
  }
});

// 8. Serve Static Frontend in Staging
const distPath = path.join(process.cwd(), '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('SRI DURGA MATA TEMPLE API is running. Mount static client build in production.');
  });
}

// 9. Unhandled Error Middleware
app.use(errorHandler);

// Seeding Initial Data
async function bootstrapData() {
  try {
    // 0. Website Visibility Settings Seeding
    const defaultVisibilitySettings = [
      // Home Page Controls
      { key: 'hero_enabled', label: 'Hero Section', description: 'Enable or disable the main hero section banner at the top of the home page.', category: 'Home Page Controls', previewIcon: 'Layout', enabled: true },
      { key: 'statistics_enabled', label: 'Statistics', description: 'Display real-time statistics (devotee counts, ledger status, heritage years) on the home page.', category: 'Home Page Controls', previewIcon: 'BarChart2', enabled: true },
      { key: 'stat_heritage_enabled', label: 'Stat: Heritage Legacy', description: 'Show the Heritage Legacy (Years) statistic card on the home page.', category: 'Home Page Controls', previewIcon: 'Calendar', enabled: true },
      { key: 'stat_devotees_enabled', label: 'Stat: Devotee Family', description: 'Show the Devotee Family (Count) statistic card on the home page.', category: 'Home Page Controls', previewIcon: 'Users', enabled: true },
      { key: 'stat_assets_enabled', label: 'Stat: Assets Value', description: 'Show the Assets Value (INR) statistic card on the home page.', category: 'Home Page Controls', previewIcon: 'DollarSign', enabled: true },
      { key: 'stat_committee_enabled', label: 'Stat: Committee Members', description: 'Show the Committee Members statistic card on the home page.', category: 'Home Page Controls', previewIcon: 'Award', enabled: true },
      { key: 'stat_band_devotees_enabled', label: 'Stat Band: Registered Devotees', description: 'Show Registered Devotees counter in the real-time statistics band.', category: 'Home Page Controls', previewIcon: 'Users', enabled: true },
      { key: 'stat_band_funds_enabled', label: 'Stat Band: Devotion Funds', description: 'Show Total Devotion Funds counter in the real-time statistics band.', category: 'Home Page Controls', previewIcon: 'Heart', enabled: true },
      { key: 'stat_band_ledger_enabled', label: 'Stat Band: Audited Ledger', description: 'Show Audited Ledger counter in the real-time statistics band.', category: 'Home Page Controls', previewIcon: 'ShieldCheck', enabled: true },
      { key: 'welcome_enabled', label: 'Welcome Message', description: 'Show the formal welcome message from the temple trust on the home page.', category: 'Home Page Controls', previewIcon: 'MessageSquare', enabled: true },
      { key: 'highlights_enabled', label: 'Temple Highlights', description: 'Show highlighted temple services or features on the home page.', category: 'Home Page Controls', previewIcon: 'Sparkles', enabled: true },
      { key: 'featured_sections_enabled', label: 'Featured Sections', description: 'Conditionally show featured cards linking to other parts of the site.', category: 'Home Page Controls', previewIcon: 'Grid', enabled: true },

      // Temple Information
      { key: 'about_enabled', label: 'About Temple', description: 'Toggle visibility of the "About Temple" section and details page.', category: 'Temple Information', previewIcon: 'Info', enabled: true },
      { key: 'temple_history_enabled', label: 'Temple History', description: 'Show the historical timeline of the temple.', category: 'Temple Information', previewIcon: 'History', enabled: true },
      { key: 'founders_enabled', label: 'Founders', description: 'Toggle visibility of the temple founders information.', category: 'Temple Information', previewIcon: 'Users', enabled: true },
      { key: 'founders_history_enabled', label: 'Founders Timeline', description: 'Display a detailed timeline of events related to the founders.', category: 'Temple Information', previewIcon: 'GitCommit', enabled: true },
      { key: 'mission_vision_enabled', label: 'Mission & Vision', description: 'Show the temple mission, vision, and core spiritual values cards.', category: 'Temple Information', previewIcon: 'Target', enabled: true },

      // Committee Management
      { key: 'committee_enabled', label: 'Committee Section', description: 'Enable/disable the public board committee page and section.', category: 'Committee Management', previewIcon: 'Award', enabled: true },
      { key: 'chairman_card_enabled', label: 'Chairman Card', description: 'Show the details card of the Committee Chairman.', category: 'Committee Management', previewIcon: 'UserCheck', enabled: true },
      { key: 'gen_secretary_card_enabled', label: 'General Secretary Card', description: 'Show the details card of the General Secretary.', category: 'Committee Management', previewIcon: 'UserCheck', enabled: true },
      { key: 'treasurer_card_enabled', label: 'Treasurer Card', description: 'Show the details card of the Committee Treasurer.', category: 'Committee Management', previewIcon: 'UserCheck', enabled: true },
      { key: 'advisors_enabled', label: 'Advisors', description: 'Show the advisors grid in the committee page.', category: 'Committee Management', previewIcon: 'HelpCircle', enabled: true },
      { key: 'executive_members_enabled', label: 'Executive Members', description: 'Show executive committee members in the committee list.', category: 'Committee Management', previewIcon: 'Users', enabled: true },
      { key: 'former_members_enabled', label: 'Former Members Archive', description: 'Show past members directory archive.', category: 'Committee Management', previewIcon: 'Archive', enabled: true },

      // Donations
      { key: 'donations_enabled', label: 'Enable Donations', description: 'Globally enable or disable online donations.', category: 'Donations', previewIcon: 'Heart', enabled: true },
      { key: 'donation_progress_enabled', label: 'Donation Progress Bar', description: 'Show progress bar towards the annual fundraising goals.', category: 'Donations', previewIcon: 'Percent', enabled: true },
      { key: 'donation_campaigns_enabled', label: 'Donation Campaigns', description: 'Show specific running donation programs and drives.', category: 'Donations', previewIcon: 'Flag', enabled: true },
      { key: 'donation_qr_enabled', label: 'QR Donations', description: 'Display official UPI QR Code for quick scans.', category: 'Donations', previewIcon: 'QrCode', enabled: true },
      { key: 'donation_bank_details_enabled', label: 'Bank Account Details', description: 'Display direct bank transfer coordinates (IBAN, IFSC, Account Number).', category: 'Donations', previewIcon: 'CreditCard', enabled: true },
      { key: 'donation_upi_enabled', label: 'UPI Payments', description: 'Show UPI payment address and handle detail cards.', category: 'Donations', previewIcon: 'Smartphone', enabled: true },
      { key: 'donation_history_enabled', label: 'Donation History', description: 'Allow public viewing of recent verified donations ledger.', category: 'Donations', previewIcon: 'FileText', enabled: false },
      { key: 'sponsors_enabled', label: 'Sponsor Wall', description: 'Show logos and details of official temple sponsors.', category: 'Donations', previewIcon: 'Briefcase', enabled: false },
      { key: 'top_donors_enabled', label: 'Top Donors', description: 'Show top contributors hall of fame.', category: 'Donations', previewIcon: 'TrendingUp', enabled: false },

      // Assets & Financial Transparency
      { key: 'assets_enabled', label: 'Temple Assets', description: 'Toggle visibility of the temple assets overview page.', category: 'Assets & Financial Transparency', previewIcon: 'Home', enabled: true },
      { key: 'asset_gallery_enabled', label: 'Asset Gallery', description: 'Show photographs of physical assets and lands.', category: 'Assets & Financial Transparency', previewIcon: 'Image', enabled: true },
      { key: 'asset_buildings_enabled', label: 'Buildings', description: 'Show details of buildings and constructions owned by the trust.', category: 'Assets & Financial Transparency', previewIcon: 'Building2', enabled: true },
      { key: 'asset_land_enabled', label: 'Land Information', description: 'Show records of lands and properties.', category: 'Assets & Financial Transparency', previewIcon: 'Map', enabled: true },
      { key: 'asset_vehicles_enabled', label: 'Vehicles', description: 'Show records of temple vehicles and chariots.', category: 'Assets & Financial Transparency', previewIcon: 'Truck', enabled: true },
      { key: 'asset_gold_enabled', label: 'Gold Assets', description: 'Show gold, silver, and ornament registry valuations.', category: 'Assets & Financial Transparency', previewIcon: 'Activity', enabled: true },
      { key: 'asset_financial_reports_enabled', label: 'Financial Reports', description: 'Show public financial summary statements.', category: 'Assets & Financial Transparency', previewIcon: 'PieChart', enabled: false },
      { key: 'asset_audit_reports_enabled', label: 'Audit Reports', description: 'Show official third-party audit clearance certificates.', category: 'Assets & Financial Transparency', previewIcon: 'FileCheck', enabled: false },
      { key: 'asset_annual_statements_enabled', label: 'Annual Statements', description: 'Download links for annual balance sheets.', category: 'Assets & Financial Transparency', previewIcon: 'Download', enabled: false },
      { key: 'asset_transparency_dashboard_enabled', label: 'Transparency Dashboard', description: 'Show visual charts of income and expense allocation.', category: 'Assets & Financial Transparency', previewIcon: 'Compass', enabled: true },

      // Media
      { key: 'gallery_enabled', label: 'Photo Gallery', description: 'Enable photo gallery media viewer.', category: 'Media', previewIcon: 'Image', enabled: true },
      { key: 'videos_enabled', label: 'Video Gallery', description: 'Show video library folder cards.', category: 'Media', previewIcon: 'Video', enabled: true },
      { key: 'temple_videos_enabled', label: 'Temple Videos', description: 'Show direct video streams or uploaded videos.', category: 'Media', previewIcon: 'Play', enabled: true },
      { key: 'live_stream_enabled', label: 'Live Streaming', description: 'Toggle live streaming feature (Aarti / Darshan broadcasts).', category: 'Media', previewIcon: 'Radio', enabled: false },
      { key: 'youtube_embeds_enabled', label: 'YouTube Embeds', description: 'Embed official YouTube channel highlights.', category: 'Media', previewIcon: 'Youtube', enabled: true },

      // Events & Festivals
      { key: 'events_enabled', label: 'Events', description: 'Enable upcoming events listings and calendar.', category: 'Events & Festivals', previewIcon: 'Calendar', enabled: true },
      { key: 'festival_enabled', label: 'Upcoming Festivals', description: 'Show special festival announcements and countdowns.', category: 'Events & Festivals', previewIcon: 'Flame', enabled: false },
      { key: 'announcements_enabled', label: 'Announcements', description: 'Show high-priority flash banner notifications.', category: 'Events & Festivals', previewIcon: 'Volume2', enabled: true },
      { key: 'notices_enabled', label: 'Notices', description: 'Show public notice board and announcements lists.', category: 'Events & Festivals', previewIcon: 'Clipboard', enabled: true },
      { key: 'celebrations_calendar_enabled', label: 'Celebrations Calendar', description: 'Show annual celebrations grid.', category: 'Events & Festivals', previewIcon: 'CalendarDays', enabled: true },

      // Devotional Services
      { key: 'pooja_enabled', label: 'Pooja Services', description: 'Allow online booking / requests for Pooja details.', category: 'Devotional Services', previewIcon: 'Bookmark', enabled: false },
      { key: 'darshan_enabled', label: 'Darshan Booking', description: 'Allow scheduling of VIP/General Darshan passes.', category: 'Devotional Services', previewIcon: 'Ticket', enabled: false },
      { key: 'prasadam_enabled', label: 'Prasadam Booking', description: 'Enable online home delivery order requests for Laddu / Prasadam.', category: 'Devotional Services', previewIcon: 'ShoppingBag', enabled: false },
      { key: 'seva_enabled', label: 'Seva Booking', description: 'Enable sponsorship bookings for Archana, Abhishek, and other daily Sevas.', category: 'Devotional Services', previewIcon: 'Star', enabled: false },
      { key: 'online_services_enabled', label: 'Online Services', description: 'Generic online application services for devotees.', category: 'Devotional Services', previewIcon: 'Globe', enabled: false },

      // Community
      { key: 'volunteer_registration_enabled', label: 'Volunteer Registration', description: 'Allow devotees to sign up as volunteers for temple events.', category: 'Community', previewIcon: 'Hand', enabled: true },
      { key: 'testimonials_enabled', label: 'Testimonials', description: 'Show devotee feedback and experiences quotes on home page.', category: 'Community', previewIcon: 'Quote', enabled: true },
      { key: 'member_registration_enabled', label: 'Member Registration', description: 'Allow registering as a trust member online.', category: 'Community', previewIcon: 'UserPlus', enabled: false },
      { key: 'community_activities_enabled', label: 'Community Activities', description: 'Show updates about medical camps, schools, etc.', category: 'Community', previewIcon: 'ShieldAlert', enabled: true },
      { key: 'newsletter_enabled', label: 'Newsletter', description: 'Show footer email updates subscription form.', category: 'Community', previewIcon: 'Send', enabled: false },

      // Contact & Social
      { key: 'contact_enabled', label: 'Contact Section', description: 'Show contact page and form.', category: 'Contact & Social', previewIcon: 'Phone', enabled: true },
      { key: 'map_enabled', label: 'Google Maps', description: 'Embed Google map with temple location pins.', category: 'Contact & Social', previewIcon: 'MapPin', enabled: true },
      { key: 'phone_numbers_enabled', label: 'Phone Numbers', description: 'Show direct contact telephone numbers.', category: 'Contact & Social', previewIcon: 'PhoneCall', enabled: true },
      { key: 'email_addresses_enabled', label: 'Email Addresses', description: 'Show direct inquiry email links.', category: 'Contact & Social', previewIcon: 'Mail', enabled: true },
      { key: 'social_links_enabled', label: 'Social Media Links', description: 'Display icons linking to Facebook, YouTube, Instagram.', category: 'Contact & Social', previewIcon: 'Share2', enabled: true },
      { key: 'whatsapp_button_enabled', label: 'WhatsApp Button', description: 'Display floating WhatsApp direct chat support button.', category: 'Contact & Social', previewIcon: 'MessageCircle', enabled: true },

      // Footer Controls
      { key: 'footer_sections_enabled', label: 'Footer Links', description: 'Show categorized footer navigation columns.', category: 'Footer Controls', previewIcon: 'LayoutTemplate', enabled: true },
      { key: 'copyright_enabled', label: 'Copyright', description: 'Show copyright string and developer links.', category: 'Footer Controls', previewIcon: 'Lock', enabled: true },
      { key: 'quick_links_enabled', label: 'Quick Links', description: 'Show short quick-links checklist in footer.', category: 'Footer Controls', previewIcon: 'ExternalLink', enabled: true },
      { key: 'visitor_counter_enabled', label: 'Visitor Counter', description: 'Show global hit counter in footer.', category: 'Footer Controls', previewIcon: 'Eye', enabled: true },
      { key: 'privacy_policy_enabled', label: 'Privacy Policy', description: 'Show privacy policy page link.', category: 'Footer Controls', previewIcon: 'Scale', enabled: true },
      { key: 'terms_conditions_enabled', label: 'Terms & Conditions', description: 'Show terms and conditions page link.', category: 'Footer Controls', previewIcon: 'FileSignature', enabled: true }
    ];

    let seededCount = 0;
    for (const s of defaultVisibilitySettings) {
      const exists = await WebsiteSetting.findOne({ key: s.key });
      if (!exists) {
        await WebsiteSetting.create(s);
        seededCount++;
      }
    }
    if (seededCount > 0) {
      logger.info(`⚙️ Bootstrapped ${seededCount} new/missing Website Visibility settings.`);
    }

    // 1. Settings Bootstrapping
    const settings = await Setting.findOne({ key: 'general' });
    if (!settings) {
      await Setting.create({ key: 'general' });
      logger.info('⚙️ Default settings initialized.');
    }

    // 2. User Bootstrapping
    const adminCount = await User.countDocuments();
    if (adminCount === 0) {
      const defaultAdmin = new User({
        name: 'Super Administrator',
        email: 'admin@sridurgamatatemple.org',
        password: 'DurgaMataAdmin2026!',
        role: 'Super Admin',
        isEmailVerified: true,
      });
      await defaultAdmin.save();
      logger.info('🔐 Bootstrapped first Super Admin account:');
      logger.info('   Email:    admin@sridurgamatatemple.org');
      logger.info('   Password: DurgaMataAdmin2026!');
    }

    // 3. Seed Committee, Founders, History, Assets, and Transactions if completely empty
    // Clear dummy members if they exist to force reseeding the actual members
    const dummyCheck = await CommitteeMember.findOne({ name: 'Dr. Anand Verma' });
    if (dummyCheck) {
      logger.info('🧹 Cleaning up dummy committee members for new premium seeding...');
      await CommitteeMember.deleteMany({ category: { $in: ['Current Committee', 'Past Member'] } });
    }

    const memberCount = await CommitteeMember.countDocuments();
    if (memberCount === 0) {
      await CommitteeMember.create([
        // Main Office Bearers
        {
          name: 'Badodhe Sreenu',
          role: 'Chairman',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Directing the trust board, fostering spiritual growth, and leading major development programs.',
          category: 'Current Committee',
          email: 'chairman@sridurgamatatemple.org',
          phone: '9848431244',
        },
        {
          name: 'Goutham Anil Kumar',
          role: 'General Secretary',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Managing overall administration, coordinating programs, and handling correspondence.',
          category: 'Current Committee',
          email: 'secretary@sridurgamatatemple.org',
          phone: '9652079793',
        },
        {
          name: 'Gudipalli Ganesh',
          role: 'Treasurer',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Overseeing all temple accounts, verifying donation books, and directing financial planning.',
          category: 'Current Committee',
          email: 'treasurer@sridurgamatatemple.org',
          phone: '9849871099',
        },
        // Vice Chairmen
        {
          name: 'N. Yadaiah',
          role: 'Vice Chairman',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Supporting administrative functions and community outreach coordination.',
          category: 'Current Committee',
        },
        {
          name: 'K. Venkatesh Gupta',
          role: 'Vice Chairman',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Assisting in trust board coordination and spiritual event management.',
          category: 'Current Committee',
        },
        // Joint Secretaries
        {
          name: 'J. Ramesh',
          role: 'Joint Secretary',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Assisting the General Secretary in daily administrative records and schedules.',
          category: 'Current Committee',
        },
        {
          name: 'P. Srisailam',
          role: 'Joint Secretary',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Coordinating operational meetings and public relations.',
          category: 'Current Committee',
        },
        // Organising Secretaries
        {
          name: 'B. Nagaraj',
          role: 'Organising Secretary',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Organising volunteers, materials, and infrastructure for main festivals.',
          category: 'Current Committee',
        },
        {
          name: 'Rahul Kumar Sharma',
          role: 'Organising Secretary',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Managing social media communications, event logistics, and volunteer databases.',
          category: 'Current Committee',
        },
        {
          name: 'G. Madhavi Latha',
          role: 'Organising Secretary',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Coordinating women devotee activities and Navratri festival arrangements.',
          category: 'Current Committee',
        },
        {
          name: 'M. Manjula',
          role: 'Organising Secretary',
          periodStart: '2026',
          periodEnd: 'Present',
          bio: 'Directing community service drives and prasadam distribution planning.',
          category: 'Current Committee',
        },
        // Executive Members
        { name: 'M. Vignesh Goud', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'V. Venkatesh', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'B. Deepak Kumar', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'K. Chandra Shekhar', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'N. Srinath', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'C. Mahesh Goud', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'M. Bheem Rao', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'L. Harishwar Reddy', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'N. Srikanth', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'P. Teja', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'B. Sai Deepak', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'M. Vinay Kumar', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'K. Raj', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'J. Jatin', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        { name: 'Y. Malathi', role: 'Executive Member', periodStart: '2026', periodEnd: 'Present', category: 'Current Committee' },
        // Advisors
        { name: 'I. Somasundaram', role: 'Advisor', periodStart: '2026', periodEnd: 'Present', bio: 'Senior guidance on traditional temple architecture and rituals.', category: 'Current Committee' },
        { name: 'V. Gnaneshwar', role: 'Advisor', periodStart: '2026', periodEnd: 'Present', bio: 'Advising on statutory compliance, audits, and administration.', category: 'Current Committee' },
        { name: 'G. Laxman Das', role: 'Advisor', periodStart: '2026', periodEnd: 'Present', bio: 'Providing strategic counsel for social services and expansion.', category: 'Current Committee' },
        
        // Retain former secretary from original seed for history archives
        {
          name: 'Shri G. Ramesh',
          role: 'General Secretary',
          periodStart: '2015',
          periodEnd: '2024',
          bio: 'Supervised community services and helped build the temple library and archive.',
          category: 'Past Member',
          email: 'g.ramesh@gmail.com',
          phone: '+91 94401 22334',
        },
      ]);
      logger.info('🌱 Seeded 29 actual committee members + 1 past member.');
    }

    // Migrate existing members to support structured categories
    const unmigratedCount = await CommitteeMember.countDocuments({ role_category: { $exists: false } });
    if (unmigratedCount > 0) {
      logger.info(`🔄 Found ${unmigratedCount} unmigrated committee members. Running migration...`);
      const unmigrated = await CommitteeMember.find({ role_category: { $exists: false } });
      
      const roleCategoriesOrder = [
        'CHAIRMAN', 'GENERAL_SECRETARY', 'TREASURER', 'VICE_CHAIRMAN', 
        'JOINT_SECRETARY', 'ORGANISING_SECRETARY', 'EXECUTIVE_MEMBER', 
        'ADVISOR', 'PAST_MEMBER'
      ];
      
      // Let's group them first to assign sequential order within each category
      const counts: { [key: string]: number } = {};
      roleCategoriesOrder.forEach(cat => { counts[cat] = 0; });

      for (const member of unmigrated) {
        let roleCat: any = 'EXECUTIVE_MEMBER';
        const roleLower = (member.role || member.designation || '').toLowerCase();
        
        if (member.category === 'Past Member') {
          roleCat = 'PAST_MEMBER';
        } else if (roleLower.includes('chairman')) {
          roleCat = 'CHAIRMAN';
        } else if (roleLower.includes('general secretary') || roleLower.includes('general-secretary')) {
          roleCat = 'GENERAL_SECRETARY';
        } else if (roleLower.includes('treasurer')) {
          roleCat = 'TREASURER';
        } else if (roleLower.includes('vice chairman') || roleLower.includes('vice-chairman') || roleLower.includes('vice chairmen')) {
          roleCat = 'VICE_CHAIRMAN';
        } else if (roleLower.includes('joint secretary') || roleLower.includes('joint-secretary') || roleLower.includes('joint secretaries')) {
          roleCat = 'JOINT_SECRETARY';
        } else if (roleLower.includes('organising secretary') || roleLower.includes('organizing secretary') || roleLower.includes('organising secretaries')) {
          roleCat = 'ORGANISING_SECRETARY';
        } else if (roleLower.includes('advisor') || roleLower.includes('advisors')) {
          roleCat = 'ADVISOR';
        }
        
        member.set('role_category', roleCat);
        member.set('roleCategory', roleCat);
        member.set('is_active', member.category !== 'Past Member');
        member.set('isActive', member.category !== 'Past Member');
        
        // Assign display order sequentially within its category
        member.set('display_order', counts[roleCat]);
        member.set('displayOrder', counts[roleCat]);
        counts[roleCat] += 1;
        
        await member.save();
      }
      logger.info('✅ Committee members migration completed.');
    }

    const founderCount = await Founder.countDocuments();
    if (founderCount === 0) {
      await Founder.create([
        {
          name: 'Late Shri Ram Nivas',
          role: 'Founding Chairman',
          period: '1982 - 2005',
          bio: 'Visionary who laid the foundation stone of the temple and dedicated his life to its establishment.',
          imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
          order: 1,
        },
        {
          name: 'Late Shri Venkat Rajan',
          role: 'Co-Founder & Chief Priest',
          period: '1984 - 2012',
          bio: 'Conducted the first Maha Prana Pratishtha of Maa Durga and set up temple puja routines.',
          imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
          order: 2,
        },
      ]);
      logger.info('🌱 Seeded founders.');
    }

    const timelineCount = await HistoryTimeline.countDocuments();
    if (timelineCount === 0) {
      await HistoryTimeline.create([
        {
          year: '1984',
          title: 'Divine Foundation Stone',
          description: 'The temple foundation stone was laid by Late Shri Ram Nivas, starting a divine era of devotion in Bapu Nagar.',
          type: 'Foundation',
          imageUrl: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?auto=format&fit=crop&q=80&w=500',
          order: 1,
        },
        {
          year: '1995',
          title: 'Main Temple Hall Construction',
          description: 'Completed the main congregation hall (Mandapam) to accommodate hundreds of devotees during major festivals.',
          type: 'Expansion',
          imageUrl: 'https://images.unsplash.com/photo-1609137882255-a22a3d0f419c?auto=format&fit=crop&q=80&w=500',
          order: 2,
        },
        {
          year: '2005',
          title: 'Annadanam Hall Inauguration',
          description: 'Built a dedicated dining hall for serving daily prasadam meals, feeding thousands of pilgrims weekly.',
          type: 'Expansion',
          imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=500',
          order: 3,
        },
      ]);
      logger.info('🌱 Seeded history timeline.');
    }

    // Clean up test assets if present
    const testAssetsToDelete = await Asset.deleteMany({
      assetName: { $in: ['Main Temple Complex', 'Maa Durga Golden Crown', 'Silver Chariot (Rath)'] }
    });
    if (testAssetsToDelete.deletedCount > 0) {
      logger.info(`🧹 Cleaned up ${testAssetsToDelete.deletedCount} test assets.`);
    }

    // Clean up test data if present (Rahul Sharma Family, Anonymous Devotee, HUNDI-W40, SAL-SEP-23)
    const testDonationsToDelete = await Donation.find({
      donorName: { $in: ['Rahul Sharma Family', 'Anonymous Devotee'] }
    });
    if (testDonationsToDelete.length > 0) {
      const deletedIds = testDonationsToDelete.map(d => d._id);
      await Donation.deleteMany({ _id: { $in: deletedIds } });
      await IncomeLedger.deleteMany({ sourceId: { $in: deletedIds } });
      logger.info(`🧹 Cleaned up ${testDonationsToDelete.length} test donations and matching income ledgers.`);
    }

    const testTxnsToDelete = await FinancialTransaction.deleteMany({
      reference: { $in: ['HUNDI-W40', 'SAL-SEP-23'] }
    });
    if (testTxnsToDelete.deletedCount > 0) {
      logger.info(`🧹 Cleaned up ${testTxnsToDelete.deletedCount} test transactions.`);
    }

    const donationCount = await Donation.countDocuments();
    if (donationCount === 0) {
      await Donation.create([
        {
          donorName: 'Priya Patel',
          donationType: 'Annadanam',
          amount: 11000,
          purpose: 'Annadanam',
          paymentMethod: 'Bank Transfer',
          paymentStatus: 'Paid',
          paidAmount: 11000,
          dueAmount: 0,
          receiptNumber: 'TMP-2026-000003',
          isPublic: true,
          status: 'Verified',
          donationDate: new Date('2026-06-20'),
          date: new Date('2026-06-20'),
        },
      ]);
      logger.info('🌱 Seeded donations.');
    }

    const incomeLedgerCount = await IncomeLedger.countDocuments();
    if (incomeLedgerCount === 0) {
      const donations = await Donation.find({});
      if (donations.length > 0) {
        await IncomeLedger.insertMany(
          donations.map((donation: any) => ({
            ledgerType: 'income',
            source: 'donation',
            sourceId: donation._id,
            category: donation.donationType,
            description: `${donation.donorName} - ${donation.donationType}`,
            amount: donation.amount || 0,
            paidAmount: donation.paidAmount || donation.amount || 0,
            dueAmount: donation.dueAmount || 0,
            paymentStatus: donation.paymentStatus || 'Paid',
            paymentMethod: donation.paymentMethod || 'Cash',
            transactionDate: donation.donationDate || donation.date || new Date(),
            receiptNumber: donation.receiptNumber,
            createdBy: donation.createdBy,
          }))
        );
        logger.info('🌱 Seeded income ledger from donations.');
      }
    }

    const txnCount = await FinancialTransaction.countDocuments();
    if (txnCount === 0) {
      await FinancialTransaction.create([
        {
          date: new Date('2023-10-10'),
          type: 'Income',
          category: 'Special Pooja',
          amount: 85000,
          description: 'Navchandi Havan bookings',
          reference: 'POOJA-NC',
        },
        {
          date: new Date('2023-10-15'),
          type: 'Expense',
          category: 'Maintenance',
          amount: 45000,
          description: 'Flower decoration and temple cleaning supplies',
          reference: 'MAINT-10',
        },
        {
          date: new Date('2023-10-20'),
          type: 'Income',
          category: 'Donations',
          amount: 150000,
          description: 'Online donations via portal',
          reference: 'PG-SETTLE-10',
        },
      ]);
      logger.info('🌱 Seeded transactions.');
    }

    const galleryCount = await Gallery.countDocuments();
    if (galleryCount === 0) {
      await Gallery.create([
        {
          title: 'Main Temple Deity Maa Durga',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1613679074971-91fc27180061?auto=format&fit=crop&q=80&w=800',
          thumbnailUrl: 'https://images.unsplash.com/photo-1613679074971-91fc27180061?auto=format&fit=crop&q=80&w=200',
          album: 'Deity Darshan',
          category: 'Darshan',
          order: 1,
        },
      ]);
      logger.info('🌱 Seeded gallery.');
    }

  } catch (error) {
    logger.error('Error seeding database:', error);
  }
}

// 10. Start Server
app.listen(PORT, () => {
  logger.info(`🚀 Sri Durga Mata Temple Backend Server running on port ${PORT}`);
});
