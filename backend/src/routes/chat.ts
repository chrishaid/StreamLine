import { Router } from 'express';
import { sendMessage, sendMessageStream, getSuggestions } from '../controllers/chatController';

export const chatRouter = Router();

chatRouter.post('/message', sendMessage);
chatRouter.post('/message/stream', sendMessageStream);
chatRouter.post('/suggestions', getSuggestions);
