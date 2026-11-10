import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { seedIfEnabled } from '@/lib/seed';
export const dynamic = 'force-dynamic';
export async function GET() { try { await seedIfEnabled(); await db.execute(sql`select 1`); return Response.json({ready:true,database:'connected',provider:'mock',externalLLM:false},{headers:{'Cache-Control':'no-store'}}); } catch { return Response.json({ready:false},{status:503,headers:{'Cache-Control':'no-store'}}); } }
