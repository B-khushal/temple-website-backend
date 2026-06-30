import { Response } from 'express';
import { Donation } from '../models/Donation';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import { generateDonationReceiptPDF } from '../services/PdfService';
import logger from '../config/logger';

// Helper to generate a unique receipt number
function generateReceiptNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `RCP-${dateStr}-${rand}`;
}

// List donations with search, filters, and pagination
export const getDonations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, type, status, page = 1, limit = 10 } = req.query;
    const filter: any = {};

    // Apply search filter (donorName, receiptNumber, mobile)
    if (search) {
      filter.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    // Apply type filter
    if (type) {
      filter.$or = [
        { donationType: type },
        { type: type }
      ];
    }

    // Apply status filter
    if (status) {
      filter.status = status;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const donations = await Donation.find(filter)
      .sort({ date: -1 })
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

// Create Donation
export const createDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const donationData = { ...req.body };
    
    // Automatically set unique receipt number if not provided
    if (!donationData.receiptNumber) {
      donationData.receiptNumber = generateReceiptNumber();
    }

    const donation = new Donation(donationData);
    await donation.save();

    await logActivity(req, 'CREATE_DONATION', 'Donation', donation._id.toString(), null, donation.toObject());

    res.status(201).json({ success: true, donation, data: donation });
  } catch (error: any) {
    logger.error(`Error in createDonation: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Donation (Admin/Treasurer Only)
export const updateDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const donation = await Donation.findById(id);
    if (!donation) {
      res.status(404).json({ success: false, message: 'Donation record not found' });
      return;
    }

    const original = donation.toObject();
    Object.assign(donation, req.body);
    await donation.save();

    await logActivity(req, 'UPDATE_DONATION', 'Donation', id, original, donation.toObject());

    res.json({ success: true, donation, data: donation });
  } catch (error: any) {
    logger.error(`Error in updateDonation: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Donation (Admin Only)
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

    await logActivity(req, 'DELETE_DONATION', 'Donation', id, original, null);

    res.json({ success: true, message: 'Donation record deleted successfully' });
  } catch (error: any) {
    logger.error(`Error in deleteDonation: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Stream Receipt PDF
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

// Export Donations to CSV
export const exportDonations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const donations = await Donation.find().sort({ date: -1 });

    // Construct CSV Header and Rows
    const headers = 'Receipt Number,Date,Donor Name,Mobile,Email,Type,Amount,Payment Method,Ref,Status,Purpose\n';
    const rows = donations.map((d: any) => {
      const dateStr = d.date ? new Date(d.date).toISOString().slice(0, 10) : '';
      const name = `"${d.donorName.replace(/"/g, '""')}"`;
      const type = d.donationType || d.type || 'Monetary';
      const ref = d.transactionReference || '';
      const purpose = `"${(d.purpose || '').replace(/"/g, '""')}"`;
      return `${d.receiptNumber},${dateStr},${name},${d.mobile || ''},${d.email || ''},${type},${d.amount || 0},${d.paymentMethod},${ref},${d.status},${purpose}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=donations_export.csv');
    res.status(200).send(headers + rows);
  } catch (error: any) {
    logger.error(`Error in exportDonations: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
