"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Paperclip, Mic, X, SendHorizonal, Camera, Smile, FileText, FileSpreadsheet } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import useLongPress from "@/hooks/useLongPress";
import EmojiBoard from "@/components/EmojisCustom";
import MessageActions from "@/components/MessageActions";
import { toast } from 'sonner'; // Importa o toast da Sonner

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

interface Rascunho {
    tipo: "texto" | "imagem" | "audio" | "anexo";
    conteudo: string;
    legenda?: string;
    file?: File | Blob;
}

const sanitizeFilename = (filename: string): string => {
    let cleaned = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    cleaned = cleaned.replace(/[^a-zA-Z0-9.]/g, "-");
    cleaned = cleaned.replace(/--+/g, "-");
    cleaned = cleaned.replace(/^-+|-+$/g, "");
    return cleaned;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
    const [statusOutroUsuario, setStatusOutroUsuario] = useState<string | null>(null);
    const [resposta, setResposta] = useState<Mensagem | null>(null);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
    const [mensagemSelecionada, setMensagemSelecionada] = useState<string | null>(null);
    const [mensagemDestacada, setMensagemDestacada] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const fileRef = useRef<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const lastTapRef = useRef<number | null>(null);
    const lastTapXY = useRef<{ x: number, y: number } | null>(null);
    const ignoreOutsideClick = useRef(false);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ignoreOutsideClick.current) return;
            if (mensagemSelecionada && !document.elementFromPoint(e.clientX, e.clientY)?.closest('.menu-suspenso-chat')) {
                setMensagemSelecionada(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mensagemSelecionada]);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const panStartRef = useRef<{ x: number; y: number } | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);
    const fimDasMensagens = useRef<HTMLDivElement>(null);
    const mensagemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [mostrarModalEmojis, setMostrarModalEmojis] = useState(false);
    const emojiModalRef = useRef<HTMLDivElement>(null);
    const dragStartY = useRef<number | null>(null);

    useEffect(() => {
        if (!mostrarModalEmojis) return;
        function handleClickOutside(event: MouseEvent) {
            if (emojiModalRef.current && !emojiModalRef.current.contains(event.target as Node)) {
                setMostrarModalEmojis(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mostrarModalEmojis]);

    const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        dragStartY.current = clientY;
    }, []);

    const handleDragEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (dragStartY.current === null) return;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;
        if (clientY - dragStartY.current > 60) {
            setMostrarModalEmojis(false);
        }
        dragStartY.current = null;
    }, []);
    const [rascunhoParaEnviar, setRascunhoParaEnviar] = useState<Rascunho | null>(null);
    const [legenda, setLegenda] = useState("");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    useEffect(() => {
        mensagensRef.current = mensagens;
    }, [mensagens]);

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

    useEffect(() => {
        if (!destinatarioId || !userId) return;

        supabase.getChannels().forEach((ch: any) => {
            if (ch.topic && ch.topic.includes('status-chat-')) {
                supabase.removeChannel(ch);
            }
        });

        const canal = supabase
            .channel('status-chat-' + destinatarioId + '-' + userId)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'status_chat',
                filter: `usuario_id=eq.${destinatarioId}&destinatario_id=eq.${userId}`
            }, (payload: any) => {
                console.log("Evento realtime recebido:", payload);
                if (payload.eventType === 'DELETE') {
                    setStatusOutroUsuario(null);
                } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setStatusOutroUsuario(payload?.new?.status || null);
                }
            })
            .subscribe();

        const fetchStatusInicial = async () => {
            const { data } = await supabase
                .from('status_chat')
                .select('status')
                .eq('usuario_id', destinatarioId)
                .eq('destinatario_id', userId)
                .single();
            setStatusOutroUsuario(data?.status || null);
        };
        fetchStatusInicial();

        return () => {
            supabase.removeChannel(canal);
        };
    }, [destinatarioId, userId]);

    const atualizarStatus = async (status: string | null) => {
        if (!userId) return;
        if (status) {
            await supabase.from("status_chat").upsert({
                usuario_id: userId,
                destinatario_id: destinatarioId,
                status: status,
                atualizado_em: new Date().toISOString(),
            }, { onConflict: "usuario_id,destinatario_id" });
        }
    };

    const removerStatus = async () => {
        if (!userId) return;
        await supabase.from("status_chat")
            .delete()
            .eq("usuario_id", userId)
            .eq("destinatario_id", destinatarioId);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const novoTexto = e.target.value;
        setTexto(novoTexto);

        if (novoTexto.length > 0) {
            atualizarStatus("digitando");
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                removerStatus();
            }, 2000);
        } else {
            removerStatus();
        }
    };

    const marcarMensagensComoLidas = async () => {
        if (!userId || !destinatarioId) return;
        await supabase
            .from("mensagens")
            .update({ lida: true })
            .eq("remetente", destinatarioId)
            .eq("destinatario", userId)
            .eq("lida", false);
    };

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
    };

    useEffect(() => {
        fetchAndSyncMessages();
        const intervalId = setInterval(fetchAndSyncMessages, 2000);
        return () => clearInterval(intervalId);
    }, [destinatarioId, userId]);

    const enviarMensagem = async (
        tipo: "texto" | "imagem" | "audio" | "anexo" = "texto",
        conteudo?: string,
        file?: File | Blob
    ) => {
        if (!destinatarioId || !userId) return;

        setIsUploading(true);
        let conteudoParaSalvar = conteudo;

        try {
            if (file) {
                const sanitizedFilename = sanitizeFilename(file instanceof File ? file.name : 'audio.webm');
                const filePath = `${tipo}s/${Date.now()}-${sanitizedFilename}`;

                const { error } = await supabase.storage.from("uploads").upload(filePath, file, {
                    contentType: file instanceof File ? file.type : 'audio/webm'
                });
                if (error) {
                    console.error("Erro ao fazer upload:", error.message);
                    throw error;
                }
                const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
                const url = data?.publicUrl;
                if (url) {
                    conteudoParaSalvar = conteudo ? `${url}|SEPARATOR|${conteudo}` : url;
                } else {
                    console.error("URL do arquivo não encontrada.");
                    throw new Error("URL do arquivo não encontrada.");
                }
            }

            if (editandoId) {
                await supabase
                    .from("mensagens")
                    .update({ conteudo: conteudoParaSalvar || texto })
                    .eq("id", editandoId);
                setEditandoId(null);
            } else {
                await supabase.from("mensagens").insert({
                    remetente: userId,
                    destinatario: destinatarioId,
                    conteudo: conteudoParaSalvar,
                    tipo: tipo,
                    resposta_id: resposta?.id || null,
                });
            }
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
        } finally {
            setIsUploading(false);
            setTexto("");
            setResposta(null);
            setRascunhoParaEnviar(null);
            setLegenda("");
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
                setImagePreviewUrl(null);
            }
            fileRef.current = null;
            removerStatus();
        }
    };

    const toggleGravacao = async () => {
        if (!gravando) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                chunks.current = [];
                mediaRecorderRef.current.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.current.push(e.data);
                };
                mediaRecorderRef.current.onstop = () => {
                    const audioBlob = new Blob(chunks.current, { type: "audio/webm" });
                    setRascunhoParaEnviar({
                        tipo: "audio",
                        conteudo: URL.createObjectURL(audioBlob),
                        file: audioBlob,
                    });
                    stream.getTracks().forEach(track => track.stop());
                };
                mediaRecorderRef.current.start();
                setGravando(true);
                atualizarStatus("gravando");
            } catch (error) {
                console.error("Erro ao acessar microfone:", error);
            }
        } else {
            mediaRecorderRef.current?.stop();
            setGravando(false);
            removerStatus();
        }
    };

    const formatarHora = (dataISO: string) =>
        new Date(dataISO).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const handleWheel = (e: React.WheelEvent<HTMLImageElement>) => {
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
                y: e.clientY - panOffset.y,
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

    const handleCameraClick = () => {
        document.getElementById("camera-input")?.click();
    };

    const handleAnexoClick = () => {
        document.getElementById("anexo-input")?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            if (file.size > MAX_FILE_SIZE) {
                toast.error("O arquivo é muito grande. O limite é de 50 MB.");
                // Limpa o input para permitir que o mesmo arquivo seja selecionado novamente após a tentativa
                e.target.value = ""; 
                return;
            }

            fileRef.current = file;

            if (file.type.startsWith("image/")) {
                setImagePreviewUrl(URL.createObjectURL(file));
                setRascunhoParaEnviar({
                    tipo: "imagem",
                    conteudo: file.name,
                    file: file,
                });
                setLegenda("");
            } else {
                setImagePreviewUrl(null);
                setRascunhoParaEnviar({
                    tipo: "anexo",
                    conteudo: file.name,
                    file: file,
                });
                setLegenda("");
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const items = e.clipboardData?.items;
        if (items) {
            for (const item of items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) {
                        if (file.size > MAX_FILE_SIZE) {
                             toast.error("O arquivo é muito grande. O limite é de 50 MB.");
                            e.preventDefault(); // Impede a ação padrão de colar
                            return;
                        }

                        e.preventDefault();
                        fileRef.current = file;

                        if (file.type.startsWith('image/')) {
                            setImagePreviewUrl(URL.createObjectURL(file));
                            setRascunhoParaEnviar({
                                tipo: "imagem",
                                conteudo: file.name || `imagem-colada-${Date.now()}.png`,
                                file: file,
                            });
                        } else {
                            setImagePreviewUrl(null);
                            setRascunhoParaEnviar({
                                tipo: "anexo",
                                conteudo: file.name || `arquivo-colado-${Date.now()}.${file.name.split('.').pop() || 'dat'}`,
                                file: file,
                            });
                        }
                        setLegenda("");
                        return;
                    }
                }
            }
        }
    };

    const handleSendDraft = async () => {
        if (!rascunhoParaEnviar) return;
        await enviarMensagem(rascunhoParaEnviar.tipo, legenda.trim(), rascunhoParaEnviar.file);
        setRascunhoParaEnviar(null);
        setLegenda("");
        removerStatus();
    };

    const handleCancelDraft = () => {
        setRascunhoParaEnviar(null);
        setLegenda("");
        setTexto("");
        setMostrarModalEmojis(false);
        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
            setImagePreviewUrl(null);
        }
        fileRef.current = null;
        removerStatus();
    };

    const onEmojiClick = (emojiData: any) => {
        const novoTexto = texto + emojiData.emoji;
        setTexto(novoTexto);
        atualizarStatus("digitando");
    };

    return (
        <div className="flex flex-col h-screen bg-[#0b1419]">
            {isUploading && (
                <div className="fixed top-0 left-0 w-full h-1 bg-green-500 z-50 animate-pulse" />
            )}
            <div className="flex items-center gap-3 p-3 bg-[#1f2937] text-white shadow-md z-10">
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden text-white hover:text-gray-300">
                        <ArrowLeft />
                    </Button>
                )}
                {destinatario?.foto_url && <img src={destinatario.foto_url} alt={destinatario.nome} className="w-10 h-10 rounded-full object-cover" />}
                <div>
                    <h2 className="text-lg font-semibold">{destinatario?.nome}</h2>
                    <p className="text-xs opacity-70">
                        {statusOutroUsuario === 'digitando' && <span className="text-green-400 animate-pulse">Digitando...</span>}
                        {statusOutroUsuario === 'gravando' && <span className="text-green-400 animate-pulse flex items-center gap-1"><Mic className="inline w-4 h-4 text-green-400" /> Gravando áudio</span>}
                        {!statusOutroUsuario && destinatario?.status}
                    </p>
                </div>
            </div>
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

                            const nomeArquivo = conteudoDaMensagem.split('/').pop()?.split('?')[0];
                            const extensao = nomeArquivo?.split('.').pop()?.toLowerCase();

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
                                        onDoubleClick={() => setMensagemSelecionada(m.id)}
                                        onTouchStart={(e) => {
                                            e.stopPropagation();
                                            const now = Date.now();
                                            const touch = e.touches[0];
                                            const x = touch.clientX;
                                            const y = touch.clientY;
                                            if (
                                                lastTapRef.current &&
                                                now - lastTapRef.current < 350 &&
                                                lastTapXY.current &&
                                                Math.abs(lastTapXY.current.x - x) < 30 &&
                                                Math.abs(lastTapXY.current.y - y) < 30
                                            ) {
                                                setMensagemSelecionada(m.id);
                                                ignoreOutsideClick.current = true;
                                                setTimeout(() => { ignoreOutsideClick.current = false; }, 120);
                                                lastTapRef.current = null;
                                                lastTapXY.current = null;
                                            } else {
                                                lastTapRef.current = now;
                                                lastTapXY.current = { x, y };
                                            }
                                        }}
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
                                            <>
                                                {['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(extensao || '') ? (
                                                    <a
                                                        href={conteudoDaMensagem}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 p-2 rounded-md bg-[#00a884] text-white hover:bg-[#008f72] transition-colors duration-200"
                                                        download
                                                    >
                                                        {extensao === 'pdf' && <FileText className="h-4 w-4" />}
                                                        {['doc', 'docx'].includes(extensao || '') && <FileText className="h-4 w-4" />}
                                                        {['xls', 'xlsx'].includes(extensao || '') && <FileSpreadsheet className="h-4 w-4" />}
                                                        <span>BAIXAR {extensao?.toUpperCase()}</span>
                                                    </a>
                                                ) : (
                                                    <a href={conteudoDaMensagem} target="_blank" rel="noopener noreferrer" className="text-white underline">
                                                        📎 Anexo: {nomeArquivo}
                                                    </a>
                                                )}
                                                {legendaDaMensagem && (
                                                    <span className="block mt-2 text-xs opacity-90">{legendaDaMensagem}</span>
                                                )}
                                            </>
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
            {imagemAmpliada && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-8 touch-none"
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
            <div className={`p-2 bg-[#202c33] transition-transform duration-300 ease-in-out ${mostrarModalEmojis ? 'transform-none' : 'transform translate-y-full'}`}>
                {mostrarModalEmojis && (
                    <div
                        ref={emojiModalRef}
                        className="mx-auto w-full max-w-md bg-[#1f2937] rounded-lg p-6 flex flex-col touch-none select-none"
                        onMouseDown={handleDragStart}
                        onMouseUp={handleDragEnd}
                        onTouchStart={handleDragStart}
                        onTouchEnd={handleDragEnd}
                    >
                        <EmojiBoard
                            onEmojiClick={(emoji) => {
                                if (emoji) {
                                    if (rascunhoParaEnviar) {
                                        setLegenda((prev) => prev + emoji);
                                    } else {
                                        setTexto((prev) => prev + emoji);
                                    }
                                }
                                setMostrarModalEmojis(false);
                            }}
                        />
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-2 p-4 bg-[#202c33] transition-transform duration-300 ease-in-out">
                {(resposta || rascunhoParaEnviar) && (
                    <div className="p-2 bg-[#1f2937] border-l-4 border-green-500 flex justify-between items-center rounded-md">
                        <div className="text-xs text-gray-300 flex-1">
                            {resposta && (
                                <div className="mb-2">
                                    <span className="block font-semibold">Respondendo:</span>
                                    {resposta.tipo === "texto" && <span className="block truncate">{resposta.conteudo}</span>}
                                    {resposta.tipo === "imagem" && <span className="italic opacity-80">📷 Imagem</span>}
                                    {resposta.tipo === "audio" && <span className="italic opacity-80">🎤 Áudio</span>}
                                    {resposta.tipo === "anexo" && <span className="italic opacity-80">📎 Anexo</span>}
                                </div>
                            )}
                            {rascunhoParaEnviar && (
                                <div className="flex items-center gap-2">
                                    {rascunhoParaEnviar.tipo === "imagem" && <img src={imagePreviewUrl || ''} alt="Prévia" className="w-20 h-20 rounded-md object-cover" />}
                                    {rascunhoParaEnviar.tipo === "audio" && <AudioPlayer src={rascunhoParaEnviar.conteudo} />}
                                    {rascunhoParaEnviar.tipo === "anexo" && (
                                        <span className="italic opacity-80 flex items-center gap-2">
                                            <Paperclip className="h-4 w-4" /> {rascunhoParaEnviar.conteudo}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        {rascunhoParaEnviar && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelDraft}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        )}
                        {resposta && !rascunhoParaEnviar && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setResposta(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        )}
                    </div>
                )}
                <div className="flex items-end gap-4">
                    <div className="flex-1 flex items-end bg-[#2a3942] rounded-full px-4 py-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMostrarModalEmojis(!mostrarModalEmojis)}
                            className="text-gray-400 hover:text-white"
                        >
                            <Smile className="w-6 h-6" />
                        </Button>
                        <Input
                            ref={inputRef}
                            type="text"
                            value={rascunhoParaEnviar ? legenda : texto}
                            onChange={rascunhoParaEnviar ? (e) => setLegenda(e.target.value) : handleTextChange}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    if (rascunhoParaEnviar) {
                                        handleSendDraft();
                                    } else if (texto.trim()) {
                                        enviarMensagem("texto", texto);
                                    }
                                }
                            }}
                            onPaste={handlePaste}
                            placeholder={rascunhoParaEnviar ? "Adicione uma legenda..." : "Digite uma mensagem"}
                            className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 placeholder:text-gray-500 resize-none overflow-hidden h-auto max-h-40 px-2 py-0"
                            style={{ paddingTop: '8px', paddingBottom: '8px' }}
                        />
                        {!rascunhoParaEnviar && !texto.trim() && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleAnexoClick}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <Paperclip className="h-6 w-6" />
                                    <input
                                        id="anexo-input"
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-400 hover:text-white"
                                    onClick={handleCameraClick}
                                >
                                    <Camera className="h-6 w-6" />
                                    <input
                                        id="camera-input"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </Button>
                            </>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-[#00a884] rounded-full w-12 h-12 p-3 hover:bg-[#008f72] transition-colors duration-200"
                        onClick={rascunhoParaEnviar ? handleSendDraft : (texto.trim() ? () => enviarMensagem("texto", texto) : toggleGravacao)}
                    >
                        {(texto.trim() || rascunhoParaEnviar) ? (
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