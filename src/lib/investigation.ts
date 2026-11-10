import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { Actor } from './domain';
import { calculateVariance, duplicateReasons, matchRecords, money, riskAssessment, TRANSITIONS } from './domain';
import { ApiError } from './auth';
import { audit } from './audit';
import { applicablePolicy, searchEvidence } from './retrieval';
export type LLMProvider = { name: string; model: string; available: boolean };
export const mockProvider: LLMProvider = { name: 'mock', model: 'deterministic-rules-v1', available: true };
function transitionCheck(from: string, to: string) { if (!TRANSITIONS[from]?.includes(to)) throw new ApiError(409, `Invalid transition ${from} → ${to}.`); }
export async function investigate(exceptionId: string, actor: Actor, requestId: string) {
  const started = Date.now();
  return db.transaction(async tx => {
    // Lock the exception before reading evidence. A repeatable-read snapshot keeps
    // related source records consistent for the duration of this investigation.
    const [exception] = await tx.select().from(s.exceptions).where(eq(s.exceptions.id, exceptionId)).for('update');
    if (!exception) throw new ApiError(404, 'Exception not found.');
    const preserveState = ['AWAITING_APPROVAL','ESCALATED','BLOCKED'].includes(exception.status);
    if (!preserveState && !['DETECTED','REOPENED','ANALYZED','ACTION_REQUIRED','FAILED'].includes(exception.status)) {
      throw new ApiError(409, `An exception in ${exception.status} cannot be investigated. Reopen it first.`);
    }

    const [invoice] = await tx.select().from(s.invoices).where(eq(s.invoices.id, exception.invoiceId)).for('update');
    if (!invoice) throw new ApiError(409, 'The source invoice is missing. Investigation blocked.');
    const [vendor] = await tx.select().from(s.vendors).where(eq(s.vendors.id, exception.vendorId)).for('update');
    if (!vendor) throw new ApiError(409, 'The source vendor is missing. Investigation blocked.');
    const [po] = invoice.poId ? await tx.select().from(s.purchaseOrders).where(eq(s.purchaseOrders.id, invoice.poId)).for('update') : [];
    const [grn] = invoice.poId ? await tx.select().from(s.goodsReceipts).where(eq(s.goodsReceipts.poId, invoice.poId)).for('update') : [];
    const [policy] = await tx.select().from(s.policies).where(eq(s.policies.id, 'pol-1')).for('update');
    const tolerance = policy?.status === 'ACTIVE' && (!policy.expiresAt || policy.expiresAt > new Date()) ? policy.tolerancePercent : 0;
    const match = matchRecords(po ?? null, grn ?? null, invoice, tolerance);

    const history = await tx.select().from(s.invoices)
      .where(and(eq(s.invoices.vendorId, invoice.vendorId), ne(s.invoices.id, invoice.id)))
      .limit(100);
    const duplicates = duplicateReasons(invoice, history);
    const similar = await tx.select().from(s.exceptions)
      .where(and(eq(s.exceptions.vendorId, exception.vendorId), eq(s.exceptions.type, exception.type), eq(s.exceptions.status, 'RESOLVED'), ne(s.exceptions.id, exception.id)))
      .orderBy(desc(s.exceptions.resolvedAt)).limit(3);
    const previous = await tx.select({ id: s.exceptions.id }).from(s.exceptions)
      .where(and(eq(s.exceptions.vendorId, exception.vendorId), eq(s.exceptions.type, exception.type), ne(s.exceptions.id, exception.id)))
      .limit(100);
    const [riskSetting] = await tx.select().from(s.settings).where(eq(s.settings.key, 'riskRules'));
    const evidence = await searchEvidence(exception.title, undefined, applicablePolicy(exception.type), tx);
    const risk = riskAssessment({
      duplicate: duplicates.length > 0,
      variance: match.outsideTolerance,
      missingReceipt: !grn,
      policyViolation: match.outsideTolerance,
      repeated: previous.length >= 2,
      unusual: po ? invoice.total > po.total * 1.5 : false,
      suspicious: exception.type === 'SUSPICIOUS_TRANSACTION',
    }, exception.dueAt < new Date(), riskSetting?.value as Partial<typeof import('./domain').DEFAULT_RISK_WEIGHTS> | undefined);

    const findings = [
      { kind: 'FACT', text: `Invoice ${invoice.number} totals ${money(invoice.total)}. ${po ? `The linked PO totals ${money(po.total)}.` : 'No purchase order is linked.'}` },
      { kind: 'FACT', text: grn ? `${grn.acceptedQuantity} units were accepted against the purchase order.` : 'No goods receipt was found. Receiving evidence is incomplete.' },
      { kind: 'FACT', text: match.variance.percent === null ? 'No PO baseline exists for a percentage variance.' : `The deterministic variance is ${match.variance.percent.toFixed(2)}% (${money(match.variance.difference)}). The active tolerance is ${tolerance}%.` },
      { kind: 'FACT', text: duplicates.length ? `${duplicates.length} potential duplicate match(es): ${duplicates.map(d => d.reason).join('; ')}.` : 'No exact or near-duplicate match was found in the retrieved invoice history.' },
      { kind: 'FACT', text: `${previous.length} other exceptions of this type were found for this vendor in the retrieved history.` },
      { kind: 'RULE_BASED_RECOMMENDATION', text: evidence.length ? 'Place the invoice on hold and request human approval before executing the hold. Obtain corrected commercial documentation from the vendor.' : 'Evidence is incomplete. Block automated clearing and request a current policy before making a decision.' },
    ];
    const recommendation = {
      action: 'PLACE_ON_HOLD',
      label: 'Place on hold · request approval',
      requiresApproval: true,
      reason: match.outsideTolerance || duplicates.length || !grn
        ? 'One or more deterministic controls require review.'
        : 'This demo requires explicit authorization for financial state changes.',
    };
    const report = {
      exceptionId,
      investigationId: `run-${randomUUID()}`,
      provider: mockProvider.name,
      model: mockProvider.model,
      findings,
      evidence,
      policyMatches: evidence.map(e => e.id),
      match,
      duplicates,
      risk,
      recommendation,
      approvalRequired: true,
      actionsTaken: [],
      confidence: null,
      confidenceNote: 'No calibrated LLM confidence is available. Rule outcomes are deterministic; evidence match strength is lexical, not a probability of correctness.',
      similarCases: similar.map(item => ({
        id: item.id,
        resolvedAt: item.resolvedAt,
        resolution: item.resolution,
        sameVendor: true,
        sameType: true,
        note: 'Rule-based similarity: same vendor and exception type. Historical cases are not binding precedent.',
      })),
      generatedAt: new Date().toISOString(),
    };

    if (['DETECTED','REOPENED','FAILED'].includes(exception.status)) {
      transitionCheck(exception.status, 'INVESTIGATING');
      await tx.update(s.exceptions).set({ status: 'INVESTIGATING' }).where(eq(s.exceptions.id, exceptionId));
      await audit({
        actor: actor.name, actorType: 'HUMAN', action: 'INVESTIGATION_STARTED', target: exceptionId,
        inputSummary: 'Read-only investigation authorized.', result: 'Investigation started.',
        requestId: `${requestId}:start`,
        beforeState: { status: exception.status }, afterState: { status: 'INVESTIGATING' },
      }, tx);
    }
    transitionCheck('INVESTIGATING', 'ANALYZED');
    await tx.insert(s.agentRuns).values({
      id: report.investigationId, exceptionId, provider: mockProvider.name, model: mockProvider.model,
      status: 'COMPLETED', report, tokens: 0, latencyMs: Date.now() - started, estimatedCost: 0,
    });
    if (!preserveState) {
      await tx.update(s.exceptions).set({
        status: 'ANALYZED', riskScore: risk.score, riskFactors: risk.factors, recommendation: recommendation.action,
      }).where(eq(s.exceptions.id, exceptionId));
    }
    await audit({
      actor: actor.name, actorType: 'HUMAN', action: 'INVESTIGATION_REQUESTED', target: exceptionId,
      inputSummary: 'Authorized read-only investigation using structured records and active policy evidence.',
      result: `Investigation ${report.investigationId} completed. No financial action executed.`,
      tool: 'investigate', risk: risk.score,
      beforeState: { status: exception.status },
      afterState: { status: preserveState ? exception.status : 'ANALYZED' },
      requestId,
    }, tx);
    await audit({
      actor: 'Investigation Agent', actorType: 'AGENT', action: 'INVESTIGATION_COMPLETED', target: exceptionId,
      inputSummary: 'get_invoice → get_purchase_order → get_goods_receipt → check_duplicate → calculate_variance → search_policy → calculate_risk',
      result: 'Concise decision factors stored. Recommended human-approved hold.',
      tool: 'mock.investigate', risk: risk.score,
      afterState: { runId: report.investigationId },
      requestId: `${requestId}:agent`,
    }, tx);
    return report;
  }, { isolationLevel: 'repeatable read' });
}
export async function evidencePacket(exceptionId: string) {
  const [exception] = await db.select().from(s.exceptions).where(eq(s.exceptions.id,exceptionId)); if(!exception) throw new ApiError(404,'Exception not found.');
  const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.id,exception.invoiceId));
  const [vendor] = await db.select().from(s.vendors).where(eq(s.vendors.id,exception.vendorId));
  const [po] = invoice.poId ? await db.select().from(s.purchaseOrders).where(eq(s.purchaseOrders.id,invoice.poId)) : [];
  const [grn] = invoice.poId ? await db.select().from(s.goodsReceipts).where(eq(s.goodsReceipts.poId,invoice.poId)) : [];
  const runs = await db.select().from(s.agentRuns).where(eq(s.agentRuns.exceptionId,exceptionId)).orderBy(desc(s.agentRuns.createdAt)).limit(10);
  const approvalList = await db.select().from(s.approvals).where(eq(s.approvals.exceptionId,exceptionId));
  const timeline = await db.select().from(s.auditEvents).where(eq(s.auditEvents.target,exceptionId)).orderBy(desc(s.auditEvents.timestamp)).limit(200);
  const evidence = await searchEvidence(exception.title,undefined,applicablePolicy(exception.type));
  return { generatedAt:new Date().toISOString(), exception, invoice, vendor:{...vendor,taxId:`******${vendor.taxId.slice(-4)}`,bankAccount:`****${vendor.bankLast4}`}, purchaseOrder:po??null, goodsReceipt:grn??null, investigation:runs[0]??null, approvals:approvalList, evidence, timeline, notice:'Development demo. Source documents are untrusted evidence. No external financial action has been executed.' };
}
