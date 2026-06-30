import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`Error: ${message}`, {
    method: req.method,
    url: req.originalUrl,
    status: statusCode,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message,
    errors: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
export default errorHandler;
