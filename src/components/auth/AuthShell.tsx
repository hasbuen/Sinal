"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { LockKeyhole, MessageCircleMore, ShieldCheck, Smartphone } from "lucide-react";
import { withBasePath } from "@/lib/utils";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

const highlights = [
  {
    icon: MessageCircleMore,
    title: "Chats e grupos",
    text: "Lista de conversas, respostas, reacoes, edicao e envio de midia.",
  },
  {
    icon: LockKeyhole,
    title: "Entrada rapida",
    text: "Acesse o fluxo real do produto com login direto, sem desvio para portal publico.",
  },
  {
    icon: ShieldCheck,
    title: "Mensagens efemeras",
    text: "Cada mensagem expira em ate 1 hora com remocao automatica.",
  },
  {
    icon: Smartphone,
    title: "Experiencia multi-plataforma",
    text: "Layout movel e desktop alinhado com app de mensageria.",
  },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#d9dbd5] text-[#111b21] dark:bg-[#0b141a] dark:text-white">
      <div className="h-40 bg-[#00a884] md:h-52" />
      <div className="-mt-28 px-4 pb-10 md:-mt-36">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-[#f0f2f5] shadow-[0_22px_80px_rgba(17,27,33,0.22)] dark:bg-[#111b21] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden bg-[linear-gradient(180deg,#0b141a_0%,#111b21_100%)] p-10 text-white lg:flex lg:flex-col">
            <div className="flex items-center gap-4">
              <div className="rounded-[1.4rem] bg-[#00a884]/16 p-3 shadow-[0_0_40px_rgba(0,168,132,0.22)]">
                <Image
                  src={withBasePath("/icons/icon-transparent.png")}
                  alt="Sinal"
                  width={52}
                  height={52}
                  className="rounded-2xl"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-[#7ad9c3]">{eyebrow}</p>
                <h1 className="mt-2 text-4xl font-semibold leading-tight">{title}</h1>
              </div>
            </div>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/68">{description}</p>

            <div className="mt-10 grid gap-4">
              {highlights.map(({ icon: Icon, title: itemTitle, text }) => (
                <div
                  key={itemTitle}
                  className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5 backdrop-blur"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-[#00a884]/14 p-3 text-[#89f0d6]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{itemTitle}</p>
                      <p className="mt-1 text-sm leading-6 text-white/65">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-[calc(100vh-10rem)] flex-col justify-center bg-[#efeae2] p-5 dark:bg-[#0f1720] md:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-6 rounded-[1.8rem] border border-black/5 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-[#111b21]/90 lg:hidden">
                <div className="flex items-center gap-3">
                  <Image
                    src={withBasePath("/icons/icon-transparent.png")}
                    alt="Sinal"
                    width={42}
                    height={42}
                    className="rounded-2xl"
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[#00a884]">{eyebrow}</p>
                    <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#667781] dark:text-white/62">
                  {description}
                </p>
              </div>

              <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_16px_50px_rgba(17,27,33,0.12)] dark:border-white/8 dark:bg-[#111b21] md:p-8">
                {children}
                <div className="mt-6 border-t border-black/5 pt-5 text-center text-sm text-[#667781] dark:border-white/8 dark:text-white/58">
                  {footer}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
