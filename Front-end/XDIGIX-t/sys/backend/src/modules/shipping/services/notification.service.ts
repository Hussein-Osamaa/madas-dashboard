/**
 * ShippingNotificationService
 *
 * Sends email notifications to customers (and optionally merchants) when
 * shipment status changes. Uses nodemailer via the existing SMTP env vars.
 *
 * All calls are fire-and-forget (errors are logged, never thrown).
 * Configure via env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   SHIPPING_NOTIFY_MERCHANT=true|false  (default: false)
 */

import nodemailer from 'nodemailer';

// ─── Config ───────────────────────────────────────────────────────────────────

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const FROM = process.env.SMTP_FROM || 'XDIGIX Shipping <noreply@xdigix.com>';
const BRAND_COLOR = '#f59e0b'; // amber-500

// ─── Status copy ─────────────────────────────────────────────────────────────

interface StatusCopy {
  subject: string;
  headline: string;
  body: string;
  emoji: string;
  color: string;
}

const STATUS_COPY: Record<string, StatusCopy> = {
  pickup_scheduled: {
    emoji: '📅', color: '#6366f1',
    subject: 'Your order is scheduled for pickup',
    headline: 'Pickup Scheduled',
    body: 'Great news! Your order has been scheduled for pickup. Our courier will collect it soon.',
  },
  picked_up: {
    emoji: '🚚', color: '#8b5cf6',
    subject: 'Your order has been picked up',
    headline: 'Order Picked Up',
    body: 'Your package has been collected and is on its way to our sorting facility.',
  },
  in_warehouse: {
    emoji: '🏭', color: '#64748b',
    subject: 'Your order is at our warehouse',
    headline: 'In Warehouse',
    body: 'Your package has arrived at our warehouse and is being processed.',
  },
  sorted: {
    emoji: '📑', color: '#eab308',
    subject: 'Your order has been sorted',
    headline: 'Package Sorted',
    body: 'Your package has been sorted and is being assigned to a delivery courier.',
  },
  out_for_delivery: {
    emoji: '🛵', color: '#f97316',
    subject: 'Your order is out for delivery today!',
    headline: 'Out for Delivery',
    body: 'Your package is with our courier and on its way to you. Please be available to receive it.',
  },
  delivered: {
    emoji: '✅', color: '#22c55e',
    subject: 'Your order has been delivered!',
    headline: 'Delivered Successfully',
    body: 'Your package has been delivered. Thank you for choosing XDIGIX Shipping!',
  },
  failed: {
    emoji: '❌', color: '#ef4444',
    subject: 'Delivery attempt was unsuccessful',
    headline: 'Delivery Attempt Failed',
    body: 'Our courier was unable to deliver your package. We will attempt delivery again. Please ensure someone is available.',
  },
  return_initiated: {
    emoji: '↩️', color: '#f43f5e',
    subject: 'Your order is being returned',
    headline: 'Return Initiated',
    body: 'After multiple delivery attempts, your package is being returned to the sender.',
  },
  returned: {
    emoji: '🔄', color: '#6b7280',
    subject: 'Your order has been returned to sender',
    headline: 'Returned to Sender',
    body: 'Your package has been returned to the merchant. Please contact the merchant for next steps.',
  },
  cancelled: {
    emoji: '🚫', color: '#6b7280',
    subject: 'Your order has been cancelled',
    headline: 'Order Cancelled',
    body: 'Your shipment has been cancelled. Please contact support if you have any questions.',
  },
};

// ─── Email template ───────────────────────────────────────────────────────────

function buildEmailHtml(params: {
  recipientName: string;
  trackingNumber: string;
  copy: StatusCopy;
  trackingUrl: string;
}): string {
  const { recipientName, trackingNumber, copy, trackingUrl } = params;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0e26;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0e26;min-height:100vh">
    <tr><td align="center" style="padding:40px 20px">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="padding-bottom:24px">
          <table width="100%"><tr>
            <td>
              <div style="display:inline-flex;align-items:center;gap:10px">
                <div style="width:36px;height:36px;background:${BRAND_COLOR};border-radius:8px;display:inline-block;text-align:center;line-height:36px;font-weight:900;color:#000;font-size:16px">X</div>
                <span style="color:#fff;font-size:16px;font-weight:700;vertical-align:top;line-height:36px">XDIGIX Shipping</span>
              </div>
            </td>
          </tr></table>
        </td></tr>

        <!-- Status card -->
        <tr><td style="background:#1a1b3e;border:1px solid rgba(255,255,255,0.1);border-top:3px solid ${copy.color};border-radius:16px;padding:32px">
          <div style="font-size:48px;margin-bottom:16px">${copy.emoji}</div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px">${copy.headline}</h1>
          <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px">${copy.body}</p>

          <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:16px;margin-bottom:24px">
            <p style="color:#6b7280;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Tracking Number</p>
            <p style="color:#f59e0b;font-size:18px;font-weight:700;font-family:monospace;margin:0">${trackingNumber}</p>
          </div>

          <p style="color:#9ca3af;font-size:14px;margin:0 0 16px">Hi ${recipientName}, you can track your shipment status at any time:</p>

          <a href="${trackingUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:10px">
            Track Shipment →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center">
          <p style="color:#374151;font-size:12px;margin:0">© 2026 XDIGIX Shipping Platform. All rights reserved.</p>
          <p style="color:#374151;font-size:12px;margin:4px 0 0">This is an automated notification. Please do not reply.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ShipmentNotificationPayload {
  trackingNumber: string;
  newStatus: string;
  recipientName: string;
  recipientEmail?: string;      // if available — customer notification
  merchantEmail?: string;       // optional — merchant notification
}

export async function notifyShipmentStatusChange(payload: ShipmentNotificationPayload): Promise<void> {
  const { trackingNumber, newStatus, recipientName, recipientEmail, merchantEmail } = payload;

  const copy = STATUS_COPY[newStatus];
  if (!copy) return; // no copy defined for this status, skip silently

  const transporter = getTransporter();
  if (!transporter) return; // SMTP not configured

  const trackingUrl = `${process.env.TRACKING_APP_URL || 'https://track.xdigix.com'}?track=${trackingNumber}`;

  const html = buildEmailHtml({ recipientName, trackingNumber, copy, trackingUrl });

  const recipients: string[] = [];
  if (recipientEmail) recipients.push(recipientEmail);
  if (merchantEmail && process.env.SHIPPING_NOTIFY_MERCHANT === 'true') recipients.push(merchantEmail);

  if (recipients.length === 0) return;

  try {
    await transporter.sendMail({
      from: FROM,
      to: recipients.join(', '),
      subject: `${copy.emoji} ${copy.subject} — #${trackingNumber}`,
      html,
    });
  } catch (err) {
    console.error('[ShippingNotification] Email error:', err);
  }
}
