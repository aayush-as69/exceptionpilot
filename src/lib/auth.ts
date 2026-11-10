import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { roles, sessions, users } from '@/db/schema';
import type { Actor } from './domain';
const scrypt = promisify(scryptCallback);

// Demo access is opt-in and available only in an explicitly configured development environment.
export const demoEnabled = () => process.env.APP_ENV === 'development' && process.env.DEMO_MODE === 'true';

export function assertRuntimeConfiguration() {
  const appEnv = process.env.APP_ENV;
  const demo = process.env.DEMO_MODE;
  if (appEnv !== 'development' && appEnv !== 'production') {
    throw new Error('APP_ENV must be explicitly set to development or production.');
  }
  if (demo !== 'true' && demo !== 'false') {
    throw new Error('DEMO_MODE must be explicitly set to true or false.');
  }
  if (appEnv === 'production' && demo !== 'false') {
    throw new Error('DEMO_MODE must be false in production.');
  }
  if (appEnv === 'production' && process.env.SEED_ON_START === 'true') {
    throw new Error('SEED_ON_START must not be true in production.');
  }
}

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); const key = await scrypt(password, salt, 64) as Buffer; return `${salt}:${key.toString('hex')}`; }
export async function verifyPassword(password: string, stored: string) { const [salt, hash] = stored.split(':'); if (!salt || !hash) return false; const key = await scrypt(password, salt, 64) as Buffer; const expected = Buffer.from(hash, 'hex'); return key.length === expected.length && timingSafeEqual(key, expected); }
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export async function currentActor(): Promise<Actor> {
  const token = (await cookies()).get('ep_session')?.value;
  if (!token) throw new ApiError(401, 'Please sign in to continue.');
  const [row] = await db.select({ id: users.id, name: users.name, email: users.email, roleId: users.roleId, initials: users.initials, permissions: roles.permissions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true)))
    .limit(1);
  if (!row) throw new ApiError(401, 'Your session is invalid or expired. Please sign in again.');
  return row;
}
export async function requireActor(permission?: string) { const actor = await currentActor(); if (permission && !actor.permissions.includes(permission)) throw new ApiError(403, `Your role does not allow ${permission}.`); return actor; }
export async function createSession(userId: string, secure: boolean) { const token = randomBytes(32).toString('hex'); const expiresAt = new Date(Date.now() + 8 * 3600000); await db.insert(sessions).values({ tokenHash: digest(token), userId, expiresAt }); (await cookies()).set('ep_session', token, { httpOnly: true, secure, sameSite: 'lax', path: '/', expires: expiresAt }); }
export async function destroySession() { const jar = await cookies(); const token = jar.get('ep_session')?.value; if (token) await db.delete(sessions).where(eq(sessions.tokenHash, digest(token))); jar.delete('ep_session'); }

// Process-local throttling is retained only as a development fallback. Production must
// enforce limits at a trusted distributed gateway until a shared store is configured.
const attempts = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max = 10, windowMs = 60000) {
  if (process.env.APP_ENV === 'production') return;
  const now = Date.now();
  if (attempts.size > 5000) for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) { attempts.set(key, { count: 1, reset: now + windowMs }); return; }
  entry.count++;
  if (entry.count > max) throw new ApiError(429, 'Too many requests. Please wait a minute and try again.');
}
