import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../src/db';
migrate(db, { migrationsFolder: './drizzle' }).then(() => console.log('Database migrations applied.')).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
