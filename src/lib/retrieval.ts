import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { documents, policyChunks, policies } from '@/db/schema';
import { aiConfigured, embedQuery } from './ai-provider';

export type Evidence = { id: string; documentId: string; document: string; version: string; section: string; page: number; content: string; category: string; matchStrength: number; semanticScore?: number; retrieval: string };

function lexicalScore(query: string, content: string) {
  const tokens = [...new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])];
  if (!tokens.length) return 0;
  return tokens.filter(t => content.toLowerCase().includes(t)).length / tokens.length;
}
function vectorLiteral(values: number[]) { return '[' + values.map(v => Number(v).toString()).join(',') + ']'; }

async function semanticRows(query: string, category?: string, policyId?: string, executor: Pick<typeof db, 'execute'> = db) {
  if (!aiConfigured()) return [];
  const embedding = await embedQuery(query);
  const vector = vectorLiteral(embedding.vector);
  const filters = [
    sql`d.status = 'ACTIVE'`,
    sql`d.effective_date <= now()`,
    sql`(d.expires_at IS NULL OR d.expires_at > now())`,
    sql`(pc.embedding IS NOT NULL)`,
    category ? sql`pc.category = ${category}` : sql`TRUE`,
    policyId ? sql`pc.policy_id = ${policyId}` : sql`TRUE`,
  ];
  const rows = await executor.execute(sql`SELECT pc.id, d.id AS "documentId", d.title AS document, d.version, pc.section, pc.page, pc.content, pc.category, 1 - (pc.embedding <=> ${vector}::vector) AS "semanticScore" FROM policy_chunks pc JOIN documents d ON d.id = pc.document_id LEFT JOIN policies p ON p.id = pc.policy_id WHERE ${and(...filters)} ORDER BY pc.embedding <=> ${vector}::vector LIMIT 20`);
  return rows.rows as Array<Evidence & { semanticScore: number }>;
}

export async function searchEvidence(query: string, category?: string, policyId?: string, executor: Pick<typeof db, 'select' | 'execute'> = db): Promise<Evidence[]> {
  const now = new Date();
  try {
    const semantic = await semanticRows(query, category, policyId, executor);
    if (semantic.length) return semantic.map(row => ({ ...row, semanticScore: Number(row.semanticScore), matchStrength: Math.round(lexicalScore(query, row.content) * 100) / 100, retrieval: `Semantic RAG · ${row.document} · ${row.version}` })).sort((a,b) => (b.semanticScore! + 0.15*b.matchStrength) - (a.semanticScore! + 0.15*a.matchStrength)).slice(0,5);
  } catch { /* provider/vector unavailable: retain transparent lexical fallback */ }
  const rows = await executor.select({ id: policyChunks.id, documentId: documents.id, document: documents.title, version: documents.version, section: policyChunks.section, page: policyChunks.page, content: policyChunks.content, category: policyChunks.category, keywordRank: sql<number>`ts_rank(to_tsvector('english', ${policyChunks.content}), plainto_tsquery('english', ${query}))` }).from(policyChunks).innerJoin(documents, eq(documents.id, policyChunks.documentId)).leftJoin(policies, eq(policies.id, policyChunks.policyId)).where(and(eq(documents.status, 'ACTIVE'), lte(documents.effectiveDate, now), or(gt(documents.expiresAt, now), isNull(documents.expiresAt)), or(isNull(policyChunks.policyId), and(eq(policies.status, 'ACTIVE'), lte(policies.effectiveDate, now), or(gt(policies.expiresAt, now), isNull(policies.expiresAt)))), category ? eq(policyChunks.category, category) : undefined, policyId ? eq(policyChunks.policyId, policyId) : undefined)).orderBy(desc(sql<number>`ts_rank(to_tsvector('english', ${policyChunks.content}), plainto_tsquery('english', ${query}))`)).limit(100);
  return rows.map(row => ({ ...row, keywordRank: Number(row.keywordRank), matchStrength: Math.round(lexicalScore(query,row.content)*100)/100, retrieval:'Keyword + lexical overlap + metadata filtering' })).filter(r => policyId || r.keywordRank > 0 || r.matchStrength > .1).sort((a,b) => (b.keywordRank+b.matchStrength)-(a.keywordRank+a.matchStrength)).slice(0,5);
}
export function applicablePolicy(type: string) { return type.includes('DUPLICATE') || type === 'PAYMENT_DUPLICATION' ? 'pol-2' : type.includes('GOODS') || type === 'QUANTITY_VARIANCE' ? 'pol-3' : type.includes('VENDOR') || type.includes('CONTRACT') ? 'pol-4' : 'pol-1'; }
export const INJECTION_PATTERN = /ignore (all |any )?(previous|prior|system|developer)|bypass (approval|security|authorization)|delete (the )?audit|reveal (your |the )?(system prompt|api key)|disable security|send (this|an) email without|modify historical financial/i;