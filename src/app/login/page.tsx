"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Chrome, Lock, Mail } from "lucide-react";
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
  isAppwriteGoogleOAuthEnabled,
  loginWithAppwriteEmailPassword,
  OAuthProvider,
  startAppwriteOAuthLogin,
} from "@/lib/appwrite-client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withBasePath } from "@/lib/utils";
import { toAppHref } from "@/lib/runtime";

export default function PaginaLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const appwriteEnabled = isAppwriteEnabled();
  const googleOAuthEnabled = isAppwriteGoogleOAuthEnabled();

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
      toast.error(error instanceof Error ? error.message : "Erro ao entrar.");
    } finally {
      setCarregando(false);
    }
  }

  function handleSocialLogin(provider: OAuthProvider) {
    if (!appwriteEnabled) {
      toast.error("Login social indisponivel agora.");
      return;
    }

    if (provider === OAuthProvider.Google && !googleOAuthEnabled) {
      toast.error("Login com Google indisponivel agora.");
      return;
    }

    startAppwriteOAuthLogin(provider);
  }

  return (
    <AuthShell
      eyebrow="Entrar"
      title="Acesse sua caixa de conversas"
      description="Entre com sua conta e volte direto para suas conversas."
      footer={
        <p>
          Ainda nao tem conta?{" "}
          <Link href={toAppHref("/cadastro")} className="font-semibold text-[#14b8a6] hover:underline">
            Criar agora
          </Link>
        </p>
      }
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-3 rounded-full bg-[#e6fffb] px-4 py-2 text-xs font-medium text-[#0f766e] dark:bg-[#123229] dark:text-[#8ff3d1]">
          <Image
            src={withBasePath("/favicon.png")}
            alt="Sinal"
            width={20}
            height={20}
            className="rounded-full"
          />
          Conta segura
        </div>
      </div>

      <div className="space-y-4">
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
          className="h-12 w-full rounded-full bg-[#14b8a6] text-base font-semibold text-white hover:bg-[#0f9f91]"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </Button>

        {appwriteEnabled && googleOAuthEnabled ? (
          <>
            <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-[0.25em] text-[#667781] dark:text-white/40">
              <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
              Google
              <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            </div>

            <div className="grid gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full border-black/10"
                onClick={() => handleSocialLogin(OAuthProvider.Google)}
              >
                <Chrome className="h-4 w-4" />
                Continuar com Google
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </AuthShell>
  );
}
