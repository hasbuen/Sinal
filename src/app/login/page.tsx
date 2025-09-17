"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';

export default function PaginaLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const entrar = async () => {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (loginError) {
      toast.error("Erro ao fazer login: " + loginError.message);
    } else {
      window.location.href = "/dashboard"; 
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md bg-black/70 border border-purple-500 shadow-[0_0_15px_3px_rgba(168,85,247,0.7)] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center font-bold text-purple-400">
            🔑 Entrar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            className="bg-black/60 border-purple-500 focus:border-green-400 text-white"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            className="bg-black/60 border-purple-500 focus:border-green-400 text-white"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Button
            onClick={entrar}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold shadow-[0_0_15px_3px_rgba(34,197,94,0.7)]"
          >
            Entrar
          </Button>
          <p className="text-sm text-gray-400 text-center">
            Não tem uma conta?{" "}
            <a
              href="/cadastro"
              className="text-pink-400 hover:underline font-semibold"
            >
              Cadastre-se já
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
