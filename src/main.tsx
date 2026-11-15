import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './i18n/data';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  // Register after the page (and the Solar System textures it requested) has finished loading,
  // then wait for an idle slot: the full offline precache still happens, it just no longer
  // competes for bandwidth/CPU with the first render.
  const register = () =>
    registerSW({
      immediate: true,
      onOfflineReady() {
        // Offline precache ready silently without noisy UI toasts
      },
      onNeedRefresh() {
        // A newer version is installed and waiting: it takes over the next time the app is
        // opened. Never reload here: that threw people out of what they were exploring.
      },
    });

  const registerWhenIdle = () => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(register, { timeout: 5000 });
    } else {
      window.setTimeout(register, 1500);
    }
  };

  if (document.readyState === 'complete') {
    registerWhenIdle();
  } else {
    window.addEventListener('load', registerWhenIdle, { once: true });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
