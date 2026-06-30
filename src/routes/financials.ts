import { Router } from 'express';
import * as financialController from '../controllers/financial.controller';
import { authenticateJWT, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { transactionSchema, budgetSchema } from '../validators/financial.validator';

const router = Router();

// Require credentials for all financials endpoints (Treasurer, Accountant, Super Admin)
router.use(authenticateJWT, requireRoles(['Super Admin', 'Treasurer', 'Accountant']));

// Financial Transactions (Ledger)
router.get('/', financialController.getTransactions);
router.get('/summary', financialController.getTransactionSummary);
router.get('/export', requireRoles(['Super Admin', 'Treasurer']), financialController.exportTransactions);
router.post('/', validateRequest(transactionSchema), financialController.createTransaction);
router.put('/:id', validateRequest(transactionSchema), financialController.updateTransaction);
router.delete('/:id', requireRoles(['Super Admin']), financialController.deleteTransaction);

// Budgets
router.get('/budgets', financialController.getBudgets);
router.post('/budgets', requireRoles(['Super Admin', 'Treasurer']), validateRequest(budgetSchema), financialController.createOrUpdateBudget);
router.delete('/budgets/:id', requireRoles(['Super Admin']), financialController.deleteBudget);

export default router;
