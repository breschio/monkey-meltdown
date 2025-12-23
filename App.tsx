import React, { useState } from 'react';
import { CharacterGenerator } from './components/CharacterGenerator';
import { N64Game } from './components/N64Game';
import { StartScreen } from './components/StartScreen';

type AppMode = 'START' | 'CREATE' | 'GAME';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('START');
  const [generatedSprite, setGeneratedSprite] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-retro-black text-white font-sans selection:bg-n64-yellow selection:text-black flex flex-col">
      
      {/* Start Screen - overlays the demo game */}
      {mode === 'START' && (
        <div className="fixed inset-0 z-20">
          {/* Background demo game */}
          <div className="absolute inset-0">
            <N64Game isDemo={true} />
          </div>
          {/* Start screen overlay */}
          <StartScreen onStart={() => setMode('CREATE')} />
        </div>
      )}

      {/* Character Creation Screen */}
      {mode === 'CREATE' && (
        <main className="flex-grow w-full flex flex-col items-center justify-center transition-all duration-300 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8 animate-fade-in">
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6">
              <span className="text-n64-yellow">Create</span> Your Character
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-xl">
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
                className="text-3xl font-extrabold text-white mb-1 tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span className="text-n64-yellow">MONKEY</span> <span className="text-n64-red italic transform -skew-x-6 inline-block">MELTDOWN</span>
              </button>
              <p className="text-gray-400 text-xs font-mono">
                Collect Bananas • Avoid Pizza • Beat the Clock
              </p>
            </div>
            <div className="flex-grow w-full relative">
              <N64Game generatedSpriteUrl={generatedSprite} />
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default App;