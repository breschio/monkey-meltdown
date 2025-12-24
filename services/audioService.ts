export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private isMuted: boolean = false;
  private menuAudio: HTMLAudioElement | null = null;
  private gameAudio: HTMLAudioElement | null = null;
  
  // Playlist for menu music rotation
  private playlist: string[] = [
    '/audio/playlist/monkrey-meltdown-1.mp3',
    '/audio/playlist/monkrey-meltdown-2.mp3',
    '/audio/playlist/pizza-bust.mp3',
    '/audio/playlist/monkey-on-a-mission.mp3',
  ];
  private currentTrackIndex: number = 0;
  private trackChangeListeners: Set<() => void> = new Set();
  
  // Skiing SFX for direction changes
  private skiingSfx: string[] = [
    '/audio/sfx/sking/ski1.mp3',
    '/audio/sfx/sking/ski2.mp3',
    '/audio/sfx/sking/ski3.mp3',
    '/audio/sfx/sking/ski14.mp3',
  ];
  private lastSkiSfxIndex: number = -1;
  private sfxVolume: number = 0.5;
  
  // Collision SFX
  private bananaSfx: string = '/audio/sfx/collisions/banana.mp3';
  private ohNoSfx: string = '/audio/sfx/collisions/oh-no.mp3';

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
    // Play banana collection sound
    const audio = new Audio(this.bananaSfx);
    audio.volume = this.sfxVolume;
    audio.play().catch(() => {});
  }

  playPenalty() {
    this.playTone(100, 'sawtooth', 0.3, 0.5);
    setTimeout(() => this.playTone(80, 'sawtooth', 0.3, 0.5), 100);
  }

  playCrash() {
    // Play "oh no" sound when hitting rocks/trees
    const audio = new Audio(this.ohNoSfx);
    audio.volume = this.sfxVolume;
    audio.play().catch(() => {});
  }

  playPowerUp() {
    const now = this.ctx?.currentTime || 0;
    [440, 554, 659, 880].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'square', 0.2, 0.4), i * 100);
    });
  }

  // Play a random skiing sound effect (for direction changes)
  playSkiingSound() {
    if (this.skiingSfx.length === 0) return;
    
    // Pick a random sound, but avoid repeating the last one for variety
    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * this.skiingSfx.length);
    } while (randomIndex === this.lastSkiSfxIndex && this.skiingSfx.length > 1);
    
    this.lastSkiSfxIndex = randomIndex;
    
    const audio = new Audio(this.skiingSfx[randomIndex]);
    audio.volume = this.sfxVolume;
    audio.play().catch(() => {
      // Autoplay may be blocked
    });
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
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

  // Get current track info
  getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  getTotalTracks(): number {
    return this.playlist.length;
  }

  getCurrentTrackName(): string {
    const path = this.playlist[this.currentTrackIndex];
    const filename = path.split('/').pop() || '';
    // Clean up the filename for display
    return filename
      .replace('.mp3', '')
      .replace(/-/g, ' ')
      .replace(/(\d)$/, ' $1');
  }

  // Subscribe to track changes
  onTrackChange(callback: () => void): () => void {
    this.trackChangeListeners.add(callback);
    return () => this.trackChangeListeners.delete(callback);
  }

  private notifyTrackChange() {
    this.trackChangeListeners.forEach(cb => cb());
  }

  // Menu music (MP3 file) with playlist rotation
  startMenuMusic() {
    // On first play of session, pick a random starting track
    if (!this.menuAudio) {
      this.currentTrackIndex = Math.floor(Math.random() * this.playlist.length);
    }
    // Always load through loadTrack to ensure rotation is set up
    this.loadTrack(this.currentTrackIndex, true);
  }

  private loadTrack(index: number, forcePlay: boolean = false) {
    const wasPlaying = forcePlay || (this.menuAudio ? !this.menuAudio.paused : true);
    const volume = this.menuAudio?.volume ?? 0.4;
    
    // Clean up previous audio element completely
    if (this.menuAudio) {
      this.menuAudio.pause();
      this.menuAudio.removeEventListener('ended', this.handleTrackEnded);
      this.menuAudio.src = '';
      this.menuAudio.load();
    }

    this.currentTrackIndex = ((index % this.playlist.length) + this.playlist.length) % this.playlist.length;
    this.menuAudio = new Audio(this.playlist[this.currentTrackIndex]);
    this.menuAudio.volume = volume;
    
    // Bind the handler so we can remove it later
    this.handleTrackEnded = () => {
      this.nextTrack();
    };
    
    // When track ends, play next track (continuous rotation)
    this.menuAudio.addEventListener('ended', this.handleTrackEnded);

    if (wasPlaying) {
      this.menuAudio.play().catch(() => {
        // Autoplay blocked - will play on user interaction
      });
    }
    
    this.notifyTrackChange();
  }
  
  private handleTrackEnded: () => void = () => {};

  nextTrack() {
    const nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this.loadTrack(nextIndex);
  }

  previousTrack() {
    // If we're more than 3 seconds into the song, restart it
    if (this.menuAudio && this.menuAudio.currentTime > 3) {
      this.menuAudio.currentTime = 0;
      this.notifyTrackChange();
      return;
    }
    const prevIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    this.loadTrack(prevIndex);
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