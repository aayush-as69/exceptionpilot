import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { roles, sessions, users } from '@/db/schema';
import type { Actor } from './domain';
const scrypt = promisify(scryptCallback);
export const demoEnabled = () => process.env.DEMO_MODE === 'true' || (process.env.DEMO_MODE !== 'false' && process.env.APP_ENV !== 'production');
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); const key = await scrypt(password, salt, 64) as Buffer; return `${salt}:${key.toString('hex')}`; }
export async function verifyPassword(password: string, stored: string) { const [salt, hash] = stored.split(':'); if (!salt || !hash) return false; const key = await scrypt(password, salt, 64) as Buffer; const expected = Buffer.from(hash, 'hex'); return key.length === expected.length && timingSafeEqual(key, expected); }
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export async function currentActor(): Promise<Actor> { const token = (await cookies()).get('ep_session')?.value; if (token) { const [row] = await db.select({ id: users.id, name: users.name, email: users.email, roleId: users.roleId, initials: users.initials, permissions: roles.permissions }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).innerJoin(roles, eq(roles.id, users.roleId)).where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true))).limit(1); if (row) return row; } if (demoEnabled()) { const [row] = await db.select({ id: users.id, name: users.name, email: users.email, roleId: users.roleId, initials: users.initials, permissions: roles.permissions }).from(users).innerJoin(roles, eq(roles.id, users.roleId)).where(and(eq(users.id, 'usr-director'), eq(users.active, true))).limit(1); if (row) return row; } throw new ApiError(401, 'Please sign in to continue.'); }
export async function requireActor(permission?: string) { const actor = await currentActor(); if (permission && !actor.permissions.includes(permission)) throw new ApiError(403, `Your role does not allow ${permission}.`); return actor; }
export async function createSession(userId: string, secure: boolean) { const token = randomBytes(32).toString('hex'); const expiresAt = new Date(Date.now() + 8 * 3600000); await db.insert(sessions).values({ tokenHash: digest(token), userId, expiresAt }); (await cookies()).set('ep_session', token, { httpOnly: true, secure, sameSite: 'lax', path: '/', expires: expiresAt }); }
export async function destroySession() { const jar = await cookies(); const token = jar.get('ep_session')?.value; if (token) await db.delete(sessions).where(eq(sessions.tokenHash, digest(token))); jar.delete('ep_session'); }
const attempts = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max = 10, windowMs = 60000) { const now = Date.now(); if (attempts.size > 5000) for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k); const entry = attempts.get(key); if (!entry || entry.reset < now) { attempts.set(key, { count: 1, reset: now + windowMs }); return; } entry.count++; if (entry.count > max) throw new ApiError(429, 'Too many requests. Please wait a minute and try again.'); }
