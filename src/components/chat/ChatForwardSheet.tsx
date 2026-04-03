"use client";

import { X } from "lucide-react";
import type { BackendConversation, BackendMessage } from "@/lib/backend-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { conversationName, messagePreview } from "./chat-helpers";

type Props = {
  open: boolean;
  message: BackendMessage | null;
  currentUserId: string;
  conversations: BackendConversation[];
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onPickConversation: (conversationId: string) => void;
};

export function ChatForwardSheet({
  open,
  message,
  currentUserId,
  conversations,
  note,
  onNoteChange,
  onClose,
  onPickConversation,
}: Props) {
  if (!open || !message) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#07111d] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
              Encaminhar
            </p>
            <h3 className="mt-1 text-xl font-semibold">
              Escolha a conversa de destino
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full text-white/70 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/65">{messagePreview(message)}</p>
          <Textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Acrescente uma nota opcional..."
            className="mt-4 min-h-24 border-white/10 bg-white/5 text-white"
          />
        </div>
        <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onPickConversation(conversation.id)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            >
              <p className="font-medium">
                {conversationName(conversation, currentUserId)}
              </p>
              <p className="mt-1 text-sm text-white/45">
                {messagePreview(conversation.latestMessage)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
