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
      <Card className="w-full max-w-md bg-transparent border-none">
        <CardHeader>
          <CardTitle className="text-3xl text-center font-bold text-blue-400 flex items-center justify-center space-x-2">
          
            <img
              src="/icons/icon-transparent.png"
              className="w-10 h-10"
            />
            <span>Sinal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            className="bg-black/60 text-white !border-0 !ring-0 !ring-offset-0 focus:!ring-0"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            className="bg-black/60 text-white !border-0 !ring-0 !ring-offset-0 focus:!ring-0"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Button
            onClick={entrar}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold"
          >
            Entrar
          </Button>
          <p className="text-sm text-gray-400 text-center">
            Não tem uma conta?{" "}
            <a
              href="/cadastro"
              className="text-blue-400 hover:underline font-semibold"
            >
              Cadastre-se já
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
