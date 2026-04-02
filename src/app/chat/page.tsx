"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatWorkspace from "@/components/chat/ChatWorkspace";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("id")?.trim() || undefined;

  return <ChatWorkspace initialConversationId={conversationId} />;
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#071019] text-white">
          Carregando conversa...
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
