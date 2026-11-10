import { notFound, redirect } from 'next/navigation';
import { currentActor, ApiError, demoEnabled } from '@/lib/auth';
import { can } from '@/lib/domain';
import { seedIfEnabled } from '@/lib/seed';
import { getWorkspace } from '@/lib/workspace';
import { Workspace } from '@/components/workspace';
import type { View } from '@/components/types';
export const dynamic = 'force-dynamic';
const views: View[] = ['overview','exceptions','my-queue','approvals','invoices','purchase-orders','goods-receipts','vendors','policies','documents','analytics','copilot','audit','tasks','administration','settings','api-docs'];
const viewPermissions: Partial<Record<View,string[]>>={overview:['exception.read'],exceptions:['exception.read'],'my-queue':['exception.read'],approvals:['approval.create','approval.execute'],invoices:['invoice.read'],'purchase-orders':['invoice.read'],'goods-receipts':['invoice.read'],vendors:['vendor.read'],policies:['policy.read'],documents:['document.read'],analytics:['analytics.read'],copilot:['exception.read'],audit:['audit.read'],tasks:['task.manage'],administration:['system.configure']};
export default async function Page({params,searchParams}:{params:Promise<{view:string}>;searchParams:Promise<{exception?:string;filter?:string}>}) { const {view}=await params; if(!views.includes(view as View))notFound(); await seedIfEnabled(); let actor; try{actor=await currentActor();}catch(error){if(error instanceof ApiError&&error.status===401)redirect('/login');throw error;} const required=viewPermissions[view as View];if(required&&!required.some(permission=>can(actor,permission)))notFound(); const [data,query]=await Promise.all([getWorkspace(actor,demoEnabled()),searchParams]); return <Workspace actor={actor} data={data} view={view as View} initialException={query.exception} initialFilter={query.filter}/>; }
