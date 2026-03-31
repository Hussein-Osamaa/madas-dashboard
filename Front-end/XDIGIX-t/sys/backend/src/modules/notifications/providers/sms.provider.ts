import { createLogger } from '../../../lib/logger';

const log = createLogger('sms-provider');

export const smsProvider = {
  /**
   * Send an SMS message.
   * Foundation stub: SMS provider not yet integrated. Logs and returns failure.
   */
  async send(
    to: string,
    body: string
  ): Promise<{ success: boolean; error?: string }> {
    log.info('SMS (not sent, provider not configured)', {
      to,
      bodyLength: String(body.length),
    });
    return { success: false, error: 'SMS provider not configured' };
  },
};
