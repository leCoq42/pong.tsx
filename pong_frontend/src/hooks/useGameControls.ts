import { useCallback, useRef } from 'react';

export const useGameControls = () => {
  const keyRef = useRef<{ [key: string]: boolean }>({});

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)) {
      e.preventDefault();
    }
    keyRef.current[e.key] = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keyRef.current[e.key] = false;
  }, []);

  return { keyRef, handleKeyDown, handleKeyUp };
};