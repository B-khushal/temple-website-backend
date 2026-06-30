import { Router } from 'express';
import * as committeeController from '../controllers/committee.controller';
import { authenticateJWT, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { committeeMemberSchema } from '../validators/committee.validator';

const router = Router();

// Public route to view committee list
router.get('/', committeeController.getCommittee);

// Administrative routes
router.post(
  '/', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  validateRequest(committeeMemberSchema), 
  committeeController.createCommittee
);

router.put(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  validateRequest(committeeMemberSchema), 
  committeeController.updateCommittee
);

router.delete(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin']), 
  committeeController.deleteCommittee
);

export default router;
