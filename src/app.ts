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
    const memberCount = await CommitteeMember.countDocuments();
    if (memberCount === 0) {
      await CommitteeMember.create([
        {
          name: 'Dr. Anand Verma',
          role: 'Current President',
          periodStart: '2018',
          periodEnd: 'Present',
          bio: 'Leading the modern transformation of temple facilities while preserving ancient traditions.',
          category: 'Current Committee',
          email: 'anand.verma@sridurgamatatemple.org',
          phone: '+91 98480 12345',
        },
        {
          name: 'Smt. Kavita Reddy',
          role: 'Chief Treasurer',
          periodStart: '2020',
          periodEnd: 'Present',
          bio: 'Overseeing the financial transparency and digitalization of temple records.',
          category: 'Current Committee',
          email: 'kavita.reddy@sridurgamatatemple.org',
          phone: '+91 98480 54321',
        },
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
      logger.info('🌱 Seeded committee members.');
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

    const assetCount = await Asset.countDocuments();
    if (assetCount === 0) {
      await Asset.create([
        {
          assetName: 'Main Temple Complex',
          category: 'Land & Buildings',
          notes: 'The primary temple structure including the sanctum sanctorum, assembly hall, and surrounding pathways.',
          acquisitionDate: new Date('1985-05-10'),
          currentValue: 150000000,
          purchaseValue: 5000000,
          status: 'Excellent',
          location: 'Main Campus',
        },
        {
          assetName: 'Maa Durga Golden Crown',
          category: 'Gold',
          notes: 'Intricately carved golden crown (Mukut) weighing 2.5kg offered to the main deity.',
          acquisitionDate: new Date('2010-10-05'),
          currentValue: 18000000,
          purchaseValue: 8000000,
          status: 'Excellent',
          location: 'Main Sanctum / Safe',
        },
      ]);
      logger.info('🌱 Seeded assets.');
    }

    const donationCount = await Donation.countDocuments();
    if (donationCount === 0) {
      await Donation.create([
        {
          donorName: 'Rahul Sharma Family',
          donationType: 'Monetary',
          amount: 51000,
          purpose: 'Navratri Mahotsav Sponsorship',
          paymentMethod: 'UPI',
          receiptNumber: 'RCP-20231015-1024',
          isPublic: true,
          status: 'Verified',
          date: new Date('2023-10-15'),
        },
        {
          donorName: 'Anonymous Devotee',
          donationType: 'Gold',
          amount: 0,
          itemDescription: 'Gold chain 50g',
          purpose: 'Offering to Deity',
          paymentMethod: 'In-Kind',
          receiptNumber: 'RCP-20231018-1025',
          isPublic: false,
          status: 'Verified',
          date: new Date('2023-10-18'),
        },
      ]);
      logger.info('🌱 Seeded donations.');
    }

    const txnCount = await FinancialTransaction.countDocuments();
    if (txnCount === 0) {
      await FinancialTransaction.create([
        {
          date: new Date('2023-10-01'),
          type: 'Income',
          category: 'Hundi Collection',
          amount: 250000,
          description: 'Weekly hundi counting',
          reference: 'HUNDI-W40',
        },
        {
          date: new Date('2023-10-05'),
          type: 'Expense',
          category: 'Employee Salaries',
          amount: 180000,
          description: 'September salaries for priests and staff',
          reference: 'SAL-SEP-23',
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
