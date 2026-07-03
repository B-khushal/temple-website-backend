import { Response } from 'express';
import { Donation } from '../models/Donation';
import { IncomeLedger } from '../models/IncomeLedger';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import { generateDonationReceiptPDF } from '../services/PdfService';
import logger from '../config/logger';

async function generateReceiptNumber(donationDate?: Date): Promise<string> {
  const currentDate = donationDate || new Date();
  const year = currentDate.getFullYear();
  const prefix = `TMP-${year}-`;
  let sequence = (await Donation.countDocuments({
    receiptNumber: { $regex: `^${prefix}` },
  })) + 1;

  let receiptNumber = `${prefix}${String(sequence).padStart(6, '0')}`;
  while (await Donation.exists({ receiptNumber })) {
    sequence += 1;
    receiptNumber = `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  return receiptNumber;
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function normalizeAmounts(amountInput: unknown, paymentStatusInput: unknown, paidAmountInput: unknown) {
  const amount = Math.max(0, Number(amountInput || 0));
  const paymentStatus = ['Paid', 'Due', 'Partial'].includes(String(paymentStatusInput))
    ? String(paymentStatusInput)
    : 'Paid';

  let paidAmount = Math.max(0, Number(paidAmountInput || 0));
  let dueAmount = 0;

  if (paymentStatus === 'Due') {
    paidAmount = 0;
    dueAmount = amount;
  } else if (paymentStatus === 'Partial') {
    paidAmount = Math.min(amount, paidAmount);
    dueAmount = Math.max(0, amount - paidAmount);
  } else {
    paidAmount = amount;
    dueAmount = 0;
  }

  return {
    amount,
    paymentStatus,
    paidAmount,
    dueAmount,
  };
}

function buildDonationPayload(req: AuthRequest) {
  const donationType = req.body.donationType || req.body.type;
  const donationDate = parseDate(req.body.donationDate || req.body.date);
  const amountState = normalizeAmounts(req.body.amount, req.body.paymentStatus, req.body.paidAmount);
  const transactionId = req.body.transactionId || req.body.transactionReference || req.body.upiReferenceNumber || '';
  const defaultStatus = amountState.paymentStatus === 'Paid' ? 'Verified' : 'Pending';

  return {
    ...req.body,
    donorName: req.body.donorName,
    mobile: req.body.mobile || req.body.phone || '',
    donationType,
    type: donationType,
    donationDate,
    date: donationDate,
    category: req.body.category || donationType,
    purpose: req.body.purpose || donationType,
    transactionId,
    transactionReference: transactionId,
    paymentMethod: req.body.paymentMethod || 'Cash',
    existingDonor: Boolean(req.body.existingDonor),
    memberType: req.body.memberType || 'Non-member',
    status: req.body.status || defaultStatus,
    isPublic: typeof req.body.isPublic === 'boolean' ? req.body.isPublic : true,
    createdBy: req.user?.id || req.body.createdBy,
    ...amountState,
  };
}

async function syncIncomeLedgerFromDonation(req: AuthRequest, donation: any): Promise<void> {
  if (donation.status === 'Cancelled') {
    await IncomeLedger.deleteOne({ source: 'donation', sourceId: donation._id });
    return;
  }

  await IncomeLedger.findOneAndUpdate(
    { source: 'donation', sourceId: donation._id },
    {
      ledgerType: 'income',
      source: 'donation',
      sourceId: donation._id,
      category: donation.donationType,
      description: `${donation.donorName} - ${donation.donationType}`,
      amount: donation.amount,
      paidAmount: donation.paidAmount,
      dueAmount: donation.dueAmount,
      paymentStatus: donation.paymentStatus,
      paymentMethod: donation.paymentMethod,
      transactionDate: donation.donationDate || donation.date,
      receiptNumber: donation.receiptNumber,
      createdBy: donation.createdBy || req.user?.id,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

export const getDonations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, type, status, paymentStatus, page = 1, limit = 10 } = req.query;
    const filter: any = {};

    if (search) {
      filter.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (type) {
      filter.$or = [
        { donationType: type },
        { type: type },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const donations = await Donation.find(filter)
      .sort({ donationDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Donation.countDocuments(filter);

    res.json({
      success: true,
      data: donations,
      donations,
      total,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`Error in getDonations: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const donationData = buildDonationPayload(req);

    if (!donationData.donationType) {
      res.status(400).json({ success: false, message: 'Donation type is required' });
      return;
    }

    if (!donationData.receiptNumber) {
      donationData.receiptNumber = await generateReceiptNumber(donationData.donationDate);
    }

    const donation = new Donation(donationData);
    await donation.save();
    await syncIncomeLedgerFromDonation(req, donation);

    await logActivity(req, 'CREATE_DONATION', 'Donation', donation._id.toString(), null, donation.toObject());

    res.status(201).json({ success: true, donation, data: donation });
  } catch (error: any) {
    logger.error(`Error in createDonation: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const donation = await Donation.findById(id);
    if (!donation) {
      res.status(404).json({ success: false, message: 'Donation record not found' });
      return;
    }

    const updateData = buildDonationPayload(req);
    if (!updateData.donationType) {
      res.status(400).json({ success: false, message: 'Donation type is required' });
      return;
    }

    const original = donation.toObject();
    Object.assign(donation, updateData);
    await donation.save();
    await syncIncomeLedgerFromDonation(req, donation);

    await logActivity(req, 'UPDATE_DONATION', 'Donation', id, original, donation.toObject());

    res.json({ success: true, donation, data: donation });
  } catch (error: any) {
    logger.error(`Error in updateDonation: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const donation = await Donation.findById(id);
    if (!donation) {
      res.status(404).json({ success: false, message: 'Donation record not found' });
      return;
    }

    const original = donation.toObject();
    await donation.deleteOne();
    await IncomeLedger.deleteOne({ source: 'donation', sourceId: id });

    await logActivity(req, 'DELETE_DONATION', 'Donation', id, original, null);

    res.json({ success: true, message: 'Donation record deleted successfully' });
  } catch (error: any) {
    logger.error(`Error in deleteDonation: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReceiptPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const donation = await Donation.findById(id);
    if (!donation) {
      res.status(404).json({ success: false, message: 'Donation not found' });
      return;
    }

    generateDonationReceiptPDF(res, donation);
  } catch (error: any) {
    logger.error(`Error in getReceiptPDF: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportDonations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const donations = await Donation.find().sort({ donationDate: -1, createdAt: -1 });

    const headers = 'Receipt Number,Date,Donor Name,Mobile,Email,Donation Type,Category,Purpose,Amount,Paid Amount,Due Amount,Payment Status,Payment Method,Transaction ID,Verification Status\n';
    const rows = donations.map((d: any) => {
      const dateStr = d.donationDate ? new Date(d.donationDate).toISOString().slice(0, 10) : '';
      const name = `"${d.donorName.replace(/"/g, '""')}"`;
      const donationType = d.donationType || d.type || '';
      const category = `"${(d.category || '').replace(/"/g, '""')}"`;
      const purpose = `"${(d.purpose || '').replace(/"/g, '""')}"`;
      const transactionId = d.transactionId || d.transactionReference || '';
      return `${d.receiptNumber},${dateStr},${name},${d.mobile || ''},${d.email || ''},${donationType},${category},${purpose},${d.amount || 0},${d.paidAmount || 0},${d.dueAmount || 0},${d.paymentStatus || 'Paid'},${d.paymentMethod || ''},${transactionId},${d.status || ''}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=donations_export.csv');
    res.status(200).send(headers + rows);
  } catch (error: any) {
    logger.error(`Error in exportDonations: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
