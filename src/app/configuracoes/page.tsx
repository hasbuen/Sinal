"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  Database,
  HelpCircle,
  ImageIcon,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Save,
  Settings2,
  Share2,
  Sun,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import {
  clearBackendToken,
  getCurrentUser,
  resolveBackendAssetUrl,
  updateProfile,
  updateUserSettings,
  uploadMedia,
  type BackendUser,
  type BackendUserSettings,
} from "@/lib/backend-client";
import { isAppwriteEnabled, logoutAppwrite } from "@/lib/appwrite-client";
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

const settingSections = [
  {
    icon: Lock,
    title: "Conta",
    description: "Perfil, privacidade e acesso entre web, desktop e Android.",
  },
  {
    icon: Settings2,
    title: "Experiencia",
    description: "Tema, densidade visual e comportamento do chat.",
  },
  {
    icon: Bell,
    title: "Notificacoes",
    description: "Sons, preview e alertas locais para novas mensagens.",
  },
  {
    icon: Database,
    title: "Midia e dados",
    description: "Cache, download automatico e controle de rede.",
  },
  {
    icon: Share2,
    title: "Distribuicao",
    description: "Mesmo layout em todas as superficies, com links de acesso rapido.",
  },
  {
    icon: HelpCircle,
    title: "Ajuda",
    description: "Google login, Appwrite, release e suporte operacional.",
  },
] as const;

const themeOptions = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
] as const;

const accentOptions = [
  { value: "ocean", label: "Ocean", accent: "#14b8a6" },
  { value: "ember", label: "Ember", accent: "#f97316" },
  { value: "forest", label: "Forest", accent: "#22c55e" },
] as const;

const wallpaperOptions = [
  { value: "aurora", label: "Aurora" },
  { value: "graphite", label: "Graphite" },
  { value: "sand", label: "Sand" },
  { value: "none", label: "Nenhum" },
] as const;

const shareLinks = [
  { label: "Web", href: toAppHref("/login") },
  { label: "Desktop", href: "https://github.com/hasbuen/Sinal/releases/latest/download/Sinal-Setup.exe" },
  { label: "Android APK", href: "https://github.com/hasbuen/Sinal/releases/latest/download/sinal-android.apk" },
] as const;

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
  const appwriteEnabled = isAppwriteEnabled();

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
      toast.success("Imagem enviada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar imagem.");
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
      toast.success("Perfil atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveSettings() {
    const previous = user?.settings ? normalizeUserSettings(user.settings) : defaultUserSettings;

    try {
      setSavingSettings(true);
      const updatedSettings = await updateUserSettings(settings);
      const normalized = normalizeUserSettings(updatedSettings);
      setSettings(normalized);
      setUser((current) => (current ? { ...current, settings: normalized } : current));
      storeUserSettings(normalized);
      toast.success("Preferencias salvas.");
    } catch (error) {
      setSettings(previous);
      storeUserSettings(previous);
      toast.error(error instanceof Error ? error.message : "Falha ao salvar preferencias.");
    } finally {
      setSavingSettings(false);
    }
  }

  const previewDarkMode = resolveThemeMode(settings.theme);
  const accent = accentToneClasses(settings.accentTone);

  return (
    <div
      className={`min-h-screen ${previewDarkMode ? "dark" : ""} bg-[linear-gradient(180deg,#eef5f7,#e8ecef)] text-[#102027] dark:bg-[linear-gradient(180deg,#07131b,#0b1822)] dark:text-white`}
      style={
        {
          "--sinal-accent": accent.accent,
          "--sinal-accent-soft": accent.accentSoft,
          "--sinal-accent-strong": accent.accentStrong,
        } as CSSProperties
      }
    >
      <div className="border-b border-black/5 bg-[linear-gradient(135deg,var(--sinal-accent),#0f172a)] px-4 py-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/72">Configuracoes</p>
            <h1 className="text-2xl font-semibold">Conta, visual e experiencia do produto</h1>
          </div>
          <Button
            variant="ghost"
            className="rounded-full border border-white/20 text-white hover:bg-white/10"
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
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
          <div className={`px-6 py-6 ${wallpaperClass(settings.wallpaper)}`}>
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
                className="mt-4 rounded-full border border-black/10 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-black/20 dark:hover:bg-black/30"
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

              <p className="mt-4 text-xl font-semibold">
                {displayName || user?.displayName || "Carregando..."}
              </p>
              <p className="text-sm text-slate-500 dark:text-white/55">@{user?.username || "..."}</p>
              <p className="text-sm text-slate-500 dark:text-white/55">{user?.email || "..."}</p>

              <div className="mt-6 w-full rounded-[1.5rem] border border-white/50 bg-white/75 px-4 py-3 text-left text-sm shadow-sm backdrop-blur dark:border-white/8 dark:bg-black/20">
                <p className="font-medium">Produto unificado</p>
                <p className="mt-1 text-slate-600 dark:text-white/60">
                  A interface web, desktop e APK agora compartilha a mesma base visual e as mesmas
                  preferencias persistidas.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1 p-3">
            {settingSections.map((section) => {
              const Icon = section.icon;

              return (
                <div
                  key={section.title}
                  className="flex items-center gap-4 rounded-[1.4rem] px-4 py-4 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--sinal-accent-soft)] text-[color:var(--sinal-accent-strong)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{section.title}</p>
                    <p className="text-sm text-slate-500 dark:text-white/55">{section.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-white/40" />
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--sinal-accent)]">
                  Perfil
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
                  Ajuste sua identidade exibida em todas as superficies.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Nome exibido</p>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Nome exibido"
                  className="border-black/10 bg-[#f6fafb] dark:border-white/10 dark:bg-[#0a131b]"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Bio</p>
                <Textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Status, recado ou descricao curta"
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
                <Button asChild variant="ghost" className="rounded-full border border-black/10 dark:border-white/10">
                  <Link href={toAppHref("/chat")}>Voltar ao chat</Link>
                </Button>
                {appwriteEnabled ? (
                  <Button asChild variant="ghost" className="rounded-full border border-black/10 dark:border-white/10">
                    <Link href={toAppHref("/admin")}>Painel Appwrite</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--sinal-accent)]">
                  Aparencia
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
                  Tema, cor de destaque e papel de parede para diferenciar o app da referencia
                  original e manter a identidade propria do Sinal.
                </p>
              </div>
              <div className="rounded-full border border-black/10 px-3 py-1 text-xs text-slate-500 dark:border-white/10 dark:text-white/55">
                Preview ativo
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
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
                  <p className="mb-3 text-sm font-medium">Cor de destaque</p>
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
                          style={active ? { borderColor: option.accent, boxShadow: `0 0 0 2px ${option.accent}33` } : undefined}
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
                  <p className="mb-3 text-sm font-medium">Papel de parede</p>
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
                            {active ? <Check className="h-4 w-4 text-[color:var(--sinal-accent)]" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-black/5 bg-[#f7fbfc] p-4 shadow-inner dark:border-white/8 dark:bg-[#0a131b]">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4 text-[color:var(--sinal-accent)]" />
                  Pre-visualizacao
                </div>

                <div className={`overflow-hidden rounded-[1.6rem] border border-black/5 dark:border-white/8 ${wallpaperClass(settings.wallpaper)}`}>
                  <div className="border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/8 dark:bg-black/20">
                    <p className="font-medium">Sinal Design Preview</p>
                    <p className="text-xs text-slate-500 dark:text-white/50">
                      Web, desktop e APK compartilham esta mesma linguagem.
                    </p>
                  </div>
                  <div className={`space-y-3 px-4 py-4 ${settings.compactMode ? "text-sm" : ""}`}>
                    <div className="mr-8 rounded-[1.3rem] bg-white px-4 py-3 shadow-sm dark:bg-[#13212b]">
                      Interface com identidade propria e foco em velocidade.
                    </div>
                    <div
                      className="ml-8 rounded-[1.3rem] px-4 py-3 text-white shadow-sm"
                      style={{ backgroundColor: "var(--sinal-accent)" }}
                    >
                      Preferencias persistidas no backend e no cliente.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--sinal-accent)]">
                Comportamento do app
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
                Funcoes agora operacionais e persistidas na conta do usuario.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ToggleCard
                title="Modo compacto"
                description="Diminui espacos do chat para caber mais mensagens por tela."
                checked={settings.compactMode}
                onToggle={() =>
                  setSettings((current) => ({ ...current, compactMode: !current.compactMode }))
                }
              />
              <ToggleCard
                title="Enter para enviar"
                description="Usa Enter para envio imediato e Shift+Enter para quebra de linha."
                checked={settings.enterToSend}
                onToggle={() =>
                  setSettings((current) => ({ ...current, enterToSend: !current.enterToSend }))
                }
              />
              <ToggleCard
                title="Download automatico"
                description="Baixa midias automaticamente nas conversas recentes."
                checked={settings.autoDownloadMedia}
                onToggle={() =>
                  setSettings((current) => ({
                    ...current,
                    autoDownloadMedia: !current.autoDownloadMedia,
                  }))
                }
              />
              <ToggleCard
                title="Confirmacao de leitura"
                description="Mostra recibos de leitura quando o backend entregar o evento."
                checked={settings.readReceipts}
                onToggle={() =>
                  setSettings((current) => ({ ...current, readReceipts: !current.readReceipts }))
                }
              />
              <ToggleCard
                title="Sons do aplicativo"
                description="Ativa audio local de alertas e eventos da interface."
                checked={settings.soundEnabled}
                icon={<Volume2 className="h-4 w-4" />}
                onToggle={() =>
                  setSettings((current) => ({ ...current, soundEnabled: !current.soundEnabled }))
                }
              />
              <ToggleCard
                title="Preview de mensagem"
                description="Exibe resumo da ultima mensagem na sidebar e nas notificacoes."
                checked={settings.messagePreview}
                onToggle={() =>
                  setSettings((current) => ({ ...current, messagePreview: !current.messagePreview }))
                }
              />
            </div>

            <div className="mt-4">
              <ToggleCard
                title="Notificacoes locais"
                description="Mantem alertas locais ativos em web, desktop e Android quando suportado."
                checked={settings.desktopNotifications}
                icon={<Bell className="h-4 w-4" />}
                onToggle={() =>
                  setSettings((current) => ({
                    ...current,
                    desktopNotifications: !current.desktopNotifications,
                  }))
                }
              />
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
                  const restored = normalizeUserSettings(user?.settings);
                  setSettings(restored);
                  storeUserSettings(restored);
                }}
              >
                Restaurar valores salvos
              </Button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--sinal-accent)]">
                Distribuicao
              </p>
              <div className="mt-4 space-y-3">
                {shareLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between rounded-[1.3rem] border border-black/8 bg-[#f6fafb] px-4 py-3 transition hover:bg-[#edf8fa] dark:border-white/10 dark:bg-[#0a131b] dark:hover:bg-[#12202b]"
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-slate-500 dark:text-white/55">{item.href}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 dark:text-white/40" />
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1a22]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--sinal-accent)]">
                Google e Appwrite
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-white/62">
                <p>
                  O login com Google depende de configuracao correta no Google Cloud, Appwrite e
                  plataformas autorizadas do app.
                </p>
                <p>
                  A implementacao do frontend ja esta pronta para web, desktop e Android quando o
                  provedor OAuth estiver liberado.
                </p>
                <a
                  href="https://appwrite.io/docs/products/auth/oauth2"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 font-medium text-[color:var(--sinal-accent)] transition hover:bg-[color:var(--sinal-accent-soft)] dark:border-white/10"
                >
                  Abrir guia OAuth do Appwrite
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onToggle,
  icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start justify-between gap-4 rounded-[1.5rem] border border-black/8 bg-[#f6fafb] px-4 py-4 text-left transition hover:bg-[#eef7f8] dark:border-white/10 dark:bg-[#0a131b] dark:hover:bg-[#12202b]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <p className="font-medium">{title}</p>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-white/55">{description}</p>
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
}
