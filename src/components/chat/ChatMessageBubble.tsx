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
  const mine = message.sender.id === currentUserId;
  const deleted = Boolean(message.deletedAt);
  const status = mine ? receiptState(message, conversation, currentUserId) : "sent";
  const expiryLabel = timeUntilExpiry(message, clock);
  const contextVisible = hovered || menuOpen || reactionRailOpen;

  useEffect(() => {
    if (!menuOpen) {
      setReactionRailOpen(false);
    }
  }, [menuOpen]);

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
      className={`group/message flex ${mine ? "justify-end" : "justify-start"} animate-in fade-in-0`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setReactionRailOpen(false);
      }}
    >
      <div
        className={`relative max-w-[92%] px-2 pt-6 sm:max-w-[78%] ${
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
        {!deleted && contextVisible ? (
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
          className={`relative rounded-[1.2rem] px-3 py-2 shadow-sm transition-all ${
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
              className={`absolute top-2 rounded-full border border-black/5 bg-white/80 p-1 text-[#667781] shadow-sm transition ${
                mine ? "left-2" : "right-2"
              } ${
                contextVisible
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
                  className="mt-2 block rounded-2xl bg-black/5 px-3 py-3 text-sm font-medium text-[#075E54] dark:bg-white/5 dark:text-[#7fe7bc]"
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
                            className="max-h-80 w-full rounded-2xl object-cover"
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
                        className="block rounded-2xl bg-black/5 px-4 py-3 text-sm dark:bg-white/5"
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

          {menuOpen ? (
            <div
              className={`absolute top-full z-20 mt-2 w-52 rounded-2xl bg-white p-2 text-[#111B21] shadow-2xl dark:bg-[#233138] dark:text-white ${
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
