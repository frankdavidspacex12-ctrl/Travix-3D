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

/** A newer version is installed and waiting. */
export function markUpdateReady(): void {
  ready = true;
  emit();
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
