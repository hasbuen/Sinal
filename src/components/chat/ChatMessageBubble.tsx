"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Forward,
  Pencil,
  Reply,
  Trash2,
} from "lucide-react";
import type { BackendConversation, BackendMessage } from "@/lib/backend-client";
import { resolveBackendAssetUrl } from "@/lib/backend-client";
import {
  hourFormatter,
  messagePreview,
  quickReactions,
  receiptState,
  timeUntilExpiry,
} from "./chat-helpers";

type Props = {
  message: BackendMessage;
  currentUserId: string;
  conversation: BackendConversation;
  clock: number;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onReply: (message: BackendMessage) => void;
  onCopy: (message: BackendMessage) => void;
  onForward: (message: BackendMessage) => void;
  onEdit: (message: BackendMessage) => void;
  onDelete: (messageId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
};

export function ChatMessageBubble({
  message,
  currentUserId,
  conversation,
  clock,
  menuOpen,
  onToggleMenu,
  onReply,
  onCopy,
  onForward,
  onEdit,
  onDelete,
  onReaction,
}: Props) {
  const longPressRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [reactionRailOpen, setReactionRailOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(false);
  const mine = message.sender.id === currentUserId;
  const deleted = Boolean(message.deletedAt);
  const status = mine ? receiptState(message, conversation, currentUserId) : "sent";
  const expiryLabel = timeUntilExpiry(message, clock);
  const contextVisible = hovered || menuOpen || reactionRailOpen;
  const mobilePreview =
    message.text ||
    message.emoji ||
    message.linkTitle ||
    message.linkUrl ||
    message.attachments[0]?.fileName ||
    messagePreview(message);

  useEffect(() => {
    if (!menuOpen) {
      setReactionRailOpen(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobileViewport(media.matches);
    apply();
    media.addEventListener("change", apply);

    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!menuOpen || !mobileViewport) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen, mobileViewport]);

  function clearLongPress() {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  function handlePointerDown(pointerType?: string) {
    if (pointerType && pointerType !== "touch") {
      return;
    }

    clearLongPress();
    longPressRef.current = window.setTimeout(() => {
      setReactionRailOpen(true);
      if (!menuOpen) {
        onToggleMenu();
      }
    }, 380);
  }

  function closeMenuIfOpen() {
    if (menuOpen) {
      onToggleMenu();
    }
  }

  return (
    <div
      className={`group/message flex w-full overflow-x-hidden ${mine ? "justify-end" : "justify-start"} animate-in fade-in-0`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setReactionRailOpen(false);
      }}
    >
      <div
        className={`relative w-full max-w-[min(calc(100vw-1rem),32rem)] px-2 pt-3 sm:w-fit sm:max-w-[78%] sm:px-2 sm:pt-6 ${
          mine ? "items-end" : "items-start"
        }`}
        onContextMenu={(event) => {
          event.preventDefault();
          setReactionRailOpen(true);
          if (!menuOpen) {
            onToggleMenu();
          }
        }}
        onPointerDown={(event) => handlePointerDown(event.pointerType)}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
      >
        {!deleted && contextVisible && !mobileViewport ? (
          <div
            className={`pointer-events-auto absolute top-0 z-20 flex -translate-y-1/2 items-center gap-1 rounded-full border border-black/5 bg-white px-2 py-1 shadow-lg transition dark:border-white/10 dark:bg-[#233138] ${
              mine ? "right-3" : "left-3"
            }`}
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReaction(message.id, emoji);
                  setReactionRailOpen(false);
                  closeMenuIfOpen();
                }}
                className="rounded-full px-2 py-1 text-base transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        <div
          className={`relative max-w-full overflow-hidden rounded-[1.2rem] px-3 py-2 shadow-sm transition-all ${
            mine
              ? "bg-[#DCF8C6] text-[#111B21] dark:bg-[#144d37] dark:text-white"
              : "bg-white text-[#111B21] dark:bg-[#202c33] dark:text-white"
          }`}
        >
          {!mine ? (
            <p className="pr-10 text-[11px] font-semibold text-[#075E54] dark:text-[#7fe7bc]">
              {message.sender.displayName}
            </p>
          ) : null}

          {!deleted && (
            <button
              type="button"
              onClick={() => {
                setReactionRailOpen((current) => !current);
                onToggleMenu();
              }}
              className={`absolute top-2 rounded-full border border-black/5 bg-white/80 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#667781] shadow-sm transition ${
                mine ? "left-2" : "right-2"
              } ${
                contextVisible || mobileViewport
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              } dark:border-white/10 dark:bg-[#2a3942] dark:text-white/65`}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}

          {message.forwardedFrom ? (
            <div className="mt-1 rounded-2xl bg-black/5 px-3 py-2 text-xs text-black/70 dark:bg-white/5 dark:text-white/70">
              Encaminhada de {message.forwardedFrom.sender.displayName}
            </div>
          ) : null}

          {message.replyTo ? (
            <button
              type="button"
              onClick={() => onReply(message.replyTo!)}
              className="mt-1 w-full rounded-2xl border-l-4 border-[#25D366] bg-black/5 px-3 py-2 text-left text-xs text-black/70 transition hover:bg-black/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
            >
              <p className="font-semibold text-[#075E54] dark:text-[#7fe7bc]">
                {message.replyTo.sender.displayName}
              </p>
              <p className="mt-1 truncate">
                {message.replyTo.text ||
                  message.replyTo.emoji ||
                  message.replyTo.linkUrl ||
                  messagePreview(message.replyTo)}
              </p>
            </button>
          ) : null}

          {deleted ? (
            <p className="mt-1 text-sm italic text-black/55 dark:text-white/55">
              {message.text || "Mensagem apagada"}
            </p>
          ) : (
            <>
              {message.kind === "LINK" && message.linkUrl ? (
                <a
                  href={message.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all rounded-2xl bg-black/5 px-3 py-3 text-sm font-medium text-[#075E54] dark:bg-white/5 dark:text-[#7fe7bc]"
                >
                  {message.linkTitle || message.linkUrl}
                </a>
              ) : null}

              {message.kind === "EMOJI" && message.emoji ? (
                <p className="mt-1 text-4xl leading-none">{message.emoji}</p>
              ) : null}

              {message.text ? (
                <p className="mt-1 whitespace-pre-wrap break-words pr-4 text-[15px] leading-6">
                  {message.text}
                </p>
              ) : null}

              {message.attachments.length > 0 ? (
                <div className="mt-2 grid gap-2">
                  {message.attachments.map((attachment) => {
                    const src = resolveBackendAssetUrl(attachment.url);

                    if (attachment.kind === "IMAGE") {
                      return (
                        <a
                          key={attachment.id || attachment.url}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={src}
                            alt={attachment.fileName}
                            className="max-h-72 w-full rounded-2xl object-cover sm:max-h-80"
                          />
                        </a>
                      );
                    }

                    if (attachment.kind === "AUDIO") {
                      return (
                        <audio
                          key={attachment.id || attachment.url}
                          controls
                          className="w-full"
                          src={src}
                        />
                      );
                    }

                    if (attachment.kind === "VIDEO") {
                      return (
                        <video
                          key={attachment.id || attachment.url}
                          controls
                          className="w-full rounded-2xl"
                          src={src}
                        />
                      );
                    }

                    return (
                      <a
                        key={attachment.id || attachment.url}
                        href={src}
                        target="_blank"
                        className="block break-all rounded-2xl bg-black/5 px-4 py-3 text-sm dark:bg-white/5"
                        rel="noreferrer"
                      >
                        {attachment.fileName}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}

          {!deleted && message.reactions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.id}
                  type="button"
                  onClick={() => onReaction(message.id, reaction.emoji)}
                  className="rounded-full border border-black/10 bg-white/55 px-2 py-0.5 text-xs dark:border-white/10 dark:bg-black/20"
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-1 flex items-end justify-end gap-1.5 pl-8 text-[11px] text-black/50 dark:text-white/45">
            {message.editedAt && !deleted ? <span>editada</span> : null}
            {expiryLabel ? <span>{expiryLabel}</span> : null}
            <span>{hourFormatter.format(new Date(message.createdAt))}</span>
            {mine ? (
              status === "read" ? (
                <CheckCheck className="h-3.5 w-3.5 text-[#34B7F1]" />
              ) : status === "delivered" ? (
                <CheckCheck className="h-3.5 w-3.5" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )
            ) : null}
          </div>

          {menuOpen && mobileViewport ? (
            <>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={closeMenuIfOpen}
                className="fixed inset-0 z-30 bg-black/35 md:hidden"
              />
              <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[1.8rem] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-18px_60px_rgba(0,0,0,0.28)] dark:bg-[#16232c] md:hidden">
                <div className="mx-auto max-w-xl">
                  <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/10 dark:bg-white/15" />
                  <div className="mb-4 rounded-[1.25rem] bg-black/[0.04] px-4 py-3 dark:bg-white/[0.04]">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[#667781] dark:text-white/45">
                      {mine ? "Sua mensagem" : message.sender.displayName}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm text-[#111B21] dark:text-white/80">
                      {mobilePreview}
                    </p>
                  </div>
                  {!deleted ? (
                    <div className="mb-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex w-max min-w-full gap-2 pb-1">
                        {quickReactions.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              onReaction(message.id, emoji);
                              setReactionRailOpen(false);
                              closeMenuIfOpen();
                            }}
                            className="rounded-full border border-black/8 bg-black/[0.03] px-4 py-2 text-2xl transition hover:bg-black/8 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onReply(message);
                        closeMenuIfOpen();
                      }}
                      className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Reply className="h-4 w-4" />
                      Responder
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onCopy(message);
                        closeMenuIfOpen();
                      }}
                      className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onForward(message);
                        closeMenuIfOpen();
                      }}
                      className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Forward className="h-4 w-4" />
                      Encaminhar
                    </button>
                    {mine && !deleted ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(message);
                            closeMenuIfOpen();
                          }}
                          className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(message.id);
                            closeMenuIfOpen();
                          }}
                          className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Apagar
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {menuOpen && !mobileViewport ? (
            <div
              className={`absolute top-full z-20 mt-2 hidden w-52 rounded-2xl bg-white p-2 text-[#111B21] shadow-2xl dark:bg-[#233138] dark:text-white md:block ${
                mine ? "right-0" : "left-0"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onReply(message);
                  closeMenuIfOpen();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Reply className="h-4 w-4" />
                Responder
              </button>
              <button
                type="button"
                onClick={() => {
                  onCopy(message);
                  closeMenuIfOpen();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </button>
              <button
                type="button"
                onClick={() => {
                  onForward(message);
                  closeMenuIfOpen();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Forward className="h-4 w-4" />
                Encaminhar
              </button>
              {mine && !deleted ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(message);
                      closeMenuIfOpen();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(message.id);
                      closeMenuIfOpen();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Apagar
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

