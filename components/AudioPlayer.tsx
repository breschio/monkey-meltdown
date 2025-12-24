import React, { useState, useEffect } from 'react';
import { audioService } from '../services/audioService';

export const AudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.4);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(audioService.getCurrentTrackIndex());
  const [trackName, setTrackName] = useState(audioService.getCurrentTrackName());

  useEffect(() => {
    // Sync with actual audio state
    const checkPlaying = () => {
      setIsPlaying(audioService.isMenuMusicPlaying());
    };
    checkPlaying();
    const interval = setInterval(checkPlaying, 500);
    
    // Subscribe to track changes
    const unsubscribe = audioService.onTrackChange(() => {
      setCurrentTrack(audioService.getCurrentTrackIndex());
      setTrackName(audioService.getCurrentTrackName());
    });
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
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

  const handlePrevTrack = () => {
    audioService.previousTrack();
  };

  const handleNextTrack = () => {
    audioService.nextTrack();
  };

  return (
    <div 
      className={`fixed bottom-4 left-4 z-50 flex items-center bg-white/80 backdrop-blur-sm 
                  rounded-full border border-mm-purple/20 shadow-lg shadow-purple-500/10 transition-all duration-300 
                  ${isExpanded ? 'gap-2 px-4 py-2' : 'gap-1.5 px-2 py-2'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Previous Track Button - Show on hover */}
      {isExpanded && (
        <button
          onClick={handlePrevTrack}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-mm-purple/10 hover:bg-mm-purple/20 
                     transition-all text-mm-deep text-xs"
          title="Previous track"
        >
          ⏮
        </button>
      )}

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-mm-purple/20 hover:bg-mm-purple/30 
                   transition-colors text-mm-deep text-sm flex-shrink-0"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Next Track Button - Show on hover */}
      {isExpanded && (
        <button
          onClick={handleNextTrack}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-mm-purple/10 hover:bg-mm-purple/20 
                     transition-all text-mm-deep text-xs"
          title="Next track"
        >
          ⏭
        </button>
      )}

      {/* Track info - Show on hover */}
      {isExpanded && (
        <div className="flex flex-col items-start max-w-32">
          <span className="text-mm-deep text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-full capitalize">
            {trackName}
          </span>
          <span className="text-mm-deep/50 text-[10px]">
            {currentTrack + 1} / {audioService.getTotalTracks()}
          </span>
        </div>
      )}

      {/* Volume Controls - Show on hover */}
      {isExpanded && (
        <div className="flex items-center gap-2">
          <span className="text-mm-deep/60 text-xs">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-mm-purple/20 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                       [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-mm-pink 
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 
                       [&::-moz-range-thumb]:bg-mm-pink [&::-moz-range-thumb]:rounded-full 
                       [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
      )}

      {/* Music indicator */}
      {isPlaying && (
        <div className="flex gap-0.5 items-end h-4">
          <div className="w-0.5 bg-mm-pink rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
          <div className="w-0.5 bg-mm-purple rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
          <div className="w-0.5 bg-mm-magenta rounded-full animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};

