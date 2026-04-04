# Sinal com Flutter + Appwrite

Este blueprint descreve a estrutura alvo para uma versao `Flutter + Appwrite` do Sinal, mantendo MongoDB, Redis e SQLite com papeis claros.

## 1. Estrutura do projeto

```text
sinal/
  app/
    lib/
      app.dart
      bootstrap.dart
      core/
        env/
        theme/
        crypto/
        storage/
      features/
        auth/
          data/
          domain/
          presentation/
        contacts/
        chat/
        groups/
        calls/
        notifications/
        settings/
        admin/
      services/
        appwrite/
        redis/
        mongo/
        sqlite/
    android/
    ios/
    windows/
    web/
  backend/
    functions/
      push/
      admin/
      sync/
    workers/
      redis-presence/
      mongo-archive/
  infra/
    docker/
    nginx/
    compose/
```

## 2. Papéis de cada tecnologia

- `Appwrite`: autenticacao, banco principal operacional, realtime, storage de midia, notificacoes push, teams/grupos, painel admin simples.
- `MongoDB`: espelho operacional e trilha de auditoria, analytics, busca, arquivamento, agregacoes e exportacao de historico.
- `Redis`: presenca online/offline, typing, fila curta para eventos, fan-out de notificacoes, debounce de status.
- `SQLite`: cache offline no dispositivo Flutter para conversas recentes, drafts, anexos pendentes e boot rapido.

## 3. Configuracao inicial do Appwrite

### Projeto

- Criar um projeto `sinal`.
- Adicionar plataformas:
  - `Android`: package id do APK.
  - `Web`: dominio publico.
  - `Windows/Desktop`: dominio usado pelo cliente ou endpoint custom.
- Habilitar provedores OAuth desejados:
  - `Google`
  - `GitHub`
  - `Microsoft` se quiser paridade de desktop corporativo

### Collections sugeridas

- `users`
  - `userId: string`
  - `displayName: string`
  - `username: string`
  - `avatarUrl: string`
  - `bio: string`
  - `isOnline: boolean`
  - `lastSeenAt: datetime`
  - `pushTargets: string[]`
- `messages`
  - `conversationId: string`
  - `senderId: string`
  - `type: string`
  - `ciphertext: string`
  - `nonce: string`
  - `attachments: string[]`
  - `replyToId: string`
  - `expiresAt: datetime`
  - `deletedAt: datetime`
- `groups`
  - `teamId: string`
  - `title: string`
  - `description: string`
  - `avatarUrl: string`
  - `memberIds: string[]`
  - `ownerIds: string[]`
- `contacts`
  - `ownerId: string`
  - `contactId: string`
  - `alias: string`
  - `isBlocked: boolean`

### Buckets

- `chat-media`
  - imagens, audio, video, thumbnails
- `stickers`
  - figurinhas geradas

### Permissions

- `users`
  - leitura e escrita do proprio usuario
  - leitura opcional por membros dos mesmos grupos
- `messages`
  - leitura para participantes da conversa
  - escrita do remetente e workers de backend
- `groups`
  - leitura para membros do time
  - escrita para `owner` e `admin`
- `contacts`
  - leitura e escrita apenas do dono

### Teams

- Criar um `team` Appwrite por grupo.
- Roles sugeridas:
  - `owner`
  - `admin`
  - `member`

## 4. Configuracao de autenticacao

- `Email/senha`: Appwrite Account.
- `Social login`: `Google`, `GitHub`, `Microsoft`.
- `Push`: Appwrite Messaging com targets por dispositivo.
- `E2EE`: chaves publicas no Appwrite e material secreto apenas no dispositivo.

## 5. Exemplo Flutter: autenticacao

```dart
import 'package:appwrite/appwrite.dart';
import 'package:appwrite/models.dart' as models;

class AuthRepository {
  AuthRepository(this.client)
      : account = Account(client);

  final Client client;
  final Account account;

  Future<models.User> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    await account.create(
      userId: ID.unique(),
      email: email,
      password: password,
      name: name,
    );

    await account.createEmailPasswordSession(
      email: email,
      password: password,
    );

    return account.get();
  }

  Future<models.User> signIn({
    required String email,
    required String password,
  }) async {
    await account.createEmailPasswordSession(
      email: email,
      password: password,
    );
    return account.get();
  }

  Future<void> signInWithGoogle() async {
    await account.createOAuth2Session(
      provider: OAuthProvider.google,
      success: 'sinal://auth-success',
      failure: 'sinal://auth-failure',
    );
  }
}
```

## 6. Exemplo Flutter: envio e recebimento de mensagens em tempo real

```dart
import 'dart:convert';
import 'package:appwrite/appwrite.dart';

class ChatRepository {
  ChatRepository(this.client)
      : databases = Databases(client);

  final Client client;
  final Databases databases;

  static const databaseId = 'chat-db';
  static const messagesCollectionId = 'messages';

  Future<void> sendEncryptedMessage({
    required String conversationId,
    required String senderId,
    required String ciphertext,
    required String nonce,
  }) async {
    await databases.createDocument(
      databaseId: databaseId,
      collectionId: messagesCollectionId,
      documentId: ID.unique(),
      data: {
        'conversationId': conversationId,
        'senderId': senderId,
        'type': 'text',
        'ciphertext': ciphertext,
        'nonce': nonce,
      },
    );
  }

  RealtimeSubscription subscribeToConversation(
    String databaseId,
    String messagesCollectionId,
    void Function(Map<String, dynamic>) onMessage,
  ) {
    return client.subscribe([
      'databases.$databaseId.collections.$messagesCollectionId.documents'
    ], (event) {
      final payload = Map<String, dynamic>.from(event.payload);
      onMessage(payload);
    });
  }
}
```

## 7. Exemplo Flutter: criacao e gerenciamento de grupos

```dart
import 'package:appwrite/appwrite.dart';

class GroupRepository {
  GroupRepository(this.client)
      : teams = Teams(client),
        databases = Databases(client);

  final Client client;
  final Teams teams;
  final Databases databases;

  static const databaseId = 'chat-db';
  static const groupsCollectionId = 'groups';

  Future<String> createGroup({
    required String title,
    required List<String> memberUserIds,
  }) async {
    final team = await teams.create(
      teamId: ID.unique(),
      name: title,
      roles: ['owner', 'admin', 'member'],
    );

    for (final userId in memberUserIds) {
      await teams.createMembership(
        teamId: team.$id,
        userId: userId,
        roles: ['member'],
      );
    }

    await databases.createDocument(
      databaseId: databaseId,
      collectionId: groupsCollectionId,
      documentId: team.$id,
      data: {
        'teamId': team.$id,
        'title': title,
        'memberIds': memberUserIds,
      },
    );

    return team.$id;
  }
}
```

## 8. Criptografia ponta a ponta

- Use `Signal Protocol` no app Flutter com chaves por dispositivo.
- Armazene no Appwrite apenas:
  - chave publica de identidade
  - prekeys publicas
  - ciphertext
  - metadados minimos
- Nunca armazene chaves privadas no backend.
- SQLite local guarda:
  - identity key
  - sessions
  - ratchets
  - fila offline de envio

## 9. Painel administrativo simples

No painel admin:

- listar usuarios do Appwrite
- listar grupos/teams
- bloquear ou desabilitar usuarios
- criar grupos
- acompanhar mirrors em Mongo/Redis/SQLite

No repo atual, isso foi iniciado pela rota web `/admin`, usando o backend Nest como camada segura para operar Appwrite com API key.

## 10. Hospedagem barata

- `Appwrite Cloud`: sobe mais rapido, menor manutencao, bom para MVP.
- `Hetzner VPS + Docker Compose`: custo baixo e previsivel para Appwrite self-hosted.
- `Contabo VPS + Docker`: barato para ambientes de homologacao e pequenos projetos.
- `Oracle Cloud Free + Appwrite self-hosted`: muito barato, mas exige mais paciencia com rede e disco.

### Recomendacao pragmatica

- MVP pequeno: `Appwrite Cloud`
- producao economica controlada: `Hetzner + Docker`
- workers extras:
  - Redis em `Upstash` ou VPS proprio
  - MongoDB em Atlas free ou cluster dedicado pequeno

## 11. Estado atual do repositorio

O repositorio atual ainda nao e Flutter. Hoje ele usa:

- `Next.js` no navegador
- `Electron` no desktop
- `Capacitor` no APK Android
- `NestJS` no backend

Nesta fase, o Appwrite foi integrado como:

- autenticacao do app
- painel admin simples
- espelho de usuarios, grupos e mensagens

Se a proxima etapa for migracao total para Flutter, este documento vira o alvo de implementacao.
