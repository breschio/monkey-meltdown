import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateCharacterSprite } from '../services/geminiService';
import { GenerationStatus, AppError } from '../types';
import { Spinner } from './Spinner';
import { 
  SavedMonkey, 
  getAllMonkeys, 
  saveMonkey, 
  extractFrontView,
  deleteMonkey 
} from '../services/monkeyStorageService';

interface CharacterGeneratorProps {
  onSpriteGenerated: (url: string) => void;
  onMonkeySelected: (name: string) => void;
  onPlayGame: () => void;
}

type TabType = 'CHOOSE' | 'CREATE';

// Default prompt based on user request
const DEFAULT_PROMPT = "A monkey in a colorful ski suit, skiing on skis that are made of giant golden french fries.";

// Helper to remove white background
const removeBackground = (base64Image: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Image);
        return;
      }
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Chroma key: remove white/near-white pixels
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (r > 235 && g > 235 && b > 235) {
          data[i + 3] = 0;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
        console.error("Error processing image", err);
        resolve(base64Image);
    };
    img.src = base64Image;
  });
};

// Color palette for monkeys without sprites
const MONKEY_COLORS = ['#FFD93D', '#6BCB77', '#FF6B9D', '#C9A227', '#4D96FF', '#FF8C42', '#A855F7', '#22D3EE'];

export const CharacterGenerator: React.FC<CharacterGeneratorProps> = ({ onSpriteGenerated, onMonkeySelected, onPlayGame }) => {
  const [activeTab, setActiveTab] = useState<TabType>('CHOOSE');
  const [savedMonkeys, setSavedMonkeys] = useState<SavedMonkey[]>([]);
  const [monkeyThumbnails, setMonkeyThumbnails] = useState<Record<string, string>>({});
  const [selectedMonkeyId, setSelectedMonkeyId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [monkeyName, setMonkeyName] = useState('');
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load saved monkeys on mount
  useEffect(() => {
    const monkeys = getAllMonkeys();
    setSavedMonkeys(monkeys);
    
    // Extract front view thumbnails for each monkey
    monkeys.forEach(async (monkey) => {
      const frontView = await extractFrontView(monkey.spriteSheet);
      setMonkeyThumbnails(prev => ({ ...prev, [monkey.id]: frontView }));
    });
  }, []);

  // Refresh monkeys list (call after saving a new one)
  const refreshMonkeys = useCallback(() => {
    const monkeys = getAllMonkeys();
    setSavedMonkeys(monkeys);
    
    // Extract thumbnails for any new monkeys
    monkeys.forEach(async (monkey) => {
      if (!monkeyThumbnails[monkey.id]) {
        const frontView = await extractFrontView(monkey.spriteSheet);
        setMonkeyThumbnails(prev => ({ ...prev, [monkey.id]: frontView }));
      }
    });
  }, [monkeyThumbnails]);
  
  // Focus the name input when generation succeeds
  useEffect(() => {
    if (status === GenerationStatus.SUCCESS && generatedImage && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [status, generatedImage]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setStatus(GenerationStatus.LOADING);
    setError(null);
    setGeneratedImage(null);
    setMonkeyName(''); // Reset name for new generation
    
    try {
      const rawImageUrl = await generateCharacterSprite(prompt);
      const processedImageUrl = await removeBackground(rawImageUrl);
      
      setGeneratedImage(processedImageUrl);
      onSpriteGenerated(processedImageUrl);
      setStatus(GenerationStatus.SUCCESS);
    } catch (err: any) {
      setStatus(GenerationStatus.ERROR);
      setError({ message: err.message || "Unknown error occurred" });
    }
  }, [prompt, onSpriteGenerated]);

  const handleSelectMonkey = (monkey: SavedMonkey) => {
    setSelectedMonkeyId(monkey.id);
    onSpriteGenerated(monkey.spriteSheet);
    onMonkeySelected(monkey.name);
  };

  const handleDeleteMonkey = (e: React.MouseEvent, monkeyId: string) => {
    e.stopPropagation(); // Prevent selecting the monkey
    if (confirm('Delete this monkey?')) {
      deleteMonkey(monkeyId);
      if (selectedMonkeyId === monkeyId) {
        setSelectedMonkeyId(null);
      }
      refreshMonkeys();
    }
  };

  const handlePlay = () => {
    // If we're on Create tab and have a new monkey, save it first
    if (activeTab === 'CREATE' && generatedImage && monkeyName.trim()) {
      const saved = saveMonkey(monkeyName, generatedImage);
      refreshMonkeys();
      // Switch to the saved monkey
      setSelectedMonkeyId(saved.id);
      onMonkeySelected(monkeyName.trim());
    } else if (activeTab === 'CHOOSE' && selectedMonkey) {
      onMonkeySelected(selectedMonkey.name);
    }
    onPlayGame();
  };

  // Get selected monkey object
  const selectedMonkey = savedMonkeys.find(m => m.id === selectedMonkeyId);

  // Check if we have a character ready to play
  const hasCharacterReady = (activeTab === 'CHOOSE' && selectedMonkeyId !== null) || 
                            (activeTab === 'CREATE' && status === GenerationStatus.SUCCESS && generatedImage && monkeyName.trim());

  // No saved monkeys message
  const hasNoMonkeys = savedMonkeys.length === 0;

  return (
    <div className="w-full mx-auto p-6 bg-white/60 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-500/10 border border-mm-purple/20 flex flex-col gap-6">
      
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-mm-purple/20 pb-4 items-center">
        <button
          onClick={() => setActiveTab('CHOOSE')}
          className={`
            px-6 py-3 rounded-t-lg font-bold uppercase tracking-wider transition-all
            ${activeTab === 'CHOOSE' 
              ? 'bg-gradient-to-r from-mm-pink to-mm-magenta text-white shadow-lg' 
              : 'bg-white/50 text-mm-deep/60 hover:bg-white/80 hover:text-mm-deep'}
          `}
        >
          🐵 Choose {savedMonkeys.length > 0 && `(${savedMonkeys.length})`}
        </button>
        <button
          onClick={() => setActiveTab('CREATE')}
          className={`
            px-6 py-3 rounded-t-lg font-bold uppercase tracking-wider transition-all
            ${activeTab === 'CREATE' 
              ? 'bg-gradient-to-r from-mm-purple to-mm-deep text-white shadow-lg' 
              : 'bg-white/50 text-mm-deep/60 hover:bg-white/80 hover:text-mm-deep'}
          `}
        >
          ✨ Create
        </button>
        
        {/* Name Input & Play Button - Top Right */}
        <div className="ml-auto flex items-center gap-3">
          {/* Name input - only show when monkey is generated in Create tab */}
          {activeTab === 'CREATE' && status === GenerationStatus.SUCCESS && generatedImage && (
            <input
              ref={nameInputRef}
              type="text"
              value={monkeyName}
              onChange={(e) => setMonkeyName(e.target.value)}
              placeholder="Name your monkey..."
              className="px-4 py-3 rounded-xl border-2 border-mm-purple/30 bg-white/80 text-mm-deep placeholder-mm-deep/40 font-medium focus:border-mm-pink focus:outline-none transition-colors w-48"
            />
          )}
          
          {hasCharacterReady ? (
            <button
              onClick={handlePlay}
              className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-mm-pink to-mm-magenta hover:from-mm-magenta hover:to-mm-pink uppercase tracking-wider transition-all transform active:scale-95 shadow-lg hover:shadow-pink-500/25"
            >
              Play →
            </button>
          ) : (
            <div className="px-6 py-3 rounded-xl font-bold text-mm-deep/30 bg-white/50 uppercase tracking-wider border-2 border-dashed border-mm-purple/20">
              {activeTab === 'CREATE' && status === GenerationStatus.SUCCESS && !monkeyName.trim() 
                ? 'Name to Play' 
                : activeTab === 'CHOOSE' && hasNoMonkeys
                ? 'Create First'
                : 'Select to Play'}
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        
        {/* Left Side */}
        <div className="lg:w-1/3 flex flex-col">
          {activeTab === 'CHOOSE' ? (
            /* Choose Tab - Monkey Grid */
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-mm-deep flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-mm-pink"></span>
                Your Monkeys
              </h3>
              
              {hasNoMonkeys ? (
                /* No monkeys yet - prompt to create */
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/50 rounded-xl border-2 border-dashed border-mm-purple/30">
                  <div className="text-6xl mb-4">🐒</div>
                  <p className="text-mm-deep/60 text-center mb-4">No monkeys yet!</p>
                  <button
                    onClick={() => setActiveTab('CREATE')}
                    className="px-4 py-2 bg-gradient-to-r from-mm-purple to-mm-deep text-white rounded-lg font-medium hover:from-mm-magenta hover:to-mm-purple transition-all"
                  >
                    Create Your First →
                  </button>
                </div>
              ) : (
                /* Monkey grid - 3 columns */
                <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[450px] pr-1">
                  {savedMonkeys.map((monkey, index) => (
                    <div
                      key={monkey.id}
                      onClick={() => handleSelectMonkey(monkey)}
                      className={`
                        rounded-lg border-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer
                        flex flex-col items-center p-2 relative group aspect-square
                        ${selectedMonkeyId === monkey.id 
                          ? 'border-mm-pink bg-mm-pink/10 shadow-lg shadow-pink-500/20' 
                          : 'border-mm-purple/30 bg-white/80 hover:border-mm-purple/50'}
                      `}
                    >
                      {/* Delete button */}
                      {!monkey.isPreset && (
                        <button
                          onClick={(e) => handleDeleteMonkey(e, monkey.id)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                        >
                          ✕
                        </button>
                      )}
                      
                      {/* Thumbnail */}
                      <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                        {monkeyThumbnails[monkey.id] ? (
                          <img 
                            src={monkeyThumbnails[monkey.id]} 
                            alt={monkey.name}
                            className="w-full h-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                            style={{ backgroundColor: MONKEY_COLORS[index % MONKEY_COLORS.length] + '30' }}
                          >
                            🐒
                          </div>
                        )}
                      </div>
                      
                      {/* Name below thumbnail */}
                      <span className="text-xs font-bold text-mm-deep text-center truncate w-full mt-1">
                        {monkey.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Create Tab - Prompt Input */
            <div className="flex flex-col gap-4 h-full">
              <h3 className="text-lg font-bold text-mm-deep flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-mm-purple"></span>
                Describe Your Monkey
              </h3>
              <div className="bg-white/80 p-4 rounded-xl border border-mm-purple/30 focus-within:border-mm-pink transition-colors flex-1 flex flex-col">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-transparent text-mm-deep placeholder-mm-deep/40 resize-none outline-none text-base font-mono flex-1"
                  placeholder="Describe your character..."
                />
                <div className="text-right mt-2 text-xs text-mm-deep/50 font-mono">
                  POWERED BY GEMINI 2.5
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={status === GenerationStatus.LOADING || !prompt.trim()}
                className={`
                  w-full px-6 py-4 rounded-xl font-bold text-white uppercase tracking-wider transition-all transform active:scale-95
                  flex items-center justify-center gap-2
                  ${status === GenerationStatus.LOADING 
                    ? 'bg-mm-purple/40 cursor-not-allowed opacity-50' 
                    : 'bg-gradient-to-r from-mm-purple to-mm-deep hover:from-mm-magenta hover:to-mm-purple shadow-lg hover:shadow-purple-500/25'}
                `}
              >
                {status === GenerationStatus.LOADING ? (
                  <>
                    <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                    Generating...
                  </>
                ) : 'Create Character'}
              </button>
            </div>
          )}
        </div>

        {/* Right Side - Preview */}
        <div className="lg:w-2/3 flex flex-col">
          <h3 className="text-lg font-bold text-mm-deep flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-mm-magenta"></span>
            Preview
          </h3>
          <div className="flex-1 bg-white/80 rounded-xl border-2 border-dashed border-mm-purple/30 flex items-center justify-center relative overflow-hidden">
            
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{backgroundImage: 'linear-gradient(#c084fc 1px, transparent 1px), linear-gradient(90deg, #c084fc 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
            </div>

            {activeTab === 'CHOOSE' ? (
              /* Choose Tab Preview */
              selectedMonkey ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 z-10">
                  <div className="relative group hover:scale-[1.02] transition-transform duration-300 w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-mm-purple to-mm-pink opacity-10 blur-2xl rounded-2xl"></div>
                    <img 
                      src={monkeyThumbnails[selectedMonkey.id] || selectedMonkey.spriteSheet} 
                      alt={selectedMonkey.name}
                      className="relative max-w-full max-h-[80%] object-contain drop-shadow-2xl"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="absolute bottom-6 left-0 right-0 text-center">
                    <p className="text-mm-deep font-bold text-xl">{selectedMonkey.name}</p>
                    <p className="text-mm-deep/50 text-sm font-mono mt-1">FRONT VIEW</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 opacity-50 z-10">
                  <div className="w-20 h-20 mx-auto border-4 border-mm-purple/40 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl">👈</span>
                  </div>
                  <p className="text-mm-deep/60 font-mono uppercase tracking-widest">
                    {hasNoMonkeys ? 'Create a Monkey First' : 'Select a Monkey'}
                  </p>
                </div>
              )
            ) : (
              /* Create Tab Preview */
              <>
                {status === GenerationStatus.IDLE && (
                  <div className="text-center p-8 opacity-50 z-10">
                    <div className="w-20 h-20 mx-auto border-4 border-mm-purple/40 rounded-full flex items-center justify-center mb-4">
                      <span className="text-4xl">✨</span>
                    </div>
                    <p className="text-mm-deep/60 font-mono uppercase tracking-widest">Generate to Preview</p>
                  </div>
                )}

                {status === GenerationStatus.LOADING && (
                  <div className="z-10 text-center">
                    <Spinner />
                    <p className="mt-6 text-mm-pink font-mono text-sm animate-pulse">
                      Rasterizing Textures...
                    </p>
                  </div>
                )}

                {status === GenerationStatus.ERROR && error && (
                  <div className="text-center p-8 max-w-md z-10">
                    <div className="w-12 h-12 mx-auto bg-pink-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-mm-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-mm-deep font-bold mb-2">Glitch Detected</h3>
                    <p className="text-mm-pink text-sm font-mono">{error.message}</p>
                  </div>
                )}

                {status === GenerationStatus.SUCCESS && generatedImage && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6 z-10">
                    <div className="relative group hover:scale-[1.02] transition-transform duration-300 w-full h-full flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-r from-mm-purple to-mm-pink opacity-10 blur-2xl rounded-2xl"></div>
                      <img 
                        src={generatedImage} 
                        alt="Generated Sprite Sheet" 
                        className="relative max-w-full max-h-full object-contain drop-shadow-2xl bg-white rounded-lg"
                        style={{imageRendering: 'pixelated'}}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
