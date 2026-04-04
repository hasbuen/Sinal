import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  LockKeyhole,
  Globe,
  Laptop2,
  ServerCog,
  Smartphone,
  Sparkles,
  TimerReset,
} from "lucide-react";
import DownloadQrCard from "@/components/DownloadQrCard";
import AppPlatformRedirect from "@/components/AppPlatformRedirect";
import { withBasePath } from "@/lib/utils";
import packageMeta from "../../package.json";

const browserRoute = "/login/";
const registerRoute = "/cadastro/";
const browserPath = withBasePath(browserRoute);
const registerPath = withBasePath(registerRoute);
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://hasbuen.github.io/Sinal")
  .replace(/\/+$/, "");
const browserAppUrl = new URL(browserPath, `${siteUrl}/`).toString();
const latestReleaseUrl = "https://github.com/hasbuen/Sinal/releases/latest";
const desktopDownloadUrl = `${latestReleaseUrl}/download/Sinal-Setup.exe`;
const androidDownloadUrl = `${latestReleaseUrl}/download/sinal-android.apk`;

const highlights = [
  {
    title: "Appwrite na entrada",
    text: "Cadastro, login social e sessao principal agora passam por Appwrite antes de abrir o chat.",
    icon: LockKeyhole,
  },
  {
    title: "Infra em camadas",
    text: "MongoDB, Redis e SQLite continuam ativos para espelho, presenca, fila curta e cache local.",
    icon: ServerCog,
  },
  {
    title: "APK e desktop de verdade",
    text: "As superficies nativas entram no fluxo do produto e caem direto em login ou chat, nao na landing.",
    icon: Blocks,
  },
  {
    title: "Expiracao real",
    text: "As mensagens desaparecem depois de 1 hora por padrao, sem lotar a conversa para sempre.",
    icon: TimerReset,
  },
];

const distributionOptions = [
  {
    eyebrow: "Navegador",
    title: "Entrar pelo navegador",
    description:
      "A superficie web publica abre direto no fluxo do produto com Appwrite e entrada no chat.",
    href: browserAppUrl,
    hrefLabel: "Abrir web",
    caption: "Escaneie para entrar no app web",
    icon: Globe,
  },
  {
    eyebrow: "Windows",
    title: "Desktop nativo",
    description:
      "Baixe o instalador Windows e entre no chat sem passar pela landing dentro do app.",
    href: desktopDownloadUrl,
    hrefLabel: "Baixar desktop",
    caption: "Escaneie para baixar o instalador",
    icon: Laptop2,
  },
  {
    eyebrow: "Android",
    title: "APK nativo",
    description:
      "Baixe o APK direto da release publica e abra o fluxo nativo de login/chat no Android.",
    href: androidDownloadUrl,
    hrefLabel: "Baixar APK",
    caption: "Escaneie para baixar no Android",
    icon: Smartphone,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.23),transparent_28%),radial-gradient(circle_at_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(145deg,#020617_12%,#07111f_48%,#041814_100%)] text-white">
      <AppPlatformRedirect />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:84px_84px] opacity-20" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-4 rounded-full border border-white/10 bg-white/[0.035] px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
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
              <h1 className="text-lg font-semibold">Mensageria pronta para navegador, desktop e Android</h1>
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

        <section className="grid gap-14 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100">
              <Sparkles className="size-4" />
              Landing publica alinhada com Appwrite, chat e binarios nativos
            </div>

            <div className="space-y-5">
              <h2 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
                Entre no app certo, pela superficie certa.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-white/68">
                O Sinal agora apresenta o produto como produto: autenticacao com
                Appwrite, chat em tempo real e entrada direta por navegador,
                instalador Windows e APK Android. A landing continua publica, mas
                desktop e APK abrem o fluxo real de login e conversa.
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
            <div className="absolute inset-0 rounded-[2.5rem] bg-emerald-400/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/45">
                    Release atual
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold text-white">
                    v{packageMeta.version}
                  </h3>
                </div>
                <Link
                  href={latestReleaseUrl}
                  className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/14"
                >
                  GitHub Releases
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  ["Web publica", browserAppUrl],
                  ["Cadastro web", new URL(registerPath, `${siteUrl}/`).toString()],
                  ["Instalador Windows", desktopDownloadUrl],
                  ["APK Android", androidDownloadUrl],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1.6rem] border border-white/8 bg-slate-950/45 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-white/42">
                      {label}
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-emerald-100/90">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.8rem] border border-emerald-300/15 bg-emerald-300/8 p-4 text-sm text-emerald-50/90">
                Appwrite faz a autenticacao e a superficie publica. MongoDB, Redis e SQLite
                continuam segurando espelho operacional, presenca e cache local do produto.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 pb-16 md:grid-cols-3">
          {distributionOptions.map((option) => (
            <DownloadQrCard key={option.title} {...option} />
          ))}
        </section>
      </div>
    </main>
  );
}
