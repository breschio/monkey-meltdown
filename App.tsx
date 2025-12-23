import React, { useState } from 'react';
import { CharacterGenerator } from './components/CharacterGenerator';
import { N64Game } from './components/N64Game';
import { StartScreen } from './components/StartScreen';
import { AudioPlayer } from './components/AudioPlayer';
import { audioService } from './services/audioService';

type AppMode = 'START' | 'CREATE' | 'GAME';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('START');
  const [generatedSprite, setGeneratedSprite] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(() => audioService.isMenuMusicPlaying());

  const handleAudioEnabled = () => {
    setAudioEnabled(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mm-light via-mm-lavender/30 to-mm-purple/20 text-retro-black font-sans selection:bg-mm-pink selection:text-white flex flex-col">
      
      {/* Start Screen - overlays the demo game */}
      {mode === 'START' && (
        <div className="fixed inset-0 z-20">
          {/* Background demo game */}
          <div className="absolute inset-0">
            <N64Game isDemo={true} />
          </div>
          {/* Start screen overlay */}
          <StartScreen onStart={() => setMode('CREATE')} onAudioEnabled={handleAudioEnabled} />
        </div>
      )}

      {/* Character Creation Screen */}
      {mode === 'CREATE' && (
        <main className="flex-grow w-full flex flex-col items-center justify-center transition-all duration-300 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8 animate-fade-in">
            <h2 className="text-4xl md:text-6xl font-extrabold text-retro-black mb-6">
              <span className="text-mm-pink">Create</span> Your Character
            </h2>
            <p className="text-mm-deep/70 max-w-2xl mx-auto text-xl">
              Describe your character and watch the AI bring it to life
            </p>
          </div>
          <CharacterGenerator 
            onSpriteGenerated={setGeneratedSprite}
            onPlayGame={() => setMode('GAME')}
          />
        </main>
      )}

      {/* Gameplay Screen */}
      {mode === 'GAME' && (
        <main className="flex-grow w-full flex flex-col items-center justify-center transition-all duration-300 w-full h-screen p-2 overflow-hidden">
          <div className="animate-fade-in w-full h-full flex flex-col">
            <div className="text-center mb-2 flex-shrink-0">
              <button 
                onClick={() => setMode('START')}
                className="font-game text-3xl mb-1 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span className="text-mm-pink">MONKEY</span> <span className="text-mm-purple">MELTDOWN</span>
              </button>
              <p className="text-mm-deep/60 text-xs font-mono">
                Collect Bananas • Avoid Pizza • Beat the Clock
              </p>
            </div>
            <div className="flex-grow w-full relative">
              <N64Game generatedSpriteUrl={generatedSprite} />
            </div>
          </div>
        </main>
      )}

      {/* Audio Player - shows after audio is enabled */}
      {audioEnabled && <AudioPlayer />}
    </div>
  );
};

export default App;