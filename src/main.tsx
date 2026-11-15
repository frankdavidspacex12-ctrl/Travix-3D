import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { markUpdateReady, onVisibilityChange, setRegistration, setUpdater } from './pwa/update';
import './i18n/data';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  // Register after the page (and the Solar System textures it requested) has finished loading,
  // then wait for an idle slot: the full offline precache still happens, it just no longer
  // competes for bandwidth/CPU with the first render.
  const register = () => {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_url, r) {
        setRegistration(r);
      },
      onOfflineReady() {
        // Offline precache ready silently without noisy UI toasts
      },
      onNeedRefresh() {
        // A newer version is installed and waiting. It is applied by itself only right after the
        // app opens or after coming back from a long time away; otherwise when the person taps
        // «System» (see pwa/update.ts). Never in the middle of exploring.
        markUpdateReady();
      },
    });
    setUpdater(updateSW);
  };

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

  // Phones keep the app open for days: look for a new version when coming back to it
  document.addEventListener('visibilitychange', () => {
    onVisibilityChange(document.visibilityState === 'visible');
  });

  if (document.readyState === 'complete') {
    registerWhenIdle();
  } else {
    window.addEventListener('load', registerWhenIdle, { once: true });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
