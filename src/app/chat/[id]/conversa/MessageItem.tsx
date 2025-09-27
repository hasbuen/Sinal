"use client";

import { useState, useRef, useEffect } from "react";
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

interface MessageItemProps extends React.HTMLAttributes<HTMLDivElement> {
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
    longPressProps: Record<string, any>;
    handleMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void; // A sua função local
    // Adicionando um alias para o objeto que você estava usando no spread
    someProps: Record<string, any>;
}

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
    someProps
}: MessageItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const mouseLeaveTimeout = useRef<NodeJS.Timeout | null>(null);
    const longPressProps = useLongPress(() => setMensagemSelecionada(mensagem.id));
    const { onMouseLeave: longPressOnMouseLeave, ...restLongPressProps } = longPressProps;
    const { onMouseLeave: originalOnMouseLeave } = someProps || {};

    const handleMouseEnter = () => {
        if (mouseLeaveTimeout.current) {
            clearTimeout(mouseLeaveTimeout.current);
        }
        setIsHovered(true);
    };

    const handleMouseLeaveCombined = (e: React.MouseEvent<HTMLDivElement>) => {
        if (mouseLeaveTimeout.current) {
            clearTimeout(mouseLeaveTimeout.current);
        }

        // Inicia um timeout de 100ms antes de fechar o menu
        mouseLeaveTimeout.current = setTimeout(() => {
            setIsHovered(false);
            longPressOnMouseLeave?.(e); // Chama a função do useLongPress
            originalOnMouseLeave?.(e); // Chama o onMouseLeave do someProps
            handleMouseLeaveProp?.(e); // Chama a sua prop handleMouseLeave
        }, 100); // 100ms (você pode ajustar este valor se necessário)
    };

    // ❗ NOVO: Cleanup para o timer
    useEffect(() => {
        return () => {
            if (mouseLeaveTimeout.current) {
                clearTimeout(mouseLeaveTimeout.current);
            }
        };
    }, []);


    const [mostrarMenu, setMostrarMenu] = useState(false);

    const [conteudoDaMensagem, legendaDaMensagem] = mensagem.conteudo?.split("|SEPARATOR|") || ["", ""];

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
                                <span className="block break-words break-all">{mensagem.resposta.conteudo}</span>
                            )}
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
                                onReply={() => { setResposta(mensagem); setMensagemSelecionada(null); setMostrarMenu(false); }}
                                onEdit={() => { if (souEu) { setEditandoId(mensagem.id); setTexto(mensagem.conteudo); setMensagemSelecionada(null); setMostrarMenu(false); } }}
                                onDelete={() => {
                                    if (souEu) {
                                        // 1. Executa a exclusão no Supabase
                                        supabase.from("mensagens").delete().eq("id", mensagem.id);
                                        // 2. Fecha o menu de seleção
                                        setMensagemSelecionada(null);

                                        // 3. Fecha o menu de ações (se estiver aberto por hover/touch)
                                        setMostrarMenu(false); // Adicionado
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
                                        className="px-1 py-0.5 bg-[#1f1e1e] rounded-full text-xs cursor-pointer shadow-sm ml-1"
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