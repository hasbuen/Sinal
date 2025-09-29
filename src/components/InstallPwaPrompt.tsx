// components/InstallPwaPrompt.tsx
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// Define a interface para o evento de instalação do PWA
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // 1. Lógica de Detecção e Armazenamento do Evento
  useEffect(() => {
    // 1.1. Verifica se a app já está instalada (em modo standalone/nativo)
    const isInstalled = () => {
      // Verifica o display-mode: 'standalone' ou 'fullscreen' indica PWA
      if (window.matchMedia('(display-mode: standalone)').matches || (document as any).standalone) {
        return true;
      }
      // Verifica outras heurísticas (Ex: iOS standalone)
      if ((navigator as any).standalone) return true;
      return false;
    };

    if (isInstalled()) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Impede que o prompt padrão do navegador apareça
      e.preventDefault();
      
      // Armazena o evento e o tipo dele
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Exibe o card após a detecção (pode adicionar um timeout se quiser)
      setShowInstallPrompt(true);
    };

    // Adiciona o listener
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      // Remove o listener ao desmontar
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 2. Lógica do Clique no Botão de Instalação
  const handleInstallClick = () => {
    if (deferredPrompt) {
      // Aciona o prompt de instalação do navegador
      deferredPrompt.prompt();

      // Oculta o card imediatamente (ou após a escolha do usuário)
      setShowInstallPrompt(false); 
      setDeferredPrompt(null);
      
      // Opcional: Registrar o resultado da escolha do usuário
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Usuário aceitou a instalação do PWA');
        } else {
          console.log('Usuário recusou a instalação do PWA');
        }
      });
      
    } else {
      // Mensagem alternativa para iOS ou navegadores sem suporte
      alert("Para instalar, por favor, use o menu de compartilhamento do seu navegador e selecione 'Adicionar à Tela de Início'.");
      setShowInstallPrompt(false); 
    }
  };
  
  // 3. Renderização do Card
  // Verifica se é iOS para exibir instruções específicas
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <AnimatePresence>
      {showInstallPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="w-full bg-[#1f2937] p-4 rounded-xl shadow-lg z-10 border border-gray-700 mb-4"
        >
          <h3 className="text-lg font-bold text-[#00d4ff] mb-2">
            Instale o App! 📱
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            {isIOS
                ? "Para uma experiência de aplicativo, use o Safari e toque no ícone 'Compartilhar', depois 'Adicionar à Tela de Início'."
                : "Instale esta aplicação para acessá-la diretamente da sua tela inicial."
            }
          </p>
          <div className="flex justify-end gap-3">
            <Button 
                variant="ghost" 
                onClick={() => setShowInstallPrompt(false)} 
                className="text-gray-400 hover:bg-gray-700"
            >
              Agora Não
            </Button>
            <Button 
                onClick={handleInstallClick}
                className="bg-[#6a00f4] hover:bg-[#5a00d4] text-white font-bold"
                // Desabilita o botão se for iOS e o prompt nativo não estiver disponível
                disabled={isIOS && deferredPrompt === null} 
            >
              {isIOS ? "Ver Instruções" : "Instalar Agora"}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}