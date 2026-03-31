import nodemailer from 'nodemailer';
import { createLogger } from '../../../lib/logger';

const log = createLogger('email-provider');

let transporter: nodemailer.Transporter | null = null;

/**
 * Lazily create the SMTP transporter.
 * If SMTP is not configured, returns a dummy transporter that logs instead of sending.
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user) {
    log.warn('SMTP not configured — emails will be logged but not sent');
    return {
      sendMail: async (opts: { to?: string; subject?: string }) => {
        log.info('EMAIL (not sent, no SMTP)', {
          to: String(opts.to ?? ''),
          subject: String(opts.subject ?? ''),
        });
        return { messageId: 'dev-' + Date.now() };
      },
    } as unknown as nodemailer.Transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export const emailProvider = {
  async send(
    to: string,
    subject: string,
    body: string,
    from?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const t = getTransporter();
      const result = await t.sendMail({
        from: from || process.env.SMTP_FROM || 'noreply@xdigix.com',
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });
      log.info('Email sent', {
        to,
        subject: subject.slice(0, 50),
        messageId: String(result.messageId ?? ''),
      });
      return { success: true, messageId: result.messageId as string };
    } catch (err) {
      const error = (err as Error).message;
      log.error('Email send failed', { to, subject: subject.slice(0, 50), error });
      return { success: false, error };
    }
  },
};
