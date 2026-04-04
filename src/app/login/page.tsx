"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Chrome, Github, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  exchangeAppwriteJwt,
  getBackendToken,
  loginUser,
  setBackendToken,
} from "@/lib/backend-client";
import {
  createAppwriteJwt,
  getAppwriteCurrentUser,
  isAppwriteEnabled,
  loginWithAppwriteEmailPassword,
  OAuthProvider,
  startAppwriteOAuthLogin,
} from "@/lib/appwrite-client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withBasePath } from "@/lib/utils";
import { isEmbeddedAppBrowser, toAppHref } from "@/lib/runtime";

export default function PaginaLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const appwriteEnabled = isAppwriteEnabled();
  const embedded = isEmbeddedAppBrowser();

  useEffect(() => {
    if (getBackendToken()) {
      router.replace(toAppHref("/chat"));
      return;
    }

    if (!appwriteEnabled) {
      return;
    }

    let cancelled = false;

    async function bootstrapAppwriteSession() {
      try {
        await getAppwriteCurrentUser();
        const jwt = await createAppwriteJwt();
        const auth = await exchangeAppwriteJwt(jwt);
        if (cancelled) return;
        setBackendToken(auth.accessToken);
        router.replace(toAppHref("/chat"));
      } catch {
        // Sem sessao Appwrite ativa ainda.
      }
    }

    void bootstrapAppwriteSession();

    return () => {
      cancelled = true;
    };
  }, [appwriteEnabled, router]);

  async function entrar() {
    if (!email || !senha) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    try {
      setCarregando(true);
      const auth = appwriteEnabled
        ? await (async () => {
            await loginWithAppwriteEmailPassword(email, senha);
            const jwt = await createAppwriteJwt();
            return exchangeAppwriteJwt(jwt);
          })()
        : await loginUser(email, senha);
      setBackendToken(auth.accessToken);
      router.replace(toAppHref("/chat"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao entrar no Appwrite.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function handleSocialLogin(provider: OAuthProvider) {
    if (!appwriteEnabled) {
      toast.error("Configure o Appwrite para liberar login social.");
      return;
    }

    startAppwriteOAuthLogin(provider);
  }

  return (
    <AuthShell
      eyebrow="Entrar"
      title="Acesse sua caixa de conversas"
      description={
        appwriteEnabled
          ? "Email e senha passam pelo Appwrite e o backend local recebe um token sincronizado para abrir o chat no navegador, desktop e Android."
          : "Entre direto no app com fluxo de mensageria, sem depender de pagina publica para abrir conversa."
      }
      footer={
        <p>
          Ainda nao tem conta?{" "}
          <Link href={toAppHref("/cadastro")} className="font-semibold text-[#00a884] hover:underline">
            Criar agora
          </Link>
        </p>
      }
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-3 rounded-full bg-[#e7fef5] px-4 py-2 text-xs font-medium text-[#075e54] dark:bg-[#123229] dark:text-[#8ff3d1]">
          <Image
            src={withBasePath("/favicon.png")}
            alt="Sinal"
            width={20}
            height={20}
            className="rounded-full"
          />
          {appwriteEnabled ? "Appwrite ativo" : "Login seguro"}
        </div>
      </div>

      <div className="space-y-4">
        {appwriteEnabled ? (
          <div className="rounded-[1.4rem] border border-[#d8f4e8] bg-[#f2fff9] px-4 py-3 text-sm text-[#075e54] dark:border-[#21463a] dark:bg-[#10281f] dark:text-[#92f4d2]">
            Sessao sincronizada com Appwrite, MongoDB, Redis e cache local do app.
          </div>
        ) : null}

        <div className="rounded-[1.5rem] bg-[#f7f8fa] p-3 dark:bg-[#0b141a]">
          <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#667781] dark:text-white/45">
            <Mail className="h-3.5 w-3.5" />
            E-mail
          </label>
          <Input
            className="h-12 rounded-[1rem] border-0 bg-white text-[#111b21] placeholder:text-[#8696a0] dark:bg-[#202c33] dark:text-white"
            placeholder="seuemail@dominio.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="rounded-[1.5rem] bg-[#f7f8fa] p-3 dark:bg-[#0b141a]">
          <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#667781] dark:text-white/45">
            <Lock className="h-3.5 w-3.5" />
            Senha
          </label>
          <Input
            type="password"
            className="h-12 rounded-[1rem] border-0 bg-white text-[#111b21] placeholder:text-[#8696a0] dark:bg-[#202c33] dark:text-white"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        <Button
          onClick={() => void entrar()}
          disabled={carregando}
          className="h-12 w-full rounded-full bg-[#00a884] text-base font-semibold text-white hover:bg-[#019574]"
        >
          {carregando
            ? "Entrando..."
            : appwriteEnabled
              ? "Entrar com Appwrite"
              : "Entrar"}
        </Button>

        {appwriteEnabled && !embedded ? (
          <>
            <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-[0.25em] text-[#667781] dark:text-white/40">
              <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
              social
              <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full border-black/10"
                onClick={() => handleSocialLogin(OAuthProvider.Google)}
              >
                <Chrome className="h-4 w-4" />
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full border-black/10"
                onClick={() => handleSocialLogin(OAuthProvider.Github)}
              >
                <Github className="h-4 w-4" />
                GitHub
              </Button>
            </div>
          </>
        ) : null}

        {appwriteEnabled && embedded ? (
          <p className="text-center text-xs text-[#667781] dark:text-white/45">
            Login social fica melhor no navegador. No APK e no desktop nativo, use e-mail e senha.
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
