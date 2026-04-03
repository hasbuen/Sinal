"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { loginUser, setBackendToken } from "@/lib/backend-client";
import { withBasePath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaginaLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (!email || !senha) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    try {
      setCarregando(true);
      const auth = await loginUser(email, senha);
      setBackendToken(auth.accessToken);
      router.replace("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao entrar no backend.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#0f766e22,transparent_30%),linear-gradient(180deg,#030712,#111827)] px-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-950/70 text-white shadow-2xl backdrop-blur">
        <CardHeader className="space-y-6">
          <Link
            href={withBasePath("/")}
            className="text-sm text-white/55 transition hover:text-white"
          >
            {"< Voltar para landing"}
          </Link>
          <CardTitle className="flex items-center justify-center gap-3 text-center text-3xl font-bold text-emerald-300">
            <Image
              src={withBasePath("/icons/icon-transparent.png")}
              alt="Sinal"
              width={44}
              height={44}
              className="rounded-2xl"
            />
            <span>Sinal</span>
          </CardTitle>
          <p className="text-center text-sm text-white/60">
            Login via backend NestJS com JWT e GraphQL.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            className="border-white/10 bg-black/40 text-white placeholder:text-white/35"
            placeholder="Digite seu e-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            className="border-white/10 bg-black/40 text-white placeholder:text-white/35"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Button
            onClick={() => void entrar()}
            disabled={carregando}
            className="w-full bg-emerald-400 font-bold text-slate-950 hover:bg-emerald-300"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-center text-sm text-white/55">
            Ainda nao tem conta?{" "}
            <Link
              href={withBasePath("/cadastro")}
              className="font-semibold text-emerald-300 hover:underline"
            >
              Criar agora
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
