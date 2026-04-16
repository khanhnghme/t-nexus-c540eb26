import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorHandler } from "./lib/errorLogger";

initGlobalErrorHandler();

createRoot(document.getElementById("root")!).render(<App />);

// Force-update old Service Workers then re-register
if ('serviceWorker' in navigator) {
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const isPreviewHost =
    window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com');

  if (isPreviewHost || isInIframe) {
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.forEach((r) => r.unregister())
    );
  } else {
    // Force unregister old SW and clear stale caches, then register new SW
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      const hadOldSW = regs.length > 0;
      await Promise.all(regs.map((r) => r.unregister()));

      // Delete old caches (tnexus-v1, etc.)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== 'tnexus-v2').map((k) => caches.delete(k)));

      // Register fresh SW
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });

      // Reload once if we cleared an old SW so user gets latest assets
      if (hadOldSW && !sessionStorage.getItem('sw-refreshed')) {
        sessionStorage.setItem('sw-refreshed', '1');
        window.location.reload();
      }
    });
  }
}
