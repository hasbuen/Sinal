"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import ChatComponent from "../chat/[id]/chatComponent"; // Importa o componente ChatComponent

interface Perfil {
  id: string;
  nome: string;
  foto_url: string | null;
  status: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("offline");
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string | null>(null);
  const [contagemNaoLida, setContagemNaoLida] = useState<{ [key: string]: number }>({});

  const [filtroStatus, setFiltroStatus] = useState<"todos" | "online" | "offline">("todos");
  const [termoBusca, setTermoBusca] = useState("");

  useEffect(() => {
    const canal = supabase
      .channel("tempo-real:perfis")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "perfis" },
        (payload) => {
          setUsuarios((prev) =>
            prev.map((u) =>
              u.id === payload.new.id ? { ...u, status: payload.new.status } : u
            )
          );
        }
      )
      .subscribe();

    const canalMensagens = supabase
      .channel("realtime:mensagens:contagem")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mensagens" },
        async (payload) => {
          const nova = payload.new as any;
          if (!nova || !userId) return;

          if (payload.eventType === "INSERT" && nova.destinatario === userId) {
            setContagemNaoLida((prev) => ({
              ...prev,
              [nova.remetente]: (prev[nova.remetente] || 0) + 1,
            }));
          }

          if (payload.eventType === "UPDATE" && nova.destinatario === userId && nova.lida) {
            setContagemNaoLida((prev) => ({
              ...prev,
              [nova.remetente]: 0,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
      supabase.removeChannel(canalMensagens);
    };
  }, [userId]);

  useEffect(() => {
    const carregarPerfil = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setCarregado(true);
        return;
      }

      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome, foto_url, status")
        .eq("id", uid)
        .single();
      if (perfil) {
        setNome(perfil.nome);
        setFotoUrl(perfil.foto_url);
        setStatus(perfil.status);
        await supabase.from("perfis").update({ status: perfil.status }).eq("id", uid);
      }

      const { data: outros } = await supabase
        .from("perfis")
        .select("id, nome, foto_url, status")
        .neq("id", uid);
      if (outros) setUsuarios(outros);

      const { data: mensagensNaoLidas } = await supabase
        .from("mensagens")
        .select("remetente")
        .eq("destinatario", uid)
        .eq("lida", false);

      if (mensagensNaoLidas) {
        const contagemMap: { [key: string]: number } = {};
        mensagensNaoLidas.forEach((m) => {
          contagemMap[m.remetente] = (contagemMap[m.remetente] || 0) + 1;
        });
        setContagemNaoLida(contagemMap);
      }

      setCarregado(true);
    };
    carregarPerfil();
  }, [userId]);

  if (!carregado) {
    return <p className="text-center text-white">Carregando...</p>;
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    const nomeCorresponde = u.nome.toLowerCase().includes(termoBusca.toLowerCase());
    const statusCorresponde =
      filtroStatus === "todos" || u.status === filtroStatus;
    return nomeCorresponde && statusCorresponde;
  });

  const ListaChats = () => (
    <div className="flex flex-col h-screen w-full bg-[#111827] border-r border-gray-800">
      <div className="flex flex-col gap-4 p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Image
            src={fotoUrl || "/assets/avatar.png"}
            alt="avatar"
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover border border-[#00d4ff]"
          />
          <div className="flex-1">
            <div className="font-bold text-[#00d4ff]">{nome}</div>
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${status === "online" ? "bg-[#00ff87]" : "bg-red-500"}`} />
              <span className={`${status === "online" ? "text-[#00ff87]" : "text-red-400"}`}>{status}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.push('/configuracoes')}>
            <Settings className="h-5 w-5 text-gray-400 hover:text-white" />
          </Button>
          <Button
            onClick={async () => {
              if (userId) {
                await supabase.from("perfis").update({ status: "offline" }).eq("id", userId);
              }
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="bg-transparent hover:bg-white/10 text-white font-bold"
          >
            Sair
          </Button>
        </div>
        
        <Input
          type="text"
          placeholder="Buscar por nome..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="bg-gray-800 text-white placeholder-gray-400 border-none"
        />

        <div className="flex justify-between text-sm text-gray-400">
          <Button
            variant="ghost"
            onClick={() => setFiltroStatus("todos")}
            className={`${filtroStatus === "todos" ? "text-[#00d4ff] border-b-2 border-[#00d4ff]" : "hover:text-white"}`}
          >
            Todos
          </Button>
          <Button
            variant="ghost"
            onClick={() => setFiltroStatus("online")}
            className={`${filtroStatus === "online" ? "text-[#00ff87] border-b-2 border-[#00ff87]" : "hover:text-white"}`}
          >
            Online
          </Button>
          <Button
            variant="ghost"
            onClick={() => setFiltroStatus("offline")}
            className={`${filtroStatus === "offline" ? "text-red-400 border-b-2 border-red-400" : "hover:text-white"}`}
          >
            Offline
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {usuariosFiltrados.length > 0 ? (
          usuariosFiltrados.map((u) => {
            const contagem = contagemNaoLida[u.id] || 0;
            return (
              <div
                key={u.id}
                onClick={() => setUsuarioSelecionado(u.id)} // Mantém o estado para a versão mobile
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#1f2937] cursor-pointer transition-colors border-b border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={u.foto_url || "/assets/avatar.png"}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover border border-[#6a00f4]"
                    alt={u.nome}
                  />
                  <div>
                    <span className="font-medium text-[#00d4ff]">{u.nome}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${u.status === "online" ? "bg-[#00ff87]" : "bg-red-500"}`} />
                      <span className={`${u.status === "online" ? "text-[#00ff87]" : "text-red-400"}`}>{u.status}</span>
                    </div>
                  </div>
                </div>
                {contagem > 0 && (
                  <span className="bg-[#6a00f4] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {contagem > 99 ? "+99" : contagem}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <p className="p-4 text-center text-gray-500">Nenhum usuário encontrado.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0a0a0f] text-white">
      {/* Visualização para Mobile - Uma aba por vez com animação */}
      <div className="w-full md:hidden">
        <AnimatePresence mode="wait">
          {!usuarioSelecionado ? (
            <motion.div
              key="list"
              initial={{ x: 0 }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3 }}
            >
              <ListaChats />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <ChatComponent
                destinatarioId={usuarioSelecionado}
                onClose={() => setUsuarioSelecionado(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Visualização para Desktop - Lado a lado (com a nova imagem) */}
      <div className="hidden md:flex w-full">
        <div className="w-72">
          <ListaChats />
        </div>
        <div className="flex-1">
          {!usuarioSelecionado ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#00d4ff] text-lg text-center h-full">
              <motion.div
                animate={{ y: ["-10%", "10%", "-10%"] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Image
                  src="/assets/background.svg"
                  alt="Selecione um usuário para iniciar a conversa"
                  width={300}
                  height={300}
                  className="opacity-50"
                />
              </motion.div>
            </div>
          ) : (
            <ChatComponent
              destinatarioId={usuarioSelecionado}
              onClose={() => setUsuarioSelecionado(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}