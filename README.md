# Sinal

Aplicacao de mensageria com frontend em Next.js, backend em NestJS e base Android via Capacitor.

## Estrutura

- `src/`: frontend Next.js pronto para Vercel
- `backend/`: API NestJS + GraphQL + Prisma + MongoDB
- `android/`: wrapper Android do frontend

## Frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

Variaveis principais:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/graphql
NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:4000
NEXT_PUBLIC_ENABLE_WEBSOCKETS=true
NEXT_PUBLIC_BASE_PATH=
```

## Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:push
npm run dev
```

Scripts uteis na raiz:

```bash
npm run backend:dev
npm run backend:build
npm run backend:typecheck
```

## Arquitetura atual

- Next.js 16 com frontend pronto para Vercel
- NestJS 11 com GraphQL code-first
- Prisma 6.x com MongoDB
- Redis para presenca e typing
- SQLite para cache local de snapshots
- Upload multipart com Vercel Blob em producao
- Tutorial lazy com `driver.js`
- PWA + Capacitor Android

## Deploy

- Frontend: Vercel no root do repositorio
- Backend: Vercel em projeto separado com root em `backend/`
- Banco MongoDB gratis: Atlas
- Redis: servico separado barato ou gratis
- Arquivos: Vercel Blob

## Fluxo recomendado no Vercel

1. Criar um projeto `web` apontando para a raiz.
2. Criar um projeto `api` apontando para `backend/`.
3. Definir `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BACKEND_ORIGIN` e `NEXT_PUBLIC_ENABLE_WEBSOCKETS` no frontend.
4. Definir `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `PUBLIC_API_ORIGIN` e `BLOB_READ_WRITE_TOKEN` no backend.
5. Rodar `npm run prisma:push` no primeiro deploy do backend.

Observacao: se o backend ficar em Vercel puro, mantenha `NEXT_PUBLIC_ENABLE_WEBSOCKETS=false` e o app usa polling inteligente no lugar de subscriptions.
