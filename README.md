# Sinal

Aplicacao de mensageria com frontend em Next.js, backend novo em NestJS e base Android via Capacitor.

## Estrutura

- `src/`: frontend exportavel para GitHub Pages
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

- Next.js 16 com export estatico
- NestJS 11 com GraphQL code-first
- Prisma 6.x com MongoDB
- Redis para presenca e typing
- SQLite para cache local de snapshots
- Upload multipart para imagem, audio, video e arquivos
- Tutorial lazy com `driver.js`
- PWA + Capacitor Android

## Deploy

- Landing e frontend estatico: GitHub Pages
- Backend: Railway apontando para `backend/`
- Banco MongoDB gratis: Atlas
- Redis: servico separado barato ou gratis

## Fluxo recomendado no Railway

1. Criar um servico com root em `backend/`.
2. Usar `backend/railway.json` como config-as-code.
3. Definir `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` e `PUBLIC_API_ORIGIN`.
4. Rodar `npm run prisma:push` no primeiro deploy.

Observacao: Railway hoje entrega bem o NestJS, mas para banco gratis o Atlas segue sendo a opcao mais estavel.
