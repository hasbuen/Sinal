"use client";

import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { avatarLabel } from "./chat-helpers";

export type ChatCallPhase = "idle" | "incoming" | "calling" | "connecting" | "active";
export type ChatCallMode = "audio" | "video";

export type ChatCallState = {
  phase: ChatCallPhase;
  mode: ChatCallMode;
  remoteLabel?: string | null;
  muted: boolean;
  cameraEnabled: boolean;
};

type Props = {
  state: ChatCallState;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  hasLocalStream: boolean;
  hasRemoteStream: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
};

export function ChatCallOverlay({
  state,
  localVideoRef,
  remoteVideoRef,
  hasLocalStream,
  hasRemoteStream,
  onAccept,
  onDecline,
  onToggleMute,
  onToggleCamera,
  onEnd,
}: Props) {
  if (state.phase === "idle") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,#19d7ff22,transparent_24%),linear-gradient(180deg,#020611ee,#040914f2)] px-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2.2rem] border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[22rem] bg-black/40">
            {hasRemoteStream && state.mode === "video" ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full min-h-[22rem] w-full object-cover"
              />
            ) : (
              <div className="flex min-h-[22rem] items-center justify-center bg-[radial-gradient(circle_at_top,#19d7ff22,transparent_35%),linear-gradient(180deg,#08111d,#050814)]">
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-3xl font-semibold text-cyan-200">
                    {avatarLabel(state.remoteLabel)}
                  </div>
                  <p className="mt-4 text-2xl font-semibold">
                    {state.remoteLabel || "Contato"}
                  </p>
                  <p className="mt-2 text-white/55">
                    {state.phase === "incoming"
                      ? "Chamada recebida"
                      : state.phase === "calling"
                        ? "Chamando..."
                        : state.phase === "connecting"
                          ? "Conectando..."
                          : "Chamada ativa"}
                  </p>
                </div>
              </div>
            )}

            {hasLocalStream ? (
              <div className="absolute bottom-4 right-4 w-40 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/60 shadow-xl">
                {state.mode === "video" ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="aspect-[4/5] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center">
                    <Mic className="h-10 w-10 text-cyan-200" />
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col justify-between p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
                Chamada {state.mode === "video" ? "de video" : "de voz"}
              </p>
              <h3 className="mt-3 text-3xl font-semibold">
                {state.remoteLabel || "Contato"}
              </h3>
              <p className="mt-3 text-white/55">
                {state.phase === "incoming"
                  ? "Aceite para iniciar a conversa. O outro lado ja enviou a oferta WebRTC."
                  : "Sinalizacao em tempo real, audio/video e controle de dispositivo na mesma tela."}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {state.phase === "incoming" ? (
                <>
                  <Button
                    onClick={onAccept}
                    className="rounded-full bg-emerald-400 px-6 text-slate-950 hover:bg-emerald-300"
                  >
                    <Phone className="h-4 w-4" />
                    Aceitar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onDecline}
                    className="rounded-full border border-rose-400/20 bg-rose-400/10 px-6 text-rose-100 hover:bg-rose-400/20"
                  >
                    <PhoneOff className="h-4 w-4" />
                    Recusar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={onToggleMute}
                    className="rounded-full border border-white/10 px-5 text-white hover:bg-white/10"
                  >
                    {state.muted ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    {state.muted ? "Ativar microfone" : "Silenciar"}
                  </Button>
                  {state.mode === "video" ? (
                    <Button
                      variant="ghost"
                      onClick={onToggleCamera}
                      className="rounded-full border border-white/10 px-5 text-white hover:bg-white/10"
                    >
                      {state.cameraEnabled ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <VideoOff className="h-4 w-4" />
                      )}
                      {state.cameraEnabled ? "Desativar camera" : "Ativar camera"}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={onEnd}
                    className="rounded-full border border-rose-400/20 bg-rose-400/10 px-6 text-rose-100 hover:bg-rose-400/20"
                  >
                    <PhoneOff className="h-4 w-4" />
                    Encerrar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
