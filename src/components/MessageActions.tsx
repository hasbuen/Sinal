"use client";

import { useState, useRef, useEffect } from "react";
import { Smile, MoreHorizontal, Reply, Edit2, Trash2 } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";

const emojisRapidos = ["😂", "😍", "😱", "👍", "👎", "❤️"];

interface MessageActionsProps {
  souEu: boolean;
  mensagem: any;
  onReply: (mensagem: any) => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

export default function MessageActions({
  souEu,
  mensagem,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: MessageActionsProps) {
  const [mostrarRapidos, setMostrarRapidos] = useState(false);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [mostrarModalEmojis, setMostrarModalEmojis] = useState(false);

  const rapidosTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalEmojisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleRapidosMouseEnter = () => {
    if (rapidosTimeoutRef.current) {
      clearTimeout(rapidosTimeoutRef.current);
    }
    setMostrarRapidos(true);
  };

  const handleRapidosMouseLeave = () => {
    rapidosTimeoutRef.current = setTimeout(() => {
      setMostrarRapidos(false);
    }, 200);
  };

  const handleMenuMouseEnter = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    setMostrarMenu(true);
  };

  const handleMenuMouseLeave = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setMostrarMenu(false);
    }, 200);
  };

  useEffect(() => {
    if (mostrarModalEmojis) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mostrarModalEmojis]);

  return (
    <div className="flex items-center gap-2 bg-[#1f2937] px-2 py-1 rounded-xl shadow-md relative">
      {/* Container para emojis rápidos */}
      <div
        className="relative"
        onMouseEnter={handleRapidosMouseEnter}
        onMouseLeave={handleRapidosMouseLeave}
      >
        <button
          className="p-1 hover:bg-gray-600 rounded-full transition"
          onClick={() => setMostrarRapidos((prev) => !prev)}
        >
          <Smile className="w-4 h-4 text-white" />
        </button>
        {mostrarRapidos && (
          <div
            className={`absolute z-20 flex gap-1 p-1 rounded-md shadow-lg bg-gray-800
              max-w-[240px] max-h-[50px] overflow-hidden
              ${souEu ? "right-0" : "left-0"}
              top-[-50px]`}
          >
            {emojisRapidos.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setMostrarRapidos(false);
                }}
                className="text-lg hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Container para o menu de opções */}
      <div
        className="relative"
        onMouseEnter={handleMenuMouseEnter}
        onMouseLeave={handleMenuMouseLeave}
      >
        <button
          className="p-1 hover:bg-gray-600 rounded-full transition"
          onClick={() => setMostrarMenu((prev) => !prev)}
        >
          <MoreHorizontal className="w-4 h-4 text-white" />
        </button>

        {mostrarMenu && (
          <div className="absolute bottom-full right-0 mb-2 flex flex-col bg-[#111827] p-2 rounded-2xl shadow-lg z-50 min-w-[140px] text-white">
            <button
              onClick={() => {
                onReply(mensagem);
                setMostrarMenu(false);
              }}
              className="text-left p-1 hover:bg-gray-600 rounded flex items-center gap-1"
            >
              <Reply className="w-4 h-4 text-white" /> Responder
            </button>

            {souEu && (
              <>
                <button
                  onClick={() => {
                    onEdit();
                    setMostrarMenu(false);
                  }}
                  className="text-left p-1 hover:bg-gray-600 rounded flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4 text-white" /> Editar
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setMostrarMenu(false);
                  }}
                  className="text-left p-1 hover:bg-gray-600 rounded flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4 text-white" /> Apagar
                </button>
              </>
            )}

            <button
              onClick={() => {
                setMostrarModalEmojis(true);
                setMostrarMenu(false);
              }}
              className="text-left p-1 hover:bg-gray-600 rounded flex items-center gap-1"
            >
              <Smile className="w-4 h-4 text-white" /> Emojis
            </button>
          </div>
        )}
      </div>

      {/* Picker de Emojis */}
      {mostrarModalEmojis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMostrarModalEmojis(false)} />
          <div className="relative p-4 bg-[#0b1220] rounded-xl shadow-lg max-w-[90vw] max-h-[80vh] overflow-auto">
            <EmojiPicker
              theme={Theme.DARK}
              onEmojiClick={(emojiData: any) => {
                onReact(emojiData.emoji);
                setMostrarModalEmojis(false);
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
