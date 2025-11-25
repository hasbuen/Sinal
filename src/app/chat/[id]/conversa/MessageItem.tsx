"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, FileSpreadsheet, Paperclip } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import MessageActions from "@/components/MessageActions";
import useLongPress from "@/hooks/useLongPress";
import { supabase } from "@/lib/supabase";
import { Rascunho } from "@/types/rascunho";


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
    remetenteOriginalId?: string | null;
    remetenteOriginal?: string | null;
    reacoes?: {
        id: string;
        remetente: string;
        emoji: string;
        mensagem_id: string;
    }[];
}

interface MessageItemProps extends React.HTMLAttributes<HTMLDivElement> {
    mensagem: Mensagem;
    souEu: boolean;
    mensagemSelecionada: string | null;
    setMensagemSelecionada: (id: string | null) => void;
    setResposta: (mensagem: Mensagem) => void;
    setEditandoId: (id: string | null) => void; // ADICIONADO
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
    longPressProps: Record<string, any>;
    handleMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void;
    someProps: Record<string, any>;
    setRascunhoParaEnviar: React.Dispatch<React.SetStateAction<Rascunho | null>>;
    onSelectUserChat: (userId: string) => void;
}

type ParsedContent = {
    text: string;
    formattedHtml: string;
};

const parseMessageContent = (text: string): { formattedHtml: string } => {
  if (!text) return { formattedHtml: "" };

  const applyInlineFormatting = (str: string) => {
    return str
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>")   // *negrito*
      .replace(/\~(.*?)\~/g, "<em>$1</em>")           // ~itálico~
      .replace(/\_(.*?)\_/g, "<u>$1</u>");            // _sublinhado_
  };

  // RegEx que casa aberturas e fechamentos como tokens
  const tokenRegex = /\|COLOR:(#[0-9a-fA-F]{6})\||\|ENDCOLOR\|/g;
  let result = "";
  let lastIndex = 0;
  const stack: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(text)) !== null) {
    const index = m.index;
    // texto antes do token
    if (index > lastIndex) {
      const before = text.slice(lastIndex, index);
      result += applyInlineFormatting(before);
    }

    // Se captura um grupo de cor, m[1] terá o hex; se undefined, é |ENDCOLOR|
    if (m[1]) {
      // abertura de cor
      const color = m[1];
      stack.push(color);
      result += `<span style="color:${color}">`;
    } else {
      // fechamento
      if (stack.length > 0) {
        stack.pop();
        result += `</span>`;
      } else {
        // token |ENDCOLOR| sobrando — ignorar
      }
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // resto do texto
  if (lastIndex < text.length) {
    result += applyInlineFormatting(text.slice(lastIndex));
  }

  // fecha spans abertos (caso existam)
  while (stack.length > 0) {
    stack.pop();
    result += `</span>`;
  }

  return { formattedHtml: result };
};

export default function MensagemItem({
    mensagem,
    souEu,
    setMensagemSelecionada,
    setResposta,
    setEditandoId,
    setTexto,
    setImagemAmpliada,
    setZoomLevel,
    setPanOffset,
    setMensagemDestacada,
    handleReact,
    formatarHora,
    handleMouseLeave: handleMouseLeaveProp,
    someProps,
    setRascunhoParaEnviar,
    onSelectUserChat,
}: MessageItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const mouseLeaveTimeout = useRef<NodeJS.Timeout | null>(null);
    const longPressProps = useLongPress(() => setMensagemSelecionada(mensagem.id));
    const { onMouseLeave: longPressOnMouseLeave, ...restLongPressProps } = longPressProps;
    const { onMouseLeave: originalOnMouseLeave } = someProps || {};

    const handleMouseLeaveCombined = (e: React.MouseEvent<HTMLDivElement>) => {
        if (mouseLeaveTimeout.current) {
            clearTimeout(mouseLeaveTimeout.current);
        }

        mouseLeaveTimeout.current = setTimeout(() => {
            setIsHovered(false);
            longPressOnMouseLeave?.(e);
            originalOnMouseLeave?.(e);
            handleMouseLeaveProp?.(e);
        }, 100);
    };

    useEffect(() => {
        return () => {
            if (mouseLeaveTimeout.current) {
                clearTimeout(mouseLeaveTimeout.current);
            }
        };
    }, []);


    const [mostrarMenu, setMostrarMenu] = useState(false);

    let conteudo = mensagem.conteudo;

    const {
        remetenteOriginal,
        remetenteOriginalId,
    } = mensagem;

    const [conteudoDaMensagem, legendaDaMensagem] = conteudo?.split("|SEPARATOR|") || ["", ""];

    const reacoesAgrupadas = mensagem.reacoes?.reduce((acc, reacao) => {
        if (!acc[reacao.emoji]) acc[reacao.emoji] = [];
        acc[reacao.emoji].push(reacao);
        return acc;
    }, {} as Record<string, typeof mensagem.reacoes>) || {};


    return (
        <div
            className={`relative flex flex-col pb-8 ${souEu ? "items-end" : "items-start"}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeaveCombined}
            onClick={() => setMensagemSelecionada(mensagem.id)}
            {...restLongPressProps}
        >
            <div className={`flex flex-col max-w-[75%] ${souEu ? "items-end" : "items-start"}`}>

                <div
                    className={`px-3 pt-2 pb-5 text-sm whitespace-pre-wrap break-words relative
                ${souEu
                            ? "rounded-l-2xl rounded-tr-2xl bg-[#2c4e37] text-[#ffffff] shadow-md"
                            : "rounded-r-2xl rounded-tl-2xl bg-[#0a2127] text-[#ffffff] shadow-md"
                        }`}
                >
                    {/* Resposta */}
                    {mensagem.resposta && (
                        <div
                            className="mb-1 p-2 rounded-lg bg-white/10 text-xs border-l-4 border-white/50 cursor-pointer overflow-y-auto h-full"
                            onClick={() => setMensagemDestacada(mensagem.resposta_id || null)}
                        >
                            <span className="block font-semibold">Mensagem original:</span>
                            {mensagem.resposta.tipo === "texto" && (
                                <span 
                                    className="block break-words break-all"
                                    dangerouslySetInnerHTML={{
                                        __html: parseMessageContent(mensagem.resposta.conteudo).formattedHtml
                                    }}
                                />
                            )}
                            {mensagem.resposta.tipo === "imagem" && <span className="italic opacity-80">📷 Imagem</span>}
                            {mensagem.resposta.tipo === "audio" && <span className="italic opacity-80">🎤 Áudio</span>}
                            {mensagem.resposta.tipo === "anexo" && <span className="italic opacity-80">📎 Anexo</span>}
                        </div>
                    )}

                    {remetenteOriginal && remetenteOriginalId && (
                        <div className="mb-1 text-xs bg-yellow-300/10 rounded-full text-white flex items-center gap-1">
                            <span
                                onClick={(e) => {
                                    e.stopPropagation(); // evita que o clique suba pro onClick do container
                                    console.debug("MensagemItem: clique no remetenteOriginal", { remetenteOriginalId, remetenteOriginal });
                                    if (remetenteOriginalId) {
                                        onSelectUserChat(remetenteOriginalId);
                                    } else {
                                        console.warn("MensagemItem: remetenteOriginalId vazio");
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.stopPropagation();
                                        console.debug("MensagemItem: Enter no remetenteOriginal", { remetenteOriginalId });
                                        if (remetenteOriginalId) onSelectUserChat(remetenteOriginalId);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                className="bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-md hover:bg-yellow-700/70 hover:text-emerald-300 cursor-pointer transform-colors duration-300"
                            >
                                {remetenteOriginal}
                            </span>
                            <span className="text-yellow-400 text-[0.625rem]">encaminhamento:</span>
                        </div>
                    )}


                    {/* Conteúdo da mensagem */}
                    {mensagem.tipo === "texto" &&
                        <span>
                            <div
                                // Use a classe CSS 'whitespace-pre-wrap' para respeitar quebras de linha
                                className={`whitespace-pre-wrap break-words ${souEu ? "text-white" : "text-gray-100"} `}
                                // APLICAÇÃO PRINCIPAL: Usar dangerouslySetInnerHTML com o HTML formatado
                                dangerouslySetInnerHTML={{
                                    __html: parseMessageContent(conteudoDaMensagem).formattedHtml
                                }}
                            />
                        </span>}
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

                    {/* Hora */}
                    <span className="absolute bottom-1 right-2 text-[10px] opacity-70">
                        {formatarHora(mensagem.criado_em)}
                    </span>

                    {(isHovered || mostrarMenu) && (
                        <div
                            className={`absolute bottom-1 z-30 ${souEu ? "right-[100%] pr-2 whitespace-nowrap" : "left-[100%] pl-2 whitespace-nowrap"}`}
                            onClick={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                setMostrarMenu(false);
                            }}
                        >
                            <MessageActions
                                souEu={souEu}
                                mensagem={mensagem}
                                onCopy={() => { navigator.clipboard.writeText(conteudoDaMensagem); }}
                                onReply={() => { setResposta(mensagem); setMensagemSelecionada(null); setMostrarMenu(false); }}
                                onForward={() => {
                                    setMensagemSelecionada(mensagem.id);
                                    document.dispatchEvent(new CustomEvent("abrirEncaminhar", { detail: mensagem }));
                                }}
                                onEdit={() => {
                                    if (souEu) {
                                        const [conteudoPrincipal, legendaDaMensagem] = mensagem.conteudo.split("|SEPARATOR|") || [mensagem.conteudo, ""];

                                        setEditandoId(mensagem.id);

                                        if (mensagem.tipo === "texto") {
                                            setTexto(conteudoPrincipal.trim());
                                        } else {
                                            // usa a prop setRascunhoParaEnviar (chegou via Conversa -> ChatComponent)
                                            setRascunhoParaEnviar({
                                                tipo: mensagem.tipo!,
                                                conteudo: conteudoPrincipal,
                                                legenda: legendaDaMensagem || "",
                                                file: undefined,
                                            });
                                        }

                                        setMensagemSelecionada(null);
                                        setMostrarMenu(false);
                                    }
                                }}

                                onDelete={async () => {
                                    if (souEu) {
                                        await supabase
                                            .from("mensagens")
                                            .delete()
                                            .eq("id", mensagem.id);
                                        setMensagemSelecionada(null);
                                        setMostrarMenu(false);
                                    }
                                }}
                                onReact={(emoji: string) => { handleReact(mensagem, emoji); setMensagemSelecionada(null); setMostrarMenu(false); }}
                            />
                        </div>
                    )}

                    {/* Reações */}
                    {Object.keys(reacoesAgrupadas).length > 0 && (
                        <div
                            className={`mt-1 flex items-center space-x-1 
            ${souEu ? "self-end mr-1" : "self-start ml-1"} 
        `}
                        >
                            <div
                                className={`flex w-full 
                ${souEu ? "justify-end" : "justify-start"}`}
                            >
                                {Object.entries(reacoesAgrupadas).map(([emoji, reacoes]) => (
                                    <span
                                        key={emoji}
                                        className="px-1 py-0.5 bg-emerald-900/70 rounded-full text-xs cursor-pointer shadow-sm ml-1"
                                        onClick={(e) => { e.stopPropagation(); handleReact(mensagem, emoji); }}
                                    >
                                        {emoji} {reacoes?.length > 1 ? reacoes.length : ""}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}



                </div>
            </div>
        </div>
    );
}
