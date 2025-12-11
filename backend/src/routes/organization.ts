import { Router } from 'express';
import { sendInvitationEmail } from '../controllers/organizationController';

export const organizationRouter = Router();

// Send invitation email
organizationRouter.post('/invite/email', sendInvitationEmail);
