"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Paperclip, Mic, X, SendHorizonal, Camera } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import MessageActions from "@/components/MessageActions";
import useLongPress from "@/hooks/useLongPress";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import Image from "next/image";

interface Mensagem {
    id: string;
    remetente: string;
    destinatario: string;
    conteudo: string;
    criado_em: string;
    tipo?: "texto" | "imagem" | "audio" | null;
    resposta_id?: string | null;
    resposta?: {
        conteudo: string;
        tipo: "texto" | "imagem" | "audio" | null;
    } | null;
    reacoes?: {
        id: string;
        remetente: string;
        emoji: string;
        mensagem_id: string;
    }[];
}

interface Usuario {
    id: string;
    nome: string;
    foto_url: string | null;
    status: string;
}

interface MensagensAgrupadas {
    data: string;
    mensagens: Mensagem[];
}

export default function ChatComponent({
    destinatarioId,
    onClose,
}: {
    destinatarioId: string;
    onClose?: () => void;
}) {
    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const mensagensRef = useRef<Mensagem[]>([]);
    const [texto, setTexto] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [destinatario, setDestinatario] = useState<Usuario | null>(null);
    const [gravando, setGravando] = useState(false);
    const [resposta, setResposta] = useState<Mensagem | null>(null);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
    const [mensagemSelecionada, setMensagemSelecionada] = useState<string | null>(null);
    const [mensagemDestacada, setMensagemDestacada] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const panStartRef = useRef<{ x: number; y: number } | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);
    const fimDasMensagens = useRef<HTMLDivElement>(null);
    const mensagemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [mostrarModalEmojis, setMostrarModalEmojis] = useState(false);

    useEffect(() => {
        mensagensRef.current = mensagens;
    }, [mensagens]);

    const marcarMensagensComoLidas = async () => {
        if (!userId || !destinatarioId) return;

        await supabase
            .from("mensagens")
            .update({ lida: true })
            .eq("remetente", destinatarioId)
            .eq("destinatario", userId)
            .eq("lida", false);
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUserId(data.user?.id ?? null);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (!destinatarioId) return;
        const carregarUsuario = async () => {
            const { data } = await supabase
                .from("perfis")
                .select("id, nome, foto_url, status")
                .eq("id", destinatarioId)
                .single();
            if (data) setDestinatario(data);
        };
        carregarUsuario();
    }, [destinatarioId]);

    const fetchAndSyncMessages = async () => {
        if (!destinatarioId || !userId) return;

        const { data, error } = await supabase
            .from("mensagens")
            .select(
                `
                *,
                resposta:resposta_id(conteudo, tipo),
                reacoes:mensagens_reacoes(id, remetente, emoji, mensagem_id)
                `
            )
            .order("criado_em", { ascending: true });

        if (error) {
            console.error("Erro ao buscar mensagens:", error.message);
            return;
        }

        const mensagensDoChat = (data || []).filter(
            (m: Mensagem) =>
                (m.remetente === userId && m.destinatario === destinatarioId) ||
                (m.remetente === destinatarioId && m.destinatario === userId)
        );

        const isSameChat = mensagensRef.current.some(m => mensagensDoChat.some(nm => nm.id === m.id));
        
        if (!isSameChat || mensagensRef.current.length === 0) {
            setMensagens(mensagensDoChat);
        } else {
            const novasMensagens = mensagensDoChat.filter(
                (m) => !mensagensRef.current.some((existing) => existing.id === m.id)
            );

            const reacoesAtualizadas = mensagensDoChat.filter(
                (m) => {
                    const mensagemAntiga = mensagensRef.current.find((existing) => existing.id === m.id);
                    return (
                        mensagemAntiga &&
                        JSON.stringify(m.reacoes) !== JSON.stringify(mensagemAntiga.reacoes)
                    );
                }
            );

            if (novasMensagens.length > 0) {
                setMensagens((prev) => [...prev, ...novasMensagens]);
                novasMensagens.forEach((msg) => {
                    if (msg.remetente !== userId) {
                        marcarMensagensComoLidas();
                    }
                });
            }

            if (reacoesAtualizadas.length > 0) {
                setMensagens((prev) => prev.map((msg) => {
                    const reacaoAtualizada = reacoesAtualizadas.find((m) => m.id === msg.id);
                    return reacaoAtualizada ? { ...msg, reacoes: reacaoAtualizada.reacoes } : msg;
                }));
            }
        }
    };

    useEffect(() => {
        fetchAndSyncMessages();
        const intervalId = setInterval(fetchAndSyncMessages, 2000);

        return () => clearInterval(intervalId);
    }, [destinatarioId, userId]);

    useEffect(() => {
        fimDasMensagens.current?.scrollIntoView({ behavior: "smooth" });
    }, [mensagens]);

    useEffect(() => {
        if (mensagemDestacada) {
            const timer = setTimeout(() => {
                setMensagemDestacada(null);
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [mensagemDestacada]);

    const enviarMensagem = async (
        tipo: "texto" | "imagem" | "audio" = "texto",
        conteudo?: string
    ) => {
        if ((!texto.trim() && !conteudo) || !destinatarioId || !userId) return;

        if (editandoId) {
            await supabase
                .from("mensagens")
                .update({ conteudo: conteudo || texto })
                .eq("id", editandoId);
            setEditandoId(null);
        } else {
            await supabase.from("mensagens").insert({
                remetente: userId,
                destinatario: destinatarioId,
                conteudo: conteudo || texto,
                tipo: tipo ?? "texto",
                resposta_id: resposta?.id || null,
            });
        }

        setTexto("");
        setResposta(null);
        fetchAndSyncMessages();
    };

    const enviarImagem = async (file: File) => {
        const filePath = `imagens/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("uploads").upload(filePath, file);
        if (error) return console.error(error.message);
        const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
        if (data?.publicUrl) enviarMensagem("imagem", data.publicUrl);
    };

    const toggleGravacao = async () => {
        if (!gravando) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunks.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunks.current, { type: "audio/webm" });
                const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
                const filePath = `audios/${file.name}`;
                const { error } = await supabase.storage.from("uploads").upload(filePath, file);
                if (error) return console.error(error.message);
                const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
                if (data?.publicUrl) enviarMensagem("audio", data.publicUrl);
            };
            mediaRecorderRef.current.start();
            setGravando(true);
        } else {
            mediaRecorderRef.current?.stop();
            setGravando(false);
        }
    };

    const formatarHora = (dataISO: string) =>
        new Date(dataISO).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const handleWheel = (e: React.WheelEvent<HTMLImageElement>) => {
        e.preventDefault();
        const newZoomLevel = Math.max(0.5, Math.min(3, zoomLevel + e.deltaY * -0.01));
        setZoomLevel(newZoomLevel);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
        e.preventDefault();
        if (zoomLevel > 1) {
            panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
        if (panStartRef.current) {
            const newPanOffset = {
                x: e.clientX - panStartRef.current.x,
                y: e.clientY - panStartRef.current.y,
            };
            setPanOffset(newPanOffset);
        }
    };

    const handleMouseUp = () => {
        panStartRef.current = null;
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
        fetchAndSyncMessages();
    };

    const bind = useLongPress(() => {
        setMensagemSelecionada(mensagemSelecionada);
    }, { threshold: 500 });

    const rolarParaMensagemOriginal = (mensagemId: string) => {
        const mensagemElemento = mensagemRefs.current.get(mensagemId);
        if (mensagemElemento) {
            mensagemElemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setMensagemDestacada(mensagemId);
        }
    };

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

    return (
        <div className="flex flex-col h-screen bg-[#0b1419]">
            <div className="flex items-center gap-3 p-3 bg-[#1f2937] text-white shadow-md z-10">
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden text-white hover:text-gray-300">
                        <ArrowLeft />
                    </Button>
                )}
                {destinatario?.foto_url && <img src={destinatario.foto_url} alt={destinatario.nome} className="w-10 h-10 rounded-full object-cover" />}
                <div>
                    <h2 className="text-lg font-semibold">{destinatario?.nome}</h2>
                    <p className="text-xs opacity-70">{destinatario?.status}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative bg-chat-background">
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
                                        onMouseDown={() => setMensagemSelecionada(m.id)}
                                        onTouchStart={() => setMensagemSelecionada(m.id)}
                                        onMouseLeave={() => setMensagemSelecionada(null)}
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
                                            </div>
                                        )}

                                        {editandoId === m.id ? (
                                            <Input
                                                value={texto}
                                                onChange={(e) => setTexto(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        enviarMensagem("texto");
                                                    }
                                                }}
                                                className="w-full text-black bg-white rounded-md p-2"
                                            />
                                        ) : tipo === "texto" ? (
                                            <span>{m.conteudo}</span>
                                        ) : tipo === "imagem" ? (
                                            <img
                                                src={m.conteudo}
                                                className="rounded-md max-w-[200px] cursor-pointer"
                                                onClick={() => {
                                                    setImagemAmpliada(m.conteudo);
                                                    setZoomLevel(1);
                                                    setPanOffset({ x: 0, y: 0 });
                                                }}
                                            />
                                        ) : tipo === "audio" ? (
                                            <AudioPlayer src={m.conteudo} />
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
                                                className={`absolute top-1 z-10 ${souEu ? "right-[100%] pr-2" : "left-[100%] pl-2"}`}
                                                onMouseLeave={() => setMensagemSelecionada(null)}
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

            {imagemAmpliada && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4 touch-none"
                    onClick={() => setImagemAmpliada(null)}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    <img
                        src={imagemAmpliada}
                        alt="Imagem ampliada"
                        className="cursor-move max-w-full max-h-full"
                        style={{
                            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                            transition: panStartRef.current ? 'none' : 'transform 0.1s ease-out'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 text-white hover:bg-white/20"
                        onClick={() => setImagemAmpliada(null)}
                    >
                        <X className="w-6 h-6" />
                    </Button>
                </div>
            )}

            <div className="relative p-2 bg-[#202c33] flex flex-col gap-2">
                {resposta && (
                    <div className="p-2 bg-[#1f2937] border-l-4 border-green-500 flex justify-between items-center rounded-md">
                        <div className="text-xs text-gray-300">
                            <span className="block font-semibold">Respondendo:</span>
                            {resposta.tipo === "texto" && <span className="block truncate">{resposta.conteudo}</span>}
                            {resposta.tipo === "imagem" && <span className="italic opacity-80">📷 Imagem</span>}
                            {resposta.tipo === "audio" && <span className="italic opacity-80">🎤 Áudio</span>}
                        </div>
                        <X onClick={() => setResposta(null)} className="w-4 h-4 cursor-pointer text-gray-400 hover:text-white" />
                    </div>
                )}

                {mostrarModalEmojis && (
                    <div className="absolute bottom-[calc(100%+8px)] left-0 w-full z-50">
                        <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={(emojiData: any) => {
                                setTexto((prev) => prev + emojiData.emoji);
                            }}
                            width="100%"
                            height={300}
                        />
                    </div>
                )}

                {/* Barra de input e botão de ação redesenhados */}
                <div className="flex items-end gap-2">
                    <div className="flex-1 flex items-end bg-[#2a3942] rounded-full px-4 py-2">
                        {/* Botão de Emoji */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMostrarModalEmojis(!mostrarModalEmojis)}
                            className="text-gray-400 hover:text-white"
                        >
                            <Smile className="w-6 h-6" />
                        </Button>
                        {/* Campo de Input */}
                        <Input
                            type="text"
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && texto.trim()) {
                                    e.preventDefault();
                                    enviarMensagem("texto");
                                }
                            }}
                            placeholder="Type a message"
                            className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 placeholder:text-gray-500 resize-none overflow-hidden h-auto max-h-40 px-2 py-0"
                            style={{ paddingTop: '8px', paddingBottom: '8px' }}
                        />
                        {/* Botões de Anexo e Câmera */}
                        {!texto.trim() && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => document.getElementById("anexo-input")?.click()}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <Paperclip className="h-6 w-6" />
                                    <input
                                        id="anexo-input"
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => e.target.files?.[0] && enviarImagem(e.target.files[0])}
                                    />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-400 hover:text-white"
                                >
                                    <Camera className="h-6 w-6" />
                                </Button>
                            </>
                        )}
                    </div>
                    {/* Botão de Microfone ou Enviar */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-[#00a884] rounded-full w-12 h-12 p-3 hover:bg-[#008f72] transition-colors duration-200"
                        onClick={texto.trim() ? () => enviarMensagem("texto") : toggleGravacao}
                    >
                        {texto.trim() ? (
                            <SendHorizonal className="h-6 w-6 text-white" />
                        ) : (
                            <Mic className={`h-6 w-6 ${gravando ? "text-red-500" : "text-white"}`} />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}