"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaginaCadastro() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const cadastrar = async () => {
    if (!email || !senha) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    setCarregando(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: senha,
    });
    setCarregando(false);

    if (signUpError) {
      toast.error(signUpError.message);
      return;
    }

    toast.success("Cadastro realizado. Verifique seu e-mail para confirmar a conta.");
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#164e6322,transparent_30%),linear-gradient(180deg,#020617,#0f172a)] px-4">
      <Card className="w-full max-w-md rounded-[2rem] border-white/10 bg-slate-950/75 text-white shadow-2xl backdrop-blur">
        <CardHeader className="space-y-6">
          <Link href="/" className="text-sm text-white/55 transition hover:text-white">
            ← Voltar para landing
          </Link>
          <CardTitle className="flex items-center justify-center gap-3 text-center text-3xl font-bold text-cyan-300">
            <Image
              src="/icons/icon-transparent.png"
              alt="Sinal"
              width={44}
              height={44}
              className="rounded-2xl"
            />
            <span>Criar conta</span>
          </CardTitle>
          <p className="text-center text-sm text-white/60">
            Configure seu acesso e entre no ecossistema Sinal.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
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
            onClick={cadastrar}
            disabled={carregando}
            className="w-full bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200"
          >
            {carregando ? "Criando conta..." : "Cadastrar"}
          </Button>
          <p className="text-center text-sm text-white/55">
            Ja tem acesso?{" "}
            <Link href="/login" className="font-semibold text-cyan-300 hover:underline">
              Fazer login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
