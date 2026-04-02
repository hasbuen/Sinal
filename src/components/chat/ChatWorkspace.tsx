"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CirclePlus,
  Loader2,
  LogOut,
  Mic,
  Paperclip,
  Search,
  Send,
  SmilePlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  clearBackendToken,
  createDirectConversation,
  createGroupConversation,
  getConversationMessages,
  getConversations,
  getCurrentUser,
  getTypingUsers,
  getUsers,
  markConversationRead,
  reactToMessage,
  resolveBackendAssetUrl,
  sendMessage,
  setTypingStatus,
  uploadMedia,
  type BackendAttachment,
  type BackendConversation,
  type BackendMessage,
  type BackendUser,
} from "@/lib/backend-client";
import { withBasePath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const InstallPwaPrompt = dynamic(() => import("@/components/InstallPwaPrompt"), {
  ssr: false,
});
const OnboardingTour = dynamic(() => import("@/components/OnboardingTour"), {
  ssr: false,
});
const GroupComposer = dynamic(() => import("./GroupComposer"), {
  ssr: false,
});

const quickReactions = ["👍", "❤️", "😂", "🔥"];
const quickEmojis = ["😀", "🚀", "🎧", "📎"];
const hourFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

function isEmojiOnly(value: string) {
  return /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\s)+$/u.test(
    value.trim(),
  );
}

function inferMessageKind(text: string, attachments: BackendAttachment[]) {
  if (attachments.length > 0) {
    const kind = attachments[0]?.kind;
    if (kind === "IMAGE") return "IMAGE" as const;
    if (kind === "AUDIO") return "AUDIO" as const;
    if (kind === "VIDEO") return "VIDEO" as const;
    return "FILE" as const;
  }
  if (/^https?:\/\/\S+$/i.test(text.trim())) return "LINK" as const;
  if (isEmojiOnly(text)) return "EMOJI" as const;
  return "TEXT" as const;
}

function conversationName(conversation: BackendConversation, currentUserId: string) {
  if (conversation.kind === "GROUP") return conversation.title || "Grupo sem titulo";
  return (
    conversation.members.find((member) => member.user.id !== currentUserId)?.user
      .displayName || "Conversa direta"
  );
}

function conversationMeta(conversation: BackendConversation, currentUserId: string) {
  if (conversation.kind === "GROUP") {
    return `${conversation.members.length} participantes`;
  }
  const other = conversation.members.find((member) => member.user.id !== currentUserId);
  return other ? `@${other.user.username}` : "Chat privado";
}

function messagePreview(message?: BackendMessage | null) {
  if (!message) return "Sem mensagens ainda";
  if (message.kind === "EMOJI") return message.emoji || "Emoji";
  if (message.kind === "LINK") return message.linkUrl || "Link";
  if (message.attachments.length > 0) return `📎 ${message.attachments[0].fileName}`;
  return message.text || "Nova mensagem";
}

export default function ChatWorkspace({
  initialConversationId,
}: {
  initialConversationId?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const [booting, setBooting] = useState(true);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showGroupComposer, setShowGroupComposer] = useState(false);
  const [currentUser, setCurrentUser] = useState<BackendUser | null>(null);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [conversations, setConversations] = useState<BackendConversation[]>([]);
  const [messages, setMessages] = useState<BackendMessage[]>([]);
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId || null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [composerText, setComposerText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const deferredSearch = useDeferredValue(searchTerm);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const filteredUsers = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      `${user.displayName} ${user.username} ${user.email}`
        .toLowerCase()
        .includes(term),
    );
  }, [deferredSearch, users]);

  const filteredConversations = useMemo(() => {
    if (!currentUser) return conversations;
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) => {
      const name = conversationName(conversation, currentUser.id).toLowerCase();
      return (
        name.includes(term) ||
        messagePreview(conversation.latestMessage).toLowerCase().includes(term)
      );
    });
  }, [conversations, currentUser, deferredSearch]);

  const typingUsers = useMemo(() => {
    if (!activeConversation || !currentUser) return [];
    return activeConversation.members
      .map((member) => member.user)
      .filter((user) => user.id !== currentUser.id && typingIds.includes(user.id));
  }, [activeConversation, currentUser, typingIds]);

  async function refreshSidebar() {
    const [nextUsers, nextConversations] = await Promise.all([
      getUsers(),
      getConversations(),
    ]);
    startTransition(() => {
      setUsers(nextUsers);
      setConversations(nextConversations);
    });
  }

  async function refreshMessages(conversationId: string) {
    const [nextMessages, nextTypingIds] = await Promise.all([
      getConversationMessages(conversationId),
      getTypingUsers(conversationId),
    ]);
    startTransition(() => {
      setMessages(nextMessages);
      setTypingIds(nextTypingIds);
    });
    await markConversationRead(conversationId);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const me = await getCurrentUser();
        const [nextUsers, nextConversations] = await Promise.all([
          getUsers(),
          getConversations(),
        ]);
        setCurrentUser(me);
        setUsers(nextUsers);
        setConversations(nextConversations);
        if (initialConversationId) {
          const knownConversation = nextConversations.find(
            (conversation) => conversation.id === initialConversationId,
          );
          if (knownConversation) {
            setActiveConversationId(knownConversation.id);
          } else {
            const directConversation = await createDirectConversation(
              initialConversationId,
            );
            setConversations((current) => [directConversation, ...current]);
            setActiveConversationId(directConversation.id);
          }
        } else if (nextConversations[0]) {
          setActiveConversationId(nextConversations[0].id);
        }
      } catch (error) {
        clearBackendToken();
        router.replace("/login");
        toast.error(
          error instanceof Error ? error.message : "Falha ao autenticar.",
        );
      } finally {
        setBooting(false);
      }
    }
    void bootstrap();
  }, [initialConversationId, router]);

  useEffect(() => {
    if (!activeConversationId || !currentUser) return;
    void refreshMessages(activeConversationId);
    const interval = window.setInterval(() => {
      void refreshMessages(activeConversationId);
      void refreshSidebar();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [activeConversationId, currentUser]);

  useEffect(() => {
    if (activeConversationId) {
      router.replace(`/chat?id=${activeConversationId}`);
    }
  }, [activeConversationId, router]);

  function queueTyping(value: string) {
    setComposerText(value);
    if (!activeConversationId) return;
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    void setTypingStatus(activeConversationId, value.trim().length > 0);
    typingTimeoutRef.current = window.setTimeout(() => {
      void setTypingStatus(activeConversationId, false);
    }, 1200);
  }

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setSelectedFiles((current) => [...current, ...Array.from(list)]);
  }

  async function handleSend() {
    if (!activeConversationId) return;
    const text = composerText.trim();
    if (!text && selectedFiles.length === 0) return;
    try {
      setPending(true);
      const attachments: BackendAttachment[] = [];
      for (const file of selectedFiles) {
        const uploaded = await uploadMedia(file);
        attachments.push({
          ...uploaded,
          url: resolveBackendAssetUrl(uploaded.url),
        });
      }
      const kind = inferMessageKind(text, attachments);
      await sendMessage({
        conversationId: activeConversationId,
        kind,
        text: kind === "TEXT" || attachments.length > 0 ? text || undefined : undefined,
        emoji: kind === "EMOJI" ? text : undefined,
        linkUrl: kind === "LINK" ? text : undefined,
        linkTitle: kind === "LINK" ? new URL(text).hostname : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setComposerText("");
      setSelectedFiles([]);
      await setTypingStatus(activeConversationId, false);
      await Promise.all([refreshMessages(activeConversationId), refreshSidebar()]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao enviar mensagem.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleDirectConversation(userId: string) {
    try {
      setPending(true);
      const conversation = await createDirectConversation(userId);
      await refreshSidebar();
      setActiveConversationId(conversation.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao abrir conversa.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleCreateGroup(input: {
    title: string;
    description?: string;
    memberIds: string[];
  }) {
    try {
      setPending(true);
      const conversation = await createGroupConversation(input);
      await refreshSidebar();
      setActiveConversationId(conversation.id);
      setShowGroupComposer(false);
      toast.success("Grupo criado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao criar grupo.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleReact(messageId: string, emoji: string) {
    try {
      const updated = await reactToMessage(messageId, emoji);
      setMessages((current) =>
        current.map((message) => (message.id === updated.id ? updated : message)),
      );
      await refreshSidebar();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao reagir.",
      );
    }
  }

  async function toggleAudioRecord() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderChunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recorderChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setSelectedFiles((current) => [...current, file]);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Nao foi possivel acessar o microfone.");
    }
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071019] text-white">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          Sincronizando com o backend Nest...
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0b544940,transparent_30%),linear-gradient(180deg,#030712,#08131f_55%,#071923)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row">
        <aside className="w-full lg:max-w-sm">
          <Card className="border-white/10 bg-slate-950/70 text-white shadow-2xl backdrop-blur">
            <CardContent className="space-y-4 p-4">
              <div id="tour-profile" className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-300/15 text-lg font-semibold text-cyan-200">
                  {currentUser.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{currentUser.displayName}</p>
                  <p className="truncate text-sm text-white/50">@{currentUser.username}</p>
                </div>
                <OnboardingTour />
                <Button variant="ghost" size="icon" onClick={() => { clearBackendToken(); router.replace("/login"); }} className="rounded-full text-white/70 hover:bg-white/10">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              <div id="tour-install"><InstallPwaPrompt /></div>

              <div id="tour-search" className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2">
                <Search className="h-4 w-4 text-white/40" />
                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar conversas ou pessoas" className="border-none bg-transparent px-0 text-white shadow-none focus-visible:ring-0" />
              </div>

              <div id="tour-group" className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => setShowGroupComposer(true)} className="rounded-full bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200">
                  <Users className="h-4 w-4" />
                  Novo grupo
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-full border border-white/10 text-white hover:bg-white/5"
                >
                  <Link href="/configuracoes">Perfil</Link>
                </Button>
              </div>

              <div id="tour-chat-list" className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Conversas</p>
                <div className="grid gap-2">
                  {filteredConversations.map((conversation) => (
                    <button key={conversation.id} type="button" onClick={() => setActiveConversationId(conversation.id)} className={`rounded-[1.4rem] border p-3 text-left transition ${conversation.id === activeConversationId ? "border-cyan-300/40 bg-cyan-300/12" : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{conversationName(conversation, currentUser.id)}</p>
                          <p className="mt-1 truncate text-sm text-white/45">{messagePreview(conversation.latestMessage)}</p>
                        </div>
                        {conversation.latestMessage ? <p className="text-xs text-white/40">{hourFormatter.format(new Date(conversation.latestMessage.createdAt))}</p> : null}
                      </div>
                      <p className="mt-2 text-xs text-white/35">{conversationMeta(conversation, currentUser.id)}</p>
                    </button>
                  ))}
                  {filteredConversations.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/45">Nenhuma conversa encontrada.</p> : null}
                </div>
              </div>

              <div className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Pessoas</p>
                  <span className="text-xs text-white/35">{filteredUsers.length} disponiveis</span>
                </div>
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                  {filteredUsers.map((user) => (
                    <button key={user.id} type="button" onClick={() => void handleDirectConversation(user.id)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/5">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.displayName}</p>
                        <p className="truncate text-sm text-white/45">@{user.username}</p>
                      </div>
                      <CirclePlus className="h-4 w-4 text-cyan-300" />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="flex min-h-[75vh] flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 shadow-2xl backdrop-blur">
          {activeConversation ? (
            <>
              <div className="border-b border-white/10 px-5 py-4">
                <p className="truncate text-xl font-semibold">{conversationName(activeConversation, currentUser.id)}</p>
                <p className="mt-1 truncate text-sm text-white/45">
                  {typingUsers.length > 0 ? `${typingUsers.map((user) => user.displayName).join(", ")} digitando...` : conversationMeta(activeConversation, currentUser.id)}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {messages.map((message) => {
                  const mine = message.sender.id === currentUser.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[92%] rounded-[1.6rem] border px-4 py-3 shadow-lg sm:max-w-[78%] ${mine ? "border-cyan-300/20 bg-cyan-300/12" : "border-white/10 bg-white/5"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{message.sender.displayName}</p>
                          <span className="text-xs text-white/35">{hourFormatter.format(new Date(message.createdAt))}</span>
                        </div>
                        {message.kind === "LINK" && message.linkUrl ? <a href={message.linkUrl} target="_blank" rel="noreferrer" className="mt-3 block rounded-2xl border border-cyan-300/20 bg-black/20 px-4 py-3 text-cyan-200">{message.linkTitle || message.linkUrl}</a> : null}
                        {message.kind === "EMOJI" && message.emoji ? <p className="mt-3 text-4xl">{message.emoji}</p> : null}
                        {message.text ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/90">{message.text}</p> : null}
                        {message.attachments.length > 0 ? (
                          <div className="mt-3 grid gap-3">
                            {message.attachments.map((attachment) => {
                              const src = resolveBackendAssetUrl(attachment.url);
                              if (attachment.kind === "IMAGE") return <a key={attachment.id || attachment.url} href={src} target="_blank" rel="noreferrer"><img src={src} alt={attachment.fileName} className="max-h-80 w-full rounded-2xl object-cover" /></a>;
                              if (attachment.kind === "AUDIO") return <audio key={attachment.id || attachment.url} controls className="w-full" src={src} />;
                              if (attachment.kind === "VIDEO") return <video key={attachment.id || attachment.url} controls className="w-full rounded-2xl" src={src} />;
                              return <a key={attachment.id || attachment.url} href={src} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/85">{attachment.fileName}</a>;
                            })}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.reactions.map((reaction) => <button key={reaction.id} type="button" onClick={() => void handleReact(message.id, reaction.emoji)} className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs">{reaction.emoji} {reaction.user.displayName}</button>)}
                          {quickReactions.map((emoji) => <button key={emoji} type="button" onClick={() => void handleReact(message.id, emoji)} className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70">{emoji}</button>)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 ? <div className="flex h-full min-h-80 items-center justify-center"><div className="max-w-md rounded-[2rem] border border-dashed border-white/10 bg-white/5 px-6 py-8 text-center"><p className="text-lg font-semibold text-cyan-200">Conversa pronta para uso</p><p className="mt-2 text-sm text-white/50">Envie texto, emoji, audio, video, imagens, links e arquivos.</p></div></div> : null}
              </div>

              <div id="tour-composer" className="border-t border-white/10 bg-black/20 px-4 py-4">
                {selectedFiles.length > 0 ? <div className="mb-3 flex flex-wrap gap-2">{selectedFiles.map((file) => <span key={`${file.name}-${file.lastModified}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">{file.name}</span>)}</div> : null}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex flex-1 items-end gap-2 rounded-[1.7rem] border border-white/10 bg-slate-950/80 p-3">
                    <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="rounded-full text-cyan-300 hover:bg-white/5"><Paperclip className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setComposerText((current) => `${current}${current ? " " : ""}${quickEmojis[0]}`)} className="rounded-full text-cyan-300 hover:bg-white/5"><SmilePlus className="h-5 w-5" /></Button>
                    <Textarea value={composerText} onChange={(event) => queueTyping(event.target.value)} placeholder="Mensagem, link, emoji ou legenda..." className="min-h-12 border-none bg-transparent px-0 text-white shadow-none focus-visible:ring-0" />
                    <Button variant="ghost" size="icon" onClick={() => void toggleAudioRecord()} className={`rounded-full hover:bg-white/5 ${recording ? "text-red-400" : "text-cyan-300"}`}><Mic className="h-5 w-5" /></Button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
                  </div>
                  <Button onClick={() => void handleSend()} disabled={pending || (!composerText.trim() && selectedFiles.length === 0)} className="h-12 rounded-full bg-emerald-400 px-6 font-semibold text-slate-950 hover:bg-emerald-300">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[75vh] items-center justify-center px-6 text-center">
              <div className="max-w-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Sinal</p>
                <h1 className="mt-4 text-4xl font-semibold">Chat web com NestJS, GraphQL, MongoDB e Railway</h1>
                <p className="mt-4 text-white/55">Selecione uma conversa ou crie um grupo para validar o novo backend.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button
                    asChild
                    className="rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                  >
                    <Link href={withBasePath("/")}>Ver landing</Link>
                  </Button>
                  <Button variant="ghost" onClick={() => setShowGroupComposer(true)} className="rounded-full border border-white/10 text-white hover:bg-white/5">Criar primeiro grupo</Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <GroupComposer open={showGroupComposer} users={users} pending={pending} onClose={() => setShowGroupComposer(false)} onCreate={handleCreateGroup} />
    </main>
  );
}
