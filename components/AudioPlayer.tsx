import React, { useState, useEffect } from 'react';
import { audioService } from '../services/audioService';

export const AudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.4);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Sync with actual audio state
    const checkPlaying = () => {
      setIsPlaying(audioService.isMenuMusicPlaying());
    };
    checkPlaying();
    const interval = setInterval(checkPlaying, 500);
    return () => clearInterval(interval);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      audioService.pauseMenuMusic();
      setIsPlaying(false);
    } else {
      audioService.resumeMenuMusic();
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioService.setMenuMusicVolume(newVolume);
  };

  return (
    <div 
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-black/70 backdrop-blur-sm 
                  rounded-full border border-white/10 transition-all duration-300 
                  ${isExpanded ? 'px-4 py-2' : 'px-2 py-2'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 
                   transition-colors text-white text-sm"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Volume Controls - Show on hover */}
      <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 
                       ${isExpanded ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}>
        <span className="text-white/60 text-xs">🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                     [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-n64-yellow 
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 
                     [&::-moz-range-thumb]:bg-n64-yellow [&::-moz-range-thumb]:rounded-full 
                     [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>

      {/* Music indicator */}
      {isPlaying && (
        <div className="flex gap-0.5 items-end h-4">
          <div className="w-0.5 bg-n64-yellow rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
          <div className="w-0.5 bg-n64-yellow rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
          <div className="w-0.5 bg-n64-yellow rounded-full animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};

