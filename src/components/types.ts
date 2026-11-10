import type { Actor } from '@/lib/domain';
import type { WorkspaceData } from '@/lib/workspace';
export type View = 'overview'|'exceptions'|'my-queue'|'approvals'|'invoices'|'purchase-orders'|'goods-receipts'|'vendors'|'policies'|'documents'|'analytics'|'copilot'|'audit'|'tasks'|'administration'|'settings'|'api-docs';
export type RecordRef = {kind:string;id:string};
export type ViewProps = {data:WorkspaceData;actor:Actor;notify:(message:string,error?:boolean)=>void;refresh:()=>void;navigate:(view:View,filter?:string)=>void;openException:(id:string)=>void;openRecord:(record:RecordRef)=>void};
export type ExceptionRow = WorkspaceData['exceptions'][number];
export type InvoiceRow = WorkspaceData['invoices'][number];
export type VendorRow = WorkspaceData['vendors'][number];
