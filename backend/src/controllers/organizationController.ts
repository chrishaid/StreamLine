import { Request, Response } from 'express';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationEmailRequest {
  email: string;
  organizationName: string;
  inviterName: string;
  role: string;
  inviteToken: string;
  frontendUrl: string;
}

export async function sendInvitationEmail(req: Request, res: Response) {
  try {
    const {
      email,
      organizationName,
      inviterName,
      role,
      inviteToken,
      frontendUrl,
    }: SendInvitationEmailRequest = req.body;

    // Validate required fields
    if (!email || !organizationName || !inviteToken || !frontendUrl) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Missing required fields: email, organizationName, inviteToken, frontendUrl',
        },
      });
    }

    const inviteUrl = `${frontendUrl}/invite/${inviteToken}`;
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

    // Send the email
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'StreamLine <onboarding@resend.dev>',
      to: email,
      subject: `You've been invited to join ${organizationName} on StreamLine`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to ${organizationName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">StreamLine</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">BPMN Process Designer</p>
          </div>

          <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
            <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 22px;">You're invited!</h2>

            <p style="margin: 0 0 24px 0; color: #475569;">
              ${inviterName ? `<strong>${inviterName}</strong> has` : 'You have been'} invited you to join
              <strong style="color: #6366f1;">${organizationName}</strong> as a <strong>${roleDisplay}</strong>.
            </p>

            <p style="margin: 0 0 24px 0; color: #475569;">
              StreamLine helps teams design, collaborate on, and manage BPMN business processes with AI assistance.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>

            <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin: 8px 0 0 0; word-break: break-all;">
              <a href="${inviteUrl}" style="color: #6366f1; font-size: 14px;">${inviteUrl}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

            <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
              This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>

          <div style="text-align: center; padding: 24px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} StreamLine. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
You've been invited to join ${organizationName} on StreamLine!

${inviterName ? `${inviterName} has` : 'You have been'} invited you to join ${organizationName} as a ${roleDisplay}.

StreamLine helps teams design, collaborate on, and manage BPMN business processes with AI assistance.

Accept your invitation by clicking this link:
${inviteUrl}

This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
      `.trim(),
    });

    if (error) {
      console.error('[Organization] Failed to send invitation email:', error);
      return res.status(500).json({
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send invitation email',
          details: error.message,
        },
      });
    }

    console.log(`[Organization] Invitation email sent to ${email} for org ${organizationName}`);

    return res.json({
      success: true,
      messageId: data?.id,
    });
  } catch (error: any) {
    console.error('[Organization] Error sending invitation email:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send invitation email',
        details: error.message,
      },
    });
  }
}
