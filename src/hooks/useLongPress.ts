import { useRef, useEffect } from 'react';

// O callback recebe o evento como argumento
export default function useLongPress(
  callback: (event: React.MouseEvent | React.TouchEvent) => void,
  { threshold = 500 } = {}
) {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  const start = (event: React.MouseEvent | React.TouchEvent) => {
    target.current = event.target;
    timeout.current = setTimeout(() => callback(event), threshold);
  };

  const clear = (event: React.MouseEvent | React.TouchEvent) => {
    if (timeout.current) clearTimeout(timeout.current);
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
