"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Camera,
  ChevronRight,
  Database,
  HelpCircle,
  Loader2,
  Lock,
  LogOut,
  MessageCircleMore,
  Save,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import {
  clearBackendToken,
  getCurrentUser,
  resolveBackendAssetUrl,
  updateProfile,
  uploadMedia,
  type BackendUser,
} from "@/lib/backend-client";
import { isAppwriteEnabled, logoutAppwrite } from "@/lib/appwrite-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toAppHref } from "@/lib/runtime";

const settingsSections = [
  {
    icon: Lock,
    title: "Conta",
    description: "Privacidade, segurança, e-mail e controles da conta.",
  },
  {
    icon: MessageCircleMore,
    title: "Conversas",
    description: "Tema, papel de parede, backup e comportamento do chat.",
  },
  {
    icon: Bell,
    title: "Notificações",
    description: "Sons, alertas, vibração e prévias.",
  },
  {
    icon: Database,
    title: "Armazenamento e dados",
    description: "Uso de rede, cache, mídia e economia de dados.",
  },
  {
    icon: HelpCircle,
    title: "Ajuda",
    description: "FAQ, suporte, termos e detalhes da versão.",
  },
  {
    icon: Share2,
    title: "Convidar amigos",
    description: "Compartilhe link de acesso web, desktop e Android.",
  },
] as const;

export default function ConfiguracoesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<BackendUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pending, setPending] = useState(false);
  const appwriteEnabled = isAppwriteEnabled();

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
        router.replace(toAppHref("/login"));
      }
    }

    void load();
  }, [router]);

  async function handleUpload(file: File) {
    try {
      setPending(true);
      const uploaded = await uploadMedia(file);
      setAvatarUrl(resolveBackendAssetUrl(uploaded.url));
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
    <div className="min-h-screen bg-[#ECE5DD] text-[#111B21] dark:bg-[#0b141a] dark:text-white">
      <div className="bg-[#075E54] px-4 py-5 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-sm text-white/75">Configurações</p>
            <h1 className="text-2xl font-semibold">Conta e preferências</h1>
          </div>
          <Button
            variant="ghost"
            className="rounded-full border border-white/20 text-white hover:bg-white/10"
            onClick={() =>
              void (async () => {
                await logoutAppwrite();
                clearBackendToken();
                router.replace(toAppHref("/login"));
              })()
            }
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[340px_1fr]">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-[#202c33]">
          <div className="flex flex-col items-center text-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || "Perfil"}
                className="h-32 w-32 rounded-full object-cover ring-4 ring-[#25D366]/25"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#d9fdd3] text-4xl font-semibold text-[#075E54] dark:bg-[#223239] dark:text-[#7fe7bc]">
                {(displayName || user?.displayName || "S").slice(0, 1).toUpperCase()}
              </div>
            )}

            <Button
              variant="ghost"
              className="mt-4 rounded-full border border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
              onClick={() => fileInputRef.current?.click()}
            >
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

            <p className="mt-4 text-xl font-semibold">
              {displayName || user?.displayName || "Carregando..."}
            </p>
            <p className="text-sm text-[#667781] dark:text-white/55">
              @{user?.username || "..."}
            </p>
            <p className="text-sm text-[#667781] dark:text-white/55">
              {user?.email || "..."}
            </p>

            <div className="mt-6 w-full rounded-[1.5rem] bg-[#f7fff8] px-4 py-3 text-left text-sm text-[#075E54] dark:bg-[#111B21] dark:text-[#7fe7bc]">
              Mensagens não podem ser marcadas como permanentes. Toda mensagem expira em até 1 hora.
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-[#202c33]">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#075E54] dark:text-[#7fe7bc]">
              Perfil
            </p>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Nome exibido</p>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Nome exibido"
                  className="border-black/10 bg-[#f8f5f1] dark:border-white/10 dark:bg-[#111B21]"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Bio</p>
                <Textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Recado, status ou descrição curta"
                  className="min-h-28 border-black/10 bg-[#f8f5f1] dark:border-white/10 dark:bg-[#111B21]"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => void handleSave()}
                  disabled={pending}
                  className="rounded-full bg-[#25D366] text-[#111B21] hover:bg-[#1fbe5c]"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar perfil
                </Button>
                <Button asChild variant="ghost" className="rounded-full border border-black/10 dark:border-white/10">
                  <Link href={toAppHref("/dashboard")}>Voltar ao chat</Link>
                </Button>
                {appwriteEnabled ? (
                  <Button asChild variant="ghost" className="rounded-full border border-black/10 dark:border-white/10">
                    <Link href={toAppHref("/admin")}>
                      <BadgeCheck className="h-4 w-4" />
                      Painel Appwrite
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-3 shadow-sm dark:bg-[#202c33]">
            {settingsSections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.title}
                  type="button"
                  className="flex w-full items-center gap-4 rounded-[1.4rem] px-4 py-4 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9fdd3] text-[#075E54] dark:bg-[#223239] dark:text-[#7fe7bc]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{section.title}</p>
                    <p className="text-sm text-[#667781] dark:text-white/55">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#667781] dark:text-white/45" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
