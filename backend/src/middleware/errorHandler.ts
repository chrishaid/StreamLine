import { Request, Response, NextFunction } from 'express';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: APIError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error('Error:', {
    statusCode,
    message,
    code: err.code,
    details: err.details,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      details: err.details,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
