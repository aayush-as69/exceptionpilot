import { NextRequest } from 'next/server';
import { handleApi } from '@/lib/api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
type Context = { params: Promise<{ path: string[] }> };
async function route(req: NextRequest, context: Context) { return handleApi(req, (await context.params).path); }
export { route as GET, route as POST, route as PATCH, route as DELETE };
