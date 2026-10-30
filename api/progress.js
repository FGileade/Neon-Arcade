import { createClient } from '@libsql/client';
import { createHash } from 'node:crypto';
const db=()=>createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
const allowed=new Set(['tetris','shooter','snake','breaker','bomberman','checkers','pacman','lolo']);
async function schema(d){await d.batch([
'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime(\'now\')))',
'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)',
'CREATE TABLE IF NOT EXISTS progress (user_id TEXT NOT NULL, game TEXT NOT NULL, best_score INTEGER NOT NULL DEFAULT 0, games_played INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime(\'now\')), PRIMARY KEY(user_id,game))'
],'write');}
async function user(d,req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('neon_session='))?.slice(13);if(!token)return null;const h=createHash('sha256').update(token).digest('hex');const r=await d.execute({sql:'SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?',args:[h,Math.floor(Date.now()/1000)]});return r.rows[0]?.user_id||null;}
async function body(req){if(req.body&&typeof req.body==='object')return req.body;if(typeof req.body==='string')return JSON.parse(req.body);const a=[];for await(const c of req)a.push(c);return JSON.parse(Buffer.concat(a).toString()||'{}');}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');try{const d=db();await schema(d);const id=await user(d,req);if(!id)return res.status(401).json({error:'Faça login para acessar o progresso sincronizado'});
if(req.method==='GET'){const r=await d.execute({sql:'SELECT game,best_score,games_played,updated_at FROM progress WHERE user_id=?',args:[id]});return res.status(200).json({progress:r.rows});}
if(req.method==='POST'){const b=await body(req),game=String(b.game||''),score=Number(b.score);if(!allowed.has(game)||!Number.isSafeInteger(score)||score<0||score>10000000)return res.status(400).json({error:'Progresso inválido'});
await d.execute({sql:'INSERT INTO progress(user_id,game,best_score,games_played) VALUES(?,?,?,1) ON CONFLICT(user_id,game) DO UPDATE SET best_score=MAX(best_score,excluded.best_score),games_played=games_played+1,updated_at=datetime(\'now\')',args:[id,game,score]});return res.status(200).json({ok:true});}
res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Método não permitido'});
}catch(e){console.error('progress api:',e);return res.status(500).json({error:'Falha ao salvar progresso'});}}