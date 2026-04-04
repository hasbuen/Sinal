"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
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
  ArrowLeft,
  Camera,
  Loader2,
  LogOut,
  Menu,
  Mic,
  Moon,
  Paperclip,
  Phone,
  Search,
  Send,
  Settings2,
  SmilePlus,
  Sun,
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
  uploadMedia,
  type BackendAttachment,
  type BackendCallSignal,
  type BackendConversation,
  type BackendMessage,
  type BackendPresence,
  type BackendUser,
} from "@/lib/backend-client";
import { isAppwriteEnabled, logoutAppwrite } from "@/lib/appwrite-client";
import { Button } from "@/components/ui/button";
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
import { toAppHref } from "@/lib/runtime";
import { withBasePath } from "@/lib/utils";

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

const mobileTabs = [
  { id: "chats", label: "Chats" },
  { id: "status", label: "Status" },
  { id: "calls", label: "Chamadas" },
] as const;

type MobileTab = (typeof mobileTabs)[number]["id"];

export default function ChatWorkspace({
  initialConversationId,
}: {
  initialConversationId?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
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
  const [activeTab, setActiveTab] = useState<MobileTab>("chats");
  const [darkMode, setDarkMode] = useState(true);
  const deferredSearch = useDeferredValue(searchTerm);
  const websocketRealtime = supportsWebSocketRealtime();
  const appwriteEnabled = isAppwriteEnabled();

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
  const statusEntries = useMemo(() => {
    if (!currentUser) return [];

    return filteredUsers
      .filter((user) => user.id !== currentUser.id)
      .map((user) => ({
        user,
        presence: presenceMap[user.id],
        label: formatUserStatus(user, presenceMap[user.id]),
      }))
      .sort(
        (a, b) => Number(Boolean(b.presence?.online)) - Number(Boolean(a.presence?.online)),
      );
  }, [currentUser, filteredUsers, presenceMap]);
  const callEntries = useMemo(
    () => filteredConversations.filter((conversation) => conversation.kind === "DIRECT"),
    [filteredConversations],
  );
  const activePresence =
    activeDirectUser && activeConversation?.kind === "DIRECT"
      ? presenceMap[activeDirectUser.id]
      : null;
  const mobileShowingChat = activeTab === "chats" && Boolean(activeConversation);

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
      setActiveTab("chats");
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
      setActiveTab("chats");
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

  async function startOutgoingCall(
    mode: "audio" | "video",
    conversationOverride?: BackendConversation,
    directUserOverride?: BackendUser | null,
  ) {
    const conversation = conversationOverride ?? activeConversation;
    const directUser = directUserOverride ?? activeDirectUser;
    if (!conversation || !directUser) return;
    if (!websocketRealtime) {
      toast.error("Chamadas em tempo real exigem um backend com suporte a WebSocket.");
      return;
    }
    try {
      const stream = await ensureLocalStream(mode);
      const peer = await createPeer(directUser.id, mode, conversation.id);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === "video",
      });
      await peer.setLocalDescription(offer);
      setCallState({
        phase: "calling",
        mode,
        remoteLabel: directUser.displayName,
        remoteUserId: directUser.id,
        pendingOffer: null,
        muted: false,
        cameraEnabled: mode === "video",
      });
      await sendCallSignal({
        conversationId: conversation.id,
        targetUserId: directUser.id,
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
      router.replace(toAppHref("/login"));
      toast.error(error instanceof Error ? error.message : "Falha ao autenticar.");
    } finally {
      setBooting(false);
    }
  }

  async function handleRecordToggle() {
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
        setSelectedFiles((current) => [
          ...current,
          new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" }),
        ]);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Nao foi possivel acessar o microfone.");
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
          attachments.push({
            ...uploaded,
            url: resolveBackendAssetUrl(uploaded.url),
            thumbnailUrl: uploaded.thumbnailUrl
              ? resolveBackendAssetUrl(uploaded.thumbnailUrl)
              : uploaded.thumbnailUrl,
          });
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
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setDarkMode(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

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
    if (activeConversationId) router.replace(toAppHref(`/chat?id=${activeConversationId}`));
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(37,211,102,0.18),transparent_30%),linear-gradient(160deg,#06131c_18%,#09141f_100%)] px-6 text-white">
        <div className="flex w-full max-w-sm flex-col items-center rounded-[2rem] border border-white/10 bg-white/[0.04] px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="rounded-[1.8rem] bg-emerald-300/12 p-4 shadow-[0_0_40px_rgba(37,211,102,0.22)]">
            <Image
              src={withBasePath("/icons/icon-transparent.png")}
              alt="Sinal"
              width={64}
              height={64}
              priority
              className="rounded-2xl"
            />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.34em] text-emerald-100/65">Sinal</p>
          <h1 className="mt-3 text-3xl font-semibold">Abrindo suas conversas</h1>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78">
            <Loader2 className="h-4 w-4 animate-spin text-[#25D366]" />
            Sincronizando agora
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <main className={`${darkMode ? "dark" : ""} min-h-screen bg-[#ECE5DD] text-[#111B21] dark:bg-[#0b141a] dark:text-white`}>
      <div className="sticky top-0 z-30 bg-[#075E54] text-white shadow-md">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 font-semibold">
              {avatarLabel(currentUser.displayName)}
            </div>
            <div>
              <p className="text-lg font-semibold">Sinal</p>
              <p className="text-xs text-white/75">Conversa pronta para abrir, responder e seguir.</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <OnboardingTour />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/10"
              onClick={() => setDarkMode((current) => !current)}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button asChild variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10">
              <Link href={toAppHref("/configuracoes")}>
                <Settings2 className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/10"
              onClick={() =>
                void (async () => {
                  if (appwriteEnabled) {
                    await logoutAppwrite();
                  }
                  clearBackendToken();
                  router.replace(toAppHref("/login"));
                })()
              }
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 md:hidden">
          {mobileTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-white text-white"
                  : "border-transparent text-white/65"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-74px)] max-w-[1480px] gap-0 md:grid-cols-[380px_1fr]">
        <aside
          className={`border-r border-black/5 bg-[#F8F5F1] dark:border-white/5 dark:bg-[#111B21] ${
            mobileShowingChat ? "hidden md:block" : "block"
          }`}
        >
          <div className="border-b border-black/5 p-4 dark:border-white/5">
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-3 shadow-sm dark:bg-[#202c33]">
              <Search className="h-4 w-4 text-[#667781]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar conversas, contatos ou grupos"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#667781] dark:placeholder:text-white/45"
              />
            </div>
          </div>

          <div className="hidden items-center justify-between gap-2 border-b border-black/5 px-4 py-3 md:flex dark:border-white/5">
            <div className="flex gap-2">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    activeTab === tab.id
                      ? "bg-[#25D366] text-[#111B21]"
                      : "bg-black/5 text-[#667781] hover:bg-black/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setShowGroupComposer(true)}
              className="rounded-full bg-[#25D366] text-[#111B21] hover:bg-[#1fbe5c]"
            >
              <Users className="h-4 w-4" />
              Novo grupo
            </Button>
          </div>

          <div className="h-[calc(100vh-210px)] overflow-y-auto">
            {activeTab === "chats" ? (
              <>
                <div className="border-t border-black/5 dark:border-white/5">
                  {filteredConversations.map((conversation) => {
                    const other = getConversationUser(conversation, currentUser.id);
                    const presence =
                      other && conversation.kind === "DIRECT" ? presenceMap[other.id] : null;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => {
                          setActiveConversationId(conversation.id);
                          setActiveTab("chats");
                        }}
                        className={`flex w-full items-start gap-3 border-b border-black/5 px-4 py-3 text-left transition dark:border-white/5 ${
                          conversation.id === activeConversationId
                            ? "bg-[#e7ffef] dark:bg-[#202c33]"
                            : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="relative mt-0.5 shrink-0">
                          {other?.avatarUrl ? (
                            <img
                              src={resolveBackendAssetUrl(other.avatarUrl)}
                              alt={conversationName(conversation, currentUser.id)}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d9fdd3] text-sm font-semibold text-[#075E54] dark:bg-[#223239] dark:text-[#7fe7bc]">
                              {conversation.kind === "GROUP"
                                ? "GR"
                                : avatarLabel(other?.displayName)}
                            </div>
                          )}
                          {presence?.online ? (
                            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#F8F5F1] bg-[#25D366] dark:border-[#111B21]" />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate font-medium">
                              {conversationName(conversation, currentUser.id)}
                            </p>
                            <span className="shrink-0 text-xs text-[#667781] dark:text-white/45">
                              {conversation.latestMessage
                                ? hourFormatter.format(
                                    new Date(conversation.latestMessage.createdAt),
                                  )
                                : ""}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-[#667781] dark:text-white/55">
                            {messagePreview(conversation.latestMessage)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-black/5 p-4 dark:border-white/5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Contatos</p>
                    <span className="text-xs text-[#667781] dark:text-white/45">
                      {filteredUsers.length}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {filteredUsers.map((user) => {
                      const presence = presenceMap[user.id];
                      const userStatus = formatUserStatus(user, presence);
                      const online = userStatus === "Online";

                      return (
                        <button
                          key={user.id}
                          type="button"
                          disabled={pending}
                          onClick={() => void openDirectConversation(user)}
                          className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition hover:bg-[#f0ffef] disabled:opacity-60 dark:bg-[#202c33] dark:hover:bg-[#24343d]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative shrink-0">
                              {user.avatarUrl ? (
                                <img
                                  src={resolveBackendAssetUrl(user.avatarUrl)}
                                  alt={user.displayName}
                                  className="h-11 w-11 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9fdd3] text-sm font-semibold text-[#075E54] dark:bg-[#223239] dark:text-[#7fe7bc]">
                                  {avatarLabel(user.displayName)}
                                </div>
                              )}
                              {online ? (
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#25D366] dark:border-[#202c33]" />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{user.displayName}</p>
                              <p className="truncate text-xs text-[#667781] dark:text-white/45">
                                {userStatus}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-[#25D366]/15 px-3 py-1 text-xs font-medium text-[#075E54] dark:text-[#7fe7bc]">
                            Abrir
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === "status" ? (
              <div className="p-4">
                <div className="rounded-[1.5rem] bg-white p-4 shadow-sm dark:bg-[#202c33]">
                  <p className="text-sm font-semibold">Meu status</p>
                  <p className="mt-1 text-sm text-[#667781] dark:text-white/55">
                    A interface e o fluxo de Status foram adicionados ao app. A persistencia dedicada
                    de historias ainda depende de backend especifico.
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {statusEntries.map(({ user, label, presence }) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => void openDirectConversation(user)}
                      className="flex w-full items-center gap-3 rounded-[1.5rem] bg-white px-4 py-3 text-left shadow-sm transition hover:bg-[#f0ffef] dark:bg-[#202c33] dark:hover:bg-[#24343d]"
                    >
                      <div className="rounded-full border-2 border-[#25D366] p-0.5">
                        {user.avatarUrl ? (
                          <img
                            src={resolveBackendAssetUrl(user.avatarUrl)}
                            alt={user.displayName}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d9fdd3] font-semibold text-[#075E54] dark:bg-[#223239] dark:text-[#7fe7bc]">
                            {avatarLabel(user.displayName)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.displayName}</p>
                        <p className="truncate text-sm text-[#667781] dark:text-white/55">
                          {presence?.online ? "Online agora" : label}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "calls" ? (
              <div className="p-4">
                <div className="grid gap-2">
                  {callEntries.map((conversation) => {
                    const other = getConversationUser(conversation, currentUser.id);
                    if (!other) return null;

                    return (
                      <div
                        key={conversation.id}
                        className="rounded-[1.5rem] bg-white px-4 py-3 shadow-sm dark:bg-[#202c33]"
                      >
                        <div className="flex items-center gap-3">
                          {other.avatarUrl ? (
                            <img
                              src={resolveBackendAssetUrl(other.avatarUrl)}
                              alt={other.displayName}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d9fdd3] font-semibold text-[#075E54] dark:bg-[#223239] dark:text-[#7fe7bc]">
                              {avatarLabel(other.displayName)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{other.displayName}</p>
                            <p className="truncate text-sm text-[#667781] dark:text-white/55">
                              {messagePreview(conversation.latestMessage)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full text-[#075E54] hover:bg-[#25D366]/10 dark:text-[#7fe7bc]"
                              onClick={() => {
                                setActiveConversationId(conversation.id);
                                setActiveTab("chats");
                                void startOutgoingCall("audio", conversation, other);
                              }}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full text-[#075E54] hover:bg-[#25D366]/10 dark:text-[#7fe7bc]"
                              onClick={() => {
                                setActiveConversationId(conversation.id);
                                setActiveTab("chats");
                                void startOutgoingCall("video", conversation, other);
                              }}
                            >
                              <Video className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <section
          className={`flex min-h-[calc(100vh-74px)] flex-col bg-[linear-gradient(180deg,#efeae2,#e8dfd3)] dark:bg-[linear-gradient(180deg,#0b141a,#111b21)] ${
            mobileShowingChat ? "flex" : "hidden md:flex"
          }`}
        >
          {activeConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-black/5 bg-[#F0F2F5] px-3 py-3 dark:border-white/5 dark:bg-[#202c33]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full md:hidden"
                  onClick={() => setActiveConversationId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="relative">
                  {activeDirectUser?.avatarUrl ? (
                    <img
                      src={resolveBackendAssetUrl(activeDirectUser.avatarUrl)}
                      alt={conversationName(activeConversation, currentUser.id)}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9fdd3] font-semibold text-[#075E54] dark:bg-[#223239] dark:text-[#7fe7bc]">
                      {activeConversation.kind === "GROUP"
                        ? "GR"
                        : avatarLabel(activeDirectUser?.displayName)}
                    </div>
                  )}
                  {activePresence?.online ? (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#F0F2F5] bg-[#25D366] dark:border-[#202c33]" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {conversationName(activeConversation, currentUser.id)}
                  </p>
                  <p className="truncate text-xs text-[#667781] dark:text-white/55">
                    {formatTypingLabel(
                      typingUsers,
                      "Mensagens desaparecem automaticamente após 1 hora",
                      activePresence,
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Search className="h-4 w-4" />
                  </Button>
                  {activeConversation.kind === "DIRECT" ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => void startOutgoingCall("audio")}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => void startOutgoingCall("video")}
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Menu className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_25%)] px-3 py-4 dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_18%)] sm:px-6">
                <div className="space-y-2">
                  {visibleMessages.map((message) => (
                    <ChatMessageBubble
                      key={message.id}
                      message={message}
                      currentUserId={currentUser.id}
                      conversation={activeConversation}
                      clock={clock}
                      menuOpen={menuMessageId === message.id}
                      onToggleMenu={() =>
                        setMenuMessageId((current) =>
                          current === message.id ? null : message.id,
                        )
                      }
                      onReply={setReplyingTo}
                      onCopy={(item) =>
                        void navigator.clipboard
                          .writeText(
                            item.text ||
                              item.emoji ||
                              item.linkUrl ||
                              item.attachments[0]?.url ||
                              "",
                          )
                          .then(() => toast.success("Mensagem copiada."))
                      }
                      onForward={(item) => {
                        setForwardingMessage(item);
                        setShowForwardSheet(true);
                        setMenuMessageId(null);
                      }}
                      onEdit={(item) => {
                        setEditingMessage(item);
                        setReplyingTo(null);
                        setComposerText(
                          item.kind === "LINK"
                            ? item.linkUrl || ""
                            : item.kind === "EMOJI"
                              ? item.emoji || ""
                              : item.text || "",
                        );
                        setMenuMessageId(null);
                      }}
                      onDelete={(messageId) =>
                        void deleteMessage(messageId).then((updated) => {
                          patchMessage(updated);
                          syncConversationPreview(activeConversation.id, updated);
                          setMenuMessageId(null);
                        })
                      }
                      onReaction={(messageId, emoji) =>
                        void reactToMessage(messageId, emoji).then((updated) => {
                          patchMessage(updated);
                          syncConversationPreview(activeConversation.id, updated);
                        })
                      }
                    />
                  ))}

                  {visibleMessages.length === 0 ? (
                    <div className="flex min-h-80 items-center justify-center">
                      <div className="max-w-md rounded-[2rem] bg-white/85 px-6 py-8 text-center shadow-sm dark:bg-[#202c33]">
                        <p className="text-lg font-semibold">Conversa pronta</p>
                        <p className="mt-2 text-sm text-[#667781] dark:text-white/55">
                          Texto, imagem, video, audio, reacoes, edicao, encaminhamento e chamadas.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-black/5 bg-[#F0F2F5] px-3 py-3 dark:border-white/5 dark:bg-[#202c33] sm:px-4">
                {replyingTo ? (
                  <div className="mb-3 flex items-start justify-between gap-3 rounded-[1.2rem] border-l-4 border-[#25D366] bg-white px-4 py-3 shadow-sm dark:bg-[#111B21]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#075E54] dark:text-[#7fe7bc]">
                        Respondendo a {replyingTo.sender.displayName}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#667781] dark:text-white/55">
                        {replyingTo.text ||
                          replyingTo.emoji ||
                          replyingTo.linkUrl ||
                          messagePreview(replyingTo)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}

                {editingMessage ? (
                  <div className="mb-3 flex items-start justify-between gap-3 rounded-[1.2rem] border-l-4 border-amber-500 bg-white px-4 py-3 shadow-sm dark:bg-[#111B21]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
                        Editando mensagem
                      </p>
                      <p className="mt-1 truncate text-sm text-[#667781] dark:text-white/55">
                        {messagePreview(editingMessage)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => {
                        setEditingMessage(null);
                        setComposerText("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}

                {selectedFiles.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedFiles.map((file) => (
                      <span
                        key={`${file.name}-${file.lastModified}`}
                        className="rounded-full bg-white px-3 py-1 text-xs shadow-sm dark:bg-[#111B21]"
                      >
                        {file.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          queueTyping(
                            `${composerText}${composerText.trim().length > 0 ? " " : ""}${emoji}`,
                          )
                        }
                        className="rounded-full border border-black/5 bg-white px-3 py-1.5 text-sm shadow-sm transition hover:border-[#25D366]/40 hover:bg-[#e9fff2] dark:border-white/8 dark:bg-[#111B21] dark:hover:bg-[#1c2b32]"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex flex-1 items-end gap-1 rounded-[1.8rem] bg-white px-2 py-2 shadow-sm dark:bg-[#2a3942]">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-[#667781] hover:text-[#075E54] dark:text-white/60 dark:hover:text-white"
                      onClick={() => setShowEmojiPicker(true)}
                    >
                      <SmilePlus className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-[#667781] hover:text-[#075E54] dark:text-white/60 dark:hover:text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-[#667781] hover:text-[#075E54] dark:text-white/60 dark:hover:text-white"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                    <Textarea
                      value={composerText}
                      onChange={(event) => queueTyping(event.target.value)}
                      placeholder="Mensagem"
                      className="min-h-10 border-none bg-transparent px-1 py-2 text-[15px] shadow-none focus-visible:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-full ${
                        recording
                          ? "text-red-500 hover:text-red-600"
                          : "text-[#667781] hover:text-[#075E54] dark:text-white/60 dark:hover:text-white"
                      }`}
                      onClick={() => void handleRecordToggle()}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) =>
                        setSelectedFiles((current) => [
                          ...current,
                          ...Array.from(event.target.files || []),
                        ])
                      }
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) =>
                        setSelectedFiles((current) => [
                          ...current,
                          ...Array.from(event.target.files || []),
                        ])
                      }
                    />
                    </div>

                    <Button
                      onClick={() => void handleSend()}
                      disabled={
                        pending ||
                        (!composerText.trim() &&
                          selectedFiles.length === 0 &&
                          !editingMessage)
                      }
                      className="h-12 w-12 rounded-full bg-[#25D366] p-0 text-[#111B21] hover:bg-[#1fbe5c]"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-lg rounded-[2rem] bg-white/85 px-8 py-10 text-center shadow-sm dark:bg-[#202c33]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#075E54] dark:text-[#7fe7bc]">
                  Sinal
                </p>
                <h1 className="mt-4 text-3xl font-semibold">Interface inspirada no WhatsApp</h1>
                <p className="mt-4 text-[#667781] dark:text-white/55">
                  Abra uma conversa na lista, use as abas de Chats, Status e Chamadas e mantenha o
                  fluxo com mensagens efemeras, reacoes, respostas e chamadas.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button
                    onClick={() => setShowGroupComposer(true)}
                    className="rounded-full bg-[#25D366] text-[#111B21] hover:bg-[#1fbe5c]"
                  >
                    <Users className="h-4 w-4" />
                    Criar grupo
                  </Button>
                  <Button asChild variant="ghost" className="rounded-full border border-black/10 dark:border-white/10">
                    <Link href={toAppHref("/configuracoes")}>Abrir configuracoes</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {showEmojiPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-3xl rounded-[2rem] bg-white p-4 shadow-2xl dark:bg-[#202c33]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#075E54] dark:text-[#7fe7bc]">
                  Emojis
                </p>
                <h3 className="mt-1 text-xl font-semibold">Escolha um emoji</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setShowEmojiPicker(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="rounded-[1.5rem] bg-[#F8F5F1] p-3 dark:bg-[#111B21]">
              <EmojiBoard
                onEmojiClick={(emoji) => {
                  queueTyping(
                    `${composerText}${composerText.trim().length > 0 ? " " : ""}${emoji}`,
                  );
                  setShowEmojiPicker(false);
                }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    queueTyping(
                      `${composerText}${composerText.trim().length > 0 ? " " : ""}${emoji}`,
                    );
                    setShowEmojiPicker(false);
                  }}
                  className="rounded-full bg-[#F8F5F1] px-3 py-2 text-xl transition hover:bg-[#e7ffef] dark:bg-[#111B21] dark:hover:bg-[#24343d]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <ChatForwardSheet
        open={showForwardSheet}
        message={forwardingMessage}
        currentUserId={currentUser.id}
        conversations={conversations}
        note={forwardNote}
        onNoteChange={setForwardNote}
        onClose={() => {
          setShowForwardSheet(false);
          setForwardingMessage(null);
          setForwardNote("");
        }}
        onPickConversation={(conversationId) =>
          void (async () => {
            if (!forwardingMessage) return;
            try {
              setPending(true);
              await forwardMessage({
                messageId: forwardingMessage.id,
                conversationId,
                note: forwardNote.trim() || undefined,
              });
              setShowForwardSheet(false);
              setForwardingMessage(null);
              setForwardNote("");
              await refreshSidebar();
              if (conversationId === activeConversationId) await refreshMessages(conversationId);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Falha ao encaminhar.");
            } finally {
              setPending(false);
            }
          })()
        }
      />

      <ChatCallOverlay
        state={callState}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        hasLocalStream={Boolean(localStream)}
        hasRemoteStream={Boolean(remoteStream)}
        onAccept={() => void acceptIncomingCall()}
        onDecline={() => void endCall("DECLINED")}
        onToggleMute={() => {
          const stream = localStreamRef.current;
          if (!stream || !activeConversation || !callState.remoteUserId) return;
          const nextMuted = !callState.muted;
          stream.getAudioTracks().forEach((track) => {
            track.enabled = !nextMuted;
          });
          setCallState((current) => ({ ...current, muted: nextMuted }));
          void sendCallSignal({
            conversationId: activeConversation.id,
            targetUserId: callState.remoteUserId,
            type: "TOGGLE_AUDIO",
            payload: { enabled: !nextMuted },
          });
        }}
        onToggleCamera={() => {
          const stream = localStreamRef.current;
          if (!stream || !activeConversation || !callState.remoteUserId) return;
          const nextEnabled = !callState.cameraEnabled;
          stream.getVideoTracks().forEach((track) => {
            track.enabled = nextEnabled;
          });
          setCallState((current) => ({ ...current, cameraEnabled: nextEnabled }));
          void sendCallSignal({
            conversationId: activeConversation.id,
            targetUserId: callState.remoteUserId,
            type: "TOGGLE_VIDEO",
            payload: { enabled: nextEnabled },
          });
        }}
        onEnd={() => void endCall("ENDED")}
      />

      <GroupComposer
        open={showGroupComposer}
        users={users}
        pending={pending}
        onClose={() => setShowGroupComposer(false)}
        onCreate={async (input) => {
          try {
            setPending(true);
            const conversation = await createGroupConversation(input);
            await refreshSidebar();
            setActiveConversationId(conversation.id);
            setActiveTab("chats");
            setShowGroupComposer(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Falha ao criar grupo.");
          } finally {
            setPending(false);
          }
        }}
      />
    </main>
  );
}
