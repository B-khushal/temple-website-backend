import { Router } from 'express';
import * as donationController from '../controllers/donation.controller';
import { attachUserIfAuthenticated, authenticateJWT, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { donationSchema } from '../validators/donation.validator';

const router = Router();

// Public route to submit a donation
router.post('/', attachUserIfAuthenticated, validateRequest(donationSchema), donationController.createDonation);

// Public route to retrieve PDF receipt
router.get('/:id/receipt', donationController.getReceiptPDF);

// Administrative routes
router.get(
  '/', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Treasurer', 'Accountant']), 
  donationController.getDonations
);

router.get(
  '/export',
  authenticateJWT,
  requireRoles(['Super Admin', 'Treasurer']),
  donationController.exportDonations
);

router.put(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Treasurer']), 
  validateRequest(donationSchema), 
  donationController.updateDonation
);

router.delete(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin']), 
  donationController.deleteDonation
);

export default router;
