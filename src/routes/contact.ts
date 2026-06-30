import { Router } from 'express';
import * as contactController from '../controllers/contact.controller';
import { authenticateJWT, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { contactMessageSchema } from '../validators/contact.validator';

const router = Router();

// Public route to send contact message
router.post('/', validateRequest(contactMessageSchema), contactController.createMessage);

// Administrative routes
router.get(
  '/', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  contactController.getMessages
);

// Map status update to both endpoints to prevent breaking variations
router.put(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  contactController.updateMessageStatus
);

router.put(
  '/:id/status', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  contactController.updateMessageStatus
);

export default router;
