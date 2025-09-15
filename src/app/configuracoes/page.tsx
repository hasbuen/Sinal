"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, User, Camera, Ban, Circle } from "lucide-react";
import Image from "next/image";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState("online");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const carregarPerfil = async () => {
      setCarregando(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        router.push("/login");
        return;
      }
      setUserId(userData.user.id);

      const { data: perfilData } = await supabase
        .from("perfis")
        .select("nome, foto_url, status")
        .eq("id", userData.user.id)
        .single();
      
      if (perfilData) {
        setNome(perfilData.nome);
        setStatus(perfilData.status);
        setFotoUrl(perfilData.foto_url);
      }
      setCarregando(false);
    };

    carregarPerfil();
  }, [router]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNovaFoto(file);
      setFotoUrl(URL.createObjectURL(file));
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setCarregando(true);
    setMensagem("");

    try {
      let novaFotoUrl = fotoUrl;

      if (novaFoto) {
        const filePath = `avatares/${userId}-${Date.now()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(filePath, novaFoto, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from("uploads").getPublicUrl(filePath);
        if (publicUrlData) novaFotoUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("perfis")
        .update({
          nome: nome,
          status: status,
          foto_url: novaFotoUrl,
        })
        .eq("id", userId);

      if (updateError) throw updateError;
      
      setMensagem("Perfil atualizado com sucesso!");

    } catch (error: any) {
      setMensagem("Erro ao atualizar o perfil: " + error.message);
      console.error(error);
    } finally {
      setCarregando(false);
      setNovaFoto(null);
    }
  };

  const getStatusIcon = (currentStatus: string) => {
    switch (currentStatus) {
      case 'online':
        return <Circle className="w-4 h-4 text-green-500" />;
      case 'ausente':
        return <Ban className="w-4 h-4 text-yellow-500" />;
      case 'ocupado':
        return <Circle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#111827] text-white">
      <div className="flex items-center gap-3 p-4 bg-[#1f2937] shadow-md">
        <button className="p-2 rounded-full hover:bg-gray-700 transition-colors" onClick={() => router.back()}>
          <ArrowLeft />
        </button>
        <h2 className="text-xl font-semibold">Configurações do Perfil</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSalvar} className="flex flex-col items-center gap-6">
          <div className="relative w-28 h-28">
            <Image
              src={fotoUrl || "/default-avatar.png"}
              alt="Avatar do usuário"
              fill
              className="rounded-full object-cover border-2 border-[#00d4ff]"
            />
            <label htmlFor="foto-input" className="absolute bottom-0 right-0 p-2 bg-gray-700 rounded-full cursor-pointer hover:bg-gray-600 transition-colors">
              <Camera className="w-5 h-5 text-white" />
              <input
                id="foto-input"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFotoChange}
              />
            </label>
          </div>

          <div className="w-full max-w-sm space-y-4">
            <div>
              <p className="text-gray-400">Nome de Usuário</p>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full h-10 pl-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-gray-800 text-white border-none"
                />
              </div>
            </div>

            <div>
              <p className="text-gray-400">Status</p>
              <div className="relative mt-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  {getStatusIcon(status)}
                </div>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 pl-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-gray-800 text-white appearance-none"
                >
                  <option value="online">Online</option>
                  <option value="ausente">Ausente</option>
                  <option value="ocupado">Ocupado</option>
                </select>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full max-w-sm h-10 flex items-center justify-center rounded-md bg-[#6a00f4] hover:bg-[#5b00d5] text-white font-bold transition-colors"
            disabled={carregando}
          >
            {carregando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Salvar Alterações"
            )}
          </button>

          {mensagem && (
            <p className="mt-4 text-center text-sm text-green-500">{mensagem}</p>
          )}
        </form>
      </div>
    </div>
  );
}