import React, { useState } from 'react';
import { Download, Wifi } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PanelControls } from './PanelControls';

export const PWAControls: React.FC = () => {
  const { canInstall, isInstalled, isIOS, isOnline, install } = usePWAInstall();
  // Mientras no esté instalada, un punto ámbar en el botón invita a abrir el panel e instalarla
  const showInstallHint = !isInstalled;
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  return (
    <div className="fixed top-2.5 sm:top-4 right-14 sm:right-16 z-30 flex flex-col items-end gap-2 pointer-events-none">
      {/* Completely round Wi-Fi status & offline PWA button */}
      <button
        type="button"
        onClick={() => {
          setMinimized(false);
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        data-tour="install"
        aria-label={
          showInstallHint
            ? 'Instalar la app y estado sin internet'
            : isOnline
              ? 'Estado de conexión y modo sin internet'
              : 'Modo sin internet activo'
        }
        title={
          showInstallHint
            ? 'Instala Travix 3D en tu dispositivo y úsala sin internet'
            : isOnline
              ? 'App lista para usar sin internet'
              : 'Modo sin internet activo (100% offline)'
        }
        className={`relative pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
          !isOnline || open
            ? 'travix-glass-bar border-amber-400/55 text-amber-300'
            : 'travix-glass-bar text-slate-100 hover:text-white hover:border-white/35'
        }`}
      >
        <Wifi
          className={`w-4 h-4 shrink-0 ${
            isOnline ? 'text-emerald-300' : 'text-amber-400'
          }`}
        />
        {showInstallHint && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#05070d]"
          />
        )}
      </button>

      {open && (
        <div
          role="status"
          className="pointer-events-auto w-[min(265px,calc(100vw-4.5rem))] rounded-xl travix-glass-panel px-3 py-2 text-xs space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Wifi
                className={`w-3.5 h-3.5 shrink-0 ${
                  isOnline ? 'text-emerald-300' : 'text-amber-400'
                }`}
              />
              <span className="font-semibold text-white break-words min-w-0">
                {isOnline ? 'Modo Offline Listo' : 'Modo sin internet'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <PanelControls
                label="estado sin internet"
                minimized={minimized}
                onToggleMinimize={() => setMinimized((prev) => !prev)}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>

          {!minimized && (
            <>
              <p className="text-xs text-slate-100 leading-relaxed">
                {isOnline
                  ? 'Todas las texturas 3D, modelos NASA, efemérides y fotos están guardadas localmente.'
                  : 'Operando 100% sin conexión usando modelos, texturas y archivos NASA locales.'}
              </p>

              {canInstall && (
                <button
                  type="button"
                  onClick={() => {
                    void install();
                    setOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg travix-glass-control text-xs font-medium text-amber-200 hover:text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Instalar app offline</span>
                </button>
              )}
              {/* Sin botón del navegador: instrucciones según el dispositivo */}
              {!canInstall && !isInstalled && (
                <div className="rounded-lg bg-white/5 border border-amber-400/25 px-2.5 py-2 text-[11px] leading-snug text-slate-100">
                  <p className="font-semibold text-amber-200 flex items-center gap-1">
                    <Download className="w-3 h-3 text-amber-400 shrink-0" />
                    Instálala en tu dispositivo
                  </p>
                  <p className="mt-1">
                    {isIOS
                      ? 'En Safari toca Compartir (el cuadrado con la flecha hacia arriba) y luego «Agregar a pantalla de inicio».'
                      : 'Abre el menú del navegador (⋮) y elige «Instalar aplicación» o «Agregar a la pantalla principal».'}
                  </p>
                </div>
              )}
              {isInstalled && (
                <p className="text-[11px] text-emerald-300">App instalada en este dispositivo.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
