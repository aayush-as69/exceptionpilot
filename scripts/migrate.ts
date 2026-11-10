import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../src/db';
import { sql } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
async function main() { await migrate(db, { migrationsFolder: './drizzle' }); const semanticMigration = await readFile('./drizzle/0002_semantic_rag.sql', 'utf8'); await db.execute(sql.raw(semanticMigration)); console.log('Database migrations applied, including semantic RAG.'); } main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
