"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Laptop2, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CURRENT_APP_VERSION } from "@/lib/app-version";
import {
  compareVersions,
  fetchLatestReleaseInfo,
  type LatestReleaseInfo,
} from "@/lib/releases";
import { isEmbeddedAppBrowser } from "@/lib/runtime";

type DesktopUpdateState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "available"; info?: unknown }
  | { phase: "downloading"; progressLabel?: string }
  | { phase: "downloaded"; info?: unknown }
  | { phase: "error"; message: string };

function formatProgress(detail: unknown) {
  if (!detail || typeof detail !== "object") {
    return "Baixando atualizacao...";
  }

  const percent = "percent" in detail ? Number(detail.percent) : Number.NaN;
  if (Number.isFinite(percent)) {
    return `Baixando atualizacao... ${Math.round(percent)}%`;
  }

  return "Baixando atualizacao...";
}

export default function AppUpdateBanner() {
  const pathname = usePathname();
  const [latestRelease, setLatestRelease] = useState<LatestReleaseInfo | null>(null);
  const [desktopState, setDesktopState] = useState<DesktopUpdateState>({ phase: "idle" });
  const [surface, setSurface] = useState<"browser" | "android" | "desktop">("browser");

  const hideOnLanding = pathname === "/";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.sinalDesktop) {
      setSurface("desktop");
      return;
    }

    if (isEmbeddedAppBrowser()) {
      setSurface("android");
      return;
    }

    setSurface("browser");
  }, []);

  useEffect(() => {
    if (hideOnLanding) {
      return;
    }

    let cancelled = false;
    let desktopCleanup: (() => void) | undefined;

    async function bootstrap() {
      try {
        const release = await fetchLatestReleaseInfo();
        if (!cancelled) {
          setLatestRelease(release);
        }
      } catch {
        // Non-blocking check.
      }

      if (!window.sinalDesktop) {
        return;
      }

      desktopCleanup = window.sinalDesktop.onUpdaterEvent((payload) => {
        if (cancelled) return;

        if (payload.type === "checking") {
          setDesktopState({ phase: "checking" });
          return;
        }

        if (payload.type === "available") {
          setDesktopState({ phase: "available", info: payload.detail });
          return;
        }

        if (payload.type === "downloading") {
          setDesktopState({
            phase: "downloading",
            progressLabel: formatProgress(payload.detail),
          });
          return;
        }

        if (payload.type === "downloaded") {
          setDesktopState({ phase: "downloaded", info: payload.detail });
          return;
        }

        if (payload.type === "error") {
          setDesktopState({
            phase: "error",
            message:
              typeof payload.detail === "string"
                ? payload.detail
                : "Falha ao atualizar o desktop.",
          });
          return;
        }

        setDesktopState({ phase: "idle" });
      });

      void window.sinalDesktop.checkForUpdates().catch(() => undefined);
    }

    void bootstrap();

    return () => {
      cancelled = true;
      desktopCleanup?.();
    };
  }, [hideOnLanding]);

  if (hideOnLanding) {
    return null;
  }

  if (surface === "desktop") {
    if (desktopState.phase === "idle") {
      return null;
    }

    return (
      <aside className="fixed bottom-4 right-4 z-[90] w-[min(28rem,calc(100vw-2rem))] rounded-[1.6rem] border border-white/10 bg-[#0f1720]/96 p-4 text-white shadow-[0_22px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#00a884]/14 p-3 text-[#7fe7bc]">
            <Laptop2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Atualizacao desktop</p>
            <h3 className="mt-1 text-base font-semibold">
              {desktopState.phase === "checking" && "Verificando nova versao"}
              {desktopState.phase === "available" && "Nova versao encontrada"}
              {desktopState.phase === "downloading" && "Atualizacao em andamento"}
              {desktopState.phase === "downloaded" && "Atualizacao pronta para instalar"}
              {desktopState.phase === "error" && "Falha no auto-update"}
            </h3>
            <p className="mt-2 text-sm text-white/65">
              {desktopState.phase === "checking" && "O aplicativo esta consultando a release mais recente."}
              {desktopState.phase === "available" && "A nova release ja foi encontrada e o download comecou em segundo plano."}
              {desktopState.phase === "downloading" && desktopState.progressLabel}
              {desktopState.phase === "downloaded" && "Feche e reinstale agora para aplicar a nova versao do desktop."}
              {desktopState.phase === "error" && desktopState.message}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {desktopState.phase !== "downloaded" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/12 bg-transparent text-white hover:bg-white/5"
                  onClick={() => void window.sinalDesktop?.checkForUpdates()}
                >
                  <RefreshCw className="h-4 w-4" />
                  Verificar agora
                </Button>
              ) : null}
              {desktopState.phase === "downloaded" ? (
                <Button
                  type="button"
                  className="rounded-full bg-[#25D366] text-[#111B21] hover:bg-[#1fbe5c]"
                  onClick={() => void window.sinalDesktop?.installUpdate()}
                >
                  <Download className="h-4 w-4" />
                  Instalar update
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  if (!latestRelease || compareVersions(CURRENT_APP_VERSION, latestRelease.version) >= 0) {
    return null;
  }

  const actionLabel = surface === "android" ? "Baixar APK" : "Atualizar agora";
  const actionHref = surface === "android" ? latestRelease.androidUrl : undefined;

  return (
    <aside className="fixed bottom-4 right-4 z-[90] w-[min(28rem,calc(100vw-2rem))] rounded-[1.6rem] border border-white/10 bg-[#0f1720]/96 p-4 text-white shadow-[0_22px_80px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#00a884]/14 p-3 text-[#7fe7bc]">
          {surface === "android" ? (
            <Smartphone className="h-5 w-5" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">
            {surface === "android" ? "Atualizacao Android" : "Atualizacao web"}
          </p>
          <h3 className="mt-1 text-base font-semibold">
            Nova versao {latestRelease.tagName} disponivel
          </h3>
          <p className="mt-2 text-sm text-white/65">
            {surface === "android"
              ? "Uma release nova saiu. Baixe o APK mais recente para instalar a versao atualizada do app."
              : "Uma release nova ja foi publicada. Recarregue a aplicacao para entrar na versao mais recente."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {surface === "android" ? (
              <Button
                type="button"
                className="rounded-full bg-[#25D366] text-[#111B21] hover:bg-[#1fbe5c]"
                onClick={() => {
                  if (actionHref) {
                    window.open(actionHref, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <Download className="h-4 w-4" />
                {actionLabel}
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-full bg-[#25D366] text-[#111B21] hover:bg-[#1fbe5c]"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" />
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
