// Narración con la voz del dispositivo (Web Speech): sin archivos de audio ni internet en la mayoría
// de los dispositivos. Habla en el idioma actual de la app (inglés o español).
import { getLang } from '../i18n';

export const canNarrate = typeof window !== 'undefined' && 'speechSynthesis' in window;

function voiceFor(lang: 'en' | 'es'): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (lang === 'en') {
    return voices.find((v) => /^en[-_](US|GB)/i.test(v.lang)) ?? voices.find((v) => /^en\b|^en[-_]/i.test(v.lang));
  }
  return (
    voices.find((v) => /^es[-_](419|CO|MX|US)/i.test(v.lang)) ?? voices.find((v) => /^es\b|^es[-_]/i.test(v.lang))
  );
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
