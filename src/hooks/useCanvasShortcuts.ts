import { useEffect } from "react";

interface CanvasShortcutCallbacks {
  onForceSave?: () => void;
  onCreatePage?: () => void;
  onToggleSidebar?: () => void;
  onToggleEditMode?: () => void;
  onOpenHelp?: () => void;
}

export function useCanvasShortcuts(callbacks: CanvasShortcutCallbacks, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl+S — force save
      if (mod && e.key === "s") {
        e.preventDefault();
        callbacks.onForceSave?.();
        return;
      }

      // Ctrl+N — new page
      if (mod && e.key === "n") {
        e.preventDefault();
        callbacks.onCreatePage?.();
        return;
      }

      // Ctrl+\ — toggle sidebar
      if (mod && e.key === "\\") {
        e.preventDefault();
        callbacks.onToggleSidebar?.();
        return;
      }

      // Ctrl+E — toggle edit/view
      if (mod && e.key === "e") {
        e.preventDefault();
        callbacks.onToggleEditMode?.();
        return;
      }

      // Ctrl+? (Ctrl+Shift+/) — open help
      if (mod && e.key === "?") {
        e.preventDefault();
        callbacks.onOpenHelp?.();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [callbacks, enabled]);
}
