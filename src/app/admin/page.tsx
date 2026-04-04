"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Database,
  Layers3,
  Radio,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAppwriteGroup,
  getAppwriteDashboard,
  getAppwriteGroups,
  getAppwriteUsers,
  type AppwriteAdminGroup,
  type AppwriteAdminUser,
  type AppwriteDashboard,
} from "@/lib/backend-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toAppHref } from "@/lib/runtime";

const statCards = [
  {
    key: "appwriteUserCount",
    label: "Usuarios Appwrite",
    icon: Users,
  },
  {
    key: "appwriteGroupCount",
    label: "Grupos Appwrite",
    icon: Layers3,
  },
] as const;

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<AppwriteDashboard | null>(null);
  const [users, setUsers] = useState<AppwriteAdminUser[]>([]);
  const [groups, setGroups] = useState<AppwriteAdminGroup[]>([]);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pending, setPending] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return !term
      ? users
      : users.filter((user) =>
          `${user.name} ${user.email || ""}`.toLowerCase().includes(term),
        );
  }, [search, users]);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return !term
      ? groups
      : groups.filter((group) => group.name.toLowerCase().includes(term));
  }, [groups, search]);

  async function load() {
    try {
      setPending(true);
      const [nextDashboard, nextUsers, nextGroups] = await Promise.all([
        getAppwriteDashboard(),
        getAppwriteUsers(),
        getAppwriteGroups(),
      ]);
      setDashboard(nextDashboard);
      setUsers(nextUsers);
      setGroups(nextGroups);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar o painel Appwrite.",
      );
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreateGroup() {
    if (!groupName.trim()) {
      toast.error("Defina um nome para o grupo Appwrite.");
      return;
    }

    try {
      setSubmitting(true);
      await createAppwriteGroup({
        name: groupName.trim(),
        memberUserIds: selectedUserIds,
      });
      toast.success("Grupo criado no Appwrite.");
      setGroupName("");
      setSelectedUserIds([]);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar o grupo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#ECE5DD] text-[#111B21] dark:bg-[#0b141a] dark:text-white">
      <header className="bg-[#075E54] px-4 py-5 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">Administrador</p>
            <h1 className="text-3xl font-semibold">Painel Appwrite</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/80">
              Usuarios e grupos no Appwrite, com espelho operacional em MongoDB,
              fila/presenca em Redis e cache local em SQLite.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              className="rounded-full border border-white/20 text-white hover:bg-white/10"
              onClick={() => void load()}
            >
              <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button asChild className="rounded-full bg-white text-[#075E54] hover:bg-white/90">
              <Link href={toAppHref("/configuracoes")}>Voltar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.key}
                  className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-[#202c33]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#667781] dark:text-white/50">
                        {card.label}
                      </p>
                      <p className="mt-2 text-4xl font-semibold">
                        {dashboard?.[card.key] ?? 0}
                      </p>
                    </div>
                    <div className="rounded-full bg-[#d9fdd3] p-3 text-[#075E54] dark:bg-[#17352c] dark:text-[#8ff3d1]">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <article className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-[#202c33]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#075E54] dark:text-[#7fe7bc]">
              Infra
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-[#f8f5f1] px-4 py-3 dark:bg-[#111B21]">
                <span className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-[#00a884]" />
                  Appwrite configurado
                </span>
                <strong>{dashboard?.configured ? "Sim" : "Nao"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f8f5f1] px-4 py-3 dark:bg-[#111B21]">
                <span className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#00a884]" />
                  MongoDB
                </span>
                <strong>{dashboard?.mongoEnabled ? "Ativo" : "Nao"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f8f5f1] px-4 py-3 dark:bg-[#111B21]">
                <span className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[#00a884]" />
                  Redis
                </span>
                <strong>{dashboard?.redisEnabled ? "Ativo" : "Nao"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f8f5f1] px-4 py-3 dark:bg-[#111B21]">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#00a884]" />
                  SQLite
                </span>
                <strong>{dashboard?.sqliteEnabled ? "Ativo" : "Nao"}</strong>
              </div>
              <div className="rounded-2xl bg-[#f8f5f1] px-4 py-3 dark:bg-[#111B21]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#667781] dark:text-white/45">
                  Espelhos ativos
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(dashboard?.mirrorCollections || []).map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-[#d9fdd3] px-3 py-1 text-xs font-semibold text-[#075E54] dark:bg-[#17352c] dark:text-[#8ff3d1]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <article className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-[#202c33]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#075E54] dark:text-[#7fe7bc]">
                  Usuarios
                </p>
                <p className="mt-1 text-sm text-[#667781] dark:text-white/50">
                  Selecione membros para montar grupos no Appwrite.
                </p>
              </div>

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuarios ou grupos"
                className="max-w-sm rounded-full border-black/10 bg-[#f8f5f1] dark:border-white/10 dark:bg-[#111B21]"
              />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {filteredUsers.map((user) => {
                const active = selectedUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      setSelectedUserIds((current) =>
                        current.includes(user.id)
                          ? current.filter((item) => item !== user.id)
                          : [...current, user.id],
                      )
                    }
                    className={`rounded-[1.6rem] border px-4 py-4 text-left transition ${
                      active
                        ? "border-[#25D366] bg-[#e7fff0]"
                        : "border-black/8 bg-[#f8f5f1] hover:border-[#b9e7ce] dark:border-white/10 dark:bg-[#111B21]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="mt-1 text-sm text-[#667781] dark:text-white/50">
                          {user.email || "Sem e-mail"}
                        </p>
                      </div>
                      <span
                        className={`h-3 w-3 rounded-full ${
                          user.status ? "bg-[#25D366]" : "bg-[#c4c4c4]"
                        }`}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-black/5 px-3 py-1 text-xs dark:bg-white/10">
                        {user.emailVerification ? "email verificado" : "email pendente"}
                      </span>
                      {user.labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-black/5 px-3 py-1 text-xs dark:bg-white/10"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-[#202c33]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#075E54] dark:text-[#7fe7bc]">
                Criar grupo
              </p>
              <div className="mt-4 space-y-4">
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Nome do grupo"
                  className="rounded-full border-black/10 bg-[#f8f5f1] dark:border-white/10 dark:bg-[#111B21]"
                />
                <p className="text-sm text-[#667781] dark:text-white/50">
                  {selectedUserIds.length} membros selecionados
                </p>
                <Button
                  onClick={() => void handleCreateGroup()}
                  disabled={submitting}
                  className="w-full rounded-full bg-[#25D366] text-[#111B21] hover:bg-[#1fbe5c]"
                >
                  {submitting ? "Criando..." : "Criar grupo Appwrite"}
                </Button>
              </div>
            </article>

            <article className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-[#202c33]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#075E54] dark:text-[#7fe7bc]">
                Grupos
              </p>
              <div className="mt-4 space-y-3">
                {filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-[1.5rem] bg-[#f8f5f1] px-4 py-4 dark:bg-[#111B21]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{group.name}</p>
                        <p className="mt-1 text-sm text-[#667781] dark:text-white/50">
                          {group.total} membros
                        </p>
                      </div>
                      <Layers3 className="h-4 w-4 text-[#00a884]" />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
