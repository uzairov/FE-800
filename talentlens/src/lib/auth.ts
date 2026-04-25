import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const BCRYPT_ROUNDS = 12; // §9.2 requirement

// ─────────────────────────────────────────────
// Password utilities
// ─────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─────────────────────────────────────────────
// JWT payloads
// ─────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;    // user id
  email: string;
  role: string;
  companyId: string;
}

export interface RefreshTokenPayload {
  sub: string;   // user id
  jti: string;   // RefreshToken record id (for revocation)
}

// ─────────────────────────────────────────────
// Token generation
// ─────────────────────────────────────────────

export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');

  return jwt.sign(payload, secret, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as any,
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');

  return jwt.sign(payload, secret, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
  });
}

// ─────────────────────────────────────────────
// Token verification
// ─────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');

  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');

  return jwt.verify(token, secret) as RefreshTokenPayload;
}

// ─────────────────────────────────────────────
// Refresh token — DB persistence & rotation
// ─────────────────────────────────────────────

const REFRESH_TTL_SHORT = 7  * 24 * 60 * 60 * 1000; //  7 days (default)
const REFRESH_TTL_LONG  = 30 * 24 * 60 * 60 * 1000; // 30 days (rememberMe)

export async function createRefreshToken(userId: string, longLived = false): Promise<string> {
  const ttlMs = longLived ? REFRESH_TTL_LONG : REFRESH_TTL_SHORT;

  // Create a DB record first to get the jti
  const record = await prisma.refreshToken.create({
    data: {
      token: 'placeholder',
      userId,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });

  const token = signRefreshToken({ sub: userId, jti: record.id });

  // Store the actual signed token
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { token },
  });

  return token;
}

export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  let payload: RefreshTokenPayload;

  try {
    payload = verifyRefreshToken(oldToken);
  } catch {
    return null;
  }

  const record = await prisma.refreshToken.findUnique({
    where: { id: payload.jti, token: oldToken },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    return null;
  }

  // Revoke old token (rotation pattern) — ignore if already deleted by concurrent request
  await prisma.refreshToken.delete({ where: { id: record.id } }).catch(() => {});

  const { user } = record;
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });
  const refreshToken = await createRefreshToken(user.id);

  return { accessToken, refreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
}
