import nodemailer from 'nodemailer';
import axios from 'axios';
import { Notification } from '../models/Notification.js';

const appUrl = process.env.APP_URL || 'http://localhost:5173';

function getReportLink(reportId) {
  return `${appUrl}/reports/${reportId}`;
}

/**
 * Create dashboard notification and send email + WhatsApp when report is ready.
 */
export async function notifyReportReady(clientId, reportId, periodType, periodLabel, closingBalance) {
  const reportLink = getReportLink(reportId);
  const title = `${periodType} Inventory Report Ready`;
  const message = `Your ${periodType.toLowerCase()} inventory report (${periodLabel}) is ready. Closing balance: ${closingBalance} items. Download: ${reportLink}`;

  await Notification.create({
    clientId,
    title,
    message,
    type: 'REPORT',
    channels: ['dashboard', 'email', 'whatsapp'],
    read: false,
  });

  await sendEmailNotification(clientId, title, message, reportLink);
  await sendWhatsAppNotification(clientId, title, message, reportLink, closingBalance);
}

async function getClientEmail(clientId) {
  const { Client } = await import('../models/Client.js');
  const c = await Client.findById(clientId).select('email').lean();
  return c?.email;
}

async function getClientPhone(clientId) {
  const { Client } = await import('../models/Client.js');
  const c = await Client.findById(clientId).select('phone').lean();
  return c?.phone;
}

async function sendEmailNotification(clientId, title, message, reportLink) {
  const to = await getClientEmail(clientId);
  if (!to || !process.env.SMTP_HOST) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'reports@fulfilment.local',
      to,
      subject: title,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p><p><a href="${reportLink}">Download Report</a></p>`,
    });
  } catch (e) {
    console.error('Email send failed:', e.message);
  }
}

async function sendWhatsAppNotification(clientId, title, message, reportLink, closingBalance) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
  if (!token || !phoneId) return;

  const to = await getClientPhone(clientId);
  if (!to) return;

  const body = `Your inventory report is ready. Closing balance: ${closingBalance} items. Download: ${reportLink}`;

  try {
    await axios.post(
      `${apiUrl}/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (e) {
    console.error('WhatsApp send failed:', e.response?.data || e.message);
  }
}
