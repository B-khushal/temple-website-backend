import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import logger from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'durga-mata-temple-secret-key-super-secure-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'durga-mata-temple-refresh-secret-key-super-secure-2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
  ipAddress?: string;
}

export function generateAccessToken(user: any) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '15m' } // 15 minutes access token
  );
}

export function generateRefreshToken(user: any) {
  return jwt.sign(
    { id: user._id.toString() },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // 7 days refresh token
  );
}

export async function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Access token is required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Fetch user to check if active and exists
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(403).json({ success: false, message: 'User account is deactivated or does not exist' });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Access token has expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    logger.warn(`Failed token verification: ${err.message}`);
    res.status(403).json({ success: false, message: 'Invalid or malformed access token' });
  }
}

export async function attachUserIfAuthenticated(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);

    if (user && user.isActive) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
      };
    }
  } catch (err: any) {
    logger.warn(`Optional token attachment skipped: ${err.message}`);
  }

  next();
}

export function requireRoles(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden. Insufficient permissions.' });
      return;
    }

    next();
  };
}
