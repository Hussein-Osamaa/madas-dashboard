import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../schemas/user.schema';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { Business } from '../schemas/business.schema';
import { config } from '../config';

const SALT_ROUNDS = 10;

export interface LoginResult {
  user: {
    uid: string;
    email: string;
    displayName?: string;
    emailVerified: boolean;
    stsTokenManager?: { accessToken: string; refreshToken: string; expirationTime: number };
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(email: string, password: string): Promise<LoginResult | null> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const uid = user.uid;
  const accountType = user.type === 'super_admin' ? 'ADMIN' : 'CLIENT';
  const payload = {
    sub: uid, userId: uid, email: user.email,
    type: user.type, accountType, role: user.type,
    businessId: user.businessId, tenantId: user.tenantId,
  };
  const options: jwt.SignOptions = { expiresIn: config.jwt.accessExpiry as unknown as jwt.SignOptions['expiresIn'] };
  const accessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, options);

  const refreshTokenValue = uuidv4();
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    userId: uid,
    accountType: accountType as 'CLIENT' | 'ADMIN',
    token: refreshTokenValue,
    expiresAt: refreshExpires,
  });

  const decoded = jwt.decode(accessToken) as { exp?: number };
  const expirationTime = decoded?.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
  const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;

  return {
    user: {
      uid,
      email: user.email,
      displayName: user.displayName || undefined,
      emailVerified: user.emailVerified ?? false,
      stsTokenManager: {
        accessToken,
        refreshToken: refreshTokenValue,
        expirationTime,
      },
    },
    accessToken,
    refreshToken: refreshTokenValue,
    expiresIn,
  };
}

export async function signup(email: string, password: string): Promise<LoginResult | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return null;

  const uid = uuidv4().replace(/-/g, '').slice(0, 20);
  const passwordHash = await hashPassword(password);

  await User.create({
    uid,
    email: normalizedEmail,
    passwordHash,
    type: 'client_staff',
    emailVerified: false,
  });

  return login(normalizedEmail, password);
}

export async function refreshAccessToken(refreshTokenValue: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  const tokenDoc = await RefreshToken.findOne({ token: refreshTokenValue });
  if (!tokenDoc || tokenDoc.expiresAt < new Date()) return null;

  const user = await User.findOne({ uid: tokenDoc.userId });
  if (!user) return null;

  const at = user.type === 'super_admin' ? 'ADMIN' : 'CLIENT';
  const payload = {
    sub: user.uid, userId: user.uid, email: user.email,
    type: user.type, accountType: at, role: user.type,
    businessId: user.businessId, tenantId: user.tenantId,
  };
  const options: jwt.SignOptions = { expiresIn: config.jwt.accessExpiry as unknown as jwt.SignOptions['expiresIn'] };
  const accessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, options);

  const decoded = jwt.decode(accessToken) as { exp?: number };
  const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;

  return { accessToken, expiresIn };
}

export async function logout(refreshTokenValue: string): Promise<void> {
  await RefreshToken.deleteOne({ token: refreshTokenValue });
}

export function verifyAccessToken(token: string): { uid: string; email: string; type: string; businessId?: string; tenantId?: string } | null {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret as jwt.Secret) as { sub: string; email: string; type: string; businessId?: string; tenantId?: string };
    return {
      uid: decoded.sub,
      email: decoded.email,
      type: decoded.type,
      businessId: decoded.businessId,
      tenantId: decoded.tenantId,
    };
  } catch {
    return null;
  }
}

export async function getEffectiveTenantId(uid: string): Promise<string | null> {
  const user = await User.findOne({ uid });
  if (!user) return null;
  if (user.tenantId) return user.tenantId;
  if (user.businessId) {
    const business = await Business.findOne({ businessId: user.businessId });
    return business?.tenantId ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------
import nodemailer from 'nodemailer';
import { PasswordResetToken, generateResetToken } from '../schemas/password-reset-token.schema';
import { AdminUser } from '../schemas/admin-user.schema';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

async function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

/**
 * Request a password reset. Sends an email with a reset link.
 * Always returns success (even if email not found) to prevent user enumeration.
 */
export async function requestPasswordReset(email: string, resetBaseUrl?: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  const adminUser = !user ? await AdminUser.findOne({ email: normalizedEmail }) : null;
  if (!user && !adminUser) return; // silent – don't reveal that the email doesn't exist

  // Invalidate any existing tokens for this email
  await PasswordResetToken.updateMany({ email: normalizedEmail, used: false }, { $set: { used: true } });

  const token = generateResetToken();
  await PasswordResetToken.create({
    email: normalizedEmail,
    token,
    expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
  });

  const baseUrl = resetBaseUrl
    || process.env.FRONTEND_URL
    || process.env.DASHBOARD_URL
    || 'https://xdigix-os.vercel.app/dashboard';
  const resetLink = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

  const transporter = await getSmtpTransporter();
  if (transporter) {
    const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@xdigix.com';
    try {
      await transporter.sendMail({
        from: `XDIGIX <${fromAddr}>`,
        to: normalizedEmail,
        subject: 'Password Reset - XDIGIX',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1b3e;">Password Reset</h2>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #2d5a27; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
            <p style="margin-top: 16px; font-size: 14px; color: #666;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
      console.log(`[Auth] Password reset email sent to ${normalizedEmail}`);
    } catch (emailErr) {
      console.error('[Auth] SMTP send failed:', emailErr);
      console.log(`[Auth] Fallback reset link: ${resetLink}`);
    }
  } else {
    console.log(`[Auth] Password reset link (SMTP not configured): ${resetLink}`);
  }
}

/**
 * Reset password using a valid token.
 */
export async function resetPasswordWithToken(
  token: string,
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const resetDoc = await PasswordResetToken.findOne({ token, email: normalizedEmail, used: false });
  if (!resetDoc) return { success: false, error: 'Invalid or expired reset link' };
  if (resetDoc.expiresAt < new Date()) {
    resetDoc.used = true;
    await resetDoc.save();
    return { success: false, error: 'Reset link has expired' };
  }

  const passwordHash = await hashPassword(newPassword);

  // Try User collection first, then AdminUser
  const user = await User.findOne({ email: normalizedEmail });
  if (user) {
    user.passwordHash = passwordHash;
    await user.save();
  } else {
    const admin = await AdminUser.findOne({ email: normalizedEmail });
    if (admin) {
      admin.passwordHash = passwordHash;
      await admin.save();
    } else {
      return { success: false, error: 'Account not found' };
    }
  }

  resetDoc.used = true;
  await resetDoc.save();

  return { success: true };
}
