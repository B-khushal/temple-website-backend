import { Response } from 'express';
import { FinancialTransaction } from '../models/FinancialTransaction';
import { Budget } from '../models/Budget';
import { Donation } from '../models/Donation';
import { Asset } from '../models/Asset';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import logger from '../config/logger';

// ----------------- TRANSACTIONS (LEDGER) -----------------

// Helper to update budget spent amount
async function updateBudgetSpent(category: string, year: number, month?: number): Promise<void> {
  try {
    // Find all expense transactions in this time window
    const startDate = new Date(year, month ? month - 1 : 0, 1);
    const endDate = new Date(year, month ? month : 12, 0, 23, 59, 59, 999);

    const matchFilter: any = {
      type: 'Expense',
      category,
      date: { $gte: startDate, $lte: endDate },
    };

    const result = await FinancialTransaction.aggregate([
      { $match: matchFilter },
      { $group: { _id: null, totalSpent: { $sum: '$amount' } } },
    ]);

    const totalSpent = result[0]?.totalSpent || 0;

    // Update matching budget spent value
    const budgetFilter: any = { category, year };
    if (month !== undefined) budgetFilter.month = month;

    await Budget.updateOne(budgetFilter, { $set: { spent: totalSpent } });
  } catch (error: any) {
    logger.error(`Failed to update budget spent for category ${category}: ${error.message}`);
  }
}

// Get ledger transactions
export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, type, category, page = 1, limit = 10 } = req.query;
    const filter: any = {};

    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const transactions = await FinancialTransaction.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    const total = await FinancialTransaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      transactions,
      total,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`Error in getTransactions: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Transaction
export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const txnData = {
      ...req.body,
      createdBy: req.user?.id,
    };

    const transaction = new FinancialTransaction(txnData);
    await transaction.save();

    await logActivity(req, 'CREATE_TRANSACTION', 'FinancialTransaction', transaction._id.toString(), null, transaction.toObject());

    // Trigger budget update if it's an Expense
    if (transaction.type === 'Expense') {
      const date = new Date(transaction.date);
      await updateBudgetSpent(transaction.category, date.getFullYear(), date.getMonth() + 1);
    }

    res.status(201).json({ success: true, transaction, data: transaction });
  } catch (error: any) {
    logger.error(`Error in createTransaction: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Transaction (Treasurer/Accountant Only)
export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const transaction = await FinancialTransaction.findById(id);
    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction record not found' });
      return;
    }

    const original = transaction.toObject();
    
    // Assign fields
    Object.assign(transaction, req.body);
    // If approved, set approval user
    if (req.body.isApproved && !original.approvedBy) {
      transaction.approvedBy = req.user?.id as any;
    }

    await transaction.save();

    await logActivity(req, 'UPDATE_TRANSACTION', 'FinancialTransaction', id, original, transaction.toObject());

    // Trigger budget updates
    const originalDate = new Date(original.date);
    const newDate = new Date(transaction.date);

    if (original.type === 'Expense') {
      await updateBudgetSpent(original.category, originalDate.getFullYear(), originalDate.getMonth() + 1);
    }
    if (transaction.type === 'Expense') {
      await updateBudgetSpent(transaction.category, newDate.getFullYear(), newDate.getMonth() + 1);
    }

    res.json({ success: true, transaction, data: transaction });
  } catch (error: any) {
    logger.error(`Error in updateTransaction: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Transaction (Admin Only)
export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const transaction = await FinancialTransaction.findById(id);
    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction record not found' });
      return;
    }

    const original = transaction.toObject();
    await transaction.deleteOne();

    await logActivity(req, 'DELETE_TRANSACTION', 'FinancialTransaction', id, original, null);

    // Trigger budget update if deleted was an Expense
    if (original.type === 'Expense') {
      const date = new Date(original.date);
      await updateBudgetSpent(original.category, date.getFullYear(), date.getMonth() + 1);
    }

    res.json({ success: true, message: 'Transaction record deleted successfully' });
  } catch (error: any) {
    logger.error(`Error in deleteTransaction: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Summary metrics for dashboard
export const getTransactionSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Sum today's collections (income)
    const todayIncomeDocs = await FinancialTransaction.find({
      type: 'Income',
      date: { $gte: startOfToday },
    });
    const todayCollection = todayIncomeDocs.reduce((sum, doc) => sum + doc.amount, 0);

    // Sum overall income and expense
    const allTxns = await FinancialTransaction.find({});
    let totalIncome = 0;
    let totalExpense = 0;
    
    allTxns.forEach(t => {
      if (t.type === 'Income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    const totalCorpus = totalIncome - totalExpense;

    // Active donors count
    const uniqueDonors = await Donation.distinct('donorName');
    const activeDonorsCount = uniqueDonors.length;

    // Gold Reserve details from Assets
    const goldAssets = await Asset.find({ category: 'Gold' });
    const goldValuation = goldAssets.reduce((sum, asset) => sum + (asset.currentValue || (asset as any).currentValuation || 0), 0);

    // Calculate total weight of gold assets dynamically
    let totalGoldWeight = 0;
    for (const asset of goldAssets) {
      const textToSearch = `${asset.assetName || ''} ${asset.notes || ''} ${asset.description || ''}`;
      const kgMatch = textToSearch.match(/(\d+(?:\.\d+)?)\s*kg/i);
      if (kgMatch) {
        totalGoldWeight += parseFloat(kgMatch[1]);
      } else {
        const gMatch = textToSearch.match(/(\d+(?:\.\d+)?)\s*(?:g|grams)/i);
        if (gMatch) {
          totalGoldWeight += parseFloat(gMatch[1]) / 1000;
        }
      }
    }

    // Dynamic 6-month chart aggregation
    const chartData = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const monthTxns = await FinancialTransaction.find({
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      let income = 0;
      let expense = 0;
      monthTxns.forEach(t => {
        if (t.type === 'Income') income += t.amount;
        else expense += t.amount;
      });
      
      const monthName = startOfMonth.toLocaleString('default', { month: 'short' });
      chartData.push({ name: monthName, income, expense });
    }

    res.json({
      success: true,
      data: {
        totalCorpus,
        todayCollection,
        totalIncome,
        totalExpense,
        activeDonors: activeDonorsCount,
        goldReserveValuation: goldValuation,
        goldReserveWeight: totalGoldWeight,
        chartData,
      },
      summary: {
        totalIncome,
        totalExpense,
        netBalance: totalCorpus,
      }
    });
  } catch (error: any) {
    logger.error(`Error in getTransactionSummary: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Transactions to CSV
export const exportTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transactions = await FinancialTransaction.find().sort({ date: -1 });

    const headers = 'Date,Type,Category,Amount,Description,Ref\n';
    const rows = transactions.map((t: any) => {
      const dateStr = t.date ? new Date(t.date).toISOString().slice(0, 10) : '';
      const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
      return `${dateStr},${t.type},${t.category},${t.amount},${desc},${t.reference || ''}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.csv');
    res.status(200).send(headers + rows);
  } catch (error: any) {
    logger.error(`Error in exportTransactions: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- BUDGETS -----------------

// List Budgets
export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const budgets = await Budget.find({ year: parseInt(year as string) });
    res.json({ success: true, budgets, data: budgets });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create or update budget
export const createOrUpdateBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { category, amount, year, month } = req.body;

  try {
    const filter: any = { category, year };
    if (month !== undefined) filter.month = month;

    const budget = await Budget.findOneAndUpdate(
      filter,
      { $set: { amount } },
      { upsert: true, new: true }
    );

    // Refresh spent amounts based on existing transactions
    await updateBudgetSpent(category, year, month);
    
    // Fetch refreshed budget
    const refreshed = await Budget.findOne(filter);

    await logActivity(req, 'CREATE_OR_UPDATE_BUDGET', 'Budget', budget._id.toString(), null, refreshed?.toObject());

    res.status(200).json({ success: true, budget: refreshed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Budget
export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const budget = await Budget.findById(id);
    if (!budget) {
      res.status(404).json({ success: false, message: 'Budget entry not found' });
      return;
    }

    const original = budget.toObject();
    await budget.deleteOne();

    await logActivity(req, 'DELETE_BUDGET', 'Budget', id, original, null);

    res.json({ success: true, message: 'Budget allocation deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
