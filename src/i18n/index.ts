// Idioma de la app: inglés por defecto (los jueces de Space Apps leen en inglés) y español con un
// botón. Se recuerda en cada navegador. Los textos se escriben en pares: tr('español', 'English').
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'es';

const STORAGE_KEY = 'travix-lang';
const listeners = new Set<() => void>();

function load(): Lang {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'es') return v;
  } catch {
    // sin almacenamiento: inglés
  }
  return 'en';
}

let current: Lang = typeof window !== 'undefined' ? load() : 'en';
if (typeof document !== 'undefined') document.documentElement.lang = current;

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // sin almacenamiento: solo esta visita
  }
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
}

export function subscribeLang(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Vuelve a renderizar el componente cuando cambia el idioma y devuelve el idioma actual. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, getLang);
}

/** Texto según el idioma actual: tr('Buscar', 'Search'). */
export function tr(es: string, en: string): string {
  return current === 'en' ? en : es;
}

/** Código de idioma para fechas y números («es-ES» / «en-US»). */
export function locale(): string {
  return current === 'en' ? 'en-US' : 'es-ES';
}

const DESTINATIONS_EN: Record<string, string> = {
  Todos: 'All',
  Marte: 'Mars',
  Luna: 'Moon',
  'Tierra / Órbita': 'Earth / Orbit',
  Júpiter: 'Jupiter',
  Saturno: 'Saturn',
  Titán: 'Titan',
  Venus: 'Venus',
  Mercurio: 'Mercury',
  Asteroides: 'Asteroids',
  'Cometa 67P': 'Comet 67P',
  'Espacio Profundo': 'Deep space',
  Plutón: 'Pluto',
};

/** Nombre de un grupo de destino del buscador en el idioma actual. */
export function destinationLabel(es: string): string {
  return current === 'en' ? DESTINATIONS_EN[es] ?? es : es;
}
