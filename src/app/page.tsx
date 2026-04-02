import Link from "next/link";
import Image from "next/image";

const highlights = [
  "Chat em tempo real com Supabase",
  "Instalacao PWA e empacotamento Android",
  "Fluxo pronto para GitHub Pages e releases",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#103b32,transparent_38%),linear-gradient(135deg,#04070c_20%,#0b1220_55%,#071b17_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/icons/icon-transparent.png"
              alt="Sinal"
              width={44}
              height={44}
              priority
              className="rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.25)]"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">
                Sinal
              </p>
              <h1 className="text-lg font-semibold">Mensageria direta</h1>
            </div>
          </div>
          <nav className="hidden gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-full border border-white/10 px-5 py-2 text-sm text-white/80 transition hover:border-emerald-400/40 hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Criar conta
            </Link>
          </nav>
        </header>

        <section className="grid items-center gap-12 py-16 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
              Agora com export estatico, onboarding guiado e base para APK
            </span>
            <div className="space-y-5">
              <h2 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
                Um chat com cara de produto, pronto para web, GitHub Pages e Android.
              </h2>
              <p className="max-w-2xl text-lg text-white/70">
                Sinal ficou mais seguro, exportavel e preparado para distribuicao.
                A mesma base serve para a experiencia web, a landing publica e o pacote Android.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-100"
              >
                Abrir app
              </Link>
              <Link
                href="https://github.com/hasbuen/Sinal/releases/latest"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 font-semibold text-white/85 transition hover:border-emerald-400/40 hover:text-white"
              >
                Ver release
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/75 backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-emerald-400/15 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-300">Status do stack</p>
                  <h3 className="text-2xl font-semibold">Entrega pronta para publicar</h3>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs uppercase tracking-[0.25em] text-emerald-200">
                  v2
                </span>
              </div>

              <div className="space-y-4">
                {[
                  ["Seguranca", "Next 16.2.2 + React 19.2.4"],
                  ["Distribuicao", "export estatico + assets locais"],
                  ["Onboarding", "tutorial lazy com driver.js"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      {label}
                    </p>
                    <p className="mt-2 text-lg font-medium text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
