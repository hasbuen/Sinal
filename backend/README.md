# Sinal Backend

Backend novo da aplicacao Sinal.

## Stack

- NestJS 11
- GraphQL code-first
- Prisma 6.x com MongoDB
- Appwrite para autenticacao, admin e espelhos de users/messages/groups
- Redis para presenca e typing
- Redis para cache e fila curta de eventos realtime
- SQLite local para cache de snapshots
- Upload REST multipart para midia
- Socket.IO para eventos realtime em runtime Node persistente

## Variaveis

Use `.env.example` como base.

### Minimo para subir

```env
DATABASE_URL=mongodb+srv://...
JWT_SECRET=...
APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
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
2. Definir as variaveis do `.env.example`, principalmente `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `PUBLIC_API_ORIGIN`, `BLOB_READ_WRITE_TOKEN` e `APPWRITE_*`.
3. Manter MongoDB no Atlas e Redis em servico separado.
4. Definir `APPWRITE_MEDIA_BUCKET_ID`. O backend agora cria o bucket no Appwrite sob demanda no primeiro upload, se ele ainda nao existir.
5. Executar `npm run prisma:push` no primeiro deploy.
6. Fazer um novo deploy depois de salvar as variaveis, porque CORS e origem publica sao lidos no boot.

Estrutura de deploy:

- `api/[...all].ts`: Function catch-all da Vercel
- `src/server.ts`: bootstrap compartilhado do Nest sem `listen()`
- `src/main.ts`: apenas bootstrap local com `listen()` para desenvolvimento e VPS

Valores de producao usados neste projeto:

```env
NODE_ENV=production
PUBLIC_API_ORIGIN=https://sinal-api.vercel.app
FRONTEND_ORIGIN=https://hasbuen.github.io,https://localhost,http://localhost:3000,http://localhost,capacitor://localhost
```

Sem `FRONTEND_ORIGIN` correto, o navegador bloqueia o preflight do GitHub Pages para `https://sinal-api.vercel.app/api/graphql`.

Observacao tecnica: em Vercel, mantenha o frontend em `polling`. O transporte `socketio` foi adicionado para runtime Node persistente, mas nao deve ser considerado o modo principal em serverless.

## Modulos ja criados

- `auth`: login, cadastro, `me`
- `appwrite`: exchange de JWT, painel admin e mirrors
- `users`: busca de usuarios
- `conversations`: diretas, grupos, membros, leitura
- `messages`: envio, reacoes, typing, subscription
- `uploads`: upload multipart com Appwrite Storage como alvo principal, Blob como fallback e rota publica de proxy para view/preview
