# Sinal

Aplicativo de mensagens em tempo real com Supabase, export estatico em Next.js 16, onboarding guiado e base para Android via Capacitor.

## Stack

- Next.js 16.2.2
- React 19.2.4
- Supabase JS
- Tailwind CSS v4
- Driver.js para tutorial guiado
- Capacitor para Android

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build estatico

```bash
npm run build
```

O build gera a pasta `out/`, usada tanto para deploy quanto para o empacotamento Android.

## Android

```bash
npm run android:sync
npm run android:build
```

Requisitos locais:

- Android SDK instalado
- JDK 17 configurado

## GitHub Pages

O workflow em `.github/workflows/pages.yml` publica o export do Next no GitHub Pages usando `NEXT_PUBLIC_BASE_PATH=/Sinal`.

## Variaveis de ambiente

Crie um arquivo `.env.local` com:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
