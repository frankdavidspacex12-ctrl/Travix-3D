// «Colombians at NASA»: Colombian women and men whose work is part of NASA missions.
import React, { useEffect, useState } from 'react';
import { ExternalLink, Map as MapIcon, Square, Users, Volume2, X } from 'lucide-react';
import { COLOMBIANS_AT_NASA } from '../data/colombiansAtNasa';
import type { GuidedTourTarget } from '../data/guidedToursData';
import { getLang, tr } from '../i18n';
import { canNarrate, narrate, stopNarration } from '../audio/narration';

interface ColombiansPanelProps {
  onClose: () => void;
  onGo: (target: GuidedTourTarget) => void;
}

type Filter = 'all' | 'woman' | 'man';

function initials(name: string): string {
  return name
    .replace(/[«»"()0-9–-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const ColombiansPanel: React.FC<ColombiansPanelProps> = ({ onClose, onGo }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const lang = getLang();

  // Stop the voice when the panel closes (or the language changes and it remounts)
  useEffect(() => () => stopNarration(), []);

  const toggleListen = (p: (typeof COLOMBIANS_AT_NASA)[number]) => {
    if (speakingId === p.id) {
      stopNarration();
      setSpeakingId(null);
      return;
    }
    const t = p[lang];
    setSpeakingId(p.id);
    narrate(`${p.name}. ${t.role.replace(/·/g, ",")}. ${t.story} ${t.link}`, () =>
      setSpeakingId((cur) => (cur === p.id ? null : cur)),
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const people = COLOMBIANS_AT_NASA.filter((p) => filter === 'all' || p.gender === filter);
  const filters: Array<[Filter, string]> = [
    ['all', tr('Todos', 'All')],
    ['woman', tr('Mujeres', 'Women')],
    ['man', tr('Hombres', 'Men')],
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" role="presentation">
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(2,4,10,0.62)]" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="colombians-title"
        className="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl travix-glass-panel p-4 sm:p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0 border border-white/25"
            style={{ background: 'linear-gradient(180deg,#FCD116 0 50%,#003893 50% 75%,#CE1126 75% 100%)' }}
          >
            <Users className="w-5 h-5 text-white drop-shadow" />
          </span>
          <h2 id="colombians-title" className="flex-1 text-lg font-bold text-white">
            {tr('Colombianos en la NASA', 'Colombians at NASA')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('Cerrar', 'Close')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-200 leading-relaxed">
          {tr(
            'Mujeres y hombres de Colombia que trabajan, o trabajaron, en misiones de la NASA. Cada historia enlaza con su fuente.',
            'Colombian women and men who work, or worked, on NASA missions. Each story links to its source.',
          )}
        </p>

        <div className="mt-3 flex gap-2" role="group" aria-label={tr('Filtrar', 'Filter')}>
          {filters.map(([f, label]) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`h-8 px-3 rounded-full border text-xs font-semibold cursor-pointer ${
                filter === f ? 'bg-amber-500 text-slate-950 border-amber-400' : 'border-white/20 text-slate-100 hover:border-white/45'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {people.map((p) => {
            const t = p[lang];
            return (
              <li key={p.id} className="rounded-xl travix-glass-subcard p-3 flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white border border-white/25 bg-white/10"
                  >
                    {initials(p.name)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white leading-snug">{p.name}</h3>
                    <p className="text-[11px] text-amber-300 leading-snug">{t.role}</p>
                    <p className="text-[11px] text-slate-400">{p.origin}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-100 leading-relaxed">{t.story}</p>
                <p className="text-xs text-sky-200 leading-relaxed">{t.link}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      stopNarration();
                      onGo(p.go);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer"
                  >
                    <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {p.goLabel[lang]}
                  </button>
                  {canNarrate && (
                    <button
                      type="button"
                      onClick={() => toggleListen(p)}
                      aria-pressed={speakingId === p.id}
                      aria-label={
                        speakingId === p.id
                          ? tr(`Detener la historia de ${p.name}`, `Stop ${p.name}’s story`)
                          : tr(`Escuchar la historia de ${p.name}`, `Listen to ${p.name}’s story`)
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs font-semibold cursor-pointer ${
                        speakingId === p.id
                          ? 'border-sky-300 bg-sky-500/20 text-white'
                          : 'border-white/25 text-slate-100 hover:border-white/50'
                      }`}
                    >
                      {speakingId === p.id ? (
                        <Square className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {speakingId === p.id ? tr('Detener', 'Stop') : tr('Escuchar', 'Listen')}
                    </button>
                  )}
                  <a
                    href={p.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white underline underline-offset-2"
                  >
                    {tr('Fuente', 'Source')}: {p.source.label}
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          {tr(
            'Los cargos pueden haber cambiado desde la publicación de cada fuente. Sin fotos: las imágenes de cada persona están en su fuente.',
            'Roles may have changed since each source was published. No photos here: each person’s pictures are at their source.',
          )}
        </p>
      </section>
    </div>
  );
};

export default ColombiansPanel;
