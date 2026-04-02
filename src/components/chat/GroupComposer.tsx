"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BackendUser } from "@/lib/backend-client";

type GroupComposerProps = {
  open: boolean;
  users: BackendUser[];
  pending: boolean;
  onClose: () => void;
  onCreate: (input: {
    title: string;
    description?: string;
    memberIds: string[];
  }) => Promise<void>;
};

export default function GroupComposer({
  open,
  users,
  pending,
  onClose,
  onCreate,
}: GroupComposerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setSelected([]);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit() {
    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      memberIds: selected,
    });
  }

  function toggleUser(userId: string) {
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
              Grupo
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Criar conversa em grupo
            </h2>
            <p className="mt-2 text-sm text-white/55">
              Selecione membros, defina um titulo e deixe o grupo pronto para
              texto, audio, imagem e video.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nome do grupo"
            className="border-white/10 bg-white/5 text-white"
          />
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descricao opcional"
            className="border-white/10 bg-white/5 text-white"
          />

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">
                Membros selecionados
              </span>
              <span className="text-xs text-cyan-300">
                {selected.length} escolhido(s)
              </span>
            </div>

            <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
              {users.map((user) => {
                const active = selected.includes(user.id);

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-cyan-300/50 bg-cyan-300/10"
                        : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-white/50">@{user.username}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        active
                          ? "bg-cyan-300 text-slate-950"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {active ? "No grupo" : "Adicionar"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full border border-white/10 text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={pending || !title.trim() || selected.length === 0}
            className="rounded-full bg-cyan-300 px-6 font-semibold text-slate-950 hover:bg-cyan-200"
          >
            {pending ? "Criando grupo..." : "Criar grupo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
