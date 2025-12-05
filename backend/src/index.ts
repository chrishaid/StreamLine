import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport';
import { chatRouter } from './routes/chat';
import { processRouter } from './routes/process';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize passport
app.use(passport.initialize());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication routes (public)
app.use('/auth', authRouter);

// API Routes (protected)
app.use('/api/chat', authenticateToken, chatRouter);
app.use('/api/processes', authenticateToken, processRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 StreamLine backend running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Claude API configured: ${!!process.env.ANTHROPIC_API_KEY}`);
  console.log(`🔐 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  console.log(`🔐 Microsoft OAuth: ${process.env.MICROSOFT_CLIENT_ID ? 'Configured' : 'Not configured'}`);
});

export default app;
