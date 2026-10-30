import { createClient } from '@libsql/client';

// Pontuação máxima aceita por jogo (barreira simples contra valores absurdos).
const MAX_SCORE = {
  tetris: 1_000_000,
  shooter: 1_000_000,
  snake: 100_000,
  breaker: 1_000_000,
  bomberman: 1_000_000,
  checkers: 1_000_000,
  pacman: 1_000_000,
  lolo: 1_000_000,
};
const TOP_N = 10;

let client = null;
let ready = null;

function getClient() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL não configurada');
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

// Cria a tabela na primeira chamada (idempotente).
function ensureSchema() {
  if (!ready) {
    const db = getClient();
    ready = db
      .batch(
        [
          `CREATE TABLE IF NOT EXISTS scores (
             id         INTEGER PRIMARY KEY AUTOINCREMENT,
             game       TEXT    NOT NULL,
             name       TEXT    NOT NULL,
             score      INTEGER NOT NULL,
             created_at TEXT    NOT NULL DEFAULT (datetime('now'))
           )`,
          'CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores (game, score DESC)',
        ],
        'write'
      )
      .catch((err) => {
        ready = null; // permite tentar de novo na próxima requisição
        throw err;
      });
  }
  return ready;
}

function cleanName(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '') // sem controle nem tags
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12);
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await ensureSchema();
    const db = getClient();

    if (req.method === 'GET') {
      const game = String(req.query?.game ?? new URL(req.url, 'http://x').searchParams.get('game') ?? '');
      if (!(game in MAX_SCORE)) return res.status(400).json({ error: 'Jogo inválido' });
      const rs = await db.execute({
        sql: 'SELECT name, score FROM scores WHERE game = ? ORDER BY score DESC, id ASC LIMIT ?',
        args: [game, TOP_N],
      });
      return res.status(200).json({ game, scores: rs.rows.map((r) => ({ name: r.name, score: Number(r.score) })) });
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = await readBody(req);
      } catch {
        return res.status(400).json({ error: 'JSON inválido' });
      }
      const game = String(body.game ?? '');
      const name = cleanName(body.name);
      const score = Number(body.score);
      if (!(game in MAX_SCORE)) return res.status(400).json({ error: 'Jogo inválido' });
      if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
      if (!Number.isInteger(score) || score <= 0 || score > MAX_SCORE[game]) {
        return res.status(400).json({ error: 'Pontuação inválida' });
      }
      await db.execute({ sql: 'INSERT INTO scores (game, name, score) VALUES (?, ?, ?)', args: [game, name, score] });
      return res.status(201).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    console.error('scores api error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
