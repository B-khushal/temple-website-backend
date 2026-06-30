import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticateJWT, requireRoles } from '../middleware/auth';

const router = Router();

// Apply auth to all dashboard endpoints
router.use(authenticateJWT);

router.get('/overview', requireRoles(['Super Admin', 'Treasurer', 'Accountant', 'Committee Member', 'Content Manager']), dashboardController.getOverview);
router.get('/donations', requireRoles(['Super Admin', 'Treasurer', 'Accountant']), dashboardController.getDonationsStats);
router.get('/assets', requireRoles(['Super Admin', 'Treasurer']), dashboardController.getAssetsStats);
router.get('/financials', requireRoles(['Super Admin', 'Treasurer', 'Accountant']), dashboardController.getFinancialsStats);

export default router;
