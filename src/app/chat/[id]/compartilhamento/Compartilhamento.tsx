"use client";

import { Paperclip, Mic, Image as ImageIcon, FileText, FileSpreadsheet } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";

interface Mensagem {
    id: string;
    remetente: string;
    destinatario: string;
    conteudo: string;
    criado_em: string;
    tipo?: "texto" | "imagem" | "audio" | "anexo" | null;
}

interface CompartilhamentoProps {
    arquivos: Mensagem[];
    setImagemAmpliada: (url: string | null) => void;
    setZoomLevel: (level: number) => void;
    setPanOffset: (offset: { x: number; y: number }) => void;
}

export default function Compartilhamento({
    arquivos,
    setImagemAmpliada,
    setZoomLevel,
    setPanOffset
}: CompartilhamentoProps) {
    const imagens = arquivos.filter(a => a.tipo === 'imagem');
    const audios = arquivos.filter(a => a.tipo === 'audio');
    const anexos = arquivos.filter(a => a.tipo === 'anexo');

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {imagens.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" /> Imagens
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {imagens.map(item => {
                            const [url] = item.conteudo.split('|SEPARATOR|');
                            return (
                                <img
                                    key={item.id}
                                    src={url}
                                    alt="Imagem compartilhada"
                                    className="w-full h-auto aspect-square object-cover rounded-md cursor-pointer transition-transform hover:scale-105"
                                    onClick={() => {
                                        setImagemAmpliada(url);
                                        setZoomLevel(1);
                                        setPanOffset({ x: 0, y: 0 });
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {audios.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <Mic className="w-5 h-5" /> Áudios
                    </h3>
                    <div className="space-y-2">
                        {audios.map(item => {
                            const [url] = item.conteudo.split('|SEPARATOR|');
                            return (
                                <div key={item.id} className="p-3 bg-[#2a3942] rounded-md text-white">
                                    <AudioPlayer src={url} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {anexos.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <Paperclip className="w-5 h-5" /> Anexos
                    </h3>
                    <div className="space-y-2">
                        {anexos.map(item => {
                            const [url] = item.conteudo.split('|SEPARATOR|');
                            const nomeArquivo = url.split('/').pop();
                            const extensao = nomeArquivo?.split('.').pop()?.toLowerCase();
                            
                            // Adicionei um tratamento para mostrar prévia de imagem também aqui, caso o usuário tenha colado como anexo
                            if (extensao && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extensao)) {
                                return (
                                    <div key={item.id} className="p-3 bg-[#2a3942] rounded-md text-white flex items-center gap-3">
                                        <img
                                            src={url}
                                            alt="Prévia da imagem"
                                            className="w-20 h-20 object-cover rounded-md cursor-pointer"
                                            onClick={() => {
                                                setImagemAmpliada(url);
                                                setZoomLevel(1);
                                                setPanOffset({ x: 0, y: 0 });
                                            }}
                                        />
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 underline break-all">{nomeArquivo}</a>
                                    </div>
                                );
                            }

                            return (
                                <a
                                    key={item.id}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-[#2a3942] rounded-md text-white hover:bg-[#3e4a52] transition-colors"
                                >
                                    {extensao === 'pdf' && <FileText className="w-5 h-5" />}
                                    {['doc', 'docx'].includes(extensao || '') && <FileText className="w-5 h-5" />}
                                    {['xls', 'xlsx'].includes(extensao || '') && <FileSpreadsheet className="w-5 h-5" />}
                                    {!['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extensao || '') && <Paperclip className="w-5 h-5" />}
                                    <span>{nomeArquivo}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            {arquivos.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                    <span className="text-6xl mb-4">📂</span>
                    <p>Nenhum arquivo compartilhado nesta conversa.</p>
                </div>
            )}
        </div>
    );
}