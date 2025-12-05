import { Request, Response, NextFunction } from 'express';
import { generateToken } from '../utils/jwt';
import { User, userStore } from '../models/userModel';
import {
  getMicrosoftAuthUrl,
  handleMicrosoftCallback,
} from '../services/microsoftAuthService';

// Google OAuth callback handler
export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as User;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
    });

    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`
    );
  } catch (error) {
    next(error);
  }
}

// Microsoft OAuth initiation
export async function microsoftAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/auth/microsoft/callback`;
    const authUrl = await getMicrosoftAuthUrl(redirectUri);
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
}

// Microsoft OAuth callback handler
export async function microsoftCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=no_code`);
    }

    const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/auth/microsoft/callback`;
    const user = await handleMicrosoftCallback(code, redirectUri);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
    });

    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`
    );
  } catch (error) {
    next(error);
  }
}

// Get current user info
export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const user = userStore.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    // Return user without sensitive data
    const { ...userData } = user;
    res.json(userData);
  } catch (error) {
    next(error);
  }
}

// Logout
export async function logout(req: Request, res: Response) {
  res.json({ message: 'Logged out successfully' });
}
