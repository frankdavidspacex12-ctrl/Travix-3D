// Voice assistant: asks «Where do you want to go?», listens (in the app's language) and flies there
// using the same search as the search box. Speech recognition is done by the browser (Chrome /
// Edge / Safari send the audio to Google / Apple), so it needs internet. Talking over the question
// is not reliable on phones (the microphone hears the speaker), so tapping the microphone again
// cuts the question and starts listening at once.
import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { normalizeSearchText, resolveSpaceQuery, type SpaceAnswerResult } from '../data/spaceKnowledgeSearch';
import { CELESTIAL_BODIES } from '../data/solarSystemData';
import { getLang, tr } from '../i18n';
import { narrate, stopNarration } from '../audio/narration';

// Minimal typing of the Web Speech recognition API (not in the TypeScript DOM library)
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<RecognitionAlternative> & { isFinal: boolean }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Words around the destination that are not part of it («take me to…», «llévame a…»). */
const COMMAND_PATTERNS = [
  /\b(ll[eé]vame|vamos|quiero ir|quiero ver|quiero visitar|mu[eé]strame|ens[eé][nñ]ame|ve|ir|viajar|volar|vuela|viaja)\b( (a|al|hasta|hacia|hasta el|a la|a los|a las))?/gi,
  /\b(take me|bring me|fly me|i want to go|i want to see|i want to visit|let'?s go|show me|go|fly|travel|navigate)\b( (to|over to))?( the)?/gi,
  /\b(por favor|please|hey travix|travix|oye)\b/gi,
];

function stripCommand(text: string): string {
  let s = text;
  for (const re of COMMAND_PATTERNS) s = s.replace(re, ' ');
  return s.replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * A planet or moon said by its exact name wins («take me to Mars» is the planet, not Mars
 * Pathfinder, whose name also contains «Mars»).
 */
function exactWorld(cleaned: string): SpaceAnswerResult | null {
  const q = normalizeSearchText(cleaned).replace(/^(the|la|el|los|las) /, '');
  for (const body of CELESTIAL_BODIES) {
    if (normalizeSearchText(body.name) === q) {
      return {
        target: { type: 'body', bodyId: body.id, body },
        headline: `${body.name} · ${body.classification}`,
        answer: body.description,
        destinationLabel: body.stats.distanceAu,
        accentColor: body.accentColor,
      };
    }
    for (const moon of body.moons) {
      if (normalizeSearchText(moon.name) === q) {
        return {
          target: { type: 'moon', bodyId: body.id, moonId: moon.id, body, moon },
          headline: `${moon.name} · ${tr('Luna de', 'Moon of')} ${body.name}`,
          answer: tr(
            `${moon.name} orbita ${body.name}.`,
            `${moon.name} orbits ${body.name}.`,
          ),
          destinationLabel: `${tr('Satélite natural de', 'Natural satellite of')} ${body.name}`,
          accentColor: body.accentColor,
        };
      }
    }
  }
  return null;
}

/** Best destination for what was heard (several alternatives from the recognizer). */
export function resolveVoiceQuery(alternatives: string[]): SpaceAnswerResult | null {
  for (const alt of alternatives) {
    const exact = exactWorld(stripCommand(alt));
    if (exact) return exact;
  }
  for (const alt of alternatives) {
    const cleaned = stripCommand(alt);
    const res = (cleaned.length >= 2 ? resolveSpaceQuery(cleaned) : null) ?? resolveSpaceQuery(alt);
    if (res) return res;
  }
  return null;
}

type Phase = 'asking' | 'listening' | 'thinking' | 'going' | 'notFound' | 'error';

interface VoiceAssistantProps {
  onClose: () => void;
  onNavigate: (res: SpaceAnswerResult) => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose, onNavigate }) => {
  const [phase, setPhase] = useState<Phase>('asking');
  const [heard, setHeard] = useState('');
  const [message, setMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const recRef = useRef<Recognition | null>(null);
  const closedRef = useRef(false);
  /** Listening starts by itself only once, after the question (not again if it was cut short) */
  const autoListenRef = useRef(true);
  const lang = getLang();

  const stopListening = () => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        // already stopped
      }
    }
  };

  const listen = () => {
    autoListenRef.current = false;
    stopNarration();
    stopListening();
    if (!navigator.onLine) {
      setPhase('error');
      setMessage(tr('Necesitas internet para usar la voz. El resto de la app funciona sin conexión.', 'You need internet to use voice. The rest of the app works offline.'));
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = getLang() === 'en' ? 'en-US' : 'es-CO';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.continuous = false;
    let finalAlternatives: string[] | null = null;
    // Some Android phones never mark the result as final: keep the last thing heard as a backup
    let lastHeard = '';
    rec.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        text += r[0]?.transcript ?? '';
        if (r.isFinal) {
          finalAlternatives = Array.from({ length: r.length }, (_, k) => r[k].transcript);
        }
      }
      lastHeard = text.trim();
      setHeard(lastHeard);
    };
    rec.onerror = (e) => {
      if (closedRef.current) return;
      // 'aborted' is our own stop (a new tap on the microphone): not an error to show
      if (e.error === 'aborted') return;
      setErrorCode(e.error);
      setPhase('error');
      setMessage(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? tr('El navegador no dio permiso para el micrófono. Actívalo en los ajustes del sitio.', 'The browser did not allow the microphone. Turn it on in the site settings.')
          : e.error === 'network'
            ? tr('Necesitas internet para usar la voz.', 'You need internet to use voice.')
            : e.error === 'no-speech'
              ? tr('No te escuché. Toca el micrófono e intenta de nuevo.', 'I did not hear you. Tap the microphone and try again.')
              : tr('No pude escuchar. Toca el micrófono e intenta de nuevo.', 'I could not listen. Tap the microphone and try again.'),
      );
    };
    rec.onend = () => {
      if (closedRef.current || recRef.current !== rec) return;
      recRef.current = null;
      const alts = finalAlternatives ?? (lastHeard ? [lastHeard] : null);
      if (!alts || alts.length === 0) {
        setPhase((p) => (p === 'listening' ? 'error' : p));
        setMessage((m) => m || tr('No te escuché. Toca el micrófono e intenta de nuevo.', 'I did not hear you. Tap the microphone and try again.'));
        return;
      }
      setPhase('thinking');
      const res = resolveVoiceQuery(alts);
      if (!res) {
        setPhase('notFound');
        const say = tr('No encontré ese lugar. Prueba con un planeta o una misión, por ejemplo Marte o Perseverance.', 'I could not find that place. Try a planet or a mission, like Mars or Perseverance.');
        setMessage(say);
        narrate(say);
        return;
      }
      setPhase('going');
      setMessage(res.headline);
      narrate(tr(`Vamos a ${res.headline.split(' · ')[0]}`, `Going to ${res.headline.split(' · ')[0]}`));
      window.setTimeout(() => {
        if (closedRef.current) return;
        onNavigate(res);
        onClose();
      }, 900);
    };
    recRef.current = rec;
    setHeard('');
    setMessage('');
    setErrorCode('');
    setPhase('listening');
    try {
      rec.start();
    } catch (err) {
      // Some browsers only start it from a tap: the next tap on the microphone will work
      recRef.current = null;
      setErrorCode(err instanceof Error ? err.name : 'start');
      setPhase('error');
      setMessage(tr('Toca el micrófono para hablar.', 'Tap the microphone to talk.'));
    }
  };

  // Ask the question, then listen (tapping the microphone skips the question)
  useEffect(() => {
    closedRef.current = false;
    const startAfterQuestion = () => {
      if (!closedRef.current && autoListenRef.current) listen();
    };
    narrate(tr('¿A dónde quieres ir?', 'Where do you want to go?'), startAfterQuestion);
    // Chrome on Android sometimes never reports the end of the spoken question: listen anyway
    const fallback = window.setTimeout(startAfterQuestion, 2800);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      closedRef.current = true;
      window.clearTimeout(fallback);
      window.removeEventListener('keydown', onKey);
      stopNarration();
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listening = phase === 'listening';
  const status =
    phase === 'asking'
      ? tr('¿A dónde quieres ir? Toca el micrófono para hablar ya.', 'Where do you want to go? Tap the microphone to talk now.')
      : phase === 'listening'
        ? tr('Te escucho…', 'Listening…')
        : phase === 'thinking'
          ? tr('Buscando…', 'Searching…')
          : phase === 'going'
            ? `${tr('Vamos a', 'Going to')} ${message}`
            : message;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-6" role="presentation">
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(2,4,10,0.55)]" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-title"
        className="relative w-full max-w-sm rounded-2xl travix-glass-panel p-4 sm:p-5 text-center"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Cerrar', 'Close')}
          className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        <h2 id="voice-title" className="text-sm font-semibold uppercase tracking-wider text-amber-300">
          {tr('Asistente de voz', 'Voice assistant')}
        </h2>
        <button
          type="button"
          onClick={listen}
          aria-label={listening ? tr('Escuchando', 'Listening') : tr('Hablar ahora', 'Talk now')}
          className={`mx-auto mt-4 w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
            listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
          }`}
        >
          {phase === 'error' ? <MicOff className="w-9 h-9" aria-hidden="true" /> : <Mic className="w-9 h-9" aria-hidden="true" />}
        </button>
        <p className="mt-4 text-base font-semibold text-white" aria-live="polite">
          {status}
        </p>
        {errorCode && (
          <p className="mt-1 text-[10px] text-slate-500">({errorCode})</p>
        )}
        {heard && (
          <p className="mt-2 text-sm text-slate-200">
            «{heard}»
          </p>
        )}
        <p className="mt-3 text-[11px] text-slate-400 leading-snug">
          {lang === 'en'
            ? 'Say a planet, moon or mission, e.g. “Take me to Mars” or “Perseverance”. It listens in English; switch to ES to talk in Spanish.'
            : 'Di un planeta, luna o misión, por ejemplo «Llévame a Marte» o «Perseverance». Escucha en español; cambia a EN para hablar en inglés.'}
        </p>
      </section>
    </div>
  );
};

export default VoiceAssistant;
