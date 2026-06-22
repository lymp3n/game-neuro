import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Слой персистентности PostgreSQL.
// Если DATABASE_URL не задан — БД отключена, игра работает в памяти.
const DATABASE_URL = process.env.DATABASE_URL || '';

let pool = null;
export const dbEnabled = !!DATABASE_URL;

async function getPool() {
  if (pool) return pool;
  const { default: pg } = await import('pg');
  const needSsl = /\bsslmode=require\b/.test(DATABASE_URL) || process.env.PGSSL === '1';
  pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: needSsl ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

export async function initDb() {
  if (!dbEnabled) return false;
  const p = await getPool();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await p.query(schema);
  return true;
}

function sanitize(player) {
  const { ws, ...rest } = player;
  return rest;
}

export async function loadAllPlayers() {
  if (!dbEnabled) return [];
  const p = await getPool();
  const { rows } = await p.query('SELECT data FROM players');
  return rows.map((r) => r.data);
}

export async function upsertPlayer(player) {
  if (!dbEnabled) return;
  const p = await getPool();
  const data = sanitize(player);
  await p.query(
    `INSERT INTO players (id, name, google_id, email, level, data, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           google_id = COALESCE(EXCLUDED.google_id, players.google_id),
           email = COALESCE(EXCLUDED.email, players.email),
           level = EXCLUDED.level,
           data = EXCLUDED.data,
           updated_at = now()`,
    [player.id, player.name, player.googleId || null, player.email || null, player.level || 1, data]
  );
}

export async function countPlayers() {
  if (!dbEnabled) return 0;
  const p = await getPool();
  const { rows } = await p.query('SELECT count(*)::int AS c FROM players');
  return rows[0].c;
}

export async function findByGoogleId(googleId) {
  if (!dbEnabled || !googleId) return null;
  const p = await getPool();
  const { rows } = await p.query('SELECT data FROM players WHERE google_id = $1', [googleId]);
  return rows[0]?.data ?? null;
}
