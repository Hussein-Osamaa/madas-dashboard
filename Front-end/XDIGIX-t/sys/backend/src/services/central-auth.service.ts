/**
 * Central Auth Service - Separate identity for CLIENT, STAFF, ADMIN.
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../schemas/user.schema';
import { StaffUser } from '../schemas/staff-user.schema';
import { AdminUser } from '../schemas/admin-user.schema';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { Business } from '../schemas/business.schema';
import { config } from '../config';
import { getEffectiveTenantId } from './auth.service';

const SALT_ROUNDS = 10;

export type AccountType = 'CLIENT' | 'STAFF' | 'ADMIN';

export interface JWTPayload {
  userId: string;
  accountType: AccountType;
  email: string;
  role?: string;
  department?: string;
  allowedApps?: string[];
  permissions?: string[];
  businessId?: string;
  tenantId?: string;
}

export interface LoginResponse {
  user: {
    uid: string;
    userId: string;
    email: string;
    displayName?: string;
    accountType: AccountType;
    role?: string;
    department?: string;
    allowedApps?: string[];
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function signTokens(payload: JWTPayload): { accessToken: string; refreshToken: string; expiresIn: number } {
  const opts: jwt.SignOptions = { expiresIn: config.jwt.accessExpiry as jwt.SignOptions['expiresIn'] };
  const accessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, opts);
  const refreshTokenValue = uuidv4();
  const decoded = jwt.decode(accessToken) as { exp?: number };
  const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;
  return { accessToken, refreshToken: refreshTokenValue, expiresIn };
}

/** POST /auth/client/login - Client dashboard users (existing User collection) */
export async function loginClient(email: string, password: string): Promise<LoginResponse | null> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const tenantId = user.tenantId || (await getEffectiveTenantId(user.uid));
  const payload: JWTPayload = {
    userId: user.uid,
    accountType: 'CLIENT',
    email: user.email,
    role: user.type,
    businessId: user.businessId,
    tenantId: tenantId ?? undefined,
  };

  const { accessToken, refreshToken, expiresIn } = signTokens(payload);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    userId: user.uid,
    accountType: 'CLIENT',
    token: refreshToken,
    expiresAt: refreshExpires,
  });

  return {
    user: {
      uid: user.uid,
      userId: user.uid,
      email: user.email,
      displayName: user.displayName,
      accountType: 'CLIENT',
      role: user.type,
    },
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/** POST /auth/staff/login - Warehouse/Shipping staff */
export async function loginStaff(email: string, password: string): Promise<LoginResponse | null> {
  const user = await StaffUser.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.active) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const payload: JWTPayload = {
    userId: user._id.toString(),
    accountType: 'STAFF',
    email: user.email,
    role: user.role,
    department: user.department,
    allowedApps: user.allowedApps,
    permissions: (user as { permissions?: string[] }).permissions || [],
  };

  const { accessToken, refreshToken, expiresIn } = signTokens(payload);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    userId: user._id.toString(),
    accountType: 'STAFF',
    token: refreshToken,
    expiresAt: refreshExpires,
  });

  return {
    user: {
      uid: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      displayName: user.fullName,
      accountType: 'STAFF',
      role: user.role,
      department: user.department,
      allowedApps: user.allowedApps,
    },
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/** POST /auth/admin/login - Platform admins */
export async function loginAdmin(email: string, password: string): Promise<LoginResponse | null> {
  const user = await AdminUser.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.active) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const payload: JWTPayload = {
    userId: user._id.toString(),
    accountType: 'ADMIN',
    email: user.email,
    role: user.role,
  };

  const { accessToken, refreshToken, expiresIn } = signTokens(payload);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    userId: user._id.toString(),
    accountType: 'ADMIN',
    token: refreshToken,
    expiresAt: refreshExpires,
  });

  return {
    user: {
      uid: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      displayName: user.fullName,
      accountType: 'ADMIN',
      role: user.role,
    },
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/** Refresh token - must pass accountType to look up correct user */
export async function refreshToken(
  refreshTokenValue: string,
  accountType: AccountType
): Promise<{ accessToken: string; expiresIn: number } | null> {
  const doc = await RefreshToken.findOne({ token: refreshTokenValue, accountType });
  if (!doc || doc.expiresAt < new Date()) return null;

  let payload: JWTPayload;

  if (accountType === 'CLIENT') {
    const user = await User.findOne({ uid: doc.userId });
    if (!user) return null;
    const tenantId = user.tenantId || (await getEffectiveTenantId(user.uid));
    payload = {
      userId: user.uid,
      accountType: 'CLIENT',
      email: user.email,
      role: user.type,
      businessId: user.businessId,
      tenantId: tenantId ?? undefined,
    };
  } else if (accountType === 'STAFF') {
    const user = await StaffUser.findById(doc.userId);
    if (!user || !user.active) return null;
    payload = {
      userId: user._id.toString(),
      accountType: 'STAFF',
      email: user.email,
      role: user.role,
      department: user.department,
      allowedApps: user.allowedApps,
      permissions: (user as { permissions?: string[] }).permissions || [],
    };
  } else {
    const user = await AdminUser.findById(doc.userId);
    if (!user || !user.active) return null;
    payload = {
      userId: user._id.toString(),
      accountType: 'ADMIN',
      email: user.email,
      role: user.role,
    };
  }

  const opts: jwt.SignOptions = { expiresIn: config.jwt.accessExpiry as jwt.SignOptions['expiresIn'] };
  const accessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, opts);
  const decoded = jwt.decode(accessToken) as { exp?: number };
  const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;
  return { accessToken, expiresIn };
}

/** Exchange Firebase ID token for backend admin token (super_admin only) */
export async function exchangeFirebaseForAdminToken(
  firebaseIdToken: string,
  verifyFirebase: (token: string) => Promise<{ uid: string; email?: string } | null>
): Promise<{ accessToken: string; expiresIn: number } | null> {
  const decoded = await verifyFirebase(firebaseIdToken);
  if (!decoded?.email) return null;

  const email = decoded.email.toLowerCase().trim();
  const user = await User.findOne({ email });
  if (user && user.type === 'super_admin') {
    const payload: JWTPayload = {
      userId: user.uid,
      accountType: 'ADMIN',
      email: user.email,
      role: 'super_admin',
    };
    const opts: jwt.SignOptions = { expiresIn: config.jwt.accessExpiry as jwt.SignOptions['expiresIn'] };
    const accessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, opts);
    const decodedJwt = jwt.decode(accessToken) as { exp?: number };
    const expiresIn = decodedJwt?.exp ? decodedJwt.exp - Math.floor(Date.now() / 1000) : 86400;
    return { accessToken, expiresIn };
  }

  const SUPER_ADMIN_EMAILS = ['hesainosama@gmail.com'];
  if (SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === email)) {
    const payload: JWTPayload = {
      userId: decoded.uid,
      accountType: 'ADMIN',
      email: decoded.email,
      role: 'super_admin',
    };
    const opts: jwt.SignOptions = { expiresIn: config.jwt.accessExpiry as jwt.SignOptions['expiresIn'] };
    const accessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, opts);
    const decodedJwt = jwt.decode(accessToken) as { exp?: number };
    const expiresIn = decodedJwt?.exp ? decodedJwt.exp - Math.floor(Date.now() / 1000) : 86400;
    return { accessToken, expiresIn };
  }

  return null;
}

/** Verify token and return extended payload */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret as jwt.Secret) as JWTPayload & { sub?: string };
    return {
      userId: decoded.userId ?? decoded.sub,
      accountType: decoded.accountType,
      email: decoded.email,
      role: decoded.role,
      department: decoded.department,
      allowedApps: decoded.allowedApps,
      permissions: decoded.permissions,
      businessId: decoded.businessId,
      tenantId: decoded.tenantId,
    };
  } catch {
    return null;
  }
}
