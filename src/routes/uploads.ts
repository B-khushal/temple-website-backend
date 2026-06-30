import { Router } from 'express';
import { upload } from '../services/CloudinaryService';
import { handleUpload } from '../controllers/gallery.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Upload a single file (expects multipart form-data with field name 'file')
router.post('/', authenticateJWT, upload.single('file'), handleUpload);

export default router;
