"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Check,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Save,
  Sparkles,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import {
  clearBackendToken,
  getCurrentUser,
  resolveBackendAssetUrl,
  updateProfile,
  uploadMedia,
  type BackendUser,
  type BackendUserSettings,
} from "@/lib/backend-client";
import { logoutAppwrite } from "@/lib/appwrite-client";
import {
  accentToneClasses,
  defaultUserSettings,
  normalizeUserSettings,
  resolveThemeMode,
  storeUserSettings,
  wallpaperClass,
} from "@/lib/user-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toAppHref } from "@/lib/runtime";

const themeOptions = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
] as const;

const accentOptions = [
  { value: "ocean", label: "Oceano", accent: "#14b8a6" },
  { value: "ember", label: "Solar", accent: "#f97316" },
  { value: "forest", label: "Floresta", accent: "#22c55e" },
] as const;

const wallpaperOptions = [
  { value: "aurora", label: "Aurora" },
  { value: "graphite", label: "Grafite" },
  { value: "sand", label: "Areia" },
  { value: "none", label: "Sem fundo" },
] as const;

const behaviorCards = [
  {
    key: "compactMode",
    title: "Modo compacto",
    description: "Aproxima as mensagens para caber mais conversa na tela.",
    icon: Sparkles,
  },
  {
    key: "enterToSend",
    title: "Enter para enviar",
    description: "Envia com Enter e usa Shift+Enter para quebra de linha.",
    icon: Save,
  },
  {
    key: "messagePreview",
    title: "Previa das mensagens",
    description: "Mostra o resumo da ultima mensagem nas listas.",
    icon: Bell,
  },
  {
    key: "desktopNotifications",
    title: "Notificacoes locais",
    description: "Ativa alertas locais quando o aparelho suportar notificacoes.",
    icon: Bell,
  },
] as const satisfies Array<{
  key: keyof BackendUserSettings;
  title: string;
  description: string;
  icon: typeof Bell;
}>;

export default function ConfiguracoesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<BackendUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [settings, setSettings] = useState<BackendUserSettings>(defaultUserSettings);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const me = await getCurrentUser();
        const normalized = normalizeUserSettings(me.settings);
        setUser(me);
        setDisplayName(me.displayName);
        setBio(me.bio || "");
        setAvatarUrl(me.avatarUrl || "");
        setSettings(normalized);
        storeUserSettings(normalized);
      } catch {
        clearBackendToken();
        router.replace(toAppHref("/login"));
      }
    }

    void load();
  }, [router]);

  async function handleUpload(file: File) {
    try {
      setUploadingAvatar(true);
      const uploaded = await uploadMedia(file);
      setAvatarUrl(resolveBackendAssetUrl(uploaded.url));
      toast.success("Foto atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar a foto.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile() {
    try {
      setSavingProfile(true);
      const updated = await updateProfile({
        displayName,
        bio,
        avatarUrl: avatarUrl || undefined,
      });
      setUser(updated);
      toast.success("Perfil salvo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveSettings() {
    try {
      setSavingSettings(true);
      const normalized = normalizeUserSettings(settings);
      setSettings(normalized);
      setUser((current) => (current ? { ...current, settings: normalized } : current));
      storeUserSettings(normalized);
      toast.success("Preferencias salvas neste aparelho.");
    } finally {
      setSavingSettings(false);
    }
  }

  const previewDarkMode = resolveThemeMode(settings.theme);
  const accent = accentToneClasses(settings.accentTone);

  return (
    <div
      className={`min-h-dvh overflow-x-hidden ${previewDarkMode ? "dark" : ""} bg-[linear-gradient(180deg,#edf5f7,#e7edef)] text-[#102027] dark:bg-[linear-gradient(180deg,#07131b,#0c1822)] dark:text-white`}
      style={
        {
          "--sinal-accent": accent.accent,
          "--sinal-accent-soft": accent.accentSoft,
          "--sinal-accent-strong": accent.accentStrong,
        } as CSSProperties
      }
    >
      <header className="border-b border-black/5 bg-[linear-gradient(135deg,var(--sinal-accent),#102027)] text-white shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-sm text-white/72">Configuracoes</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-4xl">
              Perfil, visual e comportamento
            </h1>
          </div>
          <Button
            variant="ghost"
            className="shrink-0 rounded-full border border-white/20 text-white hover:bg-white/10"
            onClick={() =>
              void (async () => {
                await logoutAppwrite().catch(() => undefined);
                clearBackendToken();
                router.replace(toAppHref("/login"));
              })()
            }
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
            <div className={`px-6 py-8 ${wallpaperClass(settings.wallpaper)}`}>
              <div className="flex flex-col items-center text-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || "Perfil"}
                    className="h-32 w-32 rounded-full object-cover ring-4 ring-[color:var(--sinal-accent)]/20"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[color:var(--sinal-accent-soft)] text-4xl font-semibold text-[color:var(--sinal-accent-strong)]">
                    {(displayName || user?.displayName || "S").slice(0, 1).toUpperCase()}
                  </div>
                )}

                <Button
                  variant="ghost"
                  className="mt-4 rounded-full border border-black/10 bg-white/75 hover:bg-white dark:border-white/10 dark:bg-black/20 dark:hover:bg-black/30"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  Trocar foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleUpload(file);
                    }
                  }}
                />

                <p className="mt-5 text-2xl font-semibold">
                  {displayName || user?.displayName || "Carregando..."}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
                  {user?.email || ""}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--sinal-accent)]">
                Perfil
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-white/55">
                Ajuste como seu nome, sua foto e sua bio aparecem no aplicativo.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Nome</p>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Como voce quer aparecer"
                  className="border-black/10 bg-[#f6fafb] dark:border-white/10 dark:bg-[#0a131b]"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Bio</p>
                <Textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Escreva um recado curto sobre voce"
                  className="min-h-28 border-black/10 bg-[#f6fafb] dark:border-white/10 dark:bg-[#0a131b]"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => void handleSaveProfile()}
                  disabled={savingProfile || uploadingAvatar}
                  className="rounded-full text-white hover:opacity-90"
                  style={{ backgroundColor: "var(--sinal-accent)" }}
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar perfil
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full border border-black/10 dark:border-white/10"
                  onClick={() => router.push(toAppHref("/chat"))}
                >
                  Voltar para conversas
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--sinal-accent)]">
              Aparencia
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-white/55">
              Defina tema, cor principal e fundo da conversa.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-medium">Tema</p>
                <div className="flex flex-wrap gap-2">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const active = settings.theme === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSettings((current) => ({ ...current, theme: option.value }))}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? "border-transparent text-white"
                            : "border-black/10 bg-[#f6fafb] text-slate-600 hover:bg-[#eef7f8] dark:border-white/10 dark:bg-[#0a131b] dark:text-white/75 dark:hover:bg-[#12202b]"
                        }`}
                        style={active ? { backgroundColor: "var(--sinal-accent)" } : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Cor principal</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {accentOptions.map((option) => {
                    const active = settings.accentTone === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setSettings((current) => ({ ...current, accentTone: option.value }))
                        }
                        className={`rounded-[1.3rem] border px-4 py-4 text-left transition ${
                          active
                            ? "border-transparent ring-2 ring-offset-2 ring-offset-transparent"
                            : "border-black/10 bg-[#f6fafb] hover:bg-[#eef7f8] dark:border-white/10 dark:bg-[#0a131b] dark:hover:bg-[#12202b]"
                        }`}
                        style={active ? { boxShadow: `0 0 0 2px ${option.accent}33` } : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.label}</span>
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: option.accent }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Fundo da conversa</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {wallpaperOptions.map((option) => {
                    const active = settings.wallpaper === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setSettings((current) => ({ ...current, wallpaper: option.value }))
                        }
                        className={`overflow-hidden rounded-[1.4rem] border text-left transition ${
                          active
                            ? "border-transparent ring-2 ring-[color:var(--sinal-accent)]"
                            : "border-black/10 dark:border-white/10"
                        }`}
                      >
                        <div className={`h-20 ${wallpaperClass(option.value)}`} />
                        <div className="flex items-center justify-between bg-white px-4 py-3 dark:bg-[#0a131b]">
                          <span className="font-medium">{option.label}</span>
                          {active ? (
                            <Check className="h-4 w-4 text-[color:var(--sinal-accent)]" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-black/5 bg-[#f7fbfc] p-4 shadow-inner dark:border-white/8 dark:bg-[#0a131b]">
              <p className="mb-4 text-sm font-medium">Preview</p>
              <div
                className={`overflow-hidden rounded-[1.6rem] border border-black/5 dark:border-white/8 ${wallpaperClass(settings.wallpaper)}`}
              >
                <div className="border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/8 dark:bg-black/20">
                  <p className="font-medium">Conversa</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Visual da area principal do chat.
                  </p>
                </div>
                <div className={`space-y-3 px-4 py-4 ${settings.compactMode ? "text-sm" : ""}`}>
                  <div className="mr-8 rounded-[1.3rem] bg-white px-4 py-3 shadow-sm dark:bg-[#13212b]">
                    O visual fica mais limpo e direto.
                  </div>
                  <div
                    className="ml-8 rounded-[1.3rem] px-4 py-3 text-white shadow-sm"
                    style={{ backgroundColor: "var(--sinal-accent)" }}
                  >
                    As mudancas aparecem aqui antes de salvar.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--sinal-accent)]">
              Comportamento do app
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-white/55">
              Ajustes simples para deixar o uso mais confortavel neste aparelho.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {behaviorCards.map((item) => {
              const Icon = item.icon;
              const checked = Boolean(settings[item.key]);

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      [item.key]: !current[item.key],
                    }))
                  }
                  className="flex w-full items-start justify-between gap-4 rounded-[1.5rem] border border-black/8 bg-[#f6fafb] px-4 py-4 text-left transition hover:bg-[#eef7f8] dark:border-white/10 dark:bg-[#0a131b] dark:hover:bg-[#12202b]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[color:var(--sinal-accent)]" />
                      <p className="font-medium">{item.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
                      {item.description}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 inline-flex h-6 w-11 rounded-full p-1 transition ${
                      checked ? "bg-[color:var(--sinal-accent)]" : "bg-black/12 dark:bg-white/15"
                    }`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full bg-white shadow transition ${
                        checked ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => void handleSaveSettings()}
              disabled={savingSettings}
              className="rounded-full text-white hover:opacity-90"
              style={{ backgroundColor: "var(--sinal-accent)" }}
            >
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar preferencias
            </Button>
            <Button
              variant="ghost"
              className="rounded-full border border-black/10 dark:border-white/10"
              onClick={() => {
                setSettings(defaultUserSettings);
                storeUserSettings(defaultUserSettings);
                toast.success("Padrao restaurado neste aparelho.");
              }}
            >
              Restaurar padrao
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

