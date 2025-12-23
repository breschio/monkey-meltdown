export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private isMuted: boolean = false;
  private menuAudio: HTMLAudioElement | null = null;
  private gameAudio: HTMLAudioElement | null = null;

  constructor() {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3;
    } catch (e) {
      console.error('Web Audio API not supported');
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, volume: number = 1) {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playJump() {
    this.playTone(150, 'square', 0.1, 0.5);
    setTimeout(() => this.playTone(300, 'square', 0.2, 0.5), 50);
  }

  playCollect() {
    this.playTone(880, 'sine', 0.1, 0.3);
    setTimeout(() => this.playTone(1760, 'sine', 0.2, 0.3), 50);
  }

  playPenalty() {
    this.playTone(100, 'sawtooth', 0.3, 0.5);
    setTimeout(() => this.playTone(80, 'sawtooth', 0.3, 0.5), 100);
  }

  playCrash() {
    this.playTone(100, 'sawtooth', 0.1, 0.8);
    setTimeout(() => this.playTone(50, 'sawtooth', 0.2, 0.6), 50);
  }

  playPowerUp() {
    const now = this.ctx?.currentTime || 0;
    [440, 554, 659, 880].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'square', 0.2, 0.4), i * 100);
    });
  }

  startMusic() {
    if (!this.ctx || this.bgmOscillators.length > 0) return;

    // Simple bassline loop
    const bassFreqs = [110, 110, 146, 146, 164, 164, 146, 130];
    let noteIndex = 0;

    const playNote = () => {
      if (this.bgmOscillators.length === 0) return; // Stopped
      
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = bassFreqs[noteIndex % bassFreqs.length];
      
      gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start();
      osc.stop(this.ctx!.currentTime + 0.2);
      
      noteIndex++;
    };

    // We use setInterval for the "sequencer" - rudimentary but works for simple games
    const intervalId = window.setInterval(playNote, 250);
    // Store ID in a hacky way to clear it later, or just use a flag. 
    // Better: just keep a reference to the interval logic if needed, 
    // but for this simple scope, let's use a "playing" flag.
    (this as any).musicInterval = intervalId;
    this.bgmOscillators.push({} as any); // Marker that music is on
  }

  stopMusic() {
    if ((this as any).musicInterval) {
      clearInterval((this as any).musicInterval);
    }
    this.bgmOscillators = [];
  }

  // Check if menu music is currently playing
  isMenuMusicPlaying(): boolean {
    return this.menuAudio !== null && !this.menuAudio.paused;
  }

  // Menu music (MP3 file)
  startMenuMusic() {
    if (this.menuAudio) {
      this.menuAudio.currentTime = 0;
      this.menuAudio.play().catch(() => {});
      return;
    }

    this.menuAudio = new Audio('/audio/menu-music.mp3');
    this.menuAudio.loop = true;
    this.menuAudio.volume = 0.4;
    this.menuAudio.play().catch(() => {
      // Autoplay blocked - will play on user interaction
    });
  }

  stopMenuMusic() {
    if (this.menuAudio) {
      this.menuAudio.pause();
      this.menuAudio.currentTime = 0;
    }
  }

  pauseMenuMusic() {
    if (this.menuAudio) {
      this.menuAudio.pause();
    }
  }

  resumeMenuMusic() {
    if (this.menuAudio) {
      this.menuAudio.play().catch(() => {});
    }
  }

  setMenuMusicVolume(volume: number) {
    if (this.menuAudio) {
      this.menuAudio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getMenuMusicVolume(): number {
    return this.menuAudio?.volume ?? 0.4;
  }

  fadeOutMenuMusic(duration: number = 1000) {
    if (!this.menuAudio) return;
    
    const startVolume = this.menuAudio.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = startVolume / steps;
    
    let currentStep = 0;
    const fadeInterval = setInterval(() => {
      currentStep++;
      if (this.menuAudio) {
        this.menuAudio.volume = Math.max(0, startVolume - (volumeStep * currentStep));
      }
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        this.stopMenuMusic();
        if (this.menuAudio) this.menuAudio.volume = 0.4; // Reset for next time
      }
    }, stepDuration);
  }
}

export const audioService = new AudioService();