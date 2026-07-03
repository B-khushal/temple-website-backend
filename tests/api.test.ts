// 1. Configure Test Environment variables
process.env.PORT = '3050';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/temple_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

import mongoose from 'mongoose';

// --- MONGOOSE ZERO-DEPENDENCY MOCK CONNECTION LAYER ---
const mockDb: any = {
  collection: () => ({
    createIndex: async () => {},
    find: () => {},
    findOne: () => {},
    insertOne: () => {},
  }),
};

// Override the default connection properties to mock a successful connection state
mongoose.connect = async () => mongoose as any;
mongoose.disconnect = async () => {};
(mongoose.connection as any).readyState = 1;

Object.defineProperty(mongoose.connection, 'db', {
  get: () => mockDb,
  set: () => {},
  configurable: true,
});

// Import models AFTER connection is mocked
import { User } from '../src/models/User';
import { Donation } from '../src/models/Donation';
import { FinancialTransaction } from '../src/models/FinancialTransaction';
import { IncomeLedger } from '../src/models/IncomeLedger';
import { Setting } from '../src/models/Setting';
import { Asset } from '../src/models/Asset';
import { CommitteeMember } from '../src/models/CommitteeMember';
import { Founder } from '../src/models/Founder';
import { HistoryTimeline } from '../src/models/HistoryTimeline';
import { Gallery } from '../src/models/Gallery';
import { AuditLog } from '../src/models/AuditLog';

// Mock Query Chain Helper (mocks Mongoose chaining: sort, skip, limit, populate, select, etc.)
const mockQueryChain = (data: any) => {
  const chain: any = {
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    populate: () => chain,
    select: () => chain,
    then: (resolve: any, reject: any) => Promise.resolve(data).then(resolve, reject),
    catch: (reject: any) => Promise.resolve(data).catch(reject),
  };
  return chain;
};

// Seed Mock Data
const mockAdminId = new mongoose.Types.ObjectId();
const mockAdmin = {
  _id: mockAdminId,
  name: 'Test Administrator',
  email: 'testadmin@sridurgamatatemple.org',
  password: 'hashed-password',
  role: 'Super Admin',
  isActive: true,
  failedLoginAttempts: 0,
  isEmailVerified: true,
  save: async function() { return this; },
  comparePassword: async (p: string) => p === 'TestPassword123!',
  toObject: function() { return this; }
};

const mockDonationId = new mongoose.Types.ObjectId().toString();
const mockDonation = {
  _id: mockDonationId,
  donorName: 'Devotee Sriram',
  mobile: '9848099999',
  email: 'sriram@gmail.com',
  donationType: 'Monetary',
  type: 'Monetary',
  amount: 25000,
  paymentMethod: 'UPI',
  purpose: 'Annadanam Seva',
  receiptNumber: 'RCP-20260629-9999',
  transactionReference: 'TXN-UPI-998877',
  status: 'Verified',
  date: new Date(),
  save: async function() { return this; },
  toObject: function() { return this; }
};

const mockTxn = {
  _id: new mongoose.Types.ObjectId(),
  type: 'Income',
  category: 'Seva Contributions',
  amount: 35000,
  description: 'Chandi Havan contributions',
  reference: 'HAVAN-CH-01',
  date: new Date(),
  save: async function() { return this; },
  toObject: function() { return this; }
};

const mockIncomeLedger = {
  _id: new mongoose.Types.ObjectId(),
  ledgerType: 'income',
  source: 'donation',
  sourceId: mockDonationId,
  category: 'Annadanam',
  description: 'Devotee Sriram - Annadanam',
  amount: 25000,
  paidAmount: 25000,
  dueAmount: 0,
  paymentStatus: 'Paid',
  paymentMethod: 'UPI',
  receiptNumber: 'TMP-2026-000001',
  transactionDate: new Date(),
  createdBy: mockAdminId,
  toObject: function() { return this; }
};

// Assign Mock static handlers to Models
Setting.findOne = async () => ({ key: 'general', save: async () => {} } as any);
Setting.create = async () => ({ key: 'general' } as any);

User.countDocuments = async () => 1;
User.findOne = async (query: any) => {
  if (query.email === 'testadmin@sridurgamatatemple.org') return mockAdmin as any;
  return null;
};
User.findById = () => mockQueryChain(mockAdmin);
User.find = () => mockQueryChain([mockAdmin]);
User.updateOne = async () => ({}) as any;

CommitteeMember.countDocuments = async () => 1;
Founder.countDocuments = async () => 1;
HistoryTimeline.countDocuments = async () => 1;
Gallery.countDocuments = async () => 1;

Asset.countDocuments = async () => 1;
Asset.find = () => mockQueryChain([]);
Asset.aggregate = async () => [{ _id: null, total: 150000000 }];

Donation.countDocuments = async () => 1;
Donation.deleteMany = async () => ({}) as any;
Donation.find = () => mockQueryChain([mockDonation]);
Donation.findById = async () => mockDonation as any;
Donation.distinct = async () => ['Devotee Sriram'];
Donation.aggregate = async () => [{ _id: 'Monetary', total: 25000 }];
Donation.exists = async () => null as any;

// Setup Donation save mock on model prototype
Donation.prototype.save = async function() {
  this.receiptNumber = 'RCP-20260629-9999';
  this._id = mockDonationId as any;
  return this;
};

FinancialTransaction.deleteMany = async () => ({}) as any;
FinancialTransaction.countDocuments = async () => 1;
FinancialTransaction.find = () => mockQueryChain([mockTxn]);
FinancialTransaction.prototype.save = async function() {
  return this;
};
FinancialTransaction.aggregate = async (pipeline: any) => {
  if (pipeline && pipeline[0]?.$group?._id === '$type') {
    return [
      { _id: 'Income', total: 35000 },
      { _id: 'Expense', total: 0 }
    ];
  }
  return [
    { _id: { year: 2026, month: 6, type: 'Income' }, total: 35000 }
  ];
};

IncomeLedger.countDocuments = async () => 1;
IncomeLedger.insertMany = async () => [mockIncomeLedger] as any;
IncomeLedger.find = () => mockQueryChain([mockIncomeLedger]);
IncomeLedger.findOneAndUpdate = async () => mockIncomeLedger as any;
IncomeLedger.deleteOne = async () => ({}) as any;

AuditLog.create = async () => ({}) as any;
AuditLog.find = () => mockQueryChain([]);

// 2. Load the App dynamically using require to ensure it uses the mocked Mongoose connections
require('../src/app');

const BASE_URL = 'http://localhost:3050';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING TEMPLE BACKEND INTEGRATION TEST SUITE (MOCK DB MODE)');
  console.log('==================================================\n');

  // Let Express server bind
  await delay(1000);

  let adminToken = '';
  let donationId = mockDonationId;

  const testResults: { name: string; success: boolean; error?: string }[] = [];

  const runTest = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      testResults.push({ name, success: true });
      console.log(`✅ PASS: ${name}`);
    } catch (error: any) {
      testResults.push({ name, success: false, error: error.message });
      console.error(`❌ FAIL: ${name} -> ${error.message}`);
    }
  };

  // 1. Health Status Test
  await runTest('GET /health - Check system status', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== 'UP') {
      throw new Error(`Health status invalid: ${JSON.stringify(data)}`);
    }
  });

  // 2. User Login Test
  await runTest('POST /api/auth/login - Authenticate Admin', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testadmin@sridurgamatatemple.org',
        password: 'TestPassword123!',
      }),
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || !data.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(data)}`);
    }
    adminToken = data.accessToken;
  });

  // 3. User profile GET Test
  await runTest('GET /api/auth/me - Retrieve Admin profile', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || data.user.email !== 'testadmin@sridurgamatatemple.org') {
      throw new Error(`Profile check failed: ${JSON.stringify(data)}`);
    }
  });

  // 4. Create Donation Test
  await runTest('POST /api/donations - Create donation log', async () => {
    const res = await fetch(`${BASE_URL}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donorName: 'Devotee Sriram',
        mobile: '9848099999',
        email: 'sriram@gmail.com',
        donationType: 'Monetary',
        amount: 25000,
        paymentMethod: 'UPI',
        purpose: 'Annadanam Seva',
        transactionReference: 'TXN-UPI-998877',
      }),
    });
    const data = await res.json();
    if (res.status !== 201 || !data.success || !data.donation._id) {
      throw new Error(`Create donation failed: ${JSON.stringify(data)}`);
    }
    donationId = data.donation._id;
  });

  // 5. Access Control on Donation Search
  await runTest('GET /api/donations - Enforce authentication check', async () => {
    const res = await fetch(`${BASE_URL}/api/donations`);
    if (res.status !== 401) {
      throw new Error(`Allowed unauthorized access with status: ${res.status}`);
    }
  });

  // 6. Retrieve Donation list with verification
  await runTest('GET /api/donations - Retrieve donations list with credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/donations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || data.donations.length === 0) {
      throw new Error(`Failed to retrieve donations: ${JSON.stringify(data)}`);
    }
  });

  // 7. PDF Receipt download Test
  await runTest('GET /api/donations/:id/receipt - Download PDF', async () => {
    const res = await fetch(`${BASE_URL}/api/donations/${donationId}/receipt`);
    const contentType = res.headers.get('Content-Type');
    if (res.status !== 200 || contentType !== 'application/pdf') {
      throw new Error(`PDF generation failed: Status: ${res.status}, Type: ${contentType}`);
    }
  });

  // 8. Financial Transactions Access Restriction Test
  await runTest('POST /api/financials - Enforce credentials validation', async () => {
    const res = await fetch(`${BASE_URL}/api/financials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Income',
        category: 'Hundi Collection',
        amount: 12000,
      }),
    });
    if (res.status !== 401) {
      throw new Error(`Allowed transaction posting without auth, status: ${res.status}`);
    }
  });

  // 9. Create Financial Transaction Test
  await runTest('POST /api/financials - Create ledger item', async () => {
    const res = await fetch(`${BASE_URL}/api/financials`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        type: 'Income',
        category: 'Seva Contributions',
        amount: 35000,
        description: 'Chandi Havan contributions',
        reference: 'HAVAN-CH-01',
      }),
    });
    const data = await res.json();
    if (res.status !== 201 || !data.success) {
      throw new Error(`Create transaction failed: ${JSON.stringify(data)}`);
    }
  });

  // 10. Retrieve Transaction Summary
  await runTest('GET /api/financials/summary - Calculate balances', async () => {
    const res = await fetch(`${BASE_URL}/api/financials/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || data.summary.totalIncome !== 60000) {
      throw new Error(`Financial summary calculation incorrect: ${JSON.stringify(data)}`);
    }
  });

  // Print Test Report
  console.log('\n==================================================');
  console.log('📊 INTEGRATION TEST REPORT SUMMARY');
  console.log('==================================================');
  
  let failed = false;
  testResults.forEach((t) => {
    if (t.success) {
      console.log(`✅ SUCCESS - ${t.name}`);
    } else {
      console.log(`❌ FAILED  - ${t.name} (Error: ${t.error})`);
      failed = true;
    }
  });
  console.log('==================================================\n');

  await mongoose.connection.close();
  
  if (failed) {
    console.error('❌ Test suite failed. Fix compilation/logic issues.');
    process.exit(1);
  } else {
    console.log('🎉 All integration tests passed successfully!');
    process.exit(0);
  }
}

runTests();
