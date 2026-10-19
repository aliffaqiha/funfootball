import { useEffect, useRef } from "react";

export type KeyHandler = (event: KeyboardEvent) => void;

export function useKeyboardShortcuts(handlers: Record<string, KeyHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.isComposing) return;
      if (
        target instanceof Element &&
        (target.closest("input, textarea, select, [role='textbox'], [contenteditable]:not([contenteditable='false'])") ||
          (target instanceof HTMLElement && target.isContentEditable))
      ) {
        return;
      }

      handlersRef.current[event.key]?.(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
