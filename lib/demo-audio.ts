// Singleton audio element for demo playback.
// play() must be called synchronously within a user gesture handler —
// that is the only way iOS Safari allows audio to start.
let _audio: HTMLAudioElement | null = null;

function ensure(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio();
    _audio.crossOrigin = 'anonymous';
    _audio.setAttribute('webkit-playsinline', 'true');
    _audio.setAttribute('playsinline', 'true');
  }
  return _audio;
}

export function playDemoUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const a = ensure();
  a.src = url;
  a.currentTime = 0;
  a.load();
  const playPromise = a.play();
  if (playPromise) {
    playPromise
      .then(() => {
        console.log('[Audio] Playing:', url);
      })
      .catch((err: any) => {
        console.error('[Audio] play() rejected:', err.name, err.message);
      });
  }
}

export function getDemoAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  return _audio;
}

export function ensureDemoAudio(): HTMLAudioElement {
  return ensure();
}
