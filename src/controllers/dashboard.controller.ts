import { Response } from 'express';
import { Donation } from '../models/Donation';
import { Asset } from '../models/Asset';
import { FinancialTransaction } from '../models/FinancialTransaction';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

// 1. Overview Statistics
export const getOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Total donations (Monetary sums)
    const donationsSumResult = await Donation.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalDonations = donationsSumResult[0]?.total || 0;

    // Total assets valuation
    const assetsSumResult = await Asset.aggregate([
      { $match: { status: { $ne: 'Disposed' } } },
      { $group: { _id: null, total: { $sum: '$currentValue' } } },
    ]);
    const totalAssetsValue = assetsSumResult[0]?.total || 0;

    // Total ledger financials
    const ledgerSumResult = await FinancialTransaction.aggregate([
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const totalIncome = ledgerSumResult.find((r) => r._id === 'Income')?.total || 0;
    const totalExpense = ledgerSumResult.find((r) => r._id === 'Expense')?.total || 0;

    // Recent activities (Last 6 Audit Logs)
    const recentActivities = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(6);

    // Monthly trends (Last 6 Months Income vs Expense)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyTrendsAgg = await FinancialTransaction.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const trendMap: any = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      trendMap[key] = { key, label, income: 0, expense: 0 };
    }

    monthlyTrendsAgg.forEach((t) => {
      const key = `${t._id.year}-${String(t._id.month).padStart(2, '0')}`;
      if (trendMap[key]) {
        if (t._id.type === 'Income') trendMap[key].income = t.total;
        else if (t._id.type === 'Expense') trendMap[key].expense = t.total;
      }
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
    // Total count & sum
    const generalStats = await Donation.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Breakdown by payment methods
    const methodBreakdown = await Donation.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Breakdown by donation type (Cash, Gold, Silver, etc.)
    const typeBreakdown = await Donation.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: '$donationType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        summary: generalStats[0] || { totalAmount: 0, count: 0 },
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
