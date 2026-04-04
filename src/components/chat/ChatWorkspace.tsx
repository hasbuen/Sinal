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
  Loader2,
  LogOut,
  Mic,
  Paperclip,
  Phone,
  Search,
  Send,
  Settings2,
  SmilePlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  clearBackendToken,
  createDirectConversation,
  createGroupConversation,
  deleteMessage,
  editMessage,
  forwardMessage,
  getConversationMessages,
  getConversationPresence,
  getConversations,
  getCurrentUser,
  getTypingUsers,
  getUsers,
  markConversationRead,
  reactToMessage,
  resolveBackendAssetUrl,
  sendCallSignal,
  sendMessage,
  setPresence,
  setTypingStatus,
  subscribeToCallSignals,
  subscribeToMessageEvents,
  subscribeToPresence,
  supportsWebSocketRealtime,
  toggleMessageSaved,
  uploadMedia,
  type BackendAttachment,
  type BackendCallSignal,
  type BackendConversation,
  type BackendMessage,
  type BackendPresence,
  type BackendUser,
} from "@/lib/backend-client";
import { withBasePath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChatCallOverlay, type ChatCallState } from "./ChatCallOverlay";
import { ChatForwardSheet } from "./ChatForwardSheet";
import { ChatMessageBubble } from "./ChatMessageBubble";
import {
  avatarLabel,
  conversationName,
  dedupeConversations,
  formatTypingLabel,
  formatUserStatus,
  getConversationUser,
  hourFormatter,
  inferMessageKind,
  messagePreview,
  quickEmojis,
} from "./chat-helpers";

const InstallPwaPrompt = dynamic(() => import("@/components/InstallPwaPrompt"), {
  ssr: false,
});
const OnboardingTour = dynamic(() => import("@/components/OnboardingTour"), {
  ssr: false,
});
const GroupComposer = dynamic(() => import("./GroupComposer"), { ssr: false });
const EmojiBoard = dynamic(() => import("@/components/EmojisCustom"), {
  ssr: false,
});

const defaultCallState: ChatCallState & {
  remoteUserId?: string | null;
  pendingOffer?: RTCSessionDescriptionInit | null;
} = {
  phase: "idle",
  mode: "audio",
  remoteLabel: null,
  remoteUserId: null,
  pendingOffer: null,
  muted: false,
  cameraEnabled: true,
};

export default function ChatWorkspace({
  initialConversationId,
}: {
  initialConversationId?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const directOpenLocksRef = useRef<Set<string>>(new Set());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [booting, setBooting] = useState(true);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showGroupComposer, setShowGroupComposer] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showForwardSheet, setShowForwardSheet] = useState(false);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
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
  const [replyingTo, setReplyingTo] = useState<BackendMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<BackendMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<BackendMessage | null>(
    null,
  );
  const [forwardNote, setForwardNote] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [presenceMap, setPresenceMap] = useState<Record<string, BackendPresence>>(
    {},
  );
  const [callState, setCallState] = useState(defaultCallState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);
  const websocketRealtime = supportsWebSocketRealtime();

  const normalizedConversations = useMemo(
    () =>
      currentUser ? dedupeConversations(conversations, currentUser.id) : conversations,
    [conversations, currentUser],
  );
  const activeConversation = normalizedConversations.find(
    (conversation) => conversation.id === activeConversationId,
  );
  const activeDirectUser =
    activeConversation && currentUser
      ? getConversationUser(activeConversation, currentUser.id)
      : null;
  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.isSaved ||
          !message.expiresAt ||
          new Date(message.expiresAt).getTime() > clock,
      ),
    [clock, messages],
  );
  const typingUsers = useMemo(
    () =>
      !activeConversation || !currentUser
        ? []
        : activeConversation.members
            .map((member) => member.user)
            .filter(
              (user) => user.id !== currentUser.id && typingIds.includes(user.id),
            ),
    [activeConversation, currentUser, typingIds],
  );
  const filteredUsers = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return !term
      ? users
      : users.filter((user) =>
          `${user.displayName} ${user.username} ${user.email}`
            .toLowerCase()
            .includes(term),
        );
  }, [deferredSearch, users]);
  const filteredConversations = useMemo(() => {
    if (!currentUser) return normalizedConversations;
    const term = deferredSearch.trim().toLowerCase();
    return !term
      ? normalizedConversations
      : normalizedConversations.filter((conversation) =>
          `${conversationName(conversation, currentUser.id)} ${messagePreview(
            conversation.latestMessage,
          )}`
            .toLowerCase()
            .includes(term),
        );
  }, [currentUser, deferredSearch, normalizedConversations]);

  function patchMessage(updated: BackendMessage) {
    setMessages((current) =>
      current.map((message) => (message.id === updated.id ? updated : message)),
    );
  }

  function appendMessage(message: BackendMessage) {
    setMessages((current) => [...current, message]);
  }

  function syncConversationPreview(
    conversationId: string,
    message: BackendMessage,
  ) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              latestMessage: message,
              lastMessageAt: message.createdAt,
            }
          : conversation,
      ),
    );
  }

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

  async function openDirectConversation(user: BackendUser) {
    if (!currentUser) return;

    const existing = normalizedConversations.find(
      (conversation) =>
        conversation.kind === "DIRECT" &&
        getConversationUser(conversation, currentUser.id)?.id === user.id,
    );

    if (existing) {
      setActiveConversationId(existing.id);
      return;
    }

    if (directOpenLocksRef.current.has(user.id)) {
      return;
    }

    directOpenLocksRef.current.add(user.id);

    try {
      setPending(true);
      const conversation = await createDirectConversation(user.id);
      await refreshSidebar();
      setActiveConversationId(conversation.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao abrir conversa.");
    } finally {
      directOpenLocksRef.current.delete(user.id);
      setPending(false);
    }
  }

  async function syncPresence(conversationId: string) {
    const presence = await getConversationPresence(conversationId);
    setPresenceMap((current) => {
      const next = { ...current };
      presence.forEach((item) => {
        next[item.userId] = item;
      });
      return next;
    });
  }

  function cleanupCall() {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(defaultCallState);
  }

  async function ensureLocalStream(mode: "audio" | "video") {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video",
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }

  async function createPeer(
    targetUserId: string,
    mode: "audio" | "video",
    conversationId: string,
  ) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    const nextRemoteStream = new MediaStream();
    remoteStreamRef.current = nextRemoteStream;
    setRemoteStream(nextRemoteStream);
    peer.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => nextRemoteStream.addTrack(track));
      setRemoteStream(new MediaStream(nextRemoteStream.getTracks()));
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      void sendCallSignal({
        conversationId,
        targetUserId,
        type: "ICE_CANDIDATE",
        payload: event.candidate.toJSON() as Record<string, unknown>,
      });
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setCallState((current) => ({ ...current, phase: "active" }));
      }
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
        cleanupCall();
      }
    };
    peerConnectionRef.current = peer;
    setCallState((current) => ({ ...current, mode, remoteUserId: targetUserId }));
    return peer;
  }

  async function startOutgoingCall(mode: "audio" | "video") {
    if (!activeConversation || !activeDirectUser) return;
    if (!websocketRealtime) {
      toast.error("Chamadas em tempo real exigem um backend com suporte a WebSocket.");
      return;
    }
    try {
      const stream = await ensureLocalStream(mode);
      const peer = await createPeer(activeDirectUser.id, mode, activeConversation.id);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video",
      });
      await peer.setLocalDescription(offer);
      setCallState({
        phase: "calling",
        mode,
        remoteLabel: activeDirectUser.displayName,
        remoteUserId: activeDirectUser.id,
        pendingOffer: null,
        muted: false,
        cameraEnabled: mode === "video",
      });
      await sendCallSignal({
        conversationId: activeConversation.id,
        targetUserId: activeDirectUser.id,
        type: "OFFER",
        payload: { mode, description: offer },
      });
    } catch {
      cleanupCall();
      toast.error("Nao foi possivel iniciar a chamada.");
    }
  }

  async function acceptIncomingCall() {
    if (!activeConversation || !callState.pendingOffer || !callState.remoteUserId) {
      return;
    }
    if (!websocketRealtime) {
      toast.error("Chamadas em tempo real exigem um backend com suporte a WebSocket.");
      return;
    }
    try {
      const stream = await ensureLocalStream(callState.mode);
      const peer = await createPeer(
        callState.remoteUserId,
        callState.mode,
        activeConversation.id,
      );
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(callState.pendingOffer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendCallSignal({
        conversationId: activeConversation.id,
        targetUserId: callState.remoteUserId,
        type: "ANSWER",
        payload: { mode: callState.mode, description: answer },
      });
      setCallState((current) => ({ ...current, phase: "connecting", pendingOffer: null }));
    } catch {
      cleanupCall();
      toast.error("Nao foi possivel aceitar a chamada.");
    }
  }

  async function endCall(type: BackendCallSignal["type"] = "ENDED") {
    if (activeConversation && callState.remoteUserId) {
      await sendCallSignal({
        conversationId: activeConversation.id,
        targetUserId: callState.remoteUserId,
        type,
      }).catch(() => undefined);
    }
    cleanupCall();
  }

  async function handleSignal(signal: BackendCallSignal) {
    const sender =
      activeConversation?.members.find((member) => member.user.id === signal.senderId)
        ?.user || users.find((user) => user.id === signal.senderId);
    if (signal.type === "OFFER") {
      const description = signal.payload?.description as RTCSessionDescriptionInit | undefined;
      const mode = (signal.payload?.mode as "audio" | "video" | undefined) || "audio";
      if (!description) return;
      setCallState({
        phase: "incoming",
        mode,
        remoteLabel: sender?.displayName || "Contato",
        remoteUserId: signal.senderId,
        pendingOffer: description,
        muted: false,
        cameraEnabled: mode === "video",
      });
      return;
    }
    if (signal.type === "ANSWER" && peerConnectionRef.current) {
      const description = signal.payload?.description as RTCSessionDescriptionInit | undefined;
      if (description) {
        await peerConnectionRef.current.setRemoteDescription(description);
        setCallState((current) => ({ ...current, phase: "connecting" }));
      }
      return;
    }
    if (signal.type === "ICE_CANDIDATE" && peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(signal.payload as RTCIceCandidateInit);
      return;
    }
    if (signal.type === "DECLINED") {
      cleanupCall();
      toast.error("A chamada foi recusada.");
      return;
    }
    if (signal.type === "ENDED") {
      cleanupCall();
      toast("Chamada encerrada.");
    }
  }

  function queueTyping(value: string) {
    setComposerText(value);
    if (!activeConversationId) return;
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    void setTypingStatus(activeConversationId, value.trim().length > 0);
    typingTimeoutRef.current = window.setTimeout(() => {
      void setTypingStatus(activeConversationId, false);
    }, 1200);
  }

  async function bootstrap() {
    try {
      const me = await getCurrentUser();
      const [nextUsers, nextConversations] = await Promise.all([
        getUsers(),
        getConversations(),
      ]);
      const visibleConversations = dedupeConversations(nextConversations, me.id);
      setCurrentUser(me);
      setUsers(nextUsers);
      setConversations(nextConversations);
      if (initialConversationId) {
        const existing = visibleConversations.find(
          (item) => item.id === initialConversationId,
        );
        if (existing) {
          setActiveConversationId(existing.id);
        } else if (visibleConversations[0]) {
          setActiveConversationId(visibleConversations[0].id);
        }
      } else if (visibleConversations[0]) {
        setActiveConversationId(visibleConversations[0].id);
      }
    } catch (error) {
      clearBackendToken();
      router.replace("/login");
      toast.error(error instanceof Error ? error.message : "Falha ao autenticar.");
    } finally {
      setBooting(false);
    }
  }

  async function handleSend() {
    if (!activeConversationId) return;
    const text = composerText.trim();
    if (!text && selectedFiles.length === 0 && !editingMessage) return;
    try {
      setPending(true);
      if (editingMessage) {
        const updated = await editMessage({
          messageId: editingMessage.id,
          text:
            editingMessage.kind === "TEXT" || editingMessage.attachments.length > 0
              ? text || undefined
              : undefined,
          emoji: editingMessage.kind === "EMOJI" ? text || undefined : undefined,
          linkUrl: editingMessage.kind === "LINK" ? text || undefined : undefined,
          linkTitle:
            editingMessage.kind === "LINK" && text ? new URL(text).hostname : undefined,
        });
        patchMessage(updated);
        syncConversationPreview(activeConversationId, updated);
        setEditingMessage(null);
        setComposerText("");
        return;
      }
      const attachments: BackendAttachment[] = [];
      for (const file of selectedFiles) {
        const uploaded = await uploadMedia(file);
        attachments.push({ ...uploaded, url: resolveBackendAssetUrl(uploaded.url) });
      }
      const kind = inferMessageKind(text, attachments);
      const created = await sendMessage({
        conversationId: activeConversationId,
        kind,
        replyToId: replyingTo?.id,
        text: kind === "TEXT" || attachments.length > 0 ? text || undefined : undefined,
        emoji: kind === "EMOJI" ? text : undefined,
        linkUrl: kind === "LINK" ? text : undefined,
        linkTitle: kind === "LINK" && text ? new URL(text).hostname : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setComposerText("");
      setSelectedFiles([]);
      setReplyingTo(null);
      appendMessage(created);
      syncConversationPreview(activeConversationId, created);
      await setTypingStatus(activeConversationId, false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    void bootstrap();
  }, [initialConversationId, router]);

  useEffect(() => {
    if (!activeConversationId || !currentUser) return;
    void refreshMessages(activeConversationId);
    void syncPresence(activeConversationId);
    void setPresence(activeConversationId).catch(() => undefined);
    if (!websocketRealtime) return;
    const interval = window.setInterval(() => {
      void refreshSidebar();
      void syncPresence(activeConversationId);
      void setPresence(activeConversationId).catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [activeConversationId, currentUser, websocketRealtime]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeConversationId) router.replace(`/chat?id=${activeConversationId}`);
  }, [activeConversationId, router]);

  useEffect(() => {
    if (activeConversation || normalizedConversations.length === 0) return;
    setActiveConversationId(normalizedConversations[0].id);
  }, [activeConversation, normalizedConversations]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (!websocketRealtime) return;
    return subscribeToMessageEvents(activeConversationId, () => {
      void refreshMessages(activeConversationId);
      void refreshSidebar();
    });
  }, [activeConversationId, websocketRealtime]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (!websocketRealtime) return;
    return subscribeToPresence(activeConversationId, (presence) => {
      setPresenceMap((current) => ({ ...current, [presence.userId]: presence }));
    });
  }, [activeConversationId, websocketRealtime]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (!websocketRealtime) return;
    return subscribeToCallSignals(activeConversationId, (signal) => {
      void handleSignal(signal);
    });
  }, [activeConversationId, activeConversation, users, websocketRealtime]);

  useEffect(() => {
    if (!activeConversationId || websocketRealtime) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.hidden) return;

      await Promise.all([
        refreshMessages(activeConversationId),
        refreshSidebar(),
        syncPresence(activeConversationId),
        setPresence(activeConversationId).catch(() => undefined),
      ]).catch(() => undefined);
    };

    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeConversationId, websocketRealtime]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => () => cleanupCall(), []);

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071019] text-white">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          Sincronizando conversa...
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,211,102,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(88,101,242,0.18),transparent_24%),radial-gradient(circle_at_bottom,rgba(35,211,238,0.12),transparent_26%),linear-gradient(180deg,#07111a,#0a1622_45%,#0d1726)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col gap-4 px-3 py-3 lg:flex-row lg:px-5 lg:py-5">
        <aside className="w-full lg:max-w-sm">
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(9,15,24,0.92),rgba(10,18,28,0.84))] text-white shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <CardContent className="space-y-4 p-4">
              <div id="tour-profile" className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  {currentUser.avatarUrl ? <img src={resolveBackendAssetUrl(currentUser.avatarUrl)} alt={currentUser.displayName} className="h-14 w-14 rounded-full object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-300/15 text-lg font-semibold text-cyan-200">{avatarLabel(currentUser.displayName)}</div>}
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{currentUser.displayName}</p><p className="truncate text-sm text-white/50">@{currentUser.username}</p><p className="truncate text-xs text-white/35">Expira em 1h por mensagem, salvo quando voce quiser.</p></div>
                  <OnboardingTour />
                  <Button asChild variant="ghost" size="icon" className="rounded-full text-white/70 hover:bg-white/10"><Link href="/configuracoes"><Settings2 className="h-4 w-4" /></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => { clearBackendToken(); router.replace("/login"); }} className="rounded-full text-white/70 hover:bg-white/10"><LogOut className="h-4 w-4" /></Button>
                </div>
              </div>
              <div id="tour-install"><InstallPwaPrompt /></div>
              <div id="tour-search" className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2"><Search className="h-4 w-4 text-white/40" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar conversas ou pessoas" className="border-none bg-transparent px-0 text-white shadow-none focus-visible:ring-0" /></div>
              <div id="tour-group"><Button onClick={() => setShowGroupComposer(true)} className="w-full rounded-full bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200"><Users className="h-4 w-4" />Novo grupo</Button></div>
              <div id="tour-chat-list" className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-3"><p className="text-xs uppercase tracking-[0.25em] text-white/40">Conversas</p><div className="grid gap-2">{filteredConversations.map((conversation) => { const other = getConversationUser(conversation, currentUser.id); const presence = other && conversation.kind === "DIRECT" ? presenceMap[other.id] : null; return <button key={conversation.id} type="button" onClick={() => setActiveConversationId(conversation.id)} className={`rounded-[1.4rem] border p-3 text-left transition ${conversation.id === activeConversationId ? "border-cyan-300/40 bg-cyan-300/12" : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"}`}><div className="flex items-start gap-3"><div className="relative shrink-0">{other?.avatarUrl ? <img src={resolveBackendAssetUrl(other.avatarUrl)} alt={conversationName(conversation, currentUser.id)} className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">{conversation.kind === "GROUP" ? "GR" : avatarLabel(other?.displayName)}</div>}{presence?.online ? <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" /> : null}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="truncate font-medium">{conversationName(conversation, currentUser.id)}</p>{conversation.latestMessage ? <p className="text-xs text-white/40">{hourFormatter.format(new Date(conversation.latestMessage.createdAt))}</p> : null}</div><p className="mt-1 truncate text-sm text-white/45">{messagePreview(conversation.latestMessage)}</p></div></div></button>; })}</div></div>
              <div className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-3"><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-[0.25em] text-white/40">Pessoas</p><span className="text-xs text-white/35">{filteredUsers.length} contatos</span></div><div className="grid max-h-72 gap-2 overflow-y-auto pr-1">{filteredUsers.map((user) => { const presence = presenceMap[user.id]; const userStatus = formatUserStatus(user, presence); const online = userStatus === "Online"; return <button key={user.id} type="button" disabled={pending} onClick={() => void openDirectConversation(user)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"><div className="flex min-w-0 items-center gap-3"><div className="relative shrink-0">{user.avatarUrl ? <img src={resolveBackendAssetUrl(user.avatarUrl)} alt={user.displayName} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">{avatarLabel(user.displayName)}</div>}{online ? <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" /> : null}</div><div className="min-w-0"><p className="truncate font-medium">{user.displayName}</p><p className="truncate text-sm text-white/45">@{user.username}</p><p className={`truncate text-xs ${online ? "text-emerald-300/90" : "text-white/35"}`}>{userStatus}</p></div></div><span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs text-cyan-200">Conversar</span></button>; })}</div></div>
            </CardContent>
          </Card>
        </aside>

        <section className="flex min-h-[75vh] flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,22,0.92),rgba(7,15,24,0.78))] shadow-[0_25px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          {activeConversation ? <>
            <div id="tour-header" className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4"><div className="min-w-0"><p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">Modo efemero</p><p className="mt-1 truncate text-sm text-white/45">{formatTypingLabel(typingUsers, "Mensagens expiram em 1 hora por padrao")}</p></div><div className="flex gap-2">{activeConversation.kind === "DIRECT" ? <><Button variant="ghost" size="icon" onClick={() => void startOutgoingCall("audio")} className="rounded-full border border-white/10 text-white/75 hover:bg-white/10"><Phone className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => void startOutgoingCall("video")} className="rounded-full border border-white/10 text-white/75 hover:bg-white/10"><Video className="h-4 w-4" /></Button></> : null}</div></div>
            <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_28%)] px-5 py-5">{visibleMessages.map((message) => <ChatMessageBubble key={message.id} message={message} currentUserId={currentUser.id} conversation={activeConversation} clock={clock} menuOpen={menuMessageId === message.id} onToggleMenu={() => setMenuMessageId((current) => current === message.id ? null : message.id)} onReply={setReplyingTo} onSaveToggle={(item) => void toggleMessageSaved(item.id, !item.isSaved).then((updated) => { patchMessage(updated); syncConversationPreview(activeConversation.id, updated); })} onCopy={(item) => void navigator.clipboard.writeText(item.text || item.emoji || item.linkUrl || item.attachments[0]?.url || "").then(() => toast.success("Mensagem copiada."))} onForward={(item) => { setForwardingMessage(item); setShowForwardSheet(true); setMenuMessageId(null); }} onEdit={(item) => { setEditingMessage(item); setReplyingTo(null); setComposerText(item.kind === "LINK" ? item.linkUrl || "" : item.kind === "EMOJI" ? item.emoji || "" : item.text || ""); setMenuMessageId(null); }} onDelete={(messageId) => void deleteMessage(messageId).then((updated) => { patchMessage(updated); syncConversationPreview(activeConversation.id, updated); setMenuMessageId(null); })} onReaction={(messageId, emoji) => void reactToMessage(messageId, emoji).then((updated) => { patchMessage(updated); syncConversationPreview(activeConversation.id, updated); })} />)}{visibleMessages.length === 0 ? <div className="flex h-full min-h-80 items-center justify-center"><div className="max-w-md rounded-[2rem] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]"><p className="text-lg font-semibold text-cyan-200">Conversa pronta para uso</p><p className="mt-2 text-sm text-white/50">Texto, emoji, audio, imagem, video, links, chamada e mensagens temporarias.</p></div></div> : null}</div>
            <div id="tour-composer" className="border-t border-white/10 bg-black/20 px-4 py-4">{replyingTo ? <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Respondendo a {replyingTo.sender.displayName}</p><p className="mt-1 truncate text-sm text-white/70">{replyingTo.text || replyingTo.emoji || replyingTo.linkUrl || messagePreview(replyingTo)}</p></div><Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="rounded-full text-white/70 hover:bg-white/5"><X className="h-4 w-4" /></Button></div> : null}{editingMessage ? <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Editando mensagem</p><p className="mt-1 truncate text-sm text-white/70">{messagePreview(editingMessage)}</p></div><Button variant="ghost" size="icon" onClick={() => { setEditingMessage(null); setComposerText(""); }} className="rounded-full text-white/70 hover:bg-white/5"><X className="h-4 w-4" /></Button></div> : null}{selectedFiles.length > 0 ? <div className="mb-3 flex flex-wrap gap-2">{selectedFiles.map((file) => <span key={`${file.name}-${file.lastModified}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">{file.name}</span>)}</div> : null}<div className="flex flex-col gap-3 lg:flex-row lg:items-end"><div className="flex flex-1 items-end gap-2 rounded-[1.7rem] border border-white/10 bg-slate-950/80 p-3"><Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="rounded-full text-cyan-300 hover:bg-white/5"><Paperclip className="h-5 w-5" /></Button><Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(true)} className="rounded-full text-cyan-300 hover:bg-white/5"><SmilePlus className="h-5 w-5" /></Button><Textarea value={composerText} onChange={(event) => queueTyping(event.target.value)} placeholder="Mensagem, emoji, link, legenda ou resposta..." className="min-h-12 border-none bg-transparent px-0 text-white shadow-none focus-visible:ring-0" /><Button variant="ghost" size="icon" onClick={() => void (async () => { if (recording) { recorderRef.current?.stop(); setRecording(false); return; } try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const recorder = new MediaRecorder(stream); recorderChunksRef.current = []; recorderRef.current = recorder; recorder.ondataavailable = (event) => { if (event.data.size > 0) recorderChunksRef.current.push(event.data); }; recorder.onstop = () => { const blob = new Blob(recorderChunksRef.current, { type: "audio/webm" }); setSelectedFiles((current) => [...current, new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" })]); stream.getTracks().forEach((track) => track.stop()); }; recorder.start(); setRecording(true); } catch { toast.error("Nao foi possivel acessar o microfone."); } })()} className={`rounded-full hover:bg-white/5 ${recording ? "text-red-400" : "text-cyan-300"}`}><Mic className="h-5 w-5" /></Button><input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => setSelectedFiles((current) => [...current, ...Array.from(event.target.files || [])])} /></div><Button onClick={() => void handleSend()} disabled={pending || (!composerText.trim() && selectedFiles.length === 0 && !editingMessage)} className="h-12 rounded-full bg-emerald-400 px-6 font-semibold text-slate-950 hover:bg-emerald-300">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{editingMessage ? "Salvar edicao" : "Enviar"}</Button></div></div>
          </> : <div className="flex h-full min-h-[75vh] items-center justify-center px-6 text-center"><div className="max-w-xl"><p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Sinal</p><h1 className="mt-4 text-4xl font-semibold">Chat efemero com chamadas, recibos e salvar individual</h1><p className="mt-4 text-white/55">Selecione uma conversa ou crie um grupo. O fluxo prioriza mensagens temporarias, presenca em tempo real e chamada direta.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild className="rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Link href="/">Ver landing</Link></Button><Button variant="ghost" onClick={() => setShowGroupComposer(true)} className="rounded-full border border-white/10 text-white hover:bg-white/5">Criar primeiro grupo</Button></div></div></div>}
        </section>
      </div>

      {showEmojiPicker ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"><div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/95 p-4 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">Emojis</p><h3 className="mt-1 text-xl font-semibold">Escolha um emoji</h3></div><Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(false)} className="rounded-full text-white/70 hover:bg-white/10"><X className="h-5 w-5" /></Button></div><div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-3"><EmojiBoard onEmojiClick={(emoji) => { queueTyping(`${composerText}${composerText.trim().length > 0 ? " " : ""}${emoji}`); setShowEmojiPicker(false); }} /></div><div className="mt-4 flex flex-wrap gap-2">{quickEmojis.map((emoji) => <button key={emoji} type="button" onClick={() => { queueTyping(`${composerText}${composerText.trim().length > 0 ? " " : ""}${emoji}`); setShowEmojiPicker(false); }} className="rounded-full border border-white/10 px-3 py-2 text-xl transition hover:bg-white/10">{emoji}</button>)}</div></div></div> : null}

      <ChatForwardSheet open={showForwardSheet} message={forwardingMessage} currentUserId={currentUser.id} conversations={conversations} note={forwardNote} onNoteChange={setForwardNote} onClose={() => { setShowForwardSheet(false); setForwardingMessage(null); setForwardNote(""); }} onPickConversation={(conversationId) => void (async () => { if (!forwardingMessage) return; try { setPending(true); await forwardMessage({ messageId: forwardingMessage.id, conversationId, note: forwardNote.trim() || undefined }); setShowForwardSheet(false); setForwardingMessage(null); setForwardNote(""); await refreshSidebar(); if (conversationId === activeConversationId) await refreshMessages(conversationId); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao encaminhar."); } finally { setPending(false); } })()} />
      <ChatCallOverlay state={callState} localVideoRef={localVideoRef} remoteVideoRef={remoteVideoRef} hasLocalStream={Boolean(localStream)} hasRemoteStream={Boolean(remoteStream)} onAccept={() => void acceptIncomingCall()} onDecline={() => void endCall("DECLINED")} onToggleMute={() => { const stream = localStreamRef.current; if (!stream || !activeConversation || !callState.remoteUserId) return; const nextMuted = !callState.muted; stream.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; }); setCallState((current) => ({ ...current, muted: nextMuted })); void sendCallSignal({ conversationId: activeConversation.id, targetUserId: callState.remoteUserId, type: "TOGGLE_AUDIO", payload: { enabled: !nextMuted } }); }} onToggleCamera={() => { const stream = localStreamRef.current; if (!stream || !activeConversation || !callState.remoteUserId) return; const nextEnabled = !callState.cameraEnabled; stream.getVideoTracks().forEach((track) => { track.enabled = nextEnabled; }); setCallState((current) => ({ ...current, cameraEnabled: nextEnabled })); void sendCallSignal({ conversationId: activeConversation.id, targetUserId: callState.remoteUserId, type: "TOGGLE_VIDEO", payload: { enabled: nextEnabled } }); }} onEnd={() => void endCall("ENDED")} />
      <GroupComposer open={showGroupComposer} users={users} pending={pending} onClose={() => setShowGroupComposer(false)} onCreate={async (input) => { try { setPending(true); const conversation = await createGroupConversation(input); await refreshSidebar(); setActiveConversationId(conversation.id); setShowGroupComposer(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao criar grupo."); } finally { setPending(false); } }} />
    </main>
  );
}
