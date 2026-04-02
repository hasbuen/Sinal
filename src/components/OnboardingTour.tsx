"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "sinal-tour-complete";

export default function OnboardingTour() {
  const [running, setRunning] = useState(false);

  async function startTour() {
    setRunning(true);

    const { driver } = await import("driver.js");

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: "Proximo",
      prevBtnText: "Anterior",
      doneBtnText: "Concluir",
      steps: [
        {
          element: "#tour-profile",
          popover: {
            title: "Conta ativa",
            description: "Seu perfil local usa JWT e conversa direto com o backend GraphQL.",
          },
        },
        {
          element: "#tour-install",
          popover: {
            title: "Instalacao",
            description: "Instale o app como PWA para abrir da tela inicial ou empacotar no Android.",
          },
        },
        {
          element: "#tour-search",
          popover: {
            title: "Busca rapida",
            description: "Filtre conversas e pessoas antes de abrir um chat ou grupo.",
          },
        },
        {
          element: "#tour-group",
          popover: {
            title: "Grupos",
            description: "Crie grupos com varios membros para testar o fluxo estilo mensageria.",
          },
        },
        {
          element: "#tour-chat-list",
          popover: {
            title: "Fila de conversas",
            description: "Aqui entram grupos, conversas diretas e o ultimo preview de mensagem.",
          },
        },
        {
          element: "#tour-composer",
          popover: {
            title: "Composer",
            description: "Envie texto, emoji, audio, links, imagens, videos e arquivos.",
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setRunning(false);
      },
    });

    driverObj.drive();
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!localStorage.getItem(STORAGE_KEY)) {
      void startTour();
    }
  }, []);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void startTour()}
      disabled={running}
      className="text-xs text-emerald-300 hover:bg-white/5 hover:text-white"
    >
      {running ? "Tutorial ativo" : "Tutorial guiado"}
    </Button>
  );
}
