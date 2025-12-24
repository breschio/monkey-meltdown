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
  const [monkeyName, setMonkeyName] = useState<string>('Unnamed Monkey');
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
              <span className="text-mm-pink">Make</span> Your Monkey
            </h2>
          </div>
          <CharacterGenerator 
            onSpriteGenerated={setGeneratedSprite}
            onMonkeySelected={setMonkeyName}
            onPlayGame={() => setMode('GAME')}
          />
        </main>
      )}

      {/* Gameplay Screen */}
      {mode === 'GAME' && (
        <main className="flex-grow w-full flex flex-col items-center justify-center transition-all duration-300 w-full h-screen p-2 overflow-hidden">
          <div className="animate-fade-in w-full h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 flex-shrink-0 px-2">
              <button 
                onClick={() => setMode('START')}
                className="font-game text-3xl hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span className="text-mm-pink">MONKEY</span> <span className="text-mm-purple">MELTDOWN</span>
              </button>
              <button
                onClick={() => setMode('CREATE')}
                className="px-4 py-2 bg-white/80 hover:bg-white text-mm-deep font-bold rounded-lg border-2 border-mm-purple/30 hover:border-mm-purple transition-all shadow-sm"
              >
                Exit
              </button>
            </div>
            <div className="flex-grow w-full relative">
              <N64Game generatedSpriteUrl={generatedSprite} monkeyName={monkeyName} />
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