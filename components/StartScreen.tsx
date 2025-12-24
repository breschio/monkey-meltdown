import React, { useState } from 'react';
import { audioService } from '../services/audioService';

interface StartScreenProps {
  onStart: () => void;
  onAudioEnabled?: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onAudioEnabled }) => {
  // Check if audio is already playing (user returned from gameplay)
  const [audioEnabled, setAudioEnabled] = useState(() => audioService.isMenuMusicPlaying());

  const handleButtonClick = () => {
    if (!audioEnabled) {
      // First click: enable audio
      audioService.resume();
      audioService.startMenuMusic();
      setAudioEnabled(true);
      onAudioEnabled?.();
    } else {
      // Second click: start game
      onStart();
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
      {/* Light gradient overlay over the background gameplay */}
      <div className="absolute inset-0 bg-gradient-to-b from-mm-light/90 via-mm-lavender/80 to-mm-purple/70 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 w-fit">
        {/* Main Title */}
        <h1 className="font-game text-6xl md:text-8xl text-mm-pink mb-2 drop-shadow-2xl" style={{ textShadow: '3px 3px 0 #7c3aed, -1px -1px 0 #7c3aed' }}>
          MONKEY
        </h1>
        <h1 className="font-game text-5xl md:text-7xl text-mm-purple mb-8 drop-shadow-2xl" style={{ textShadow: '3px 3px 0 #ec4899, -1px -1px 0 #ec4899' }}>
          MELTDOWN
        </h1>

        {/* Subtitle */}
        <p className="text-mm-deep/80 text-lg md:text-xl mb-12 max-w-md font-mono">
          Ski the slopes. Collect bananas. Avoid pizza.
        </p>

        {/* Main Button - Enable Audio first, then Start Game */}
        <button
          onClick={handleButtonClick}
          className={`group relative px-12 py-5 font-black text-2xl uppercase tracking-widest rounded-xl 
                     transform hover:scale-105 active:scale-95 transition-all duration-200
                     ${audioEnabled 
                       ? 'bg-gradient-to-r from-mm-pink to-mm-magenta text-white shadow-2xl shadow-pink-500/40 hover:shadow-pink-500/60 border-b-4 border-pink-600 hover:border-pink-500' 
                       : 'bg-white/40 text-mm-deep shadow-2xl shadow-purple-500/20 hover:shadow-purple-500/40 border-b-4 border-mm-purple/50 hover:border-mm-purple backdrop-blur-sm'
                     }`}
        >
          <span className="relative z-10 flex items-center gap-3">
            {!audioEnabled && <span className="text-2xl">🔊</span>}
            {audioEnabled ? 'Start Game' : 'Enable Audio'}
          </span>
          <div className={`absolute inset-0 bg-gradient-to-t rounded-xl opacity-0 group-hover:opacity-100 transition-opacity
                          ${audioEnabled ? 'from-white/20 to-transparent' : 'from-mm-purple/20 to-transparent'}`} />
        </button>

        {/* Controls hint */}
        <div className="mt-12 flex gap-8 text-mm-deep/60 text-sm font-mono">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white/50 rounded border border-mm-purple/30 text-mm-deep">←</kbd>
            <kbd className="px-2 py-1 bg-white/50 rounded border border-mm-purple/30 text-mm-deep">→</kbd>
            <span>or drag to steer</span>
          </div>
        </div>
      </div>

      {/* Animated sparkle particles overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-mm-pink/40 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

