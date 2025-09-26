"use client";

import { Reply, Edit2, Trash2, X, Smile } from "lucide-react";

interface MessageActionsMobileProps {
  mensagem: any;
  souEu: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onOpenEmojiPicker: () => void;
  onReact?: (emoji: string) => void;
}

const emojisRapidos = ["😂", "😍", "😱", "👍", "👎", "❤️"];

export default function MessageActionsMobile({
  souEu,
  onReply,
  onEdit,
  onDelete,
  onClose,
  onOpenEmojiPicker,
  onReact,
}: MessageActionsMobileProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-[#1f2937] w-full max-w-sm rounded-t-2xl shadow-lg p-4 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-white mb-4 text-center">
          Opções
        </h2>

        <div className="flex justify-center gap-3 mb-4">
          {emojisRapidos.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact?.(emoji);
                onClose();
              }}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-white">
          <button
            onClick={() => {
              onReply();
              onClose();
            }}
            className="w-full text-left p-2 hover:bg-gray-600 rounded flex items-center gap-2"
          >
            <Reply className="w-5 h-5 text-white" /> Responder
          </button>

          {souEu && (
            <>
              <button
                onClick={() => {
                  onEdit();
                  onClose();
                }}
                className="w-full text-left p-2 hover:bg-gray-600 rounded flex items-center gap-2"
              >
                <Edit2 className="w-5 h-5 text-white" /> Editar
              </button>
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full text-left p-2 hover:bg-gray-600 rounded flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5 text-red-400" /> Apagar
              </button>
            </>
          )}

          <button
            onClick={() => {
              onOpenEmojiPicker();
              onClose();
            }}
            className="w-full text-left p-2 hover:bg-gray-600 rounded flex items-center gap-2"
          >
            <Smile className="w-5 h-5 text-white" /> Mais Emojis
          </button>
        </div>
      </div>
    </div>
  );
}
