# Sinal Backend

Backend novo da aplicacao Sinal.

## Stack

- NestJS 11
- GraphQL code-first
- Prisma 6.x com MongoDB
- Redis para presenca e typing
- SQLite local para cache de snapshots
- Upload REST multipart para midia

## Variaveis

Use `.env.example` como base.

### Minimo para subir

```env
DATABASE_URL=mongodb+srv://...
JWT_SECRET=...
```

## Rodando local

```bash
npm install
npm run prisma:generate
npm run typecheck
npm run dev
```

## Deploy no Vercel

Fluxo recomendado:

1. Criar um projeto Vercel separado apontando para a pasta `backend/`.
2. Definir as variaveis do `.env.example`, principalmente `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `PUBLIC_API_ORIGIN` e `BLOB_READ_WRITE_TOKEN`.
3. Manter MongoDB no Atlas e Redis em servico separado.
4. Criar um Blob Store no projeto para arquivos de midia.
5. Executar `npm run prisma:push` no primeiro deploy.

## Modulos ja criados

- `auth`: login, cadastro, `me`
- `users`: busca de usuarios
- `conversations`: diretas, grupos, membros, leitura
- `messages`: envio, reacoes, typing, subscription
- `uploads`: upload multipart com Vercel Blob em producao e fallback local em desenvolvimento
