// Singleton audio element for demo playback.
// play() must be called synchronously within a user gesture handler —
// that is the only way iOS Safari allows audio to start.
let _audio: HTMLAudioElement | null = null;

function ensure(): HTMLAudioElement {
  if (!_audio) _audio = new Audio();
  return _audio;
}

export function playDemoUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const a = ensure();
  a.src = url;
  a.currentTime = 0;
  a.load();
  a.play().catch(() => {});
}

export function getDemoAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  return _audio;
}

export function ensureDemoAudio(): HTMLAudioElement {
  return ensure();
}
