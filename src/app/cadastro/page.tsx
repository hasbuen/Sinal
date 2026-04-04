"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  exchangeAppwriteJwt,
  getBackendToken,
  registerUser,
  setBackendToken,
} from "@/lib/backend-client";
import {
  createAppwriteJwt,
  getAppwriteCurrentUser,
  isAppwriteEnabled,
  registerWithAppwriteEmailPassword,
} from "@/lib/appwrite-client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withBasePath } from "@/lib/utils";
import { toAppHref } from "@/lib/runtime";

export default function PaginaCadastro() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const appwriteEnabled = isAppwriteEnabled();

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
        // Sem sessao Appwrite ativa.
      }
    }

    void bootstrapAppwriteSession();

    return () => {
      cancelled = true;
    };
  }, [appwriteEnabled, router]);

  async function cadastrar() {
    if (!displayName || !email || !senha || (!appwriteEnabled && !username)) {
      toast.error(
        appwriteEnabled
          ? "Preencha nome, e-mail e senha."
          : "Preencha nome, usuario, e-mail e senha.",
      );
      return;
    }

    try {
      setCarregando(true);
      const auth = appwriteEnabled
        ? await (async () => {
            await registerWithAppwriteEmailPassword({
              name: displayName,
              email,
              password: senha,
            });
            const jwt = await createAppwriteJwt();
            return exchangeAppwriteJwt(jwt);
          })()
        : await registerUser({
            displayName,
            username,
            email,
            password: senha,
          });
      setBackendToken(auth.accessToken);
      toast.success(
        appwriteEnabled ? "Conta criada no Appwrite." : "Conta criada no MongoDB.",
      );
      router.replace(toAppHref("/chat"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao cadastrar.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Cadastro"
      title="Crie sua conta e entre no chat"
      description={
        appwriteEnabled
          ? "O cadastro passa pelo Appwrite e a conta local e sincronizada automaticamente para abrir o chat, o painel admin e os espelhos em MongoDB."
          : "O cadastro abre a experiencia real do produto com foco em conversa, sem retorno para portal publico."
      }
      footer={
        <p>
          Ja tem acesso?{" "}
          <Link href={toAppHref("/login")} className="font-semibold text-[#00a884] hover:underline">
            Fazer login
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
          {appwriteEnabled ? "Appwrite + chat" : "Nova conta"}
        </div>
      </div>

      <div className="space-y-4">
        {appwriteEnabled ? (
          <div className="rounded-[1.4rem] border border-[#d8f4e8] bg-[#f2fff9] px-4 py-3 text-sm text-[#075e54] dark:border-[#21463a] dark:bg-[#10281f] dark:text-[#92f4d2]">
            A conta nasce no Appwrite; o backend espelha usuario no MongoDB e libera o token do chat.
          </div>
        ) : null}

        <div className="rounded-[1.5rem] bg-[#f7f8fa] p-3 dark:bg-[#0b141a]">
          <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#667781] dark:text-white/45">
            <UserRound className="h-3.5 w-3.5" />
            Nome exibido
          </label>
          <Input
            className="h-12 rounded-[1rem] border-0 bg-white text-[#111b21] placeholder:text-[#8696a0] dark:bg-[#202c33] dark:text-white"
            placeholder="Nome exibido"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {!appwriteEnabled ? (
          <div className="rounded-[1.5rem] bg-[#f7f8fa] p-3 dark:bg-[#0b141a]">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#667781] dark:text-white/45">
              @ Usuario
            </label>
            <Input
              className="h-12 rounded-[1rem] border-0 bg-white text-[#111b21] placeholder:text-[#8696a0] dark:bg-[#202c33] dark:text-white"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
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
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        <Button
          onClick={() => void cadastrar()}
          disabled={carregando}
          className="h-12 w-full rounded-full bg-[#00a884] text-base font-semibold text-white hover:bg-[#019574]"
        >
          {carregando
            ? "Criando conta..."
            : appwriteEnabled
              ? "Cadastrar no Appwrite"
              : "Cadastrar"}
        </Button>
      </div>
    </AuthShell>
  );
}
