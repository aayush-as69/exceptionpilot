import { notFound, redirect } from 'next/navigation';
import { currentActor, ApiError, demoEnabled } from '@/lib/auth';
import { seedIfEnabled } from '@/lib/seed';
import { getWorkspace } from '@/lib/workspace';
import { Workspace } from '@/components/workspace';
import type { View } from '@/components/types';
export const dynamic = 'force-dynamic';
const views: View[] = ['overview','exceptions','my-queue','approvals','invoices','purchase-orders','goods-receipts','vendors','policies','documents','analytics','copilot','audit','tasks','administration','settings','api-docs'];
export default async function Page({params,searchParams}:{params:Promise<{view:string}>;searchParams:Promise<{exception?:string;filter?:string}>}) { const {view}=await params; if(!views.includes(view as View))notFound(); await seedIfEnabled(); let actor; try{actor=await currentActor();}catch(error){if(error instanceof ApiError&&error.status===401)redirect('/login');throw error;} const [data,query]=await Promise.all([getWorkspace(actor,demoEnabled()),searchParams]); return <Workspace actor={actor} data={data} view={view as View} initialException={query.exception} initialFilter={query.filter}/>; }
