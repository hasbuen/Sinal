# Sinal

Aplicacao de mensageria com frontend em Next.js, backend em NestJS e base Android via Capacitor.

Blueprint de migracao para `Flutter + Appwrite`: [docs/flutter-appwrite-whatsapp.md](/d:/Projects/Sinal/docs/flutter-appwrite-whatsapp.md)

## Estrutura

- `src/`: frontend Next.js pronto para Vercel
- `backend/`: API NestJS + GraphQL + Prisma + MongoDB
- `android/`: wrapper Android do frontend
- `docs/flutter-appwrite-whatsapp.md`: estrutura alvo `Flutter + Appwrite` e setup operacional

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
NEXT_PUBLIC_REALTIME_TRANSPORT=socketio
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:4000
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=69d0695b00063d876b0d
NEXT_PUBLIC_APPWRITE_DATABASE_ID=sinal
NEXT_PUBLIC_APPWRITE_MEDIA_BUCKET_ID=chat-media
```

Configuracao recomendada no Appwrite `Platforms`:

- `Web`: hostname `hasbuen.github.io`
- `Web (local)`: hostname `localhost`
- `Android`: package `com.hasbuen.sinal`
- `OAuth success/failure`: a sessao volta para `https://hasbuen.github.io/Sinal/login/`
- `Storage bucket`: `chat-media`

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
- Appwrite para autenticacao, painel admin e espelhos operacionais
- Redis para presenca e typing
- Socket.IO para realtime quando o backend roda em runtime Node persistente
- SQLite para cache local de snapshots
- Upload multipart com Appwrite Storage como alvo principal e fallback Blob/local
- Tutorial lazy com `driver.js`
- Capacitor Android com APK nativo
- Atualizacao de release no desktop via `electron-updater`
- Banner de update para web e Android apontando para a release mais nova

## Deploy

- Frontend: Vercel no root do repositorio
- Backend: Vercel em projeto separado com root em `backend/`
- Banco MongoDB gratis: Atlas
- Redis: servico separado barato ou gratis
- Arquivos: Appwrite Storage com fallback para Blob/local

Observacao tecnica: Vercel funciona bem para frontend, HTTP e upload, mas nao e o lugar ideal para Socket.IO com conexoes long-lived. O projeto agora suporta tres modos de realtime no frontend:

- `socketio`: recomendado em desenvolvimento ou em backend Node persistente
- `graphql-ws`: compatibilidade com a stack existente
- `polling`: fallback seguro para deploys onde websocket nao fecha bem

## Fluxo recomendado no Vercel

1. Criar um projeto `web` apontando para a raiz.
2. Criar um projeto `api` apontando para `backend/`.
3. Definir `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BACKEND_ORIGIN` e `NEXT_PUBLIC_ENABLE_WEBSOCKETS` no frontend.
4. Definir tambem as variaveis `NEXT_PUBLIC_APPWRITE_*` no frontend.
5. Definir `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `PUBLIC_API_ORIGIN`, `BLOB_READ_WRITE_TOKEN` e `APPWRITE_*` no backend.
6. Rodar `npm run prisma:push` no primeiro deploy do backend.

Observacao: se o backend ficar em Vercel puro, mantenha `NEXT_PUBLIC_ENABLE_WEBSOCKETS=false` e o app usa polling inteligente no lugar de subscriptions.
