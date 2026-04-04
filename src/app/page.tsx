import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Globe,
  HeartHandshake,
  Laptop2,
  MessageCircleMore,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import DownloadQrCard from "@/components/DownloadQrCard";
import AppPlatformRedirect from "@/components/AppPlatformRedirect";
import { withBasePath } from "@/lib/utils";
import packageMeta from "../../package.json";

const browserRoute = "/login/";
const registerRoute = "/cadastro/";
const browserPath = withBasePath(browserRoute);
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://hasbuen.github.io/Sinal")
  .replace(/\/+$/, "");
const browserAppUrl = new URL(browserPath, `${siteUrl}/`).toString();
const latestReleaseUrl = "https://github.com/hasbuen/Sinal/releases/latest";
const desktopDownloadUrl = `${latestReleaseUrl}/download/Sinal-Setup.exe`;
const androidDownloadUrl = `${latestReleaseUrl}/download/sinal-android.apk`;

const highlights = [
  {
    title: "Abre no ponto certo",
    text: "Cada superficie entra direto em login ou chat. Nada de cair na landing dentro do app.",
    icon: Zap,
  },
  {
    title: "Visual limpo e rapido",
    text: "Conversa, anexos, reacoes e chamadas em uma interface mais simples de entender.",
    icon: MessageCircleMore,
  },
  {
    title: "Entrega nativa",
    text: "Instalador Windows e APK Android saem da release publica e continuam sincronizados.",
    icon: Download,
  },
  {
    title: "Privacidade por padrao",
    text: "Mensagens efemeras, acesso seguro e fluxo continuo entre navegador, desktop e Android.",
    icon: ShieldCheck,
  },
];

const distributionOptions = [
  {
    eyebrow: "Navegador",
    title: "Entrar pelo navegador",
    description:
      "A superficie web publica abre direto no fluxo do produto, com entrada imediata no chat.",
    href: browserAppUrl,
    hrefLabel: "Abrir web",
    caption: "Escaneie para entrar no app web",
    icon: Globe,
  },
  {
    eyebrow: "Windows",
    title: "Desktop nativo",
    description:
      "Baixe o instalador Windows e entre no chat sem passar por nenhuma tela intermediaria.",
    href: desktopDownloadUrl,
    hrefLabel: "Baixar desktop",
    caption: "Escaneie para baixar o instalador",
    icon: Laptop2,
  },
  {
    eyebrow: "Android",
    title: "APK nativo",
    description:
      "Baixe o APK direto da release publica e continue a conversa no Android.",
    href: androidDownloadUrl,
    hrefLabel: "Baixar APK",
    caption: "Escaneie para baixar no Android",
    icon: Smartphone,
  },
];

const stats = [
  { label: "Login direto", value: "1 toque" },
  { label: "Superficies", value: "3" },
  { label: "Release atual", value: `v${packageMeta.version}` },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_22%),linear-gradient(160deg,#04131d_12%,#07131f_46%,#031018_100%)] text-white">
      <AppPlatformRedirect />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:78px_78px] opacity-20" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={withBasePath("/icons/icon-transparent.png")}
              alt="Sinal"
              width={48}
              height={48}
              priority
              className="rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.35)]"
            />
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.38em] text-emerald-200/70">
                Sinal {packageMeta.version}
              </p>
              <h1 className="text-lg font-semibold">
                Mensageria pronta para navegar, instalar e usar
              </h1>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={browserRoute}
              className="rounded-full border border-white/12 px-4 py-2 text-white/78 transition hover:border-emerald-300/40 hover:text-white"
            >
              Navegador
            </Link>
            <Link
              href={desktopDownloadUrl}
              className="rounded-full border border-white/12 px-4 py-2 text-white/78 transition hover:border-emerald-300/40 hover:text-white"
            >
              Desktop
            </Link>
            <Link
              href={androidDownloadUrl}
              className="rounded-full bg-emerald-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-200"
            >
              Android APK
            </Link>
          </nav>
        </header>

        <section className="grid gap-12 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100">
              <Sparkles className="size-4" />
              Release unica com navegador, desktop e Android
            </div>

            <div className="space-y-5">
              <h2 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">
                Uma entrada clara para conversar sem tropeco.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-white/68">
                Abra no navegador para entrar na hora, baixe no desktop para continuar
                a conversa no Windows ou instale o APK direto no Android. Tudo aponta
                para o fluxo real do produto.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={browserRoute}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-100"
              >
                Abrir no navegador
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href={registerRoute}
                className="inline-flex items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 px-6 py-3 font-semibold text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-300/15"
              >
                Criar conta
              </Link>
              <Link
                href={latestReleaseUrl}
                className="inline-flex items-center justify-center rounded-full border border-white/12 px-6 py-3 font-semibold text-white/82 transition hover:border-emerald-300/40 hover:text-white"
              >
                Ver release publica
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {item.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {highlights.map(({ title, text, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
                >
                  <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/6 p-3 text-emerald-200">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2.8rem] bg-emerald-400/12 blur-3xl" />
            <div className="relative space-y-5">
              <div className="overflow-hidden rounded-[2.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/90" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300/90" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/90" />
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
                    Chat pronto
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[2rem] border border-white/10 bg-[#08131d]/80 p-4">
                    <div className="flex items-center gap-3 rounded-[1.4rem] bg-emerald-300/10 px-4 py-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-300/20 font-semibold text-emerald-100">
                        J
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">Julio</p>
                        <p className="truncate text-sm text-emerald-100/70">digitando...</p>
                      </div>
                      <QrCode className="size-4 text-emerald-100/70" />
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="mr-12 rounded-[1.6rem] bg-white/95 px-4 py-3 text-sm text-slate-900">
                        Bora fechar a release nova hoje?
                      </div>
                      <div className="ml-12 rounded-[1.6rem] bg-[#DCF8C6] px-4 py-3 text-sm text-slate-900 shadow-sm">
                        Sim. Ja deixei web, desktop e Android apontando para o chat.
                      </div>
                      <div className="mr-16 rounded-[1.6rem] bg-white/95 px-4 py-3 text-sm text-slate-900">
                        Manda o QR do APK e segue.
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-[1.6rem] bg-white/6 px-4 py-3 text-sm text-white/70">
                      <HeartHandshake className="size-4 text-emerald-200" />
                      Interface pensada para abrir e usar rapido.
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
                      <p className="text-xs uppercase tracking-[0.32em] text-white/42">
                        Release atual
                      </p>
                      <h3 className="mt-2 text-3xl font-semibold text-white">
                        v{packageMeta.version}
                      </h3>
                      <div className="mt-5 space-y-3">
                        {[
                          ["Web", browserAppUrl],
                          ["Desktop", desktopDownloadUrl],
                          ["Android", androidDownloadUrl],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-3"
                          >
                            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/42">
                              {label}
                            </p>
                            <p className="mt-2 break-all font-mono text-xs text-emerald-100/90">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-emerald-300/15 bg-emerald-300/10 p-5 text-emerald-50">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="size-4" />
                        Escolha sua superficie
                      </div>
                      <p className="mt-3 text-sm leading-6 text-emerald-50/80">
                        Navegador para acesso imediato, instalador Windows para desktop
                        nativo e APK para instalar no Android sem depender da landing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: Globe,
                    label: "Web agora",
                    text: "Entre no navegador sem instalar nada.",
                  },
                  {
                    icon: Laptop2,
                    label: "Desktop",
                    text: "Instale e abra direto no login.",
                  },
                  {
                    icon: Smartphone,
                    label: "Android",
                    text: "Baixe o APK e continue no celular.",
                  },
                ].map(({ icon: Icon, label, text }) => (
                  <div
                    key={label}
                    className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
                  >
                    <div className="inline-flex rounded-2xl bg-white/8 p-3 text-emerald-200">
                      <Icon className="size-5" />
                    </div>
                    <p className="mt-4 font-semibold text-white">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-emerald-100/60">
                Escolha sua entrada
              </p>
              <h3 className="mt-2 text-3xl font-semibold">Baixe, aponte e entre.</h3>
            </div>
            <Link
              href={latestReleaseUrl}
              className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-emerald-300/35 hover:text-white"
            >
              Abrir pagina da release
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {distributionOptions.map((option) => (
              <DownloadQrCard key={option.title} {...option} />
            ))}
          </div>
        </section>

        <section className="pb-16">
          <div className="rounded-[2.4rem] border border-white/10 bg-white/[0.04] px-6 py-7 backdrop-blur lg:flex lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/60">
                Pronto para usar
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-white">
                Crie sua conta e continue a conversa na plataforma que fizer sentido.
              </h3>
              <p className="mt-3 text-base leading-7 text-white/64">
                O fluxo foi simplificado para o usuario final: abrir, entrar e conversar.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <Link
                href={registerRoute}
                className="inline-flex items-center justify-center rounded-full bg-emerald-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Criar conta
              </Link>
              <Link
                href={browserRoute}
                className="inline-flex items-center justify-center rounded-full border border-white/12 px-6 py-3 font-semibold text-white/82 transition hover:border-emerald-300/40 hover:text-white"
              >
                Entrar no navegador
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
