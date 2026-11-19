export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read recorded audio.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

export function pickSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export function formatVoiceSeconds(totalSecs: number): string {
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function resolveSpeechLangTag(chatLang: string): string {
  const lower = (chatLang || '').toLowerCase();
  if (lower.includes('french')) return 'fr-FR';
  if (lower.includes('hausa')) return 'ha-NG';
  if (lower.includes('yoruba')) return 'yo-NG';
  if (lower.includes('igbo')) return 'ig-NG';
  return 'en-NG';
}

export function speakText(text: string, chatLang: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const cleanText = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[•*-]\s+/gm, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .trim();
  if (!cleanText) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = resolveSpeechLangTag(chatLang);
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on unsupported browsers
  }
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore
  }
}

export async function transcribeVoiceBlob(
  blob: Blob,
  language: string
): Promise<{ transcript: string }> {
  const base64 = await blobToBase64(blob);
  const res = await fetch('/api/mart-ai/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: blob.type || 'audio/webm',
      language,
    }),
  });

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Voice transcription server route is unavailable on static hosting. Use Speech Recognition browser support or type your message.'
    );
  }

  const data = (await res.json()) as { transcript?: string; error?: string };
  if (!res.ok) {
    throw new Error(data?.error || `Could not transcribe voice (${res.status}).`);
  }
  if (!data?.transcript?.trim()) {
    throw new Error('Could not hear clear speech. Please try recording again.');
  }
  return { transcript: data.transcript.trim() };
}
