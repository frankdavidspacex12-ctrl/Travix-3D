// Glossary tab of the «Learn» panel: search, filter, A–Z, listen and «See it in 3D».
import React, { useEffect, useMemo, useState } from 'react';
import { Map as MapIcon, Search, Square, Volume2 } from 'lucide-react';
import { GLOSSARY, type GlossaryCategory, type GlossaryTerm } from '../data/glossaryData';
import type { GuidedTourTarget } from '../data/guidedToursData';
import { normalizeSearchText } from '../data/spaceKnowledgeSearch';
import { canNarrate, narrate, stopNarration } from '../audio/narration';
import { getLang, tr } from '../i18n';

interface GlossaryViewProps {
  onGo: (target: GuidedTourTarget) => void;
  onClose: () => void;
}

type Filter = 'all' | GlossaryCategory;

const GlossaryView: React.FC<GlossaryViewProps> = ({ onGo, onClose }) => {
  const lang = getLang();
  const other = lang === 'en' ? 'es' : 'en';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => () => stopNarration(), []);

  const terms = useMemo(() => {
    const q = normalizeSearchText(query);
    return GLOSSARY.filter((t) => filter === 'all' || t.category === filter)
      .filter(
        (t) =>
          !q ||
          normalizeSearchText(`${t.es.term} ${t.en.term} ${t[lang].def}`).includes(q),
      )
      .sort((a, b) => a[lang].term.localeCompare(b[lang].term, lang));
  }, [query, filter, lang]);

  const letters = useMemo(() => {
    const set = new Set(terms.map((t) => normalizeSearchText(t[lang].term).charAt(0).toUpperCase()));
    return [...set];
  }, [terms, lang]);

  const toggleListen = (t: GlossaryTerm) => {
    if (speakingId === t.id) {
      stopNarration();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(t.id);
    narrate(`${t[lang].term}. ${t[lang].def}`, () => setSpeakingId((cur) => (cur === t.id ? null : cur)));
  };

  const filters: Array<[Filter, string]> = [
    ['all', tr('Todas', 'All')],
    ['basics', tr('Básicas', 'Basics')],
    ['hardware', tr('Equipos del reto', 'Challenge hardware')],
  ];

  let lastLetter = '';
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-200 leading-relaxed">
        {tr(
          'Palabras del espacio en español e inglés. Toca «Ver en 3D» para ir al lugar donde se ve cada una.',
          'Space words in English and Spanish. Tap “See it in 3D” to go to the place where you can see each one.',
        )}
      </p>
      <label className="flex items-center gap-2 rounded-lg bg-black/40 border border-white/20 px-2.5 h-9">
        <Search className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr('Buscar una palabra…', 'Search a word…')}
          aria-label={tr('Buscar en el glosario', 'Search the glossary')}
          className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-slate-400 outline-none"
        />
      </label>
      <div className="flex flex-wrap gap-2" role="group" aria-label={tr('Filtrar', 'Filter')}>
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
      {letters.length > 1 && (
        <nav aria-label={tr('Letras', 'Letters')} className="flex flex-wrap gap-1">
          {letters.map((l) => (
            <a
              key={l}
              href={`#gloss-${l}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`gloss-${l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-amber-300 bg-white/5 hover:bg-white/15"
            >
              {l}
            </a>
          ))}
        </nav>
      )}
      {terms.length === 0 && (
        <p className="text-slate-300">{tr('No hay palabras con esa búsqueda.', 'No words match that search.')}</p>
      )}
      <ul className="space-y-2">
        {terms.map((t) => {
          const letter = normalizeSearchText(t[lang].term).charAt(0).toUpperCase();
          const anchor = letter !== lastLetter ? letter : null;
          lastLetter = letter;
          const speaking = speakingId === t.id;
          return (
            <li key={t.id} id={anchor ? `gloss-${anchor}` : undefined} className="rounded-xl travix-glass-subcard p-3 scroll-mt-2">
              <p className="font-semibold text-white">
                {t[lang].term}{' '}
                <span className="font-normal text-slate-400" lang={other}>
                  ({t[other].term})
                </span>
              </p>
              <p className="mt-1 text-slate-100 leading-relaxed">{t[lang].def}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {t.go && (
                  <button
                    type="button"
                    onClick={() => {
                      stopNarration();
                      onGo(t.go!);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer"
                  >
                    <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {tr('Ver en 3D', 'See it in 3D')}
                    {t.goLabel ? `: ${t.goLabel[lang]}` : ''}
                  </button>
                )}
                {canNarrate && (
                  <button
                    type="button"
                    onClick={() => toggleListen(t)}
                    aria-pressed={speaking}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs font-semibold cursor-pointer ${
                      speaking ? 'border-sky-300 bg-sky-500/20 text-white' : 'border-white/25 text-slate-100 hover:border-white/50'
                    }`}
                  >
                    {speaking ? <Square className="w-3 h-3" aria-hidden="true" /> : <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />}
                    {speaking ? tr('Detener', 'Stop') : tr('Escuchar', 'Listen')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GlossaryView;
