import { Router } from 'express';
import { sendMessage, getSuggestions } from '../controllers/chatController';

export const chatRouter = Router();

chatRouter.post('/message', sendMessage);
chatRouter.post('/suggestions', getSuggestions);
