"use client";

import { useState, useRef, useEffect } from "react";
import { Smile, MoreHorizontal, Reply, Edit2, Trash2, SeparatorHorizontal } from "lucide-react";
import EmojiBoard from "@/components/EmojisCustom";

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
  // Proteção para evitar fechar imediatamente após abrir
  const ignoreOutsideClick = useRef(false);

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

  // Fecha menus ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (ignoreOutsideClick.current) return;
      const target = e.target as HTMLElement;
      if (
        !target.closest('.menu-suspenso-chat') &&
        !target.closest('.menu-rapidos-chat') &&
        !target.closest('.menu-opcoes-chat') &&
        !target.closest('.menu-modal-emojis-chat')
      ) {
        setMostrarRapidos(false);
        setMostrarMenu(false);
        setMostrarModalEmojis(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 bg-emerald-600 px-2 py-1 rounded-xl shadow-md relative menu-suspenso-chat">
      {/* Container para emojis rápidos */}
      <div
        className="relative menu-rapidos-chat"
        onMouseEnter={handleRapidosMouseEnter}
        onMouseLeave={handleRapidosMouseLeave}
      >
        <button
          className="p-1 hover:bg-emerald-400 rounded-full transition"
          onClick={(e) => {
            e.stopPropagation();
            setMostrarRapidos((prev) => !prev);
            ignoreOutsideClick.current = true;
            setTimeout(() => { ignoreOutsideClick.current = false; }, 120);
          }}
        >
          <Smile className="w-4 h-4 text-white" />
        </button>
        {mostrarRapidos && (
          <div
            className="absolute z-20 flex gap-1 p-1 rounded-4xl shadow-lg bg-emerald-800/70 max-w-[240px] max-h-[50px] overflow-hidden
             bottom-full transform -translate-x-1/2 mb-2 menu"
          >
            {emojisRapidos.map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  onReact(emoji);
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
        className="relative menu-opcoes-chat"
        onMouseEnter={handleMenuMouseEnter}
        onMouseLeave={handleMenuMouseLeave}
      >
        <button
          className="p-1 hover:bg-emerald-400 rounded-full transition"
          onClick={(e) => {
            e.stopPropagation();
            setMostrarMenu((prev) => !prev);
            ignoreOutsideClick.current = true;
            setTimeout(() => { ignoreOutsideClick.current = false; }, 120);
          }}
        >
          <MoreHorizontal className="w-4 h-4 text-white" />
        </button>

        {mostrarMenu && (
          <div className="absolute bottom-full right-0 mb-2 flex flex-col bg-[#111827]/70 p-2 rounded-2xl shadow-lg z-50 min-w-[140px] text-white menu-opcoes-chat">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMostrarModalEmojis(true);
                setMostrarMenu(false);
                setMostrarRapidos(false);
              }}
              className="group text-left p-1 hover:bg-emerald-600 rounded flex items-center gap-1"
            >
              <Smile className="w-4 h-4 text-emerald-300 transition-colors duration-500 ease-in-out group-hover:text-green-200" />
              <div className="transition-colors duration-500 ease-in-out group-hover:text-green-200">
                +Emojis
              </div>
            </button>

            <div className="border-t border-emerald-700 my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply(mensagem);
                setMostrarMenu(false);
                setMostrarRapidos(false);
                setMostrarModalEmojis(false);
              }}
              className="text-left p-1 hover:bg-emerald-600 rounded flex items-center gap-1"
            >
              <Reply className="w-4 h-4 text-emerald-300 transform -scale-x-100" /> Responder
            </button>

            {souEu && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                    setMostrarMenu(false);
                    setMostrarRapidos(false);
                    setMostrarModalEmojis(false);
                  }}
                  className="text-left p-1 hover:bg-emerald-600 rounded flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4 text-emerald-300" /> Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setMostrarMenu(false);
                    setMostrarRapidos(false);
                    setMostrarModalEmojis(false);
                  }}
                  className="text-left p-1 hover:bg-red-600/50 transition-colors duration-500 rounded flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4 text-red-500 transition-colors duration-500 ease-in-out group-hover:text-red-300" />
                  <div className="transition-colors duration-500 ease-in-out group-hover:text-red-300">Apagar</div>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Picker de Emojis */}
      {mostrarModalEmojis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center menu-modal-emojis-chat">
          <div className="fixed inset-0 bg-transparent" onClick={() => setMostrarModalEmojis(false)} />
          <div className="relative p-4 bg-emerald-900/70 rounded-4xl shadow-lg max-w-[90vw] max-h-[80vh] overflow-auto">
            <EmojiBoard
              onEmojiClick={(emoji) => {
                onReact(emoji);
                setMostrarModalEmojis(false);
                setMostrarMenu(false);
                setMostrarRapidos(false);
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}