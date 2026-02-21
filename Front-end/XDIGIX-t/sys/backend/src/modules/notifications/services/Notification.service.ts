import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { NotificationModel } from '../models/Notification.model';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

/**
 * When report is created: dashboard notification, email, WhatsApp.
 */
export async function notifyReportReady(
  clientId: string,
  reportId: string,
  closingBalance: number,
  recipientEmail?: string,
  recipientPhone?: string
): Promise<void> {
  const link = `${BASE_URL}/api/client/warehouse/reports/${reportId}/download`;
  const message = `Your inventory report is ready. Closing balance: ${closingBalance} items. Download: ${link}`;

  await NotificationModel.create({
    clientId,
    type: 'inventory_report',
    reportId: new mongoose.Types.ObjectId(reportId),
    channel: 'dashboard',
    recipient: undefined,
    success: true,
  });

  if (recipientEmail) {
    const transporter = await getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@digix.com',
          to: recipientEmail,
          subject: 'Inventory Report Ready - DIGIX OS',
          text: message,
        });
        await NotificationModel.create({
          clientId,
          type: 'inventory_report',
          reportId: new mongoose.Types.ObjectId(reportId),
          channel: 'email',
          recipient: recipientEmail,
          success: true,
        });
      } catch (err) {
        await NotificationModel.create({
          clientId,
          type: 'inventory_report',
          reportId: new mongoose.Types.ObjectId(reportId),
          channel: 'email',
          recipient: recipientEmail,
          success: false,
          error: (err as Error).message,
        });
      }
    }
  }

  if (recipientPhone && process.env.WHATSAPP_ACCESS_TOKEN) {
    try {
      const resp = await fetch(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: String(recipientPhone).replace(/\D/g, ''),
            type: 'text',
            text: { body: message },
          }),
        }
      );
      const ok = resp.ok;
      const body = await resp.text();
      await NotificationModel.create({
        clientId,
        type: 'inventory_report',
        reportId: new mongoose.Types.ObjectId(reportId),
        channel: 'whatsapp',
        recipient: recipientPhone,
        success: ok,
        error: ok ? undefined : body,
      });
    } catch (err) {
      await NotificationModel.create({
        clientId,
        type: 'inventory_report',
        reportId: new mongoose.Types.ObjectId(reportId),
        channel: 'whatsapp',
        recipient: recipientPhone,
        success: false,
        error: (err as Error).message,
      });
    }
  }
}
