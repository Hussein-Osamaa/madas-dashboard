import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { logSystemEvent } from './logger';

// Email templates
const templates = {
  welcome: `
    <h1>Welcome to Madas!</h1>
    <p>Hi {{name}},</p>
    <p>Welcome to Madas! We're excited to have you on board.</p>
    <p>Get started by creating your first website with our drag-and-drop builder.</p>
    <a href="{{dashboardUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
    <p>Best regards,<br>The Madas Team</p>
  `,
  
  subscriptionCreated: `
    <h1>Subscription Created</h1>
    <p>Hi {{name}},</p>
    <p>Your {{plan}} subscription has been successfully created!</p>
    <p>You now have access to:</p>
    <ul>
      {{#each features}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
    <a href="{{dashboardUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Manage Subscription</a>
    <p>Best regards,<br>The Madas Team</p>
  `,
  
  subscriptionCanceled: `
    <h1>Subscription Canceled</h1>
    <p>Hi {{name}},</p>
    <p>Your {{plan}} subscription has been canceled.</p>
    <p>You'll continue to have access to your plan features until {{endDate}}.</p>
    <a href="{{dashboardUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reactivate Subscription</a>
    <p>Best regards,<br>The Madas Team</p>
  `,
  
  websitePublished: `
    <h1>Website Published!</h1>
    <p>Hi {{name}},</p>
    <p>Congratulations! Your website "{{websiteName}}" has been successfully published.</p>
    <p>You can view it at: <a href="{{websiteUrl}}">{{websiteUrl}}</a></p>
    <a href="{{websiteUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Website</a>
    <p>Best regards,<br>The Madas Team</p>
  `,
  
  passwordReset: `
    <h1>Password Reset</h1>
    <p>Hi {{name}},</p>
    <p>You requested a password reset for your Madas account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="{{resetUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>The Madas Team</p>
  `,
  
  securityAlert: `
    <h1>Security Alert</h1>
    <p>Hi {{name}},</p>
    <p>We detected suspicious activity on your account:</p>
    <p><strong>{{event}}</strong></p>
    <p>If this wasn't you, please secure your account immediately.</p>
    <a href="{{securityUrl}}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Secure Account</a>
    <p>Best regards,<br>The Madas Team</p>
  `,
};

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

// Create transporter
const transporter = nodemailer.createTransporter(emailConfig);

/**
 * Send email using template
 */
export const sendEmail = async (
  to: string,
  subject: string,
  templateName: keyof typeof templates,
  data: Record<string, any>
): Promise<boolean> => {
  try {
    const template = handlebars.compile(templates[templateName]);
    const html = template({
      ...data,
      dashboardUrl: process.env.DASHBOARD_URL || 'https://dashboard.madas.com',
      websiteUrl: data.websiteUrl,
      resetUrl: data.resetUrl,
      securityUrl: process.env.SECURITY_URL || 'https://dashboard.madas.com/security',
    });

    const mailOptions = {
      from: {
        name: 'Madas',
        address: process.env.FROM_EMAIL || 'noreply@madas.com',
      },
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    
    await logSystemEvent(
      'info',
      `Email sent: ${templateName} to ${to}`,
      'system',
      { templateName, to, subject }
    );

    return true;
  } catch (error) {
    await logSystemEvent(
      'error',
      `Failed to send email: ${templateName} to ${to}`,
      'system',
      { templateName, to, subject, error: error.message }
    );
    return false;
  }
};

/**
 * Send welcome email to new user
 */
export const sendWelcomeEmail = async (user: any) => {
  return sendEmail(
    user.email,
    'Welcome to Madas!',
    'welcome',
    {
      name: user.displayName || user.email,
    }
  );
};

/**
 * Send subscription confirmation email
 */
export const sendSubscriptionEmail = async (
  user: any,
  subscription: any,
  plan: any
) => {
  return sendEmail(
    user.email,
    `Welcome to ${plan.name}!`,
    'subscriptionCreated',
    {
      name: user.displayName || user.email,
      plan: plan.name,
      features: plan.features,
    }
  );
};

/**
 * Send subscription cancellation email
 */
export const sendSubscriptionCanceledEmail = async (
  user: any,
  subscription: any,
  plan: any
) => {
  return sendEmail(
    user.email,
    'Subscription Canceled',
    'subscriptionCanceled',
    {
      name: user.displayName || user.email,
      plan: plan.name,
      endDate: subscription.currentPeriodEnd,
    }
  );
};

/**
 * Send website published email
 */
export const sendWebsitePublishedEmail = async (
  user: any,
  website: any
) => {
  return sendEmail(
    user.email,
    'Website Published!',
    'websitePublished',
    {
      name: user.displayName || user.email,
      websiteName: website.name,
      websiteUrl: website.url,
    }
  );
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  user: any,
  resetToken: string
) => {
  const resetUrl = `${process.env.DASHBOARD_URL}/reset-password?token=${resetToken}`;
  
  return sendEmail(
    user.email,
    'Reset Your Password',
    'passwordReset',
    {
      name: user.displayName || user.email,
      resetUrl,
    }
  );
};

/**
 * Send security alert email
 */
export const sendSecurityAlertEmail = async (
  user: any,
  event: string,
  details?: any
) => {
  return sendEmail(
    user.email,
    'Security Alert - Madas Account',
    'securityAlert',
    {
      name: user.displayName || user.email,
      event,
      details,
    }
  );
};

/**
 * Send admin notification email
 */
export const sendAdminNotification = async (
  subject: string,
  message: string,
  data?: any
) => {
  try {
    // Get admin emails
    const admins = await admin.firestore()
      .collection('users')
      .where('role', '==', 'admin')
      .get();

    const adminEmails = admins.docs.map(doc => doc.data().email);

    if (adminEmails.length === 0) {
      throw new Error('No admin emails found');
    }

    const html = `
      <h1>Admin Notification</h1>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong> ${message}</p>
      ${data ? `<p><strong>Data:</strong> <pre>${JSON.stringify(data, null, 2)}</pre></p>` : ''}
      <p>Timestamp: ${new Date().toISOString()}</p>
    `;

    const mailOptions = {
      from: {
        name: 'Madas System',
        address: process.env.FROM_EMAIL || 'noreply@madas.com',
      },
      to: adminEmails.join(', '),
      subject: `[Madas Admin] ${subject}`,
      html,
    };

    await transporter.sendMail(mailOptions);
    
    await logSystemEvent(
      'info',
      `Admin notification sent: ${subject}`,
      'system',
      { subject, message, adminEmails }
    );

    return true;
  } catch (error) {
    await logSystemEvent(
      'error',
      `Failed to send admin notification: ${subject}`,
      'system',
      { subject, message, error: error.message }
    );
    return false;
  }
};

/**
 * Send bulk email to users
 */
export const sendBulkEmail = async (
  users: any[],
  subject: string,
  templateName: keyof typeof templates,
  data: Record<string, any>
): Promise<{ sent: number; failed: number }> => {
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const success = await sendEmail(
      user.email,
      subject,
      templateName,
      { ...data, name: user.displayName || user.email }
    );

    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, failed };
};
