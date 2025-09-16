"use client";

import { useParams } from "next/navigation";
import ChatComponent from "./chatComponent";

export default function PaginaChat() {
  const params = useParams();
  const destinatarioId = params.id as string;

  if (!destinatarioId) {
    return <div>ID do destinatário não encontrado.</div>;
  }

  return <ChatComponent destinatarioId={destinatarioId} />;
}