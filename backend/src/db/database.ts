// ============================================================================
// DATABASE CONNECTION & QUERY ABSTRACTION (PostgreSQL + Native SQLite fallback)
// ============================================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import pg from 'pg';
import { SCHEMA_SQL, PG_SCHEMA_SQL, DbUser } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sqliteDb: DatabaseSync | null = null;
let pgPool: pg.Pool | null = null;
let isPostgres = false;

export async function initDb(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith('postgres')) {
    try {
      isPostgres = true;
      pgPool = new pg.Pool({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
      await pgPool.query(PG_SCHEMA_SQL);
      console.log('Connected and migrated PostgreSQL database.');
      await seedInitialUsers();
      return;
    } catch (err) {
      console.warn('PostgreSQL connection failed, falling back to SQLite:', err);
      isPostgres = false;
    }
  }

  // Local persistent SQLite database
  const dbDir = path.resolve(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'neurosaathi.db');
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec(SCHEMA_SQL);

  // Safely migrate existing database to include photo column if created earlier
  try {
    sqliteDb.exec('ALTER TABLE face_scan_events ADD COLUMN photo TEXT');
  } catch {
    // Column already exists, ignore
  }

  console.log(`Connected and migrated SQLite database at ${dbPath}`);
  await seedInitialUsers();
}

async function seedInitialUsers(): Promise<void> {
  const existing = await query<DbUser>('SELECT id FROM users LIMIT 1');
  if (existing.length === 0) {
    const now = new Date().toISOString();
    await run(
      'INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['patient-1', 'Asha Sharma', 'ELDER', now, now]
    );
    await run(
      'INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['caregiver-1', 'Caregiver (Family)', 'CAREGIVER', now, now]
    );
    console.log('Seeded initial users: Asha Sharma (ELDER), Caregiver (CAREGIVER)');
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (isPostgres && pgPool) {
    // Convert ? to $1, $2, etc. for PostgreSQL
    let pIdx = 1;
    const pgSql = sql.replace(/\?/g, () => `$${pIdx++}`);
    const res = await pgPool.query(pgSql, params);
    return res.rows as T[];
  }

  if (sqliteDb) {
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params) as T[];
  }

  throw new Error('Database not initialized');
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  if (isPostgres && pgPool) {
    let pIdx = 1;
    const pgSql = sql.replace(/\?/g, () => `$${pIdx++}`);
    await pgPool.query(pgSql, params);
    return;
  }

  if (sqliteDb) {
    const stmt = sqliteDb.prepare(sql);
    stmt.run(...params);
    return;
  }

  throw new Error('Database not initialized');
}
