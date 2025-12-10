import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'NO_TOKEN',
        message: 'Authentication token required',
      },
    });
  }

  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('[Auth] Token verification failed:', error?.message || 'No user');
      return res.status(403).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }

    // Set user on request
    req.user = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
    };

    next();
  } catch (err: any) {
    console.error('[Auth] Error verifying token:', err.message);
    return res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Failed to verify authentication',
      },
    });
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        };
      }
    } catch (err) {
      // Silently ignore auth errors for optional auth
    }
  }

  next();
}

// Role-based access control
export function requireRole(...roles: Array<'viewer' | 'editor' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // For now, we'll need to fetch the user from storage to check their role
    // In production, you might include role in the JWT payload
    next();
  };
}
