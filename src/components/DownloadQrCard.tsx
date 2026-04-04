import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Download } from "lucide-react";
import QRCode from "qrcode";

type DownloadQrCardProps = {
  title: string;
  description: string;
  href: string;
  hrefLabel: string;
  caption: string;
  icon: LucideIcon;
  eyebrow: string;
};

export default async function DownloadQrCard({
  title,
  description,
  href,
  hrefLabel,
  caption,
  icon: Icon,
  eyebrow,
}: DownloadQrCardProps) {
  const qrSvg = await QRCode.toString(href, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: {
      dark: "#082f26",
      light: "#0000",
    },
  });

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_80px_rgba(3,7,18,0.35)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-emerald-200/70">
            {eyebrow}
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{title}</h3>
        </div>
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-emerald-100">
          <Icon className="size-6" />
        </div>
      </div>

      <p className="max-w-sm text-sm leading-6 text-white/68">{description}</p>

      <div className="mt-6 rounded-[1.75rem] border border-white/8 bg-[linear-gradient(160deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] p-4">
        <div className="rounded-[1.35rem] bg-[radial-gradient(circle_at_top,#d1fae5,transparent_62%),linear-gradient(180deg,#f5fff9,#d8fff0)] p-4">
          <div
            className="mx-auto aspect-square w-full max-w-[220px] [&_path]:fill-[#082f26]"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>
        <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-white/45">
          {caption}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
        >
          <Download className="size-4" />
          {hrefLabel}
        </Link>
        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-5 py-3 text-sm text-white/76 transition group-hover:border-emerald-300/45 group-hover:text-white"
        >
          Abrir link
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
