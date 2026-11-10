import { redirect } from 'next/navigation';
import { currentActor, ApiError, demoEnabled } from '@/lib/auth';
import { seedIfEnabled } from '@/lib/seed';
import { getWorkspace } from '@/lib/workspace';
import { Workspace } from '@/components/workspace';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ exception?: string }> }) { await seedIfEnabled(); let actor; try { actor = await currentActor(); } catch (error) { if (error instanceof ApiError && error.status === 401) redirect('/login'); throw error; } const [data, params] = await Promise.all([getWorkspace(actor, demoEnabled()), searchParams]); return <Workspace actor={actor} data={data} view="overview" initialException={params.exception}/>; }
