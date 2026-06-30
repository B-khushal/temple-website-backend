import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import cloudinary from '../config/cloudinary';
import logger from '../config/logger';

const UPLOADS_DIR = path.join(os.tmpdir(), 'temple-uploads-temp');

// Ensure local temp uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration (disk storage to allow validation & scanning first)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File validation filter
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf', '.docx', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Only images (PNG, JPG, WEBP, GIF), PDFs, and Documents are allowed.'));
  }
};

// Export Multer upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Mock virus scan hook (easily replaceable with ClamAV / scanner API)
export async function scanFile(filePath: string): Promise<boolean> {
  logger.info(`🔍 Running virus scan hook on: ${path.basename(filePath)}...`);
  // Simulate scanner latency
  await new Promise((resolve) => setTimeout(resolve, 100));
  logger.info(`✅ Scan complete: ${path.basename(filePath)} is clean.`);
  return true;
}

// Upload file to Cloudinary (Mandatory, no local fallback)
export async function uploadFile(filePath: string): Promise<{ url: string; key: string }> {
  // 1. Run virus scan
  const isClean = await scanFile(filePath);
  if (!isClean) {
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    throw new Error('Security Alert: File failed virus scan validation.');
  }

  const hasCloudinary = 
    !!process.env.CLOUDINARY_CLOUD_NAME && 
    !!process.env.CLOUDINARY_API_KEY && 
    !!process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinary) {
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    throw new Error('Cloudinary credentials are not configured on the server.');
  }

  try {
    logger.info(`☁️ Dispatching file ${path.basename(filePath)} to Cloudinary...`);
    
    const fileExt = path.extname(filePath).toLowerCase();
    const isPdf = fileExt === '.pdf';

    const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: 'temple-uploads',
      resource_type: isPdf ? 'raw' : 'auto',
    });

    logger.info(`✅ Uploaded to Cloudinary successfully. URL: ${uploadResult.secure_url}`);
    
    // Clean up local temp file
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) logger.error(`Failed to delete local temp file: ${err.message}`);
      });
    }

    return {
      url: uploadResult.secure_url,
      key: uploadResult.public_id,
    };
  } catch (error: any) {
    // Clean up local temp file on error
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr: any) {
        logger.error(`Failed to clean up temp file after error: ${unlinkErr.message}`);
      }
    }
    logger.error(`❌ Cloudinary upload failed: ${error.message}`);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
}
