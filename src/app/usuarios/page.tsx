import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UsuariosPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#071019] px-4 text-white">
      <div className="max-w-lg rounded-[2rem] border border-white/10 bg-slate-950/75 p-8 text-center shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
          Usuarios
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Fluxo movido para o dashboard</h1>
        <p className="mt-3 text-white/55">
          A listagem de pessoas agora fica integrada ao chat para abrir conversas diretas
          e grupos sem depender do Supabase.
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex">
          <Button className="rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            Ir para o dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
