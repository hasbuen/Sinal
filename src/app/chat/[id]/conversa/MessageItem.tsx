"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Paperclip } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import MessageActions from "@/components/MessageActions";
import useLongPress from "@/hooks/useLongPress";
import { supabase } from "@/lib/supabase";

interface Mensagem {
  id: string;
  remetente: string;
  destinatario: string;
  conteudo: string;
  criado_em: string;
  tipo?: "texto" | "imagem" | "audio" | "anexo" | null;
  resposta_id?: string | null;
  resposta?: {
    conteudo: string;
    tipo: "texto" | "imagem" | "audio" | "anexo" | null;
  } | null;
  reacoes?: {
    id: string;
    remetente: string;
    emoji: string;
    mensagem_id: string;
  }[];
}

interface MensagemItemProps {
  mensagem: Mensagem;
  souEu: boolean;
  mensagemSelecionada: string | null;
  setMensagemSelecionada: (id: string | null) => void;
  setResposta: (mensagem: Mensagem) => void;
  setEditandoId: (id: string | null) => void;
  setTexto: (texto: string) => void;
  setImagemAmpliada: (url: string | null) => void;
  setZoomLevel: (level: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setMensagemDestacada: (id: string | null) => void;
  mensagemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  mensagemDestacada: string | null;
  userId: string | null;
  handleReact: (mensagem: Mensagem, emoji: string) => void;
  formatarHora: (dataISO: string) => string;
}

export default function MensagemItem({
  mensagem,
  souEu,
  mensagemSelecionada,
  setMensagemSelecionada,
  setResposta,
  setEditandoId,
  setTexto,
  setImagemAmpliada,
  setZoomLevel,
  setPanOffset,
  setMensagemDestacada,
  mensagemRefs,
  mensagemDestacada,
  userId,
  handleReact,
  formatarHora,
}: MensagemItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [conteudoDaMensagem, legendaDaMensagem] = mensagem.conteudo?.split("|SEPARATOR|") || ["", ""];

  const reacoesAgrupadas = mensagem.reacoes?.reduce((acc, reacao) => {
    if (!acc[reacao.emoji]) acc[reacao.emoji] = [];
    acc[reacao.emoji].push(reacao);
    return acc;
  }, {} as Record<string, typeof mensagem.reacoes>) || {};

  const longPressProps = useLongPress(() => setMensagemSelecionada(mensagem.id));

  return (
    <div
      className={`relative flex ${souEu ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setIsHovered(true)}
      onClick={() => setMensagemSelecionada(mensagem.id)}
      {...longPressProps} // mobile long press
    >
      <div
        className={`max-w-[75%] px-3 pt-2 pb-5 text-sm whitespace-pre-wrap break-words relative
        ${souEu
          ? "rounded-l-2xl rounded-tr-2xl bg-[#005c4b] text-white self-end shadow-md"
          : "rounded-r-2xl rounded-tl-2xl bg-[#202c33] text-white self-start shadow-md"
        }`}
      >
        {/* Resposta */}
        {mensagem.resposta && (
          <div
            className="mb-1 p-2 rounded-lg bg-white/10 text-xs border-l-4 border-white/50 cursor-pointer overflow-y-auto h-full"
            onClick={() => setMensagemDestacada(mensagem.resposta_id || null)}
          >
            <span className="block font-semibold">Mensagem original:</span>
            {mensagem.resposta.tipo === "texto" && <span className="block truncate">{mensagem.resposta.conteudo}</span>}
            {mensagem.resposta.tipo === "imagem" && <span className="italic opacity-80">📷 Imagem</span>}
            {mensagem.resposta.tipo === "audio" && <span className="italic opacity-80">🎤 Áudio</span>}
            {mensagem.resposta.tipo === "anexo" && <span className="italic opacity-80">📎 Anexo</span>}
          </div>
        )}

        {/* Conteúdo da mensagem */}
        {mensagem.tipo === "texto" && <span>{mensagem.conteudo}</span>}
        {mensagem.tipo === "imagem" && (
          <>
            <img
              src={conteudoDaMensagem}
              className="rounded-md max-w-[200px] cursor-pointer"
              onClick={() => {
                setImagemAmpliada(conteudoDaMensagem);
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
            />
            {legendaDaMensagem && <span className="block mt-2 text-xs opacity-90">{legendaDaMensagem}</span>}
          </>
        )}
        {mensagem.tipo === "audio" && (
          <>
            <AudioPlayer src={conteudoDaMensagem} />
            {legendaDaMensagem && <span className="block mt-2 text-xs opacity-90">{legendaDaMensagem}</span>}
          </>
        )}
        {mensagem.tipo === "anexo" && (
          <a
            href={conteudoDaMensagem}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-white/10 rounded-md"
          >
            {conteudoDaMensagem.includes(".pdf") ? (
              <FileText className="w-5 h-5" />
            ) : conteudoDaMensagem.includes(".xlsx") ? (
              <FileSpreadsheet className="w-5 h-5" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
            <span className="underline">{conteudoDaMensagem.split("/").pop()}</span>
            {legendaDaMensagem && <span className="block mt-2 text-xs opacity-90">{legendaDaMensagem}</span>}
          </a>
        )}

        {/* Reações */}
        {Object.keys(reacoesAgrupadas).length > 0 && (
          <div className="flex gap-1 absolute bottom-1 -left-2 transform -translate-x-full">
            {Object.entries(reacoesAgrupadas).map(([emoji, reacoes]) => (
              <span
                key={emoji}
                className="px-1 py-0.5 bg-gray-700 rounded-full text-sm cursor-pointer"
                onClick={() => handleReact(mensagem, emoji)}
              >
                {emoji} {reacoes?.length > 1 ? reacoes.length : ""}
              </span>
            ))}
          </div>
        )}

        {/* Hora */}
        <span className="absolute bottom-1 right-2 text-[10px] opacity-70">
          {formatarHora(mensagem.criado_em)}
        </span>

        {/* Menu de ações */}
        {mensagemSelecionada === mensagem.id && (
          <div
            className="absolute z-30 -top-8 left-1/2 transform -translate-x-1/2 
            bg-[#202c33] p-1 rounded-full shadow-xl 
            flex items-center whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageActions
              souEu={souEu}
              mensagem={mensagem}
              onReply={() => { setResposta(mensagem); setMensagemSelecionada(null); }}
              onEdit={() => { if (souEu) { setEditandoId(mensagem.id); setTexto(mensagem.conteudo); setMensagemSelecionada(null); } }}
              onDelete={() => { if (souEu) { supabase.from("mensagens").delete().eq("id", mensagem.id); setMensagemSelecionada(null); } }}
              onReact={(emoji: string) => { handleReact(mensagem, emoji); setMensagemSelecionada(null); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
