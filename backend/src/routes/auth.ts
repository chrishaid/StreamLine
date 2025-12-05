import { Router } from 'express';
import passport from '../config/passport';
import {
  googleCallback,
  microsoftAuth,
  microsoftCallback,
  getCurrentUser,
  logout,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

export const authRouter = Router();

// Google OAuth routes
authRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

// Microsoft OAuth routes
authRouter.get('/microsoft', microsoftAuth);
authRouter.get('/microsoft/callback', microsoftCallback);

// Protected routes
authRouter.get('/me', authenticateToken, getCurrentUser);
authRouter.post('/logout', authenticateToken, logout);

export default authRouter;
