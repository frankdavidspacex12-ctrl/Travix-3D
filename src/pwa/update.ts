// App updates on demand. A new deploy is downloaded in the background and waits (it never reloads
// the app by itself, see main.tsx). The «System» button checks for a new version and, when one is
// ready, applies it: the app reloads once with the latest changes.
import { useSyncExternalStore } from 'react';

let ready = false;
let applyFn: ((reload?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Called from main.tsx with what registerSW returns and the service worker registration. */
export function setUpdater(apply: (reload?: boolean) => Promise<void>): void {
  applyFn = apply;
}

export function setRegistration(r: ServiceWorkerRegistration | undefined): void {
  registration = r;
}

/**
 * Moments when a new version is applied by itself, because nobody is in the middle of anything:
 * the first seconds after the app opens (the welcome screen is showing) and the first seconds
 * after coming back to the app from a long time away. Outside them it waits for «System».
 */
const OPEN_WINDOW_MS = 60_000;
const AWAY_MS = 5 * 60_000;
let autoApplyUntil = Date.now() + OPEN_WINDOW_MS;
let hiddenAt: number | null = null;

/** Called on every visibility change (main.tsx). */
export function onVisibilityChange(visible: boolean): void {
  if (!visible) {
    hiddenAt = Date.now();
    return;
  }
  if (hiddenAt !== null && Date.now() - hiddenAt >= AWAY_MS) {
    autoApplyUntil = Date.now() + OPEN_WINDOW_MS;
    if (applyUpdate()) return;
  }
  hiddenAt = null;
  checkForUpdate();
}

/** A newer version is installed and waiting. */
export function markUpdateReady(): void {
  ready = true;
  emit();
  if (Date.now() < autoApplyUntil) applyUpdate();
}

export function isUpdateReady(): boolean {
  return ready;
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ready,
    () => false,
  );
}

/** Asks the server whether there is a newer version (downloaded in the background if so). */
export function checkForUpdate(): void {
  if (!registration || !navigator.onLine) return;
  registration.update().catch(() => {
    // offline or server unreachable: try again next time
  });
}

/** Applies a waiting version (reloads the app). Returns false if there is none. */
export function applyUpdate(): boolean {
  if (!ready || !applyFn) return false;
  void applyFn(true);
  return true;
}
