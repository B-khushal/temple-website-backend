import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

// Rate limiter: 100 requests per 15 minutes per IP (much higher in development)
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

// Auth endpoints rate limiter: 15 requests per 15 minutes (higher in development)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or OTP attempts, please try again after 15 minutes',
  },
});

// Mongo Injection Sanitization Middleware
export const dbSanitizer = () => mongoSanitize();

// Simple XSS Sanitization Middleware (removes HTML tags from strings in request body)
export const xssSanitizer = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (val: any): any => {
    if (typeof val === 'string') {
      // Remove basic HTML tag structures
      return val.replace(/<[^>]*>/g, '');
    }
    if (Array.isArray(val)) {
      return val.map(sanitize);
    }
    if (typeof val === 'object' && val !== null) {
      const cleanObj: any = {};
      for (const key in val) {
        cleanObj[key] = sanitize(val[key]);
      }
      return cleanObj;
    }
    return val;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  next();
};
