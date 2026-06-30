import { Router } from 'express';
import * as assetController from '../controllers/asset.controller';
import { authenticateJWT, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { assetSchema, assetValuationSchema } from '../validators/asset.validator';

const router = Router();

// Public route to view assets
router.get('/', assetController.getAssets);

// Administrative routes
router.post(
  '/', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Treasurer']), 
  validateRequest(assetSchema), 
  assetController.createAsset
);

router.put(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Treasurer']), 
  validateRequest(assetSchema), 
  assetController.updateAsset
);

router.delete(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin']), 
  assetController.deleteAsset
);

router.post(
  '/:id/revalue',
  authenticateJWT,
  requireRoles(['Super Admin', 'Treasurer']),
  validateRequest(assetValuationSchema),
  assetController.revalueAsset
);

export default router;
