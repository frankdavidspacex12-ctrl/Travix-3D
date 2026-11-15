// Whether this browser can do speech recognition (Chrome, Edge and Safari can; Firefox cannot).
// Kept apart from the assistant so the dock can decide to show the microphone without loading it.
export const canUseVoice =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
