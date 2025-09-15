import { useRef, useEffect } from 'react';

export default function useLongPress(callback: () => void, { threshold = 500 } = {}) {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);

  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  const start = (event: React.MouseEvent | React.TouchEvent) => {
    if (event.target) {
      target.current = event.target;
    }
    timeout.current = setTimeout(() => {
      callback();
    }, threshold);
  };

  const clear = (event: React.MouseEvent | React.TouchEvent) => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    if (target.current) {
      target.current = null;
    }
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