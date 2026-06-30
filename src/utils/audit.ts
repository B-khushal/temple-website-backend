import { AuthRequest } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';
import logger from '../config/logger';

export async function logActivity(
  req: AuthRequest,
  action: string,
  module: string,
  targetId: string | null = null,
  previousState: any = null,
  newState: any = null
): Promise<void> {
  try {
    const userId = req.user?.id || 'System';
    const userName = req.user?.name || 'Anonymous / System';
    
    // IP collection
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Log in database
    await AuditLog.create({
      user: userId,
      userName,
      action,
      module,
      targetId: targetId || undefined,
      previousState,
      newState,
      ipAddress,
      userAgent,
    });

    // Mirror to winston logger
    logger.info(`📝 Audit Log: [${module}] User: ${userName} (${userId}) executed ${action}. Target: ${targetId || 'N/A'}`);
  } catch (error: any) {
    logger.error(`⚠️ Failed to write audit log: ${error.message}`);
  }
}
export default logActivity;
