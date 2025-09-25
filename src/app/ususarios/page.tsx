"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Perfil {
  id: string;
  nome: string;
  foto_url: string | null;
  status: string;
}

export default function PaginaUsuarios() {
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // pega o id do usuário logado
  useEffect(() => {
    const carregarUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    };
    carregarUser();
  }, []);

  const buscarUsuarios = useCallback(async () => {
    if (!userId) return; // só busca depois que tiver id do usuário logado

    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .neq("id", userId); // 👈 ignora o usuário logado

    if (error) {
      console.error("Erro ao buscar usuários:", error.message);
      return;
    }

    setUsuarios(data || []);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    buscarUsuarios();

    const canal = supabase
      .channel("realtime:perfis")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "perfis" },
        () => buscarUsuarios()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [userId, buscarUsuarios]);

  return (
    <div className="p-4">
      <h1 className="font-bold text-xl mb-4 text-white">Usuários</h1>
      <ul className="space-y-3">
        {usuarios.map((u) => (
          <li
            key={u.id}
            className="flex items-center px-3 py-2 bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
          >
            <img
              src={u.foto_url || "/default-avatar.png"}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover mr-3"
            />
            <div className="flex flex-col">
              <span className="text-white font-semibold">{u.nome}</span>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    u.status === "online" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span
                  className={`text-sm ${
                    u.status === "online" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {u.status}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
