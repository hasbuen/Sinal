"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { registerUser, setBackendToken } from "@/lib/backend-client";
import { withBasePath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaginaCadastro() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar() {
    if (!displayName || !username || !email || !senha) {
      toast.error("Preencha nome, usuario, e-mail e senha.");
      return;
    }

    try {
      setCarregando(true);
      const auth = await registerUser({
        displayName,
        username,
        email,
        password: senha,
      });
      setBackendToken(auth.accessToken);
      toast.success("Conta criada no MongoDB.");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao cadastrar.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#164e6322,transparent_30%),linear-gradient(180deg,#020617,#0f172a)] px-4">
      <Card className="w-full max-w-md rounded-[2rem] border-white/10 bg-slate-950/75 text-white shadow-2xl backdrop-blur">
        <CardHeader className="space-y-6">
          <Link
            href="/"
            className="text-sm text-white/55 transition hover:text-white"
          >
            {"< Voltar para landing"}
          </Link>
          <CardTitle className="flex items-center justify-center gap-3 text-center text-3xl font-bold text-cyan-300">
            <Image
              src={withBasePath("/icons/icon-transparent.png")}
              alt="Sinal"
              width={44}
              height={44}
              className="rounded-2xl"
            />
            <span>Criar conta</span>
          </CardTitle>
          <p className="text-center text-sm text-white/60">
            Cadastro direto no backend NestJS com Prisma e MongoDB.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            className="border-white/10 bg-black/40 text-white placeholder:text-white/35"
            placeholder="Nome exibido"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            className="border-white/10 bg-black/40 text-white placeholder:text-white/35"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            className="border-white/10 bg-black/40 text-white placeholder:text-white/35"
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            className="border-white/10 bg-black/40 text-white placeholder:text-white/35"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Button
            onClick={() => void cadastrar()}
            disabled={carregando}
            className="w-full bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200"
          >
            {carregando ? "Criando conta..." : "Cadastrar"}
          </Button>
          <p className="text-center text-sm text-white/55">
            Ja tem acesso?{" "}
            <Link
              href="/login"
              className="font-semibold text-cyan-300 hover:underline"
            >
              Fazer login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
