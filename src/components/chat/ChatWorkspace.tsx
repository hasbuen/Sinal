"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Copy, Loader2, LogOut, Mic, Paperclip, Reply, Search, Send, Settings2, SmilePlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  clearBackendToken, createDirectConversation, createGroupConversation, getConversationMessages,
  getConversations, getCurrentUser, getTypingUsers, getUsers, markConversationRead, reactToMessage,
  resolveBackendAssetUrl, sendMessage, setTypingStatus, toggleMessageSaved, uploadMedia,
  type BackendAttachment, type BackendConversation, type BackendMessage, type BackendUser,
} from "@/lib/backend-client";
import { withBasePath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const InstallPwaPrompt = dynamic(() => import("@/components/InstallPwaPrompt"), { ssr: false });
const OnboardingTour = dynamic(() => import("@/components/OnboardingTour"), { ssr: false });
const GroupComposer = dynamic(() => import("./GroupComposer"), { ssr: false });
const EmojiBoard = dynamic(() => import("@/components/EmojisCustom"), { ssr: false });

const quickReactions = ["👍", "❤️", "😂", "🔥"];
const quickEmojis = ["😀", "🚀", "🎧", "✨"];
const hourFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

const isEmojiOnly = (value: string) =>
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\s)+$/u.test(value.trim());

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

const avatarLabel = (name?: string | null) => name?.trim().slice(0, 1).toUpperCase() || "S";
const messagePreview = (message?: BackendMessage | null) =>
  !message ? "Sem mensagens ainda" : message.kind === "EMOJI" ? message.emoji || "Emoji" : message.attachments[0] ? `📎 ${message.attachments[0].fileName}` : message.text || message.linkUrl || "Nova mensagem";

function conversationName(conversation: BackendConversation, currentUserId: string) {
  if (conversation.kind === "GROUP") return conversation.title || "Grupo";
  return conversation.members.find((member) => member.user.id !== currentUserId)?.user.displayName || "Conversa direta";
}

function getConversationUser(conversation: BackendConversation, currentUserId: string) {
  return conversation.members.find((member) => member.user.id !== currentUserId)?.user;
}

function timeUntilExpiry(message: BackendMessage, now: number) {
  if (message.isSaved || !message.expiresAt) return null;
  const diff = new Date(message.expiresAt).getTime() - now;
  if (diff <= 0) return "Expirando...";
  const minutes = Math.floor(diff / 60000);
  if (minutes > 0) return `Expira em ${minutes}m`;
  return `Expira em ${Math.floor(diff / 1000)}s`;
}

export default function ChatWorkspace({ initialConversationId }: { initialConversationId?: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const [booting, setBooting] = useState(true);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showGroupComposer, setShowGroupComposer] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentUser, setCurrentUser] = useState<BackendUser | null>(null);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [conversations, setConversations] = useState<BackendConversation[]>([]);
  const [messages, setMessages] = useState<BackendMessage[]>([]);
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [composerText, setComposerText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyingTo, setReplyingTo] = useState<BackendMessage | null>(null);
  const [clock, setClock] = useState(Date.now());
  const deferredSearch = useDeferredValue(searchTerm);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const visibleMessages = useMemo(
    () => messages.filter((message) => message.isSaved || !message.expiresAt || new Date(message.expiresAt).getTime() > clock),
    [clock, messages],
  );
  const typingUsers = useMemo(
    () => !activeConversation || !currentUser ? [] : activeConversation.members.map((member) => member.user).filter((user) => user.id !== currentUser.id && typingIds.includes(user.id)),
    [activeConversation, currentUser, typingIds],
  );
  const filteredUsers = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return !term ? users : users.filter((user) => `${user.displayName} ${user.username} ${user.email}`.toLowerCase().includes(term));
  }, [deferredSearch, users]);
  const filteredConversations = useMemo(() => {
    if (!currentUser) return conversations;
    const term = deferredSearch.trim().toLowerCase();
    return !term ? conversations : conversations.filter((conversation) => `${conversationName(conversation, currentUser.id)} ${messagePreview(conversation.latestMessage)}`.toLowerCase().includes(term));
  }, [conversations, currentUser, deferredSearch]);

  async function refreshSidebar() {
    const [nextUsers, nextConversations] = await Promise.all([getUsers(), getConversations()]);
    startTransition(() => { setUsers(nextUsers); setConversations(nextConversations); });
  }

  async function refreshMessages(conversationId: string) {
    const [nextMessages, nextTypingIds] = await Promise.all([getConversationMessages(conversationId), getTypingUsers(conversationId)]);
    startTransition(() => { setMessages(nextMessages); setTypingIds(nextTypingIds); });
    await markConversationRead(conversationId);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const me = await getCurrentUser();
        const [nextUsers, nextConversations] = await Promise.all([getUsers(), getConversations()]);
        setCurrentUser(me);
        setUsers(nextUsers);
        setConversations(nextConversations);
        if (initialConversationId) {
          const existing = nextConversations.find((conversation) => conversation.id === initialConversationId);
          setActiveConversationId(existing?.id || (await createDirectConversation(initialConversationId)).id);
        } else if (nextConversations[0]) {
          setActiveConversationId(nextConversations[0].id);
        }
      } catch (error) {
        clearBackendToken();
        router.replace("/login");
        toast.error(error instanceof Error ? error.message : "Falha ao autenticar.");
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
      setClock(Date.now());
      void refreshMessages(activeConversationId);
      void refreshSidebar();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [activeConversationId, currentUser]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeConversationId) router.replace(`/chat?id=${activeConversationId}`);
  }, [activeConversationId, router]);

  function queueTyping(value: string) {
    setComposerText(value);
    if (!activeConversationId) return;
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    void setTypingStatus(activeConversationId, value.trim().length > 0);
    typingTimeoutRef.current = window.setTimeout(() => void setTypingStatus(activeConversationId, false), 1200);
  }

  function handleFiles(list: FileList | null) {
    if (list?.length) setSelectedFiles((current) => [...current, ...Array.from(list)]);
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
        conversationId: activeConversationId, kind, replyToId: replyingTo?.id,
        text: kind === "TEXT" || attachments.length > 0 ? text || undefined : undefined,
        emoji: kind === "EMOJI" ? text : undefined,
        linkUrl: kind === "LINK" ? text : undefined,
        linkTitle: kind === "LINK" ? new URL(text).hostname : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setComposerText(""); setSelectedFiles([]); setReplyingTo(null);
      await Promise.all([setTypingStatus(activeConversationId, false), refreshMessages(activeConversationId), refreshSidebar()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar mensagem.");
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
      toast.error(error instanceof Error ? error.message : "Falha ao abrir conversa.");
    } finally {
      setPending(false);
    }
  }

  async function handleCreateGroup(input: { title: string; description?: string; memberIds: string[] }) {
    try {
      setPending(true);
      const conversation = await createGroupConversation(input);
      await refreshSidebar();
      setActiveConversationId(conversation.id);
      setShowGroupComposer(false);
      toast.success("Grupo criado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar grupo.");
    } finally {
      setPending(false);
    }
  }

  async function handleReaction(messageId: string, emoji: string) {
    const updated = await reactToMessage(messageId, emoji);
    setMessages((current) => current.map((message) => message.id === updated.id ? updated : message));
    await refreshSidebar();
  }

  async function handleSaveToggle(message: BackendMessage) {
    const updated = await toggleMessageSaved(message.id, !message.isSaved);
    setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
    await refreshSidebar();
  }

  async function handleCopy(message: BackendMessage) {
    const text = message.text || message.emoji || message.linkUrl || message.attachments[0]?.url || "";
    await navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada.");
  }

  async function toggleAudioRecord() {
    if (recording) {
      recorderRef.current?.stop(); setRecording(false); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderChunksRef.current = []; recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) recorderChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(recorderChunksRef.current, { type: "audio/webm" });
        setSelectedFiles((current) => [...current, new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" })]);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start(); setRecording(true);
    } catch {
      toast.error("Nao foi possivel acessar o microfone.");
    }
  }

  if (booting) return <div className="flex min-h-screen items-center justify-center bg-[#071019] text-white"><div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" />Sincronizando conversa...</div></div>;
  if (!currentUser) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#19d7ff1c,transparent_22%),radial-gradient(circle_at_bottom,#ff2ba51e,transparent_30%),linear-gradient(180deg,#020611,#09121f_55%,#0a1622)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row">
        <aside className="w-full lg:max-w-sm">
          <Card className="border-white/10 bg-slate-950/75 text-white shadow-2xl backdrop-blur">
            <CardContent className="space-y-4 p-4">
              <div id="tour-profile" className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  {currentUser.avatarUrl ? <img src={resolveBackendAssetUrl(currentUser.avatarUrl)} alt={currentUser.displayName} className="h-14 w-14 rounded-full object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-300/15 text-lg font-semibold text-cyan-200">{avatarLabel(currentUser.displayName)}</div>}
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{currentUser.displayName}</p><p className="truncate text-sm text-white/50">@{currentUser.username}</p><p className="truncate text-xs text-white/35">Tudo some em 1h, salvo quando voce marca.</p></div>
                  <OnboardingTour />
                  <Button asChild variant="ghost" size="icon" className="rounded-full text-white/70 hover:bg-white/10"><Link href="/configuracoes"><Settings2 className="h-4 w-4" /></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => { clearBackendToken(); router.replace("/login"); }} className="rounded-full text-white/70 hover:bg-white/10"><LogOut className="h-4 w-4" /></Button>
                </div>
              </div>
              <div id="tour-install"><InstallPwaPrompt /></div>
              <div id="tour-search" className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2"><Search className="h-4 w-4 text-white/40" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar conversas ou pessoas" className="border-none bg-transparent px-0 text-white shadow-none focus-visible:ring-0" /></div>
              <div id="tour-group" className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => setShowGroupComposer(true)} className="rounded-full bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200"><Users className="h-4 w-4" />Novo grupo</Button>
                <Button asChild variant="ghost" className="rounded-full border border-white/10 text-white hover:bg-white/5"><Link href="/configuracoes">Perfil</Link></Button>
              </div>
              <div id="tour-chat-list" className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Conversas</p>
                <div className="grid gap-2">
                  {filteredConversations.map((conversation) => {
                    const other = getConversationUser(conversation, currentUser.id);
                    return <button key={conversation.id} type="button" onClick={() => setActiveConversationId(conversation.id)} className={`rounded-[1.4rem] border p-3 text-left transition ${conversation.id === activeConversationId ? "border-cyan-300/40 bg-cyan-300/12" : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"}`}><div className="flex items-start gap-3">{other?.avatarUrl ? <img src={resolveBackendAssetUrl(other.avatarUrl)} alt={conversationName(conversation, currentUser.id)} className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">{conversation.kind === "GROUP" ? "GR" : avatarLabel(other?.displayName)}</div>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="truncate font-medium">{conversationName(conversation, currentUser.id)}</p>{conversation.latestMessage ? <p className="text-xs text-white/40">{hourFormatter.format(new Date(conversation.latestMessage.createdAt))}</p> : null}</div><p className="mt-1 truncate text-sm text-white/45">{messagePreview(conversation.latestMessage)}</p></div></div></button>;
                  })}
                </div>
              </div>
              <div className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between"><p className="text-xs uppercase tracking-[0.25em] text-white/40">Pessoas</p><span className="text-xs text-white/35">{filteredUsers.length} contatos</span></div>
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">{filteredUsers.map((user) => <button key={user.id} type="button" onClick={() => void handleDirectConversation(user.id)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/5"><div className="flex min-w-0 items-center gap-3">{user.avatarUrl ? <img src={resolveBackendAssetUrl(user.avatarUrl)} alt={user.displayName} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">{avatarLabel(user.displayName)}</div>}<div className="min-w-0"><p className="truncate font-medium">{user.displayName}</p><p className="truncate text-sm text-white/45">@{user.username}</p></div></div><span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs text-cyan-200">Conversar</span></button>)}</div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="flex min-h-[75vh] flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 shadow-2xl backdrop-blur">
          {activeConversation ? <>
            <div id="tour-header" className="border-b border-white/10 px-5 py-4"><p className="truncate text-xl font-semibold">{conversationName(activeConversation, currentUser.id)}</p><p className="mt-1 truncate text-sm text-white/45">{typingUsers.length > 0 ? `${typingUsers.map((user) => user.displayName).join(", ")} digitando...` : "Mensagens expiram em 1 hora por padrao"}</p></div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {visibleMessages.map((message) => {
                const mine = message.sender.id === currentUser.id;
                return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[92%] rounded-[1.6rem] border px-4 py-3 shadow-lg sm:max-w-[78%] ${mine ? "border-cyan-300/20 bg-cyan-300/12" : "border-white/10 bg-white/5"}`}><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{mine ? "Voce" : message.sender.displayName}</p><div className="flex items-center gap-2">{message.isSaved ? <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-emerald-200">Salva</span> : timeUntilExpiry(message, clock) ? <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-white/50">{timeUntilExpiry(message, clock)}</span> : null}<span className="text-xs text-white/35">{hourFormatter.format(new Date(message.createdAt))}</span></div></div>{message.replyTo ? <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65"><p className="font-semibold text-cyan-200">Respondendo a {message.replyTo.sender.displayName}</p><p className="mt-1 truncate">{message.replyTo.text || message.replyTo.emoji || message.replyTo.linkUrl || messagePreview(message.replyTo)}</p></div> : null}{message.kind === "LINK" && message.linkUrl ? <a href={message.linkUrl} target="_blank" rel="noreferrer" className="mt-3 block rounded-2xl border border-cyan-300/20 bg-black/20 px-4 py-3 text-cyan-200">{message.linkTitle || message.linkUrl}</a> : null}{message.kind === "EMOJI" && message.emoji ? <p className="mt-3 text-4xl">{message.emoji}</p> : null}{message.text ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/90">{message.text}</p> : null}{message.attachments.length > 0 ? <div className="mt-3 grid gap-3">{message.attachments.map((attachment) => { const src = resolveBackendAssetUrl(attachment.url); if (attachment.kind === "IMAGE") return <a key={attachment.id || attachment.url} href={src} target="_blank" rel="noreferrer"><img src={src} alt={attachment.fileName} className="max-h-80 w-full rounded-2xl object-cover" /></a>; if (attachment.kind === "AUDIO") return <audio key={attachment.id || attachment.url} controls className="w-full" src={src} />; if (attachment.kind === "VIDEO") return <video key={attachment.id || attachment.url} controls className="w-full rounded-2xl" src={src} />; return <a key={attachment.id || attachment.url} href={src} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/85">{attachment.fileName}</a>; })}</div> : null}<div className="mt-3 flex flex-wrap gap-2">{message.reactions.map((reaction) => <button key={reaction.id} type="button" onClick={() => void handleReaction(message.id, reaction.emoji)} className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs">{reaction.emoji}</button>)}{quickReactions.map((emoji) => <button key={emoji} type="button" onClick={() => void handleReaction(message.id, emoji)} className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70">{emoji}</button>)}</div><div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45"><button type="button" onClick={() => setReplyingTo(message)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 hover:bg-white/10"><Reply className="h-3.5 w-3.5" />Responder</button><button type="button" onClick={() => void handleSaveToggle(message)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 hover:bg-white/10">{message.isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-emerald-300" /> : <Bookmark className="h-3.5 w-3.5" />}{message.isSaved ? "Guardada" : "Salvar"}</button><button type="button" onClick={() => void handleCopy(message)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 hover:bg-white/10"><Copy className="h-3.5 w-3.5" />Copiar</button></div></div></div>;
              })}
              {visibleMessages.length === 0 ? <div className="flex h-full min-h-80 items-center justify-center"><div className="max-w-md rounded-[2rem] border border-dashed border-white/10 bg-white/5 px-6 py-8 text-center"><p className="text-lg font-semibold text-cyan-200">Conversa pronta para uso</p><p className="mt-2 text-sm text-white/50">Texto, emoji, audio, imagem, video, links e mensagens temporarias.</p></div></div> : null}
            </div>
            <div id="tour-composer" className="border-t border-white/10 bg-black/20 px-4 py-4">
              {replyingTo ? <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Respondendo a {replyingTo.sender.displayName}</p><p className="mt-1 truncate text-sm text-white/70">{replyingTo.text || replyingTo.emoji || replyingTo.linkUrl || messagePreview(replyingTo)}</p></div><Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="rounded-full text-white/70 hover:bg-white/5"><X className="h-4 w-4" /></Button></div> : null}
              {selectedFiles.length > 0 ? <div className="mb-3 flex flex-wrap gap-2">{selectedFiles.map((file) => <span key={`${file.name}-${file.lastModified}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">{file.name}</span>)}</div> : null}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="flex flex-1 items-end gap-2 rounded-[1.7rem] border border-white/10 bg-slate-950/80 p-3">
                  <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="rounded-full text-cyan-300 hover:bg-white/5"><Paperclip className="h-5 w-5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(true)} className="rounded-full text-cyan-300 hover:bg-white/5"><SmilePlus className="h-5 w-5" /></Button>
                  <Textarea value={composerText} onChange={(event) => queueTyping(event.target.value)} placeholder="Mensagem, emoji, link, legenda ou resposta..." className="min-h-12 border-none bg-transparent px-0 text-white shadow-none focus-visible:ring-0" />
                  <Button variant="ghost" size="icon" onClick={() => void toggleAudioRecord()} className={`rounded-full hover:bg-white/5 ${recording ? "text-red-400" : "text-cyan-300"}`}><Mic className="h-5 w-5" /></Button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
                </div>
                <Button onClick={() => void handleSend()} disabled={pending || (!composerText.trim() && selectedFiles.length === 0)} className="h-12 rounded-full bg-emerald-400 px-6 font-semibold text-slate-950 hover:bg-emerald-300">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar</Button>
              </div>
            </div>
          </> : <div className="flex h-full min-h-[75vh] items-center justify-center px-6 text-center"><div className="max-w-xl"><p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Sinal</p><h1 className="mt-4 text-4xl font-semibold">Chat efemero com salvar individual por mensagem</h1><p className="mt-4 text-white/55">Selecione uma conversa ou crie um grupo. O fluxo agora prioriza mensagens temporarias e midia.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild className="rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Link href={withBasePath("/")}>Ver landing</Link></Button><Button variant="ghost" onClick={() => setShowGroupComposer(true)} className="rounded-full border border-white/10 text-white hover:bg-white/5">Criar primeiro grupo</Button></div></div></div>}
        </section>
      </div>

      {showEmojiPicker ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"><div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/95 p-4 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">Emojis</p><h3 className="mt-1 text-xl font-semibold">Escolha um emoji</h3></div><Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(false)} className="rounded-full text-white/70 hover:bg-white/10"><X className="h-5 w-5" /></Button></div><div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-3"><EmojiBoard onEmojiClick={(emoji) => { queueTyping(`${composerText}${composerText.trim().length > 0 ? " " : ""}${emoji}`); setShowEmojiPicker(false); }} /></div><div className="mt-4 flex flex-wrap gap-2">{quickEmojis.map((emoji) => <button key={emoji} type="button" onClick={() => { queueTyping(`${composerText}${composerText.trim().length > 0 ? " " : ""}${emoji}`); setShowEmojiPicker(false); }} className="rounded-full border border-white/10 px-3 py-2 text-xl transition hover:bg-white/10">{emoji}</button>)}</div></div></div> : null}

      <GroupComposer open={showGroupComposer} users={users} pending={pending} onClose={() => setShowGroupComposer(false)} onCreate={handleCreateGroup} />
    </main>
  );
}
