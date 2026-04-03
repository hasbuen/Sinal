"use client";

import {
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCheck,
  Copy,
  Forward,
  Menu,
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
  onSaveToggle: (message: BackendMessage) => void;
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
  onSaveToggle,
  onCopy,
  onForward,
  onEdit,
  onDelete,
  onReaction,
}: Props) {
  const mine = message.sender.id === currentUserId;
  const deleted = Boolean(message.deletedAt);
  const status = mine ? receiptState(message, conversation, currentUserId) : "sent";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[92%] rounded-[1.6rem] border px-4 py-3 shadow-lg sm:max-w-[78%] ${
          mine
            ? "border-cyan-300/20 bg-cyan-300/12"
            : "border-white/10 bg-white/5"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            {mine ? "Voce" : message.sender.displayName}
          </p>
          <div className="flex items-center gap-2">
            {message.isSaved ? (
              <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-emerald-200">
                Salva
              </span>
            ) : timeUntilExpiry(message, clock) ? (
              <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-white/50">
                {timeUntilExpiry(message, clock)}
              </span>
            ) : null}
            <span className="text-xs text-white/35">
              {hourFormatter.format(new Date(message.createdAt))}
            </span>
            {mine ? (
              status === "read" ? (
                <CheckCheck className="h-3.5 w-3.5 text-cyan-300" />
              ) : status === "delivered" ? (
                <CheckCheck className="h-3.5 w-3.5 text-white/55" />
              ) : (
                <Check className="h-3.5 w-3.5 text-white/45" />
              )
            ) : null}
            <button
              type="button"
              onClick={onToggleMenu}
              className="rounded-full border border-white/10 p-1 text-white/55 transition hover:bg-white/10"
            >
              <Menu className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {message.forwardedFrom ? (
          <div className="mt-3 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-xs text-fuchsia-100/80">
            Encaminhada de {message.forwardedFrom.sender.displayName}
          </div>
        ) : null}

        {message.replyTo ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65">
            <p className="font-semibold text-cyan-200">
              Respondendo a {message.replyTo.sender.displayName}
            </p>
            <p className="mt-1 truncate">
              {message.replyTo.text ||
                message.replyTo.emoji ||
                message.replyTo.linkUrl ||
                messagePreview(message.replyTo)}
            </p>
          </div>
        ) : null}

        {deleted ? (
          <p className="mt-3 text-sm italic text-white/55">
            {message.text || "Mensagem apagada"}
          </p>
        ) : (
          <>
            {message.kind === "LINK" && message.linkUrl ? (
              <a
                href={message.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-2xl border border-cyan-300/20 bg-black/20 px-4 py-3 text-cyan-200"
              >
                {message.linkTitle || message.linkUrl}
              </a>
            ) : null}

            {message.kind === "EMOJI" && message.emoji ? (
              <p className="mt-3 text-4xl">{message.emoji}</p>
            ) : null}

            {message.text ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/90">
                {message.text}
              </p>
            ) : null}

            {message.attachments.length > 0 ? (
              <div className="mt-3 grid gap-3">
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
                      rel="noreferrer"
                      className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/85"
                    >
                      {attachment.fileName}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </>
        )}

        {!deleted ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.id}
                  type="button"
                  onClick={() => onReaction(message.id, reaction.emoji)}
                  className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs"
                >
                  {reaction.emoji}
                </button>
              ))}
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReaction(message.id, emoji)}
                  className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
              <button
                type="button"
                onClick={() => onReply(message)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 hover:bg-white/10"
              >
                <Reply className="h-3.5 w-3.5" />
                Responder
              </button>
              <button
                type="button"
                onClick={() => onSaveToggle(message)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 hover:bg-white/10"
              >
                {message.isSaved ? (
                  <BookmarkCheck className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
                {message.isSaved ? "Guardada" : "Salvar"}
              </button>
            </div>
          </>
        ) : null}

        {message.editedAt && !deleted ? (
          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/35">
            Editada
          </p>
        ) : null}

        {menuOpen ? (
          <div className="absolute right-3 top-11 z-20 w-48 rounded-2xl border border-white/10 bg-[#07111d] p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => onReply(message)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10"
            >
              <Reply className="h-4 w-4" />
              Responder
            </button>
            <button
              type="button"
              onClick={() => onCopy(message)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </button>
            <button
              type="button"
              onClick={() => onForward(message)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10"
            >
              <Forward className="h-4 w-4" />
              Encaminhar
            </button>
            {mine && !deleted ? (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(message)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(message.id)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-200 hover:bg-rose-400/10"
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
  );
}
