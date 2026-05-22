let currentAudio: HTMLAudioElement | null = null;

export function playDemoUrl(url: string): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const audio = new Audio(url);
  audio.play().catch(() => {});
  currentAudio = audio;
}
