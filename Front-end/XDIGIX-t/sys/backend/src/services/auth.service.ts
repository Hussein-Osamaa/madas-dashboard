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
  const payload = { sub: uid, email: user.email, type: user.type, businessId: user.businessId, tenantId: user.tenantId };
  const options: jwt.SignOptions = { expiresIn: config.jwt.accessExpiry as unknown as jwt.SignOptions['expiresIn'] };
  const accessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, options);

  const refreshTokenValue = uuidv4();
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await RefreshToken.create({
    userId: uid,
    accountType: 'CLIENT',
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

  const payload = { sub: user.uid, email: user.email, type: user.type, businessId: user.businessId, tenantId: user.tenantId };
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
