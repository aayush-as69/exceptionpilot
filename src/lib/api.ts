import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ApiError, assertRuntimeConfiguration, currentActor, demoEnabled, destroySession, createSession, rateLimit, requireActor, verifyPassword } from './auth';
import { matchesCanonicalOrigin } from './security-policy';
import { seedIfEnabled } from './seed';
import { getWorkspace } from './workspace';
import { can, OPEN_STATES, TOOL_REGISTRY } from './domain';
import { investigate, evidencePacket } from './investigation';
import { askCopilot } from './copilot';
import { requestApproval, executeApproval, draftCommunication, escalate, simulate, createTask, updateTask, policyChange, uploadDocument, activateDocument, runMonitoring } from './actions';
import { audit } from './audit';
const idSchema=z.string().min(1).max(150).regex(/^[a-zA-Z0-9_-]+$/);
const noteSchema=z.string().max(2000).default('');
const actionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('request-approval'),exceptionId:idSchema,note:noteSchema}),
  z.object({action:z.literal('draft-communication'),exceptionId:idSchema}),
  z.object({action:z.literal('escalate'),exceptionId:idSchema,reason:z.string().min(5).max(2000)}),
  z.object({action:z.literal('simulate'),exceptionId:idSchema,decision:z.enum(['APPROVE','REJECT','HOLD','REQUEST_CLARIFICATION','ESCALATE'])}),
  z.object({action:z.literal('assign-me'),exceptionId:idSchema}),
  z.object({action:z.literal('feedback'),exceptionId:idSchema,rating:z.enum(['YES','PARTIALLY','NO']),comment:z.string().max(2000).default('')}),
  z.object({action:z.literal('read-notifications'),ids:z.array(z.string().uuid()).min(1).max(50).optional(),all:z.literal(true).optional()}).refine(input=>input.all===true||Boolean(input.ids?.length),{message:'Specify notification IDs or explicitly request all notifications.'}),
  z.object({action:z.literal('monitor')}),
]);
const permissions:Record<string,string>={'request-approval':'approval.create','draft-communication':'communication.draft',escalate:'exception.investigate',simulate:'exception.read','assign-me':'exception.investigate',feedback:'exception.read','read-notifications':'notification.read',monitor:'system.configure'};
const taskSchema=z.object({title:z.string().min(3).max(200),description:z.string().max(4000).default(''),assignee:idSchema,priority:z.enum(['LOW','MEDIUM','HIGH','CRITICAL']),dueAt:z.string().datetime(),exceptionId:idSchema.optional()});
function json(data:unknown,requestId:string,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store','X-Request-Id':requestId,'X-Trace-Id':requestId}});}
function originCheck(req:NextRequest,allowMissing=false){const origin=req.headers.get('origin');if(!origin){if(process.env.APP_ENV==='production'&&!allowMissing)throw new ApiError(403,'Origin header required.');return;}const expected=process.env.APP_ENV==='production'?process.env.APP_ORIGIN:req.nextUrl.origin;if(!expected||!matchesCanonicalOrigin(origin,expected))throw new ApiError(403,'Cross-origin mutations are not allowed.');}
async function body(req:NextRequest){const reader=req.body?.getReader();if(!reader)throw new ApiError(400,'A JSON request body is required.');const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();throw new ApiError(413,'JSON request body exceeds 64 KB.');}chunks.push(value);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ApiError(400,'Request body must be valid JSON.');}}
export async function handleApi(req:NextRequest,path:string[]){const requestId=randomUUID();try{
  assertRuntimeConfiguration();await seedIfEnabled();const method=req.method;const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'local';rateLimit(`${ip}:${path[0]==='auth'?'auth':'api'}`,path[0]==='auth'?12:180);if(!['GET','HEAD'].includes(method))originCheck(req,path[0]==='cron');
  if(path[0]==='cron'&&method==='POST'){const secret=process.env.CRON_SECRET;const supplied=req.headers.get('authorization')??'';const hash=(value:string)=>createHash('sha256').update(value).digest();if(!secret||secret.length<24||!timingSafeEqual(hash(supplied),hash(`Bearer ${secret}`)))throw new ApiError(401,'Scheduler authorization required.');return json(await runMonitoring({id:'system-monitor',name:'Scheduled monitor',email:'',roleId:'SYSTEM',initials:'SM',permissions:['system.configure']},requestId),requestId);}
  if(path[0]==='auth'){
    if(path[1]==='login'&&method==='POST'){const input=z.object({email:z.string().email().max(254).optional(),password:z.string().min(1).max(200).optional(),demoUserId:idSchema.optional()}).parse(await body(req));let user;
      if(input.demoUserId){if(!demoEnabled())throw new ApiError(403,'Demo role switching is disabled.');[user]=await db.select().from(s.users).where(and(eq(s.users.id,input.demoUserId),eq(s.users.active,true)));}else{if(!input.email||!input.password)throw new ApiError(400,'Email and password are required.');[user]=await db.select().from(s.users).where(eq(s.users.email,input.email.toLowerCase()));if(!user||!user.active||!await verifyPassword(input.password,user.passwordHash))throw new ApiError(401,'Invalid email or password.');}
      if(!user)throw new ApiError(401,'User not found or inactive.');await createSession(user.id,process.env.APP_ENV==='production'||new URL(req.url).protocol==='https:');await audit({actor:user.name,actorType:'HUMAN',action:'SESSION_CREATED',target:user.id,inputSummary:input.demoUserId?'Development-only demo role selection.':'Password authentication.',result:'Eight-hour HTTP-only session created.',requestId});return json({ok:true,user:{id:user.id,name:user.name,roleId:user.roleId}},requestId);
    }
    if(path[1]==='logout'&&method==='POST'){await destroySession();return json({ok:true},requestId);}
    if(path[1]==='me'&&method==='GET')return json({actor:await currentActor(),demo:demoEnabled()},requestId);
  }
  if(path[0]==='ready'&&method==='GET'){await db.execute(sql`select 1`);return json({ready:true,database:'connected',llm:'not connected',provider:'mock'},requestId);}
  if(path[0]==='openapi'&&method==='GET')return json(openApi(),requestId);
  if(path[0]==='workspace'&&method==='GET'){const actor=await requireActor('exception.read');return json(await getWorkspace(actor,demoEnabled()),requestId);}
  if(path[0]==='tools'&&method==='GET'){await requireActor('invoice.read');return json({tools:TOOL_REGISTRY,agentMaximumLevel:'L0'},requestId);}
  if(path[0]==='copilot'&&method==='POST'){const actor=await requireActor('exception.read');const input=z.object({question:z.string().min(3).max(2000),exceptionId:idSchema.optional()}).parse(await body(req));rateLimit(`copilot:${actor.id}`,20);return json(await askCopilot(input.question,actor,input.exceptionId,requestId),requestId);}
  if(path[0]==='exceptions'){
    const actor=await requireActor('exception.read');const id=path[1]?idSchema.parse(path[1]):undefined;
    if(id&&path[2]==='investigate'&&method==='POST'){await requireActor('exception.investigate');return json(await investigate(id,actor,requestId),requestId);}
    if(id&&path[2]==='evidence'&&method==='GET'){await requireActor('audit.export');const packet=await evidencePacket(id);await audit({actor:actor.name,actorType:'HUMAN',action:'EVIDENCE_EXPORTED',target:id,inputSummary:'JSON evidence packet requested.',result:'Packet generated from stored source records.',requestId});return json(packet,requestId);}
    if(id&&method==='GET'){const [row]=await db.select().from(s.exceptions).where(eq(s.exceptions.id,id));if(!row)throw new ApiError(404,'Exception not found.');return json(row,requestId);}
  }
  if(path[0]==='approvals'&&path[1]&&path[2]==='execute'&&method==='POST'){const actor=await requireActor('approval.execute');const input=z.object({decision:z.enum(['APPROVED','REJECTED']),note:noteSchema}).parse(await body(req));return json(await executeApproval(idSchema.parse(path[1]),input.decision,input.note,actor,requestId),requestId);}
  if(path[0]==='actions'&&method==='POST'){const input=actionSchema.parse(await body(req));const actor=await requireActor(permissions[input.action]);switch(input.action){case 'request-approval':return json(await requestApproval(input.exceptionId,actor,requestId,input.note),requestId);case 'draft-communication':return json(await draftCommunication(input.exceptionId,actor,requestId),requestId);case 'escalate':return json(await escalate(input.exceptionId,actor,requestId,input.reason),requestId);case 'simulate':return json(await simulate(input.exceptionId,input.decision),requestId);case 'monitor':return json(await runMonitoring(actor,requestId),requestId);case 'read-notifications':await db.update(s.notifications).set({read:true}).where(and(eq(s.notifications.userId,actor.id),input.all===true?undefined:inArray(s.notifications.id,input.ids!)));return json({ok:true},requestId);case 'assign-me':{const [e]=await db.select().from(s.exceptions).where(eq(s.exceptions.id,input.exceptionId));if(!e||!OPEN_STATES.includes(e.status))throw new ApiError(409,'Only an open exception can be assigned.');await db.update(s.exceptions).set({ownerId:actor.id}).where(eq(s.exceptions.id,e.id));await audit({actor:actor.name,actorType:'HUMAN',action:'EXCEPTION_ASSIGNED',target:e.id,inputSummary:'Assigned to current user.',result:'Ownership updated.',beforeState:{owner:e.ownerId},afterState:{owner:actor.id},requestId});return json({ok:true},requestId);}case 'feedback':{const [e]=await db.select().from(s.exceptions).where(eq(s.exceptions.id,input.exceptionId));if(e?.status!=='RESOLVED')throw new ApiError(409,'Feedback is available after resolution.');await db.insert(s.feedback).values({exceptionId:e.id,userId:actor.id,rating:input.rating,comment:input.comment}).onConflictDoUpdate({target:[s.feedback.exceptionId,s.feedback.userId],set:{rating:input.rating,comment:input.comment}});await audit({actor:actor.name,actorType:'HUMAN',action:'RECOMMENDATION_FEEDBACK',target:e.id,inputSummary:`${input.rating}: ${input.comment}`,result:'Feedback stored for evaluation. Production rules were not changed.',requestId});return json({ok:true},requestId);}}}
  if(path[0]==='tasks'){if(method==='POST'){const actor=await requireActor('task.manage');return json(await createTask(taskSchema.parse(await body(req)),actor,requestId),requestId);}if(method==='PATCH'&&path[1]){const actor=await requireActor('task.manage');const input=z.object({status:z.enum(['TODO','IN_PROGRESS','BLOCKED','DONE','CANCELLED'])}).parse(await body(req));return json(await updateTask(idSchema.parse(path[1]),input.status,actor,requestId),requestId);}}
  if(path[0]==='documents'){if(method==='POST'){const actor=await requireActor('document.manage');const form=await req.formData();const file=form.get('file');if(!(file instanceof File))throw new ApiError(400,'Select a document.');const category=z.string().min(2).max(80).parse(form.get('category')??'Accounts Payable');return json(await uploadDocument(file,category,actor,requestId),requestId);}if(method==='PATCH'&&path[1]){const actor=await requireActor('document.manage');return json(await activateDocument(idSchema.parse(path[1]),actor,requestId),requestId);}}
  if(path[0]==='policies'&&method==='PATCH'&&path[1]){const actor=await requireActor('policy.manage');const input=z.object({tolerancePercent:z.number().min(0).max(100),version:z.string().min(1).max(20),activate:z.boolean(),confirmed:z.boolean()}).parse(await body(req));return json(await policyChange(idSchema.parse(path[1]),input,actor,requestId),requestId);}
  if(path[0]==='playbooks'&&method==='POST'){const actor=await requireActor('system.configure');const input=z.object({name:z.string().min(3).max(150),steps:z.array(z.string().min(3).max(500)).min(1).max(20)}).parse(await body(req));const id=`playbook-${randomUUID()}`;await db.insert(s.playbooks).values({id,...input,createdBy:actor.id});await audit({actor:actor.name,actorType:'HUMAN',action:'PLAYBOOK_CREATED',target:id,inputSummary:input.name,result:'Reusable guidance created; no automatic execution.',requestId});return json({id},requestId);}
  if(path[0]==='settings'&&method==='PATCH'){const actor=await requireActor('system.configure');const input=z.object({key:z.enum(['approvalRules','slaRules','exceptionTypes','riskRules','agentSettings']),value:z.record(z.string(),z.unknown())}).parse(await body(req));if(input.key==='agentSettings'&&(input.value.externalLLM===true||input.value.autonomousFinancialActions===true))throw new ApiError(400,'External LLM and autonomous financial actions are not implemented.');if(input.key==='approvalRules'){z.object({rules:z.array(z.object({max:z.number().int().nonnegative().nullable(),role:z.enum(['AP_CLERK','AP_MANAGER','FINANCE_MANAGER','FINANCE_DIRECTOR'])})).min(1).max(8)}).parse(input.value);}if(input.key==='riskRules')z.object({duplicate:z.number().int().min(0).max(100),variance:z.number().int().min(0).max(100),missingReceipt:z.number().int().min(0).max(100),policyViolation:z.number().int().min(0).max(100),repeated:z.number().int().min(0).max(100),unusual:z.number().int().min(0).max(100),suspicious:z.number().int().min(0).max(100),overdue:z.number().int().min(0).max(100)}).parse(input.value);if(input.key==='slaRules')z.object({Critical:z.number().min(1).max(720),High:z.number().min(1).max(720),Medium:z.number().min(1).max(720),Low:z.number().min(1).max(720)}).parse(input.value);if(input.key==='exceptionTypes')z.object({types:z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/).max(80)).min(19).max(100)}).parse(input.value);await db.transaction(async tx=>{const [previous]=await tx.select().from(s.settings).where(eq(s.settings.key,input.key)).for('update');await tx.insert(s.settings).values(input).onConflictDoUpdate({target:s.settings.key,set:{value:input.value}});await audit({actor:actor.name,actorType:'HUMAN',action:'SETTING_UPDATED',target:input.key,inputSummary:'Administrator configuration change.',result:'Configuration saved. Existing approvals remain binding.',beforeState:previous?.value??null,afterState:input.value,requestId},tx);});return json({ok:true},requestId);}
  if(path[0]==='users'&&method==='PATCH'&&path[1]){const actor=await requireActor('user.manage');const input=z.object({active:z.boolean()}).parse(await body(req));const id=idSchema.parse(path[1]);if(id===actor.id)throw new ApiError(400,'You cannot deactivate your own account.');await db.update(s.users).set({active:input.active}).where(eq(s.users.id,id));if(!input.active)await db.delete(s.sessions).where(eq(s.sessions.userId,id));await audit({actor:actor.name,actorType:'HUMAN',action:'USER_STATUS_UPDATED',target:id,inputSummary:`Active: ${input.active}`,result:'User status updated; sessions revoked on deactivation.',requestId});return json({ok:true},requestId);}
  if(method==='GET'){const actor=await currentActor();const readPermissions:Record<string,string>={invoices:'invoice.read',exceptions:'exception.read',vendors:'vendor.read','purchase-orders':'invoice.read','goods-receipts':'invoice.read',approvals:'approval.create',tasks:'task.manage',policies:'policy.read',documents:'document.read',analytics:'analytics.read',audit:'audit.read',notifications:'notification.read',users:'user.manage',agents:'invoice.read'};const permission=readPermissions[path[0]];if(permission){if(path[0]==='approvals'){if(!can(actor,'approval.create')&&!can(actor,'approval.execute'))throw new ApiError(403,'Your role does not allow approval.read.');}else await requireActor(permission);const data=await getWorkspace(actor,demoEnabled());const keys:Record<string,keyof typeof data>={invoices:'invoices',exceptions:'exceptions',vendors:'vendors','purchase-orders':'purchaseOrders','goods-receipts':'goodsReceipts',approvals:'approvals',tasks:'tasks',policies:'policies',documents:'documents',audit:'audit',notifications:'notifications',users:'users',agents:'agentRuns'};if(path[0]==='analytics')return json({metrics:data.metrics,trend:data.trend,scope:'Current workspace; charts use up to 250 recent exceptions'},requestId);if(path[1]){const rows=data[keys[path[0]]] as unknown as {id:string}[];const row=rows.find(r=>r.id===path[1]);if(!row)throw new ApiError(404,'Record not found in the recent demo collection.');return json(row,requestId);}const query=z.object({page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(25),search:z.string().max(200).default('')}).parse(Object.fromEntries(req.nextUrl.searchParams));const rows=(data[keys[path[0]]] as unknown as Record<string,unknown>[]).filter(r=>!query.search||JSON.stringify(r).toLowerCase().includes(query.search.toLowerCase()));return json({data:rows.slice((query.page-1)*query.pageSize,query.page*query.pageSize),page:query.page,pageSize:query.pageSize,total:rows.length,scope:'Recent demo records (bounded snapshot)'},requestId);}}
  if(['audit','users','settings'].includes(path[0])&&method==='DELETE')throw new ApiError(403,'This operation is prohibited. Audit and historical financial data cannot be deleted.');
  throw new ApiError(404,'Endpoint not found. See /api/openapi.');
}catch(error){if(error instanceof ApiError)return json({error:error.message,requestId},requestId,error.status);if(error instanceof z.ZodError)return json({error:'Validation failed',issues:error.issues.map(i=>({path:i.path.join('.'),message:i.message})),requestId},requestId,400);const code=(error as {code?:string}).code;if(code==='23505')return json({error:'This record already exists. Refresh to see the current state.',requestId},requestId,409);console.error(`[api ${requestId}]`,error instanceof Error?error.message:'Unknown error');return json({error:'The operation could not be completed. No success is claimed. Contact an administrator with the request ID.',requestId},requestId,500);}
}
function openApi() {
  const collectionParams = [
    { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
    { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
    { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
  ];
  const list = (name: string, permission: string): Record<string, unknown> => ({
    get: {
      summary: 'List recent ' + name,
      description: 'Requires an authenticated session and ' + permission + '. Results are bounded and support page, pageSize, and search.',
      parameters: collectionParams,
      responses: {
        '200': { description: 'Bounded collection response' },
        '401': { description: 'Authentication required' },
        '403': { description: 'Permission denied' },
      },
    },
  });
  const paths: Record<string, unknown> = {
    '/health': {
      get: { summary: 'Application and PostgreSQL health', description: 'Checks database connectivity; this is not process-only liveness.', security: [], responses: { '200': { description: 'Healthy' }, '503': { description: 'Database unavailable' } } },
    },
    '/ready': {
      get: { summary: 'Application readiness', description: 'Checks database readiness and may initialize the explicitly enabled development seed.', security: [], responses: { '200': { description: 'Ready' }, '503': { description: 'Not ready' } } },
    },
    '/api/health': {
      get: { summary: 'Application and PostgreSQL health', description: 'Checks database connectivity.', security: [], responses: { '200': { description: 'Healthy' }, '500': { description: 'Database unavailable' } } },
    },
    '/api/ready': {
      get: { summary: 'Application readiness', security: [], responses: { '200': { description: 'Ready' }, '503': { description: 'Not ready' } } },
    },
    '/api/openapi': {
      get: { summary: 'OpenAPI description', security: [], responses: { '200': { description: 'This OpenAPI document' } } },
    },
    '/api/auth/login': {
      post: {
        summary: 'Create an authenticated session',
        description: 'Accepts email/password. demoUserId is accepted only when APP_ENV=development and DEMO_MODE=true.',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' }, demoUserId: { type: 'string' } }, additionalProperties: false } } },
        responses: { '200': { description: 'Eight-hour HTTP-only session created' }, '400': { description: 'Invalid request' }, '401': { description: 'Invalid credentials or demo access disabled' } },
      },
    },
    '/api/auth/logout': {
      post: { summary: 'Revoke the current session', responses: { '200': { description: 'Signed out' } } },
    },
    '/api/auth/me': {
      get: { summary: 'Read the current authenticated actor', responses: { '200': { description: 'Current actor and demo-mode status' }, '401': { description: 'Authentication required' } } },
    },
    '/api/workspace': {
      get: { summary: 'Read the permission-filtered workspace snapshot', description: 'Requires exception.read. Sensitive datasets and fields are projected according to the current actor.', responses: { '200': { description: 'Workspace snapshot' }, '401': { description: 'Authentication required' }, '403': { description: 'Permission denied' } } },
    },
    '/api/tools': {
      get: { summary: 'List registered deterministic tools', description: 'Requires invoice.read. Tools are descriptive and do not provide autonomous financial execution.', responses: { '200': { description: 'Tool registry' }, '401': { description: 'Authentication required' }, '403': { description: 'Permission denied' } } },
    },
    '/api/exceptions/{id}': {
      get: { summary: 'Read one exception', description: 'Requires exception.read. Record ownership is not yet scoped for multiple tenants.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Exception record' }, '401': { description: 'Authentication required' }, '404': { description: 'Record not found' } } },
    },
    '/api/exceptions/{id}/investigate': {
      post: { summary: 'Run a deterministic, read-only investigation', description: 'Requires exception.investigate. Evidence is read in a repeatable-read transaction.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Structured investigation report' }, '403': { description: 'Forbidden' }, '409': { description: 'Invalid state' } } },
    },
    '/api/exceptions/{id}/evidence': {
      get: { summary: 'Export the JSON evidence packet', description: 'Requires audit.export.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Evidence packet' }, '403': { description: 'Forbidden' } } },
    },
    '/api/approvals/{id}/execute': {
      post: { summary: 'Execute an authorized, single-use human approval decision', description: 'Requires approval.execute. Enforces separation of duties, configured approval authority, compliance gates, and state checks.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['APPROVED', 'REJECTED'] }, note: { type: 'string', maxLength: 2000 } }, additionalProperties: false } } }, responses: { '200': { description: 'Controlled action completed' }, '403': { description: 'Unauthorized' }, '409': { description: 'Replay or state conflict' } } },
    },
    '/api/actions': {
      post: { summary: 'Execute a validated workflow action', description: 'Action-specific permissions apply: approval.create, communication.draft, exception.investigate, exception.read, notification.read, or system.configure. See docs/api.md for action payloads.', responses: { '200': { description: 'Action result' }, '400': { description: 'Validation error' }, '401': { description: 'Authentication required' }, '403': { description: 'Permission denied' }, '409': { description: 'State conflict' } } },
    },
    '/api/copilot': {
      post: { summary: 'Ask the deterministic permission-aware assistant', description: 'Requires exception.read. No external LLM inference or autonomous tool execution is implemented.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['question'], properties: { question: { type: 'string', minLength: 3, maxLength: 2000 }, exceptionId: { type: 'string' } }, additionalProperties: false } } }, responses: { '200': { description: 'Answer with stored evidence' }, '403': { description: 'Permission denied' } } },
    },
    '/api/tasks/{id}': {
      patch: { summary: 'Change a task status', description: 'Requires task.manage. The old status is checked in a row-locked transaction.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'] } } } } }, responses: { '200': { description: 'Task updated' }, '409': { description: 'Concurrent or invalid transition' } } },
    },
    '/api/documents/{id}': {
      patch: { summary: 'Activate a draft document', description: 'Requires document.manage.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Document activated' }, '409': { description: 'Document is not an activatable draft' } } },
    },
    '/api/policies/{id}': {
      patch: { summary: 'Preview or activate a policy version', description: 'Requires policy.manage. Activation requires explicit confirmation.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Impact preview or activation result' }, '403': { description: 'Permission denied' } } },
    },
    '/api/settings': {
      patch: { summary: 'Update validated application settings', description: 'Requires system.configure. Before/after state and the change are recorded transactionally.', responses: { '200': { description: 'Setting updated' }, '400': { description: 'Invalid setting payload' }, '403': { description: 'Permission denied' } } },
    },
    '/api/users/{id}': {
      patch: {
        summary: 'Activate or deactivate a user',
        description: 'Requires user.manage. Deactivation revokes active sessions.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['active'],
                properties: { active: { type: 'boolean' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'User status updated' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/playbooks': {
      post: { summary: 'Create workflow guidance', description: 'Requires system.configure.', responses: { '200': { description: 'Playbook created' }, '403': { description: 'Permission denied' } } },
    },
    '/api/cron': {
      post: { summary: 'Run one bounded monitoring batch', description: 'Requires a Bearer CRON_SECRET token. This is an invocation endpoint, not a durable worker.', security: [{ cronBearer: [] }], responses: { '200': { description: 'Monitoring batch completed' }, '401': { description: 'Invalid cron token' } } },
    },
  };
  const collections: Record<string, string> = {
    invoices: 'invoice.read',
    exceptions: 'exception.read',
    vendors: 'vendor.read',
    'purchase-orders': 'invoice.read',
    'goods-receipts': 'invoice.read',
    approvals: 'approval.create or approval.execute',
    tasks: 'task.manage',
    policies: 'policy.read',
    documents: 'document.read',
    audit: 'audit.read',
    notifications: 'notification.read',
    analytics: 'analytics.read',
    users: 'user.manage',
    agents: 'invoice.read',
  };
  for (const [name, permission] of Object.entries(collections)) {
    paths['/api/' + name] = list(name, permission);
    if (name !== 'analytics') {
      const detailPath = '/api/' + name + '/{id}';
      const detailOperations = (paths[detailPath] as Record<string, unknown> | undefined) ?? {};
      detailOperations.get = {
        summary: 'Read one recent ' + name + ' record',
        description: 'Requires an authenticated session and ' + permission + '. The record is selected from the bounded workspace snapshot.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Record' }, '401': { description: 'Authentication required' }, '403': { description: 'Permission denied' }, '404': { description: 'Record not found in the current snapshot' } },
      };
      paths[detailPath] = detailOperations;
    }
  }
  const tasksPath = list('tasks', 'task.manage');
  tasksPath.post = { summary: 'Create an internal task', description: 'Requires task.manage.', responses: { '200': { description: 'Task created' }, '403': { description: 'Permission denied' } } };
  paths['/api/tasks'] = tasksPath;
  const documentsPath = list('documents', 'document.read');
  documentsPath.post = { summary: 'Upload a validated TXT, CSV, or JSON document', description: 'Requires document.manage. Maximum upload size is 256 KB; uploads start as drafts.', responses: { '200': { description: 'Draft document indexed' }, '413': { description: 'Upload too large' }, '415': { description: 'Unsupported file type' } } };
  paths['/api/documents'] = documentsPath;
  return {
    openapi: '3.0.3',
    info: {
      title: 'ExceptionPilot 2.0 · Option B API',
      version: '2.0.0',
      description: 'Authenticated single-tenant workflow API. Financial amounts are integer minor units. Mock AI only; no autonomous financial actions. Production origin checks use canonical APP_ORIGIN.',
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        sessionCookie: { type: 'apiKey', in: 'cookie', name: 'ep_session' },
        cronBearer: { type: 'http', scheme: 'bearer' },
      },
    },
    security: [{ sessionCookie: [] }],
    paths,
  };
}
