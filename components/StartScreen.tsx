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
      {/* Dark overlay over the background gameplay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Decorative top element */}
        <div className="flex gap-2 mb-6 animate-bounce">
          <span className="w-4 h-4 bg-n64-yellow rounded-full shadow-lg shadow-yellow-500/50"></span>
          <span className="w-4 h-4 bg-n64-red rounded-full shadow-lg shadow-red-500/50"></span>
          <span className="w-4 h-4 bg-n64-blue rounded-full shadow-lg shadow-blue-500/50"></span>
          <span className="w-4 h-4 bg-n64-green rounded-full shadow-lg shadow-green-500/50"></span>
        </div>

        {/* Main Title */}
        <h1 className="text-6xl md:text-8xl font-black text-white mb-2 tracking-tight drop-shadow-2xl">
          <span className="text-n64-yellow">MONKEY</span>
        </h1>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight drop-shadow-2xl italic transform -skew-x-3">
          <span className="text-n64-red">MELTDOWN</span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-300 text-lg md:text-xl mb-12 max-w-md font-mono">
          Generate your character with AI.<br />
          Ski the slopes. Collect bananas. Avoid pizza.
        </p>

        {/* Main Button - Enable Audio first, then Start Game */}
        <button
          onClick={handleButtonClick}
          className={`group relative px-12 py-5 font-black text-2xl uppercase tracking-widest rounded-lg 
                     transform hover:scale-105 active:scale-95 transition-all duration-200
                     ${audioEnabled 
                       ? 'bg-n64-yellow text-retro-black shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-500/50 border-b-4 border-yellow-600 hover:border-yellow-500' 
                       : 'bg-white/20 text-white shadow-2xl shadow-white/10 hover:shadow-white/20 border-b-4 border-white/30 hover:border-white/50 backdrop-blur-sm'
                     }`}
        >
          <span className="relative z-10 flex items-center gap-3">
            {!audioEnabled && <span className="text-2xl">🔊</span>}
            {audioEnabled ? 'Start Game' : 'Enable Audio'}
          </span>
          <div className={`absolute inset-0 bg-gradient-to-t rounded-lg opacity-0 group-hover:opacity-100 transition-opacity
                          ${audioEnabled ? 'from-yellow-500/20 to-transparent' : 'from-white/10 to-transparent'}`} />
        </button>

        {/* Controls hint */}
        <div className="mt-12 flex gap-8 text-gray-500 text-sm font-mono">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700 text-gray-400">←</kbd>
            <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700 text-gray-400">→</kbd>
            <span>or drag to steer</span>
          </div>
        </div>
      </div>

      {/* Animated snow particles overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full animate-pulse"
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

