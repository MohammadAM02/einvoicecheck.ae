import crypto from 'node:crypto';
import { connectMongo } from './db';
import { ApiKey, User, type UserDoc } from './models';
import { publishPlanLimits } from './ratelimit';

const SESSION_COOKIE = 'ec_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sessionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is not set. Set it in Railway before serving traffic.');
  }
  return 'dev-only-insecure-secret';
}

/* ------------------------------------------------------------- passwords */
/** scrypt with a per-user random salt. Format: scrypt$<saltHex>$<hashHex>. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/* -------------------------------------------------------------- sessions */
type SessionPayload = { uid: string; exp: number };

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = { uid: userId, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload?.uid || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Read the session token out of a raw Cookie header (works outside Next). */
export function tokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=');
  }
  return null;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/** Resolve the authenticated user for a Request, or null. */
export async function currentUser(request: Request): Promise<UserDoc | null> {
  return userFromToken(tokenFromCookieHeader(request.headers.get('cookie')));
}

/** Same, but from a bare token (server components read it via next/headers). */
export async function userFromToken(token: string | null | undefined): Promise<UserDoc | null> {
  const payload = verifySessionToken(token);
  if (!payload) return null;
  await connectMongo();
  return User.findById(payload.uid).lean<UserDoc>();
}

/* ---------------------------------------------------------------- signup */
export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create an account and AUTO-PROVISION its first API key in one step.
 * The raw key is returned exactly once — only its SHA-256 hash is persisted.
 * New accounts start on the free trial, and the trial rate limit is published
 * to Redis immediately so the key works against app/api on the first call.
 */
export async function signup(
  email: string,
  password: string,
): Promise<{ user: UserDoc; rawKey: string }> {
  const normalised = String(email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalised)) throw new AuthError('Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 10) {
    throw new AuthError('Password must be at least 10 characters.');
  }

  await connectMongo();
  if (await User.exists({ email: normalised })) {
    throw new AuthError('An account already exists for that email.', 409);
  }

  const user = await User.create({
    email: normalised,
    passwordHash: hashPassword(password),
    plan: 'trial',
    subscriptionStatus: 'none',
  });

  const { raw, doc } = ApiKey.generate({ name: 'Default key', userId: user._id });
  await ApiKey.create(doc);
  await publishPlanLimits(user._id, 'trial');

  return { user: user.toObject() as UserDoc, rawKey: raw };
}

export async function login(email: string, password: string): Promise<UserDoc> {
  await connectMongo();
  const user = await User.findOne({ email: String(email ?? '').trim().toLowerCase() }).lean<UserDoc>();
  if (!user || !verifyPassword(String(password ?? ''), user.passwordHash)) {
    throw new AuthError('Incorrect email or password.', 401);
  }
  return user;
}
