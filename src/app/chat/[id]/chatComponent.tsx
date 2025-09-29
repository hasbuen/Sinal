"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Paperclip, Mic, X, SendHorizonal, Camera, Smile, FileText, FileSpreadsheet, MessageCircleMore, TableOfContents } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import EmojiBoard from "@/components/EmojisCustom";
import Conversa from "./conversa/Conversa";
import Compartilhamento from "./compartilhamento/Compartilhamento";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const sanitizeFilename = (filename: string): string => {
    let cleaned = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    cleaned = cleaned.replace(/[^a-zA-Z0-9.]/g, "-");
    cleaned = cleaned.replace(/--+/g, "-");
    cleaned = cleaned.replace(/^-+|-+$/g, "");
    return cleaned;
};

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
    const [abaAtiva, setAbaAtiva] = useState("chat");

    const fimDasMensagens = useRef<HTMLDivElement>(null);
    const mensagemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const [mostrarModalEmojis, setMostrarModalEmojis] = useState(false);
    const emojiModalRef = useRef<HTMLDivElement>(null);
    const dragStartY = useRef<number | null>(null);
    const [rascunhoParaEnviar, setRascunhoParaEnviar] = useState<Rascunho | null>(null);
    const [legenda, setLegenda] = useState("");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [arquivos, setArquivos] = useState<Mensagem[]>([]);

    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const panStartRef = useRef<{ x: number; y: number } | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);

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
            if (ch.topic && ch.topic.includes("status-chat-")) {
                supabase.removeChannel(ch);
            }
        });
        const canal = supabase
            .channel("status-chat-" + destinatarioId + "-" + userId)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "status_chat",
                    filter: `usuario_id=eq.${destinatarioId}&destinatario_id=eq.${userId}`,
                },
                (payload: any) => {
                    if (payload.eventType === "DELETE") {
                        setStatusOutroUsuario(null);
                    } else if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
                        setStatusOutroUsuario(payload?.new?.status || null);
                    }
                }
            )
            .subscribe();
        const fetchStatusInicial = async () => {
            const { data } = await supabase
                .from("status_chat")
                .select("status")
                .eq("usuario_id", destinatarioId)
                .eq("destinatario_id", userId)
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
            await supabase.from("status_chat").upsert(
                {
                    usuario_id: userId,
                    destinatario_id: destinatarioId,
                    status: status,
                    atualizado_em: new Date().toISOString(),
                },
                { onConflict: "usuario_id,destinatario_id" }
            );
        }
    };

    const removerStatus = async () => {
        if (!userId) return;
        await supabase
            .from("status_chat")
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

        setMensagens(mensagensDoChat);
        setArquivos(mensagensDoChat.filter((m) => m.tipo !== "texto"));

        const novasMensagens = mensagensDoChat.filter(
            (m) => !mensagensRef.current.some((existing) => existing.id === m.id)
        );
        novasMensagens.forEach((msg) => {
            if (msg.remetente !== userId) {
                marcarMensagensComoLidas();
            }
        });
    };

    useEffect(() => {
        fetchAndSyncMessages();
        const intervalId = setInterval(fetchAndSyncMessages, 2000);
        return () => clearInterval(intervalId);
    }, [destinatarioId, userId]);

    const handlePaste = useCallback(
        (e: ClipboardEvent) => {
            if (abaAtiva !== "chat") return;
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.kind === "file") {
                    const file = item.getAsFile();
                    if (file) {
                        const isImage = file.type.startsWith("image/");
                        setRascunhoParaEnviar({
                            tipo: isImage ? "imagem" : "anexo",
                            conteudo: URL.createObjectURL(file),
                            file: file,
                            legenda: "",
                        });
                    }
                }
            }
        },
        [abaAtiva]
    );

    useEffect(() => {
        document.addEventListener("paste", handlePaste);
        return () => {
            document.removeEventListener("paste", handlePaste);
        };
    }, [handlePaste]);

    const enviarMensagem = async (
        tipo: "texto" | "imagem" | "audio" | "anexo" = "texto",
        conteudo?: string,
        file?: File | Blob
    ) => {
        if (!destinatarioId || !userId) return;
        let conteudoParaSalvar = conteudo;

        if (file) {
            const sanitizedFilename = sanitizeFilename(
                file instanceof File ? file.name : "audio.webm"
            );
            const filePath = `${tipo}s/${Date.now()}-${sanitizedFilename}`;

            const { error } = await supabase.storage.from("uploads").upload(filePath, file, {
                contentType: file instanceof File ? file.type : "audio/webm",
            });
            if (error) {
                console.error("Erro ao fazer upload:", error.message);
                return;
            }
            const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
            const url = data?.publicUrl;
            if (url) {
                conteudoParaSalvar = conteudo
                    ? `${url}|SEPARATOR|${conteudo}`
                    : url;
            } else {
                console.error("URL do arquivo não encontrada.");
                return;
            }
        }

        if (editandoId) {
            await supabase
                .from("mensagens")
                .update({ conteudo: conteudoParaSalvar || texto })
                .eq("id", editandoId);
            setEditandoId(null);
            setRascunhoParaEnviar(null); // limpa a prévia
        } else {
            await supabase.from("mensagens").insert({
                remetente: userId,
                destinatario: destinatarioId,
                conteudo: conteudoParaSalvar,
                tipo: tipo,
                resposta_id: resposta?.id || null,
            });
        }

        setTexto("");
        setResposta(null);
        setRascunhoParaEnviar(null);
        setLegenda("");
        fetchAndSyncMessages();
        removerStatus();
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
                    stream.getTracks().forEach((track) => track.stop());
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

    const handleCameraClick = () => {
        document.getElementById("camera-input")?.click();
    };

    const handleAnexoClick = () => {
        document.getElementById("anexo-input")?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: "imagem" | "anexo") => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const isImage = file.type.startsWith("image/");
            setRascunhoParaEnviar({
                tipo: isImage ? "imagem" : "anexo",
                conteudo: URL.createObjectURL(file),
                file: file,
            });
            setLegenda("");
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
        setResposta(null);
        removerStatus();
    };

    return (
        <div className="flex flex-col h-screen" style={{
                backgroundImage: 'url("assets/wallpaper.jpg")',
                backgroundRepeat: 'repeat',
                backgroundSize: '250px',

                backgroundAttachment: 'fixed', 
                backgroundPosition: 'center',
            }}>
            {/* Cabeçalho */}
            <div className="flex itens-center gap-3 p-3 bg-[#1f2937] text-white shadow-md z-10 sticky top-0">
                {onClose && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="md:hidden text-white hover:text-gray-300"
                    >
                        <ArrowLeft />
                    </Button>
                )}
                {destinatario?.foto_url && (
                    <img
                        src={destinatario.foto_url}
                        alt={destinatario.nome}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                )}
                <div>
                    <h2 className="text-lg font-semibold">{destinatario?.nome}</h2>
                    <p className="text-xs opacity-70">
                        {statusOutroUsuario === "digitando" && (
                            <span className="text-green-400 animate-pulse">Digitando...</span>
                        )}
                        {statusOutroUsuario === "gravando" && (
                            <span className="text-green-400 animate-pulse flex items-center gap-1">
                                <Mic className="inline w-4 h-4 text-green-400" /> Gravando áudio
                            </span>
                        )}
                        {!statusOutroUsuario && destinatario?.status}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                value={abaAtiva}
                onValueChange={setAbaAtiva}
                className="flex-1 flex flex-col overflow-hidden"
            >
                <TabsList className="grid w-full grid-cols-2 bg-transparent text-white">
                    <TabsTrigger value="chat" className="text-white data-[state=active]:bg-[#006453] data-[state=inactive]:bg-[#1f2937]"><MessageCircleMore/>Conversa</TabsTrigger>
                    <TabsTrigger value="arquivos" className="text-white data-[state=active]:bg-[#006453] data-[state=inactive]:bg-transparent"><TableOfContents/> Arquivos</TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="flex-1 flex flex-col bg-transparent overflow-hidden">
                    <Conversa
                        key={destinatarioId}
                        mensagens={mensagens}
                        userId={userId}
                        setResposta={setResposta}
                        setMensagemSelecionada={setMensagemSelecionada}
                        setEditandoId={setEditandoId}
                        setTexto={setTexto}
                        setImagemAmpliada={setImagemAmpliada}
                        setZoomLevel={setZoomLevel}
                        setPanOffset={setPanOffset}
                        mensagemSelecionada={mensagemSelecionada}
                        mensagemDestacada={mensagemDestacada}
                        setMensagemDestacada={setMensagemDestacada}
                        setMostrarModalEmojis={setMostrarModalEmojis}
                        fimDasMensagens={fimDasMensagens}
                        mensagemRefs={mensagemRefs}
                        setRascunhoParaEnviar={setRascunhoParaEnviar}
                    />
                </TabsContent>
                <TabsContent value="arquivos" className="flex-1 flex flex-col overflow-hidden">
                    <Compartilhamento
                        arquivos={arquivos}
                        setImagemAmpliada={setImagemAmpliada}
                        setZoomLevel={setZoomLevel}
                        setPanOffset={setPanOffset}
                    />
                </TabsContent>
            </Tabs>

            {/* Modal de Emojis */}
            <div className={`p-2 bg-transparent transition-transform duration-300 ease-in-out ${mostrarModalEmojis ? "transform-none" : "transform translate-y-full"}`}>
                {mostrarModalEmojis && (
                    <div
                        ref={emojiModalRef}
                        className="mx-auto w-full max-w-md bg-[#1f2937] rounded-lg p-6 flex flex-col touch-none select-none"
                        onMouseDown={(e) => (dragStartY.current = e.clientY)}
                        onMouseUp={(e) => {
                            if (dragStartY.current !== null && e.clientY - dragStartY.current > 60) {
                                setMostrarModalEmojis(false);
                            }
                            dragStartY.current = null;
                        }}
                        onTouchStart={(e) => (dragStartY.current = e.touches[0].clientY)}
                        onTouchEnd={(e) => {
                            if (dragStartY.current !== null && e.changedTouches[0].clientY - dragStartY.current > 60) {
                                setMostrarModalEmojis(false);
                            }
                            dragStartY.current = null;
                        }}
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

            {/* Input */}
            <div className="flex flex-col gap-2 p-4 bg-transparent transition-transform duration-300 ease-in-out">
                {(resposta || rascunhoParaEnviar) && (
                    <div className="p-2 border-l-4 border-green-500 bg-green-900/70 rounded-3xl flex justify-between items-center rounded-md">
                        <div className="text-xs text-gray-300 flex-1">
                            {editandoId && (
                                <span className="text-xs text-white mb-1 block">✏️ Você está editando...</span>
                            )}

                            {/* Prévia de resposta */}
                            {resposta && (
                                <div className="mb-1">
                                    <span className="block font-semibold">
                                        <b>{destinatario?.nome}</b> <i>enviou</i>:
                                    </span>
                                    {resposta.tipo === "texto" && (
                                        <span className="text-xs text-gray-300 break-words break-all">
                                            {resposta.conteudo}
                                        </span>
                                    )}
                                    {resposta.tipo === "imagem" && (() => {
                                        const partes = resposta.conteudo.split("|SEPARATOR|");
                                        const urlImagem = partes[0] || "";
                                        const legendaImagem = partes[1] ? partes[1].trim() : "";
                                        return (
                                            <div className="flex items-center space-x-2">
                                                <img src={urlImagem} alt="Prévia da Imagem" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                                                <span className="text-xs italic text-gray-400 break-words break-all min-w-0">
                                                    {legendaImagem || "Imagem"}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                    {resposta.tipo === "audio" && (
                                        <div className="w-full max-w-[200px] h-6">
                                            <AudioPlayer src={resposta.conteudo} />
                                        </div>
                                    )}
                                    {resposta.tipo === "anexo" && (
                                        <div className="flex items-center space-x-1 text-gray-400">
                                            {resposta.conteudo.includes(".pdf") ? (
                                                <FileText className="w-4 h-4 flex-shrink-0" />
                                            ) : resposta.conteudo.includes(".xlsx") ? (
                                                <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                                            ) : (
                                                <Paperclip className="w-4 h-4 flex-shrink-0" />
                                            )}
                                            <span className="text-xs break-words break-all truncate">
                                                {resposta.conteudo.split("/").pop()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Prévia de rascunho */}
                            {rascunhoParaEnviar && (
                                <div className="flex items-center gap-2">
                                    {rascunhoParaEnviar.tipo === "imagem" && (
                                        <img src={rascunhoParaEnviar.conteudo} alt="Prévia" className="w-20 h-20 rounded-md object-cover" />
                                    )}
                                    {rascunhoParaEnviar.tipo === "audio" && (
                                        <AudioPlayer src={rascunhoParaEnviar.conteudo} />
                                    )}
                                    {rascunhoParaEnviar.tipo === "anexo" && (
                                        <span className="italic opacity-80">📎 Anexo</span>
                                    )}
                                </div>
                            )}
                        </div>
                        {(rascunhoParaEnviar || resposta) && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelDraft}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        )}
                    </div>
                )}

                <div className="flex items-end gap-4" style={{
                    backgroundImage: 'url("assets/wallpaper.jpg")',
                    backgroundRepeat: 'repeat',
                    // NOVO: Define o tamanho da imagem replicada. Ajuste este valor!
                    backgroundSize: '250px',

                    backgroundAttachment: 'fixed', // Mantém o fundo fixo
                    backgroundPosition: 'center',
                }}>
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
                            placeholder={rascunhoParaEnviar ? "Adicione uma legenda..." : "Digite uma mensagem"}
                            className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 placeholder:text-gray-500 resize-none overflow-hidden h-auto max-h-40 px-2 py-0"
                            style={{ paddingTop: "8px", paddingBottom: "8px" }}
                        />

                        {((!rascunhoParaEnviar && !texto.trim()) ||
                            (rascunhoParaEnviar && rascunhoParaEnviar.tipo !== "texto")) && (
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
                                            onChange={(e) => handleFileChange(e, "anexo")}
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
                                            onChange={(e) => handleFileChange(e, "imagem")}
                                        />
                                    </Button>
                                </>
                            )}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-[#00a884] rounded-full w-12 h-12 p-3 hover:bg-[#008f72] transition-colors duration-200"
                        onClick={
                            rascunhoParaEnviar
                                ? handleSendDraft
                                : texto.trim()
                                    ? () => enviarMensagem("texto", texto)
                                    : toggleGravacao
                        }
                    >
                        {texto.trim() || rascunhoParaEnviar ? (
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
