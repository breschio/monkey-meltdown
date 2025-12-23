import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
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

        {/* Start Button */}
        <button
          onClick={onStart}
          className="group relative px-12 py-5 bg-n64-yellow text-retro-black font-black text-2xl uppercase tracking-widest rounded-lg 
                     shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-500/50
                     transform hover:scale-105 active:scale-95 transition-all duration-200
                     border-b-4 border-yellow-600 hover:border-yellow-500"
        >
          <span className="relative z-10">Start Game</span>
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
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

