// «Test your knowledge»: the player chooses how many questions to answer. Questions already answered
// (saved in this browser) are not asked again until the player resets the progress.
import React, { useEffect, useMemo, useState } from 'react';
import { Check, GraduationCap, Map as MapIcon, RotateCcw, Trophy, X } from 'lucide-react';
import { QUIZ_QUESTIONS, type QuizQuestion } from '../data/quizData';
import type { GuidedTourTarget } from '../data/guidedToursData';
import { getLang, tr } from '../i18n';
import { ShareButton } from './ShareButton';
import GlossaryView from './GlossaryView';

const ANSWERED_KEY = 'travix-quiz-answered';
const TOTAL = QUIZ_QUESTIONS.length;
const BY_ID = new Map(QUIZ_QUESTIONS.map((q) => [q.id, q]));

/** id → answered correctly. */
type AnsweredMap = Record<string, boolean>;

function loadAnswered(): AnsweredMap {
  try {
    const raw = window.localStorage.getItem(ANSWERED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (parsed && typeof parsed === 'object') {
      const out: AnsweredMap = {};
      for (const [id, ok] of Object.entries(parsed as Record<string, unknown>)) if (BY_ID.has(id)) out[id] = ok === true;
      return out;
    }
  } catch {
    // storage unavailable or damaged: start fresh
  }
  return {};
}

function saveAnswered(map: AnsweredMap): void {
  try {
    window.localStorage.setItem(ANSWERED_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable: progress only lasts this visit
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Round {
  questions: string[];
  /** For each question, the option order shown (indices into options; 0 is the correct one) */
  orders: number[][];
  index: number;
  /** Option index (into options) the player picked for the current question, or null */
  picked: number | null;
  correct: number;
}

/**
 * The round lives outside the component so it survives the language switch (the UI remounts) and
 * closing the panel to look at something in 3D: reopening continues where the player was.
 */
let savedRound: Round | null = null;

/** Tab of the «Learn» panel (kept across the language switch and reopening). */
type LearnTab = 'quiz' | 'glossary';
let savedTab: LearnTab = 'quiz';

interface QuizPanelProps {
  onClose: () => void;
  onGo: (target: GuidedTourTarget) => void;
}

const COUNT_CHOICES = [5, 10, 20];

const QuizPanel: React.FC<QuizPanelProps> = ({ onClose, onGo }) => {
  const [answered, setAnswered] = useState<AnsweredMap>(loadAnswered);
  const [tab, setTabState] = useState<LearnTab>(savedTab);
  const setTab = (t: LearnTab) => {
    savedTab = t;
    setTabState(t);
  };
  const [round, setRoundState] = useState<Round | null>(savedRound);
  const remainingIds = useMemo(() => QUIZ_QUESTIONS.filter((q) => !(q.id in answered)).map((q) => q.id), [answered]);
  const remaining = remainingIds.length;
  const [count, setCount] = useState(() => Math.min(10, Math.max(1, remaining)));
  const lang = getLang();

  const setRound = (r: Round | null) => {
    savedRound = r;
    setRoundState(r);
  };

  const start = (n: number) => {
    const ids = shuffle(remainingIds).slice(0, Math.max(1, Math.min(n, remaining)));
    setRound({ questions: ids, orders: ids.map(() => shuffle([0, 1, 2, 3])), index: 0, picked: null, correct: 0 });
  };

  const current: QuizQuestion | undefined = round ? BY_ID.get(round.questions[round.index]) : undefined;
  const finished = round !== null && round.index >= round.questions.length;

  const pick = (optionIndex: number) => {
    if (!round || !current || round.picked !== null) return;
    const ok = optionIndex === 0;
    const next = { ...answered, [current.id]: ok };
    setAnswered(next);
    saveAnswered(next);
    setRound({ ...round, picked: optionIndex, correct: round.correct + (ok ? 1 : 0) });
  };

  const advance = () => {
    if (!round) return;
    setRound({ ...round, index: round.index + 1, picked: null });
  };

  const resetProgress = () => {
    setAnswered({});
    saveAnswered({});
    setRound(null);
    setCount(10);
  };

  // Keyboard: Esc closes, 1-4 choose an answer, Enter goes on
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // In the glossary the keys are for typing in its search box
      if (tab !== 'quiz') return;
      if (!round || finished || !current) return;
      // Enter on a focused button already clicks it
      if (e.key === 'Enter' && e.target instanceof HTMLButtonElement) return;
      const order = round.orders[round.index];
      const n = Number(e.key);
      if (round.picked === null && n >= 1 && n <= 4) pick(order[n - 1]);
      else if (round.picked !== null && e.key === 'Enter') advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const totalCorrect = Object.values(answered).filter(Boolean).length;
  const answeredCount = TOTAL - remaining;

  let body: React.ReactNode;
  if (!round) {
    // ── Setup: how many questions ──
    body =
      remaining === 0 ? (
        <div className="space-y-3 text-sm text-slate-200">
          <p>
            {tr('¡Respondiste las', 'You have answered all')} {TOTAL} {tr('preguntas!', 'questions!')}{' '}
            {tr('Aciertos:', 'Correct:')} <b className="text-amber-300">{totalCorrect}</b> / {TOTAL}.
          </p>
          <button
            type="button"
            onClick={resetProgress}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 bg-amber-500 text-slate-950 font-semibold cursor-pointer hover:bg-amber-400"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            {tr('Empezar de nuevo', 'Start over')}
          </button>
        </div>
      ) : (
        <div className="space-y-3.5 text-sm text-slate-200">
          <p>
            {tr(
              'Preguntas sobre los equipos que la humanidad dejó en el espacio y los mundos que exploran. No se repiten las que ya respondiste.',
              'Questions about the hardware humanity left in space and the worlds it explores. Questions you already answered are not repeated.',
            )}
          </p>
          <p className="text-xs text-slate-300">
            {tr('Respondidas:', 'Answered:')} <b>{answeredCount}</b> / {TOTAL} · {tr('Aciertos:', 'Correct:')}{' '}
            <b className="text-amber-300">{totalCorrect}</b> · {tr('Quedan:', 'Left:')} <b>{remaining}</b>
          </p>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">
              {tr('¿Cuántas preguntas quieres responder?', 'How many questions do you want to answer?')}
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              {COUNT_CHOICES.filter((n) => n < remaining).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={count === n}
                  onClick={() => setCount(n)}
                  className={`min-w-11 h-9 px-3 rounded-full border text-sm font-semibold cursor-pointer ${
                    count === n ? 'bg-amber-500 text-slate-950 border-amber-400' : 'border-white/20 text-slate-100 hover:border-white/45'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={count === remaining}
                onClick={() => setCount(remaining)}
                className={`h-9 px-3 rounded-full border text-sm font-semibold cursor-pointer ${
                  count === remaining ? 'bg-amber-500 text-slate-950 border-amber-400' : 'border-white/20 text-slate-100 hover:border-white/45'
                }`}
              >
                {tr('Todas', 'All')} ({remaining})
              </button>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                {tr('Otra:', 'Other:')}
                <input
                  type="number"
                  min={1}
                  max={remaining}
                  value={count}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value));
                    if (Number.isFinite(v)) setCount(Math.min(remaining, Math.max(1, v)));
                  }}
                  className="w-16 h-9 rounded-lg bg-black/40 border border-white/20 px-2 text-sm text-white"
                />
              </label>
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => start(count)}
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 bg-amber-500 text-slate-950 font-semibold cursor-pointer hover:bg-amber-400"
            >
              {tr('Empezar', 'Start')} · {count}
            </button>
            {answeredCount > 0 && (
              <button
                type="button"
                onClick={resetProgress}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                {tr('Borrar mi progreso', 'Reset my progress')}
              </button>
            )}
          </div>
        </div>
      );
  } else if (finished) {
    // ── Results ──
    const n = round.questions.length;
    const pct = round.correct / n;
    body = (
      <div className="space-y-3 text-sm text-slate-200 text-center">
        <Trophy className="w-10 h-10 mx-auto text-amber-300" aria-hidden="true" />
        <p className="text-2xl font-bold text-white">
          {round.correct} / {n}
        </p>
        <p>
          {pct === 1
            ? tr('¡Perfecto! Eres un experto del espacio.', 'Perfect! You are a space expert.')
            : pct >= 0.7
              ? tr('¡Muy bien! Sabes mucho del espacio.', 'Great job! You know a lot about space.')
              : pct >= 0.4
                ? tr('¡Buen intento! Explora el mapa y vuelve a intentarlo.', 'Good try! Explore the map and try again.')
                : tr('Cada explorador empieza así. ¡Visita las misiones y sigue aprendiendo!', 'Every explorer starts like this. Visit the missions and keep learning!')}
        </p>
        <p className="text-xs text-slate-400">
          {tr('Quedan', 'There are')} {remaining} {tr('preguntas nuevas.', 'new questions left.')}
        </p>
        <ShareButton
          label={tr('Compartir mi resultado', 'Share my score')}
          text={tr(
            `Saqué ${round.correct} de ${n} en «Pon a prueba tus conocimientos» de Travix 3D, sobre las naves que la NASA dejó en el espacio. ¿Puedes superarme?`,
            `I scored ${round.correct} out of ${n} on the Travix 3D space quiz about the spacecraft NASA left behind. Can you beat me?`,
          )}
          className="mx-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-sky-300/40 text-sky-100 hover:text-white hover:border-sky-200 text-sm cursor-pointer"
        />
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setRound(null);
              setCount(Math.min(10, Math.max(1, remaining)));
            }}
            className="rounded-full px-5 py-2 bg-amber-500 text-slate-950 font-semibold cursor-pointer hover:bg-amber-400"
          >
            {remaining > 0 ? tr('Jugar otra vez', 'Play again') : tr('Ver mi progreso', 'See my progress')}
          </button>
          <button
            type="button"
            onClick={() => {
              setRound(null);
              onClose();
            }}
            className="rounded-full px-4 py-2 border border-white/20 text-slate-100 cursor-pointer hover:border-white/45"
          >
            {tr('Cerrar', 'Close')}
          </button>
        </div>
      </div>
    );
  } else if (current) {
    // ── A question ──
    const text = current[lang];
    const order = round.orders[round.index];
    const picked = round.picked;
    body = (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>
            {tr('Pregunta', 'Question')} {round.index + 1} {tr('de', 'of')} {round.questions.length}
          </span>
          <span>
            {tr('Aciertos', 'Correct')}: <b className="text-amber-300">{round.correct}</b>
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
          <div
            className="h-full bg-amber-400 transition-[width] duration-300"
            style={{ width: `${((round.index + (picked !== null ? 1 : 0)) / round.questions.length) * 100}%` }}
          />
        </div>
        <p className="text-base font-semibold text-white leading-snug">{text.q}</p>
        <div className="grid gap-2" role="group" aria-label={tr('Opciones', 'Options')}>
          {order.map((optIndex, i) => {
            const isCorrect = optIndex === 0;
            const isPicked = picked === optIndex;
            let cls = 'border-white/15 hover:border-white/40 hover:bg-white/5 text-slate-100';
            if (picked !== null) {
              if (isCorrect) cls = 'border-emerald-400 bg-emerald-500/20 text-white';
              else if (isPicked) cls = 'border-rose-400 bg-rose-500/20 text-white';
              else cls = 'border-white/10 text-slate-400';
            }
            return (
              <button
                key={optIndex}
                type="button"
                disabled={picked !== null}
                onClick={() => pick(optIndex)}
                className={`flex items-start gap-2 w-full text-left rounded-xl border px-3 py-2.5 transition-colors cursor-pointer disabled:cursor-default ${cls}`}
              >
                <span className="shrink-0 w-5 h-5 rounded-full border border-current/40 text-[11px] flex items-center justify-center opacity-80">
                  {picked !== null && isCorrect ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
                </span>
                <span>{text.options[optIndex]}</span>
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="rounded-xl travix-glass-subcard p-3 space-y-2" aria-live="polite">
            <p className={`font-semibold ${picked === 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {picked === 0 ? tr('¡Correcto!', 'Correct!') : tr('No es correcto.', 'Not quite.')}
            </p>
            <p className="text-slate-200 leading-relaxed">{text.explain}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={advance}
                autoFocus
                className="rounded-full px-5 py-2 bg-amber-500 text-slate-950 font-semibold cursor-pointer hover:bg-amber-400"
              >
                {round.index + 1 < round.questions.length ? tr('Siguiente', 'Next') : tr('Ver resultado', 'See result')}
              </button>
              {current.go && (
                <button
                  type="button"
                  onClick={() => {
                    // Continue with the next question when the quiz is reopened
                    setRound({ ...round, index: round.index + 1, picked: null });
                    onGo(current.go!);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 border border-white/20 text-slate-100 cursor-pointer hover:border-white/45"
                >
                  <MapIcon className="w-4 h-4" aria-hidden="true" />
                  {tr('Verlo en 3D', 'See it in 3D')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" role="presentation">
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(2,4,10,0.62)]" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl travix-glass-panel p-4 sm:p-5 text-left"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15 border border-amber-400/40 shrink-0">
            <GraduationCap className="w-5 h-5 text-amber-300" aria-hidden="true" />
          </span>
          <h2 id="quiz-title" className="flex-1 text-lg font-bold text-white">
            {tr('Aprende', 'Learn')}
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
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-black/35 p-1" role="tablist" aria-label={tr('Secciones', 'Sections')}>
          {([
            ['quiz', tr('Pon a prueba', 'Test yourself')],
            ['glossary', tr('Glosario', 'Glossary')],
          ] as Array<[LearnTab, string]>).map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-9 rounded-full text-sm font-semibold cursor-pointer transition-colors ${
                tab === t ? 'bg-amber-500 text-slate-950' : 'text-slate-200 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'glossary' ? <GlossaryView onGo={onGo} onClose={onClose} /> : body}
      </section>
    </div>
  );
};

export default QuizPanel;
