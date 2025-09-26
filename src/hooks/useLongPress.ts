import { useRef, useEffect } from 'react';

// O callback recebe o evento como argumento
export default function useLongPress(
  callback: () => void,
  { threshold = 500 } = {}
) {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);
  const isLongPress = useRef(false); // Novo estado para saber se foi um long press

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  const start = (event: React.MouseEvent | React.TouchEvent) => {
    target.current = event.target;
    isLongPress.current = false; // Reset no início
    timeout.current = setTimeout(() => {
      isLongPress.current = true; // Marca como long press
      callback();
    }, threshold);

    // Para evitar o menu de contexto padrão em alguns browsers móveis
    if ('touches' in event) {
        (event.target as HTMLElement).style.webkitUserSelect = 'none';
    }
  };

  const clear = (event: React.MouseEvent | React.TouchEvent) => {
    if (timeout.current) clearTimeout(timeout.current);
    
    // Se o evento clear ocorrer em um target diferente do que iniciou, ou 
    // se for um toque/clique normal (não um long press), não faz nada.
    // A lógica de clique/tap é tratada no MensagemItem.tsx
    if (target.current && event.target === target.current) {
        // Se for um long press, não queremos que o clique seja disparado depois.
        // A lógica de click no MessageItem cuida de alternar o estado de seleção.
    }
    
    target.current = null;
  };

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: clear,
  };
}