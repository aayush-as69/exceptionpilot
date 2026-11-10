import 'dotenv/config';
import { db, pool } from '../src/db';
import { sql } from 'drizzle-orm';
import { embedText } from '../src/lib/ai-provider';

async function main() {
  const rows = await db.execute(sql`
    SELECT pc.id, pc.content
    FROM policy_chunks pc
    JOIN documents d ON d.id = pc.document_id
    WHERE d.status = 'ACTIVE' AND pc.embedding IS NULL
    ORDER BY pc.id
  `);
  let completed = 0;
  for (const row of rows.rows as Array<{ id: string; content: string }>) {
    const result = await embedText(row.content);
    await db.execute(sql`
      UPDATE policy_chunks
      SET embedding = ${JSON.stringify(result.vector)}::vector,
          embedding_provider = ${result.provider},
          embedding_model = ${result.model},
          embedded_at = now()
      WHERE id = ${row.id}
    `);
    completed++;
    console.log(`Embedded ${completed}/${rows.rows.length}: ${row.id}`);
  }
  console.log(`Semantic RAG indexing complete: ${completed} chunks.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
