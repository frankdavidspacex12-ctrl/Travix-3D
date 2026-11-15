// «Share the app»: uses the device's share sheet (WhatsApp, email…) when there is one; otherwise
// copies the link and says so.
import React, { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { tr } from '../i18n';

/** Public address of the app (the same on every device, also when testing locally). */
export const APP_URL = 'https://travix-3-d.vercel.app';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export async function shareApp(text: string): Promise<ShareResult> {
  const data = { title: 'Travix 3D', text, url: APP_URL };
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // fall through to copying the link
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${APP_URL}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function defaultShareText(): string {
  return tr(
    'Explora en 3D los robots y naves que la NASA dejó en la Luna, Marte y más allá, con Travix 3D:',
    'Explore in 3D the robots and spacecraft NASA left on the Moon, Mars and beyond, with Travix 3D:',
  );
}

interface ShareButtonProps {
  /** Text shared with the link (defaults to the app invitation) */
  text?: string;
  label?: string;
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ text, label, className }) => {
  const [result, setResult] = useState<ShareResult | null>(null);

  useEffect(() => {
    if (!result || result === 'shared' || result === 'cancelled') return;
    const id = window.setTimeout(() => setResult(null), 3500);
    return () => window.clearTimeout(id);
  }, [result]);

  const shownLabel =
    result === 'copied'
      ? tr('¡Enlace copiado!', 'Link copied!')
      : result === 'failed'
        ? APP_URL.replace('https://', '')
        : (label ?? tr('Compartir la app', 'Share the app'));

  return (
    <button
      type="button"
      onClick={async () => setResult(await shareApp(text ?? defaultShareText()))}
      aria-label={label ?? tr('Compartir la app', 'Share the app')}
      className={
        className ??
        'w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg travix-glass-control text-xs font-medium text-sky-200 hover:text-white cursor-pointer'
      }
    >
      {result === 'copied' ? (
        <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
      ) : (
        <Share2 className="w-3.5 h-3.5 text-sky-300 shrink-0" aria-hidden="true" />
      )}
      <span aria-live="polite">{shownLabel}</span>
    </button>
  );
};
