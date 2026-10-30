# Neon Arcade

Seis jogos em um só (Tetris, Space Shooter, Snake, Block Breaker, Pong vs IA e Matrix Dodge), feito para celular e desktop, com **ranking online**.

- **Front-end:** `index.html` (HTML + Canvas, sem build)
- **API:** `api/scores.js` (função serverless da Vercel)
- **Banco:** [Turso](https://turso.tech) (SQLite na nuvem) via `@libsql/client`
- **Hospedagem:** [Vercel](https://vercel.com) ligada ao GitHub (cada `git push` publica)

## Estrutura

```
index.html        jogo + telas de ranking
api/scores.js     GET /api/scores?game=snake  |  POST /api/scores
schema.sql        tabela do ranking (a API também cria sozinha)
vercel.json       configurações da Vercel
.env.example      nomes das variáveis de ambiente (sem valores reais)
```

## Como colocar no ar

### 1. Turso (banco)

Instale a CLI (https://docs.turso.tech/cli/installation), faça login e crie o banco:

```bash
turso auth login
turso db create neon-arcade
turso db show neon-arcade --url        # -> TURSO_DATABASE_URL
turso db tokens create neon-arcade     # -> TURSO_AUTH_TOKEN
```

A tabela `scores` é criada automaticamente na primeira chamada da API. Se preferir criar antes: `turso db shell neon-arcade < schema.sql`.

### 2. GitHub

O repositório já está em `https://github.com/FGileade/Neon-Arcade`.

### 3. Vercel (site + API)

1. Em https://vercel.com/new, importe o repositório `FGileade/Neon-Arcade`.
2. *Framework Preset:* **Other** (sem build command, sem output directory).
3. Em **Environment Variables**, cadastre `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` (valores do passo 1) para Production, Preview e Development.
4. Clique em **Deploy**.

Depois disso, todo `git push` na branch `main` publica uma nova versão.

## Rodar localmente

```bash
npm install
cp .env.example .env.local     # preencha com os valores do Turso
npx vercel dev                 # http://localhost:3000
```

Para testar sem Turso, use um arquivo SQLite local: `TURSO_DATABASE_URL=file:local.db`.

Abrir o `index.html` direto no navegador também funciona para jogar, mas o ranking só aparece quando a API está rodando.

## Segurança e limites

- O banco só é acessado pela API (o token do Turso fica nas variáveis da Vercel, nunca no código).
- A API valida jogo, nome (até 12 caracteres) e pontuação máxima por jogo, e usa consultas parametrizadas.
- A pontuação é enviada pelo navegador, então um jogador técnico consegue forjar valores dentro do limite. Para um ranking competitivo de verdade seria preciso validar as partidas no servidor.
- Não há limite de requisições por IP. Se o jogo ficar popular, vale ativar o Vercel Firewall (rate limit).

## Controles

Teclado (setas / WASD), toque/mouse ou o gamepad virtual (botão **🎮 Controles**).
