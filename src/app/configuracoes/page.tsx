"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearBackendToken, getCurrentUser, type BackendUser } from "@/lib/backend-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [user, setUser] = useState<BackendUser | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const me = await getCurrentUser();
        setUser(me);
      } catch {
        clearBackendToken();
        router.replace("/login");
      }
    }

    void load();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#030712,#0f172a)] px-4 text-white">
      <Card className="w-full max-w-xl border-white/10 bg-slate-950/75 text-white shadow-2xl">
        <CardHeader>
          <CardTitle>Perfil e ambiente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/50">Conta autenticada</p>
            <p className="mt-2 text-xl font-semibold">{user?.displayName || "Carregando..."}</p>
            <p className="text-sm text-white/60">@{user?.username || "..."}</p>
            <p className="text-sm text-white/60">{user?.email || "..."}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
            Esta tela foi simplificada para a migracao. O perfil principal ja usa JWT no frontend e backend NestJS no Railway.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="flex-1 rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"
            >
              <Link href="/dashboard">Voltar ao chat</Link>
            </Button>
            <Button
              variant="ghost"
              className="flex-1 rounded-full border border-white/10 text-white hover:bg-white/5"
              onClick={() => {
                clearBackendToken();
                router.replace("/login");
              }}
            >
              Encerrar sessao
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
