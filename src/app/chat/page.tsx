"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatComponent from "../chat/[id]/chatComponent";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destinatarioId = useMemo(
    () => searchParams.get("id")?.trim() || "",
    [searchParams]
  );

  if (!destinatarioId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-6 text-center text-white">
        Selecione uma conversa pelo dashboard para abrir o chat.
      </div>
    );
  }

  return (
    <ChatComponent
      destinatarioId={destinatarioId}
      onSelectNewChat={(newDestinatarioId) =>
        router.replace(`/chat?id=${newDestinatarioId}`)
      }
    />
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white">
          Carregando conversa...
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
