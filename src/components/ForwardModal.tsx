"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function ForwardModal({ mensagem, destinatarioId, onClose }: { mensagem: any, destinatarioId: string, onClose: () => void }) {
    const [contatos, setContatos] = useState<any[]>([]);
    const [selecionados, setSelecionados] = useState<string[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const carregarDados = async () => {
            const { data: auth } = await supabase.auth.getUser();
            const idLogado = auth.user?.id || null;
            setUserId(idLogado);

            const { data } = await supabase.from("perfis").select("id, nome, foto_url");

            const filtrados = (data || []).filter(
                (c) => c.id !== idLogado && c.id !== destinatarioId
            );

            setContatos(filtrados);
        };
        carregarDados();
    }, [destinatarioId]);


    const toggleSelecionado = (id: string) => {
        setSelecionados((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const encaminhar = async () => {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;

        const { data: remetenteData } = await supabase
            .from("perfis")
            .select("nome")
            .eq("id", mensagem.remetente)
            .single();

        const remetenteNome = remetenteData?.nome || "Desconhecido";

        for (const destinatarioId of selecionados) {
            await supabase.from("mensagens").insert({
                remetente: userId,
                destinatario: destinatarioId,
                conteudo: `ENCAMINHADO_DE|${remetenteNome}|${mensagem.conteudo}`, // 👈 Agora vem com nome real
                tipo: mensagem.tipo,
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-emerald-900/50 text-white rounded-2xl p-4 w-80 max-h-[70vh] overflow-y-auto shadow-xl">
                <h2 className="text-lg font-semibold mb-4">Encaminhar para...</h2>
                <div className="space-y-2">
                    {contatos.map((c) => (
                        <div
                            key={c.id}
                            className={`flex items-center bg-black/60 gap-2 p-2 rounded-lg cursor-pointer transition ${selecionados.includes(c.id) ? "bg-emerald-600" : "hover:bg-gray-700"
                                }`}
                            onClick={() => toggleSelecionado(c.id)}
                        >
                            {c.foto_url && <img src={c.foto_url} className="w-10 h-10 rounded-full object-cover" />}
                            <span className="text-sm">{c.nome}</span>
                        </div>

                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button onClick={onClose} variant="ghost">Cancelar</Button>
                    <Button className="hover:bg-emerald-600 transform-colors duration-300" onClick={encaminhar} disabled={selecionados.length === 0}>Encaminhar</Button>
                </div>
            </div>
        </div>
    );
}
