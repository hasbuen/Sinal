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

## Deploy no Railway

Fluxo recomendado no plano gratis:

1. Criar um servico apontando para a pasta `backend/`.
2. Configurar `backend/railway.json` como config-as-code do servico.
3. Definir as variaveis do `.env.example`, principalmente `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` e `PUBLIC_API_ORIGIN`.
4. Manter MongoDB no Atlas gratis e Redis em servico separado.
5. Executar `npm run prisma:push` no primeiro deploy ou como pre-deploy.

## Modulos ja criados

- `auth`: login, cadastro, `me`
- `users`: busca de usuarios
- `conversations`: diretas, grupos, membros, leitura
- `messages`: envio, reacoes, typing, subscription
- `uploads`: upload multipart e entrega de URL publica do backend
