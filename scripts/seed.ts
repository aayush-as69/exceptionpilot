import 'dotenv/config';
import { ensureSeed } from '../src/lib/seed';
import { pool } from '../src/db';
ensureSeed().then(() => console.log('Option B demo seed is ready. Development credentials are documented in README.md.')).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
