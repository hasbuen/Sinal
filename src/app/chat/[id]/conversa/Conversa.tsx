"use client";

import AudioPlayer from "@/components/AudioPlayer";
import MessageActions from "@/components/MessageActions";
import MessageActionsMobile from "@/components/MessageActionsMobile";
import EmojiCustom from "@/components/EmojisCustom";
import useLongPress from "@/hooks/useLongPress";
import { RefObject, useEffect, useRef, useState } from "react";
import { X, FileText, FileSpreadsheet, Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MensagemItem from "./MessageItem";

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
    setMostrarModalEmojis: React.Dispatch<React.SetStateAction<boolean>>;
    fimDasMensagens: RefObject<HTMLDivElement | null>;
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
    const [mostrarModalEmojis, setMostrarModalEmojis] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const jaRolouParaFinal = useRef(false);

    useEffect(() => {
        // Rola para o final apenas na primeira vez que as mensagens são carregadas
        // e se o scroll ainda não foi feito.
        if (!jaRolouParaFinal.current && chatContainerRef.current && mensagens.length > 0) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            jaRolouParaFinal.current = true; // Marca que o scroll já foi feito
        }
    }, [mensagens]);

    const handleScroll = () => {
        const el = chatContainerRef.current;
        if (!el) return;

        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    };

    const handleMouseUp = () => {
        handleScroll();
    };

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
                ultimoGrupo = { data: rotuloData, mensagens: [] };
                grupos.push(ultimoGrupo);
            }
            ultimoGrupo.mensagens.push(mensagem);
        });
        return grupos;
    };

    const mensagensAgrupadas = agruparMensagensPorData(mensagens);

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
        <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            className="flex-1 overflow-y-auto px-5 py-3 space-y-3 relative bg-chat-background"
        >
            {mensagensAgrupadas.map((grupo) => (
                <div key={grupo.data}>
                    <div className="sticky top-0 z-20 flex justify-center my-2">
                        <span className="bg-[#1f2937] text-white text-xs px-3 py-1 rounded-lg">{grupo.data}</span>
                    </div>
                    {grupo.mensagens.map((m) => (
                        <MensagemItem
                            key={m.id}
                            mensagem={m}
                            souEu={m.remetente === userId}
                            mensagemSelecionada={mensagemSelecionada}
                            setMensagemSelecionada={setMensagemSelecionada}
                            setResposta={setResposta}
                            setEditandoId={setEditandoId}
                            setTexto={setTexto}
                            setImagemAmpliada={setImagemAmpliada}
                            setZoomLevel={setZoomLevel}
                            setPanOffset={setPanOffset}
                            setMensagemDestacada={setMensagemDestacada}
                            mensagemRefs={mensagemRefs}
                            mensagemDestacada={mensagemDestacada}
                            userId={userId}
                            handleReact={handleReact}
                            formatarHora={formatarHora}
                        />
                    ))}
                </div>
            ))}

            <div ref={fimDasMensagens} />

            {mostrarModalEmojis && (
                <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/50">
                    <div className="bg-[#1f2937] rounded-lg p-4 max-w-md w-full">
                        <EmojiCustom
                            onEmojiClick={(emoji) => {
                                const mensagem = mensagens.find(m => m.id === mensagemSelecionada);
                                if (mensagem) handleReact(mensagem, emoji);
                                setMostrarModalEmojis(false);
                                setMensagemSelecionada(null);
                            }}
                            onClose={() => setMostrarModalEmojis(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
