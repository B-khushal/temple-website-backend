import { Router } from 'express';
import * as galleryController from '../controllers/gallery.controller';
import { authenticateJWT, requireRoles } from '../middleware/auth';

const router = Router();

// Public route to view gallery
router.get('/', galleryController.getGallery);

// Administrative routes
router.post(
  '/', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  galleryController.createGalleryItem
);

router.put(
  '/:id',
  authenticateJWT,
  requireRoles(['Super Admin', 'Content Manager']),
  galleryController.updateGalleryItem
);

router.delete(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  galleryController.deleteGalleryItem
);

export default router;
