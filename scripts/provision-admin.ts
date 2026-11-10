import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db';
import { roles, users, sessions } from '../src/db/schema';
import { hashPassword } from '../src/lib/auth';
import { PERMISSIONS } from '../src/lib/domain';
async function main() { const email=process.env.ADMIN_EMAIL?.toLowerCase().trim(); const password=process.env.ADMIN_PASSWORD; if(!email||!email.includes('@')||!password||password.length<12)throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in your environment.'); const passwordHash=await hashPassword(password); await db.transaction(async tx=>{await tx.insert(roles).values(Object.entries(PERMISSIONS).map(([id,permissions])=>({id,name:id,permissions}))).onConflictDoNothing();const id=`admin-${randomUUID()}`;await tx.insert(users).values({id,name:process.env.ADMIN_NAME??'Workspace Administrator',email,passwordHash,roleId:'ADMIN',initials:'WA'}).onConflictDoUpdate({target:users.email,set:{passwordHash,roleId:'ADMIN',active:true}});const [user]=await tx.select().from(users).where(eq(users.email,email));await tx.delete(sessions).where(eq(sessions.userId,user.id));});console.log('Administrator provisioned. Existing sessions revoked. No password was logged.'); }
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
