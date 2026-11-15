// Narración con la voz del dispositivo (Web Speech): sin archivos de audio ni internet en la mayoría
// de los dispositivos. Habla en el idioma actual de la app (inglés o español).
import { getLang } from '../i18n';

export const canNarrate = typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Puntúa una voz: las neuronales («Natural», «Neural», «Online» en Edge/Windows, voces mejoradas
 * de Apple) y las de Google suenan humanas; las locales antiguas (Microsoft Sabina/Helena/
 * Pablo, eSpeak) suenan robóticas y quedan al final.
 */
function voiceScore(v: SpeechSynthesisVoice, lang: 'en' | 'es'): number {
  const name = v.name;
  let score = 0;
  if (/natural|neural|online/i.test(name)) score += 100;
  else if (/premium|enhanced|mejorad/i.test(name)) score += 80;
  else if (/google/i.test(name)) score += 60;
  else if (/siri|monica|paulina|jorge|samantha|daniel/i.test(name)) score += 40;
  if (/espeak|desktop/i.test(name)) score -= 50;
  const preferred = lang === 'en' ? /^en[-_](US|GB)/i : /^es[-_](419|CO|MX|US)/i;
  if (preferred.test(v.lang)) score += 10;
  return score;
}

function voiceFor(lang: 'en' | 'es'): SpeechSynthesisVoice | undefined {
  const prefix = lang === 'en' ? /^en\b|^en[-_]/i : /^es\b|^es[-_]/i;
  const candidates = window.speechSynthesis.getVoices().filter((v) => prefix.test(v.lang));
  let best: SpeechSynthesisVoice | undefined;
  let bestScore = -Infinity;
  for (const v of candidates) {
    const s = voiceScore(v, lang);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}

/** Lee el texto en el idioma actual; onEnd se llama al terminar o al detenerse. */
export function narrate(text: string, onEnd?: () => void): void {
  if (!canNarrate) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const lang = getLang();
  const u = new SpeechSynthesisUtterance(text);
  const voice = voiceFor(lang);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? (lang === 'en' ? 'en-US' : 'es-ES');
  u.rate = 0.98;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  synth.speak(u);
}

export function stopNarration(): void {
  if (canNarrate) window.speechSynthesis.cancel();
}
