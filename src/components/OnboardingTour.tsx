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
            title: "Seu perfil",
            description: "Aqui voce ve seu status atual e acessa configuracoes.",
          },
        },
        {
          element: "#tour-install",
          popover: {
            title: "Instalacao",
            description: "Instale o app como PWA para abrir direto da tela inicial.",
          },
        },
        {
          element: "#tour-search",
          popover: {
            title: "Busca rapida",
            description: "Filtre contatos por nome para ir direto ao chat certo.",
          },
        },
        {
          element: "#tour-chat-list",
          popover: {
            title: "Fila de conversas",
            description: "Selecione um contato para abrir a conversa e retomar o fluxo.",
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
