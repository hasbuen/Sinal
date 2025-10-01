"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ChatComponent from "./chatComponent";


export default function PaginaChat() {
  const params = useParams();
  const initialDestinatarioId = params.id as string;

  const [activeDestinatarioId, setActiveDestinatarioId] = useState(initialDestinatarioId);

  useEffect(() => {
    if (initialDestinatarioId && initialDestinatarioId !== activeDestinatarioId) {
        setActiveDestinatarioId(initialDestinatarioId);
    }
  }, [initialDestinatarioId]);

  const handleSelectNewChat = (newId: string) => {
    setActiveDestinatarioId(newId);
  };

  if (!initialDestinatarioId) {
    return <div>ID do destinatário não encontrado.</div>;
  }

  return (
    <ChatComponent 
      destinatarioId={activeDestinatarioId} 
      
      onSelectNewChat={(novoId) => setActiveDestinatarioId(novoId)}
      
    />
  );
}