import { Response } from 'express';
import { Donation } from '../models/Donation';
import { IncomeLedger } from '../models/IncomeLedger';
import { Asset } from '../models/Asset';
import { FinancialTransaction } from '../models/FinancialTransaction';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

// 1. Overview Statistics
export const getOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const donations = await Donation.find({ status: { $ne: 'Cancelled' } });
    const totalDonations = donations.reduce((sum: number, donation: any) => sum + (donation.amount || 0), 0);
    const incomeLedgers = await IncomeLedger.find({});

    // Total assets valuation
    const assetsSumResult = await Asset.aggregate([
      { $match: { status: { $ne: 'Disposed' } } },
      { $group: { _id: null, total: { $sum: '$currentValue' } } },
    ]);
    const totalAssetsValue = assetsSumResult[0]?.total || 0;

    const ledgerTransactions = await FinancialTransaction.find({});
    const totalIncome =
      incomeLedgers.reduce((sum: number, entry: any) => sum + (entry.paidAmount || 0), 0) +
      ledgerTransactions
        .filter((txn: any) => txn.type === 'Income')
        .reduce((sum: number, txn: any) => sum + (txn.amount || 0), 0);
    const totalExpense = ledgerTransactions
      .filter((txn: any) => txn.type === 'Expense')
      .reduce((sum: number, txn: any) => sum + (txn.amount || 0), 0);

    // Recent activities (Last 6 Audit Logs)
    const recentActivities = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(6);

    // Monthly trends (Last 6 Months Income vs Expense)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const trendMap: any = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      trendMap[key] = { key, label, income: 0, expense: 0 };
    }

    ledgerTransactions.forEach((transaction: any) => {
      const txnDate = new Date(transaction.date);
      const key = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      if (!trendMap[key]) return;
      if (transaction.type === 'Income') trendMap[key].income += transaction.amount || 0;
      if (transaction.type === 'Expense') trendMap[key].expense += transaction.amount || 0;
    });

    incomeLedgers.forEach((entry: any) => {
      const txnDate = new Date(entry.transactionDate);
      const key = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      if (!trendMap[key]) return;
      trendMap[key].income += entry.paidAmount || 0;
    });

    const monthlyTrends = Object.values(trendMap).reverse();

    res.json({
      success: true,
      data: {
        totals: {
          donations: totalDonations,
          assetsValue: totalAssetsValue,
          income: totalIncome,
          expense: totalExpense,
          balance: totalIncome - totalExpense,
        },
        recentActivities,
        monthlyTrends,
      },
    });
  } catch (error: any) {
    logger.error(`Overview stats dashboard error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Donation Statistics
export const getDonationsStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const donations = await Donation.find({ status: { $ne: 'Cancelled' } });
    const generalStats = {
      totalAmount: donations.reduce((sum: number, donation: any) => sum + (donation.amount || 0), 0),
      collectedAmount: donations.reduce((sum: number, donation: any) => sum + (donation.paidAmount || 0), 0),
      outstandingDues: donations.reduce((sum: number, donation: any) => sum + (donation.dueAmount || 0), 0),
      count: donations.length,
    };

    const methodBreakdown = Object.values(
      donations.reduce((acc: any, donation: any) => {
        const key = donation.paymentMethod || 'Unspecified';
        if (!acc[key]) acc[key] = { _id: key, totalAmount: 0, paidAmount: 0, dueAmount: 0, count: 0 };
        acc[key].totalAmount += donation.amount || 0;
        acc[key].paidAmount += donation.paidAmount || 0;
        acc[key].dueAmount += donation.dueAmount || 0;
        acc[key].count += 1;
        return acc;
      }, {})
    );

    const typeBreakdown = Object.values(
      donations.reduce((acc: any, donation: any) => {
        const key = donation.donationType || 'Unspecified';
        if (!acc[key]) acc[key] = { _id: key, totalAmount: 0, paidAmount: 0, dueAmount: 0, count: 0 };
        acc[key].totalAmount += donation.amount || 0;
        acc[key].paidAmount += donation.paidAmount || 0;
        acc[key].dueAmount += donation.dueAmount || 0;
        acc[key].count += 1;
        return acc;
      }, {})
    );

    res.json({
      success: true,
      data: {
        summary: generalStats,
        paymentMethods: methodBreakdown,
        donationTypes: typeBreakdown,
      },
    });
  } catch (error: any) {
    logger.error(`Donation stats dashboard error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Asset Statistics
export const getAssetsStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Counts by category & sum of currentValue
    const categoryBreakdown = await Asset.aggregate([
      { $match: { status: { $ne: 'Disposed' } } },
      {
        $group: {
          _id: '$category',
          totalValue: { $sum: '$currentValue' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Counts by status
    const statusBreakdown = await Asset.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        categories: categoryBreakdown,
        statuses: statusBreakdown,
      },
    });
  } catch (error: any) {
    logger.error(`Asset stats dashboard error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Financial Statistics
export const getFinancialsStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Categorized breakdown for income and expense
    const categoryBreakdown = await FinancialTransaction.aggregate([
      {
        $group: {
          _id: { type: '$type', category: '$category' },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const incomeCategories = categoryBreakdown
      .filter((c) => c._id.type === 'Income')
      .map((c) => ({ category: c._id.category, amount: c.totalAmount }));

    const expenseCategories = categoryBreakdown
      .filter((c) => c._id.type === 'Expense')
      .map((c) => ({ category: c._id.category, amount: c.totalAmount }));

    res.json({
      success: true,
      data: {
        incomeBreakdown: incomeCategories,
        expenseBreakdown: expenseCategories,
      },
    });
  } catch (error: any) {
    logger.error(`Financial stats dashboard error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
