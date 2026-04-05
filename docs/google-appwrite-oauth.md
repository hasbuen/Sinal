# Google OAuth + Appwrite

Este projeto ja suporta login com Google no frontend. Para funcionar em web, desktop e APK, a configuracao precisa ficar alinhada entre Google Cloud e Appwrite.

## 1. Google Cloud

1. Crie ou selecione um projeto.
2. Abra `Google Auth Platform`.
3. Configure a tela de consentimento:
   - nome do app
   - e-mail de suporte
   - dominios autorizados
   - politica de privacidade e termos, se for publicar externamente
4. Em `Clients`, crie um `OAuth client ID` do tipo `Web application`.
5. Em `Authorized redirect URIs`, use exatamente a URL de callback mostrada pelo provedor Google dentro do Appwrite.

## 2. Appwrite

1. Abra `Auth > Settings > Google`.
2. Ative o provider Google.
3. Cole `Client ID` e `Client Secret` gerados no Google Cloud.
4. Copie a `redirect URL` exibida pelo Appwrite e registre essa URL no cliente OAuth do Google.
5. Garanta que as plataformas do projeto incluam os hosts usados pelo app:
   - `http://localhost`
   - `http://localhost:3000`
   - `https://seu-dominio-web`
   - `capacitor://localhost` quando aplicavel

## 3. Frontend

Defina no frontend:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://<REGION>.cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="<PROJECT_ID>"
NEXT_PUBLIC_APPWRITE_GOOGLE_OAUTH_ENABLED="true"
```

O botao de Google agora aparece tambem nas superficies embutidas, desde que o provider esteja ativo.

## 4. Observacoes importantes

- A URL de redirect precisa bater exatamente entre Google Cloud e Appwrite.
- Em producao, use dominio HTTPS proprio e revise a verificacao da tela de consentimento no Google.
- Para chamadas de video/voz mais estaveis fora da mesma rede, configure tambem TURN no frontend:

```env
NEXT_PUBLIC_WEBRTC_TURN_URL="turn:seu-turn:3478"
NEXT_PUBLIC_WEBRTC_TURN_USERNAME="usuario"
NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL="senha"
```

## Referencias oficiais

- Appwrite OAuth 2 login: https://appwrite.io/docs/products/auth/oauth2
- Appwrite OAuth Google: https://appwrite.io/integrations/oauth-google
- Google Auth Platform client setup: https://developers.google.com/workspace/guides/create-credentials
- Google OAuth production policies: https://developers.google.com/identity/protocols/oauth2/policies
