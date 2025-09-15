"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaginaCadastro() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const cadastrar = async () => {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (signUpError) {
      alert(signUpError.message);
      return;
    }

    alert("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
    window.location.href = "/login"; // redireciona pro login
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md bg-black/70 border border-pink-500 shadow-[0_0_15px_3px_rgba(236,72,153,0.7)] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center font-bold text-pink-400">
            📝 Cadastrar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            className="bg-black/60 border-pink-500 focus:border-purple-400 text-white"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            className="bg-black/60 border-pink-500 focus:border-purple-400 text-white"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <Button
            onClick={cadastrar}
            className="w-full bg-pink-500 hover:bg-pink-400 text-black font-bold shadow-[0_0_15px_3px_rgba(236,72,153,0.7)]"
          >
            Cadastrar
          </Button>
          <p className="text-sm text-gray-400 text-center">
            Já tem conta?{" "}
            <a
              href="/login"
              className="text-purple-400 hover:underline font-semibold"
            >
              Faça login
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
