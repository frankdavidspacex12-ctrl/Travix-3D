import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // Offline precache ready silently without noisy UI toasts
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
