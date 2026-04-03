"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import { clearBackendToken, getCurrentUser, resolveBackendAssetUrl, updateProfile, uploadMedia, type BackendUser } from "@/lib/backend-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<BackendUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const me = await getCurrentUser();
        setUser(me);
        setDisplayName(me.displayName);
        setBio(me.bio || "");
        setAvatarUrl(me.avatarUrl || "");
      } catch {
        clearBackendToken();
        router.replace("/login");
      }
    }

    void load();
  }, [router]);

  async function handleUpload(file: File) {
    try {
      setPending(true);
      const uploaded = await uploadMedia(file);
      const nextAvatarUrl = resolveBackendAssetUrl(uploaded.url);
      setAvatarUrl(nextAvatarUrl);
      toast.success("Imagem enviada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar imagem.");
    } finally {
      setPending(false);
    }
  }

  async function handleSave() {
    try {
      setPending(true);
      const updated = await updateProfile({
        displayName,
        bio,
        avatarUrl: avatarUrl || undefined,
      });
      setUser(updated);
      toast.success("Perfil atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar perfil.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#14b8a61a,transparent_28%),linear-gradient(180deg,#030712,#0f172a)] px-4 text-white">
      <Card className="w-full max-w-3xl border-white/10 bg-slate-950/80 text-white shadow-2xl">
        <CardHeader className="border-b border-white/10">
          <CardTitle>Perfil e privacidade</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[300px_1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col items-center text-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName || "Perfil"} className="h-32 w-32 rounded-full object-cover ring-4 ring-cyan-300/20" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-cyan-300/15 text-4xl font-semibold text-cyan-200">
                  {(displayName || user?.displayName || "S").slice(0, 1).toUpperCase()}
                </div>
              )}
              <Button onClick={() => fileInputRef.current?.click()} variant="ghost" className="mt-4 rounded-full border border-white/10 text-white hover:bg-white/5">
                <Camera className="h-4 w-4" />
                Trocar foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              <p className="mt-4 text-lg font-semibold">{displayName || user?.displayName || "Carregando..."}</p>
              <p className="text-sm text-white/55">@{user?.username || "..."}</p>
              <p className="mt-1 text-sm text-white/45">{user?.email || "..."}</p>
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-300/70">Identidade</p>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nome exibido" className="border-white/10 bg-black/30 text-white" />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-300/70">Bio</p>
              <Textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Uma frase curta sobre voce" className="min-h-28 border-white/10 bg-black/30 text-white" />
            </div>
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/8 px-4 py-3 text-sm text-white/70">
              Sua foto de perfil e bio aparecem no chat, na busca de usuarios e nas conversas diretas.
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => void handleSave()} disabled={pending} className="flex-1 rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar perfil
              </Button>
              <Button asChild variant="ghost" className="flex-1 rounded-full border border-white/10 text-white hover:bg-white/5">
                <Link href="/dashboard">Voltar ao chat</Link>
              </Button>
              <Button variant="ghost" className="flex-1 rounded-full border border-white/10 text-white hover:bg-white/5" onClick={() => { clearBackendToken(); router.replace("/login"); }}>
                <LogOut className="h-4 w-4" />
                Encerrar sessao
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
