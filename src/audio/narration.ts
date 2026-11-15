// Narración con la voz del dispositivo (Web Speech): sin archivos de audio ni internet en la mayoría
// de los dispositivos. La usan las fichas de misión («Escuchar»).

export const canNarrate = typeof window !== 'undefined' && 'speechSynthesis' in window;

function spanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /^es[-_](419|CO|MX|US)/i.test(v.lang)) ?? voices.find((v) => /^es\b|^es[-_]/i.test(v.lang))
  );
}

/** Lee el texto en español; onEnd se llama al terminar o al detenerse. */
export function narrate(text: string, onEnd?: () => void): void {
  if (!canNarrate) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = spanishVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'es-ES';
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
