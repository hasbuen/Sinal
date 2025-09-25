"use client";

import AudioPlayer from "@/components/AudioPlayer";
import MessageActions from "@/components/MessageActions";
import { RefObject } from "react";
import { X, FileText, FileSpreadsheet, Paperclip, Mic, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface MensagensAgrupadas {
    data: string;
    mensagens: Mensagem[];
}

interface ConversaProps {
    mensagens: Mensagem[];
    userId: string | null;
    mensagemSelecionada: string | null;
    mensagemDestacada: string | null;
    setResposta: (mensagem: Mensagem) => void;
    setMensagemSelecionada: (id: string | null) => void;
    setEditandoId: (id: string | null) => void;
    setTexto: (texto: string) => void;
    setImagemAmpliada: (url: string | null) => void;
    setZoomLevel: (level: number) => void;
    setPanOffset: (offset: { x: number; y: number }) => void;
    setMensagemDestacada: (id: string | null) => void;
    fimDasMensagens: RefObject<HTMLDivElement | null>
    mensagemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

export default function Conversa({
    mensagens,
    userId,
    mensagemSelecionada,
    mensagemDestacada,
    setResposta,
    setMensagemSelecionada,
    setEditandoId,
    setTexto,
    setImagemAmpliada,
    setZoomLevel,
    setPanOffset,
    setMensagemDestacada,
    fimDasMensagens,
    mensagemRefs,
}: ConversaProps) {
    const formatarHora = (dataISO: string) =>
        new Date(dataISO).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const agruparMensagensPorData = (mensagens: Mensagem[]) => {
        const grupos: MensagensAgrupadas[] = [];
        let ultimoGrupo: MensagensAgrupadas | null = null;
        mensagens.forEach(mensagem => {
            const dataMensagem = new Date(mensagem.criado_em);
            const dataFormatada = dataMensagem.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
            const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            const ontemFormatado = ontem.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
            const rotuloData = dataFormatada === hoje ? "Hoje" : dataFormatada === ontemFormatado ? "Ontem" : dataFormatada;
            if (!ultimoGrupo || ultimoGrupo.data !== rotuloData) {
                ultimoGrupo = {
                    data: rotuloData,
                    mensagens: [],
                };
                grupos.push(ultimoGrupo);
            }
            ultimoGrupo.mensagens.push(mensagem);
        });
        return grupos;
    };
    const mensagensAgrupadas = agruparMensagensPorData(mensagens);

    const rolarParaMensagemOriginal = (mensagemId: string) => {
        const mensagemElemento = mensagemRefs.current.get(mensagemId);
        if (mensagemElemento) {
            mensagemElemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setMensagemDestacada(mensagemId);
        }
    };

    const handleReact = async (mensagem: Mensagem, emoji: string) => {
        if (!userId) return;
        const reacaoExistente = mensagem.reacoes?.find(r => r.remetente === userId && r.emoji === emoji);
        if (reacaoExistente) {
            await supabase.from("mensagens_reacoes").delete().eq("id", reacaoExistente.id);
        } else {
            await supabase.from("mensagens_reacoes").insert({
                mensagem_id: mensagem.id,
                remetente: userId,
                emoji: emoji,
            });
        }
    };
    
    return (
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 relative bg-chat-background">
            {mensagensAgrupadas.map((grupo) => (
                <div key={grupo.data}>
                    <div className="sticky top-0 z-20 flex justify-center my-2">
                        <span className="bg-[#1f2937] text-white text-xs px-3 py-1 rounded-lg">{grupo.data}</span>
                    </div>
                    {grupo.mensagens.map((m) => {
                        const souEu = m.remetente === userId;
                        const tipo = m.tipo ?? "texto";
                        const reacoesAgrupadas = m.reacoes?.reduce((acc, reacao) => {
                            if (!acc[reacao.emoji]) {
                                acc[reacao.emoji] = [];
                            }
                            acc[reacao.emoji].push(reacao);
                            return acc;
                        }, {} as Record<string, typeof m.reacoes>);
                        const [conteudoDaMensagem, legendaDaMensagem] = m.conteudo?.split("|SEPARATOR|") || ["", ""];
                        
                        return (
                            <div
                                key={m.id}
                                ref={(el) => { if (el) mensagemRefs.current.set(m.id, el); }}
                                className={`flex ${souEu ? "justify-end" : "justify-start"}
                                    ${mensagemDestacada === m.id ? 'destaque-mensagem' : ''}`}
                            >
                                <div
                                    className={`max-w-[75%] px-3 pt-2 pb-5 text-sm whitespace-pre-wrap break-words relative
                                        ${souEu ? "rounded-l-2xl rounded-tr-2xl bg-[#005c4b] text-white self-end shadow-md" : "rounded-r-2xl rounded-tl-2xl bg-[#202c33] text-white self-start shadow-md"}`}
                                >
                                    {m.resposta && (
                                        <div
                                            className="mb-1 p-2 rounded-lg bg-white/10 text-xs border-l-4 border-white/50 cursor-pointer"
                                            onClick={() => m.resposta_id && rolarParaMensagemOriginal(m.resposta_id)}
                                        >
                                            <span className="block font-semibold">Mensagem original:</span>
                                            {m.resposta.tipo === "texto" && <span className="block truncate">{m.resposta.conteudo}</span>}
                                            {m.resposta.tipo === "imagem" && <span className="italic opacity-80">📷 Imagem</span>}
                                            {m.resposta.tipo === "audio" && <span className="italic opacity-80">🎤 Áudio</span>}
                                            {m.resposta.tipo === "anexo" && <span className="italic opacity-80">📎 Anexo</span>}
                                        </div>
                                    )}
                                    {tipo === "texto" ? (
                                        <span>{m.conteudo}</span>
                                    ) : tipo === "imagem" ? (
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
                                            {legendaDaMensagem && (
                                                <span className="block mt-2 text-xs opacity-90">{legendaDaMensagem}</span>
                                            )}
                                        </>
                                    ) : tipo === "audio" ? (
                                        <>
                                            <AudioPlayer src={conteudoDaMensagem} />
                                            {legendaDaMensagem && (
                                                <span className="block mt-2 text-xs opacity-90">{legendaDaMensagem}</span>
                                            )}
                                        </>
                                    ) : tipo === "anexo" ? (
                                        <a href={conteudoDaMensagem} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-white/10 rounded-md">
                                            {conteudoDaMensagem.includes('.pdf') ? <FileText className="w-5 h-5" /> : conteudoDaMensagem.includes('.xlsx') || conteudoDaMensagem.includes('.xls') ? <FileSpreadsheet className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                                            <span className="underline">{conteudoDaMensagem.split('/').pop()}</span>
                                            {legendaDaMensagem && (
                                                <span className="block mt-2 text-xs opacity-90">{legendaDaMensagem}</span>
                                            )}
                                        </a>
                                    ) : null}
                                    {Object.keys(reacoesAgrupadas || {}).length > 0 && (
                                        <div className="flex gap-1 absolute bottom-1 -left-2 transform -translate-x-full">
                                            {Object.entries(reacoesAgrupadas || {}).map(([emoji, reacoes]) => (
                                                <span
                                                    key={emoji}
                                                    className="px-1 py-0.5 bg-gray-700 rounded-full text-sm cursor-pointer"
                                                    onClick={() => handleReact(m, emoji)}
                                                >
                                                    {emoji} {reacoes?.length > 1 ? reacoes.length : ''}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <span className="absolute bottom-1 right-2 text-[10px] opacity-70">{formatarHora(m.criado_em)}</span>
                                    {mensagemSelecionada === m.id && (
                                        <div
                                            className={`absolute top-1 z-30 ${souEu ? "right-[100%] pr-2" : "left-[100%] pl-2"}`}
                                        >
                                            <MessageActions
                                                souEu={souEu}
                                                mensagem={m}
                                                onReply={() => { setResposta(m); setMensagemSelecionada(null); }}
                                                onEdit={() => {
                                                    if (souEu) {
                                                        setEditandoId(m.id);
                                                        setTexto(m.conteudo);
                                                        setMensagemSelecionada(null);
                                                    }
                                                }}
                                                onDelete={() => {
                                                    if (souEu) {
                                                        supabase.from("mensagens").delete().eq("id", m.id);
                                                        setMensagemSelecionada(null);
                                                    }
                                                }}
                                                onReact={(emoji: string) => { handleReact(m, emoji); setMensagemSelecionada(null); }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
            <div ref={fimDasMensagens} />
        </div>
    );
}