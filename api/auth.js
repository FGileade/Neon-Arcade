import { createClient } from '@libsql/client';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCb);
const db=()=>createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
async function body(req){if(req.body&&typeof req.body==='object')return req.body;if(typeof req.body==='string')return JSON.parse(req.body);const a=[];for await(const c of req)a.push(c);return JSON.parse(Buffer.concat(a).toString()||'{}');}
function cookie(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('neon_session='))?.slice(13)||'';}
function hash(v){return createHash('sha256').update(v).digest('hex');}
async function schema(d){await d.batch([
'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime(\'now\')))',
'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)',
'CREATE TABLE IF NOT EXISTS progress (user_id TEXT NOT NULL, game TEXT NOT NULL, best_score INTEGER NOT NULL DEFAULT 0, games_played INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime(\'now\')), PRIMARY KEY(user_id,game))'
],'write');}
async function userFor(d,req){const t=cookie(req);if(!t)return null;const r=await d.execute({sql:'SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',args:[hash(t),Math.floor(Date.now()/1000)]});return r.rows[0]||null;}
export default async function handler(req,res){
res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Cookie');
try{
const d=db();await schema(d);
if(req.method==='POST'){
const b=await body(req),action=String(b.action||'');
if(action==='logout'){res.setHeader('Set-Cookie','neon_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return res.status(200).json({ok:true});}
const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'E-mail inválido'});
if(password.length<10||password.length>128)return res.status(400).json({error:'A senha deve ter entre 10 e 128 caracteres'});
let user;
if(action==='register'){
const id=randomBytes(16).toString('hex'),salt=randomBytes(16).toString('hex'),derived=await scrypt(password,salt,64);
try{await d.execute({sql:'INSERT INTO users(id,email,password_hash) VALUES(?,?,?)',args:[id,email,salt+':'+derived.toString('hex')]});}
catch(e){if(String(e).includes('UNIQUE'))return res.status(409).json({error:'Este e-mail já possui cadastro'});throw e;}
user={id,email};
}else if(action==='login'){
const r=await d.execute({sql:'SELECT id,email,password_hash FROM users WHERE email=?',args:[email]});user=r.rows[0];
if(!user)return res.status(401).json({error:'E-mail ou senha incorretos'});
const [salt,stored]=String(user.password_hash).split(':'),actual=await scrypt(password,salt,64),expected=Buffer.from(stored,'hex');
if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return res.status(401).json({error:'E-mail ou senha incorretos'});
}else return res.status(400).json({error:'Ação inválida'});
const token=randomBytes(32).toString('hex'),expires=Math.floor(Date.now()/1000)+60*60*24*30;
await d.execute({sql:'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',args:[hash(token),user.id,expires]});
res.setHeader('Set-Cookie',`neon_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
return res.status(200).json({user:{id:user.id,email:user.email}});
}
if(req.method==='GET'){const user=await userFor(d,req);return res.status(200).json({user:user?{id:user.id,email:user.email}:null});}
res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Método não permitido'});
}catch(e){console.error('auth api:',e);return res.status(500).json({error:'Falha na autenticação'});}
}