import { RefObject, useLayoutEffect } from 'react';

/**
 * Tracks how much of the screen the floating UI covers at the top and bottom (CSS px), so the 3D
 * engine can keep the focused planet / spacecraft centred in the part of the screen that is still
 * visible (see SolarSystemEngine.setViewInsets). Panels register themselves with useViewInset.
 */
export interface ViewInsets {
  top: number;
  bottom: number;
}

type InsetSource = () => Partial<ViewInsets>;

const sources = new Map<string, InsetSource>();
const listeners = new Set<(insets: ViewInsets) => void>();
let current: ViewInsets = { top: 0, bottom: 0 };
let scheduled = false;
let windowListenerAttached = false;

function recompute(): void {
  let top = 0;
  let bottom = 0;
  for (const source of sources.values()) {
    const v = source();
    if (v.top !== undefined) top = Math.max(top, v.top);
    if (v.bottom !== undefined) bottom = Math.max(bottom, v.bottom);
  }
  top = Math.round(top);
  bottom = Math.round(bottom);
  if (top === current.top && bottom === current.bottom) return;
  current = { top, bottom };
  listeners.forEach((l) => l(current));
}

/** Coalesces many layout changes into one recompute on the next animation frame. */
export function scheduleViewInsetUpdate(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    recompute();
  });
}

export function setViewInsetSource(key: string, source: InsetSource | null): void {
  if (source) sources.set(key, source);
  else sources.delete(key);
  if (!windowListenerAttached && typeof window !== 'undefined') {
    windowListenerAttached = true;
    window.addEventListener('resize', scheduleViewInsetUpdate);
  }
  scheduleViewInsetUpdate();
}

export function subscribeViewInsets(listener: (insets: ViewInsets) => void): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Registers a fixed panel as covering the top or bottom of the screen while `enabled`.
 * Re-measured automatically whenever the panel resizes (open, minimize, content change).
 */
export function useViewInset(
  key: string,
  ref: RefObject<HTMLElement | null>,
  side: 'top' | 'bottom',
  enabled = true,
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setViewInsetSource(key, null);
      return;
    }
    setViewInsetSource(key, () => {
      const r = el.getBoundingClientRect();
      if (r.height <= 0) return {};
      return side === 'top'
        ? { top: r.bottom }
        : { bottom: window.innerHeight - r.top };
    });
    const ro = new ResizeObserver(scheduleViewInsetUpdate);
    ro.observe(el);
    return () => {
      ro.disconnect();
      setViewInsetSource(key, null);
    };
  }, [key, ref, side, enabled]);
}
