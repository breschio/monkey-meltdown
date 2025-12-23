import React, { useState, useCallback } from 'react';
import { generateCharacterSprite } from '../services/geminiService';
import { GenerationStatus, AppError } from '../types';
import { Spinner } from './Spinner';

interface CharacterGeneratorProps {
  onSpriteGenerated: (url: string) => void;
  onPlayGame: () => void;
}

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
      // We use a slightly lower threshold to catch anti-aliased edges near white
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Threshold for white (adjust as needed)
        // If it's very bright, make it transparent
        if (r > 235 && g > 235 && b > 235) {
          data[i + 3] = 0; // Set alpha to 0
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
        console.error("Error processing image", err);
        resolve(base64Image); // Fallback to original if processing fails
    };
    img.src = base64Image;
  });
};

export const CharacterGenerator: React.FC<CharacterGeneratorProps> = ({ onSpriteGenerated, onPlayGame }) => {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setStatus(GenerationStatus.LOADING);
    setError(null);
    setGeneratedImage(null); // Clear previous
    
    try {
      const rawImageUrl = await generateCharacterSprite(prompt);
      
      // Process the image to remove background
      const processedImageUrl = await removeBackground(rawImageUrl);
      
      setGeneratedImage(processedImageUrl);
      onSpriteGenerated(processedImageUrl);
      setStatus(GenerationStatus.SUCCESS);
    } catch (err: any) {
      setStatus(GenerationStatus.ERROR);
      setError({ message: err.message || "Unknown error occurred" });
    }
  }, [prompt, onSpriteGenerated]);

  return (
    <div className="w-full mx-auto p-6 bg-white/60 backdrop-blur-sm rounded-xl shadow-2xl shadow-purple-500/10 border border-mm-purple/20 flex flex-col gap-8">
      
      {/* Top Section: Output Preview */}
      <div className="w-full bg-white/80 rounded-xl border-2 border-dashed border-mm-purple/30 flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden group">
        
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{backgroundImage: 'linear-gradient(#c084fc 1px, transparent 1px), linear-gradient(90deg, #c084fc 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        </div>

        {status === GenerationStatus.IDLE && (
          <div className="text-center p-8 opacity-50">
             <div className="w-20 h-20 mx-auto border-4 border-mm-purple/40 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">?</span>
             </div>
             <p className="text-mm-deep/60 font-mono uppercase tracking-widest">Waiting for Input</p>
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
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <div className="relative group-hover:scale-105 transition-transform duration-300 mb-4 w-full max-w-5xl">
               <div className="absolute -inset-4 bg-gradient-to-r from-mm-purple to-mm-pink opacity-20 blur-xl rounded-full"></div>
               {/* Displaying the full sheet */}
               <img 
                  src={generatedImage} 
                  alt="Generated Sprite Sheet" 
                  className="relative w-full object-contain drop-shadow-2xl bg-white rounded"
                  style={{imageRendering: 'pixelated'}}
               />
            </div>
            
            <div className="flex gap-6 md:gap-12 text-xs font-mono text-mm-deep/50 uppercase tracking-widest justify-center w-full border-t border-mm-purple/20 pt-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-mm-deep">Front</span>
                <span className="w-2 h-2 bg-mm-pink rounded-full"></span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-mm-deep/60">Back</span>
                <span className="w-2 h-2 bg-mm-purple/50 rounded-full"></span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-mm-deep/60">Back-Left</span>
                <span className="w-2 h-2 bg-mm-purple/50 rounded-full"></span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-mm-deep/60">Back-Right</span>
                <span className="w-2 h-2 bg-mm-purple/50 rounded-full"></span>
              </div>
            </div>

            <div className="absolute bottom-4 right-4 flex gap-2">
               <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedImage;
                    link.download = 'monkey-meltdown-sprite.png';
                    link.click();
                  }}
                  className="p-2 bg-white/80 rounded hover:bg-white text-mm-deep text-xs font-mono border border-mm-purple/30"
               >
                  SAVE SHEET
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Controls */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-mm-deep flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-mm-pink"></span>
            <span className="w-3 h-3 rounded-full bg-mm-purple"></span>
            <span className="w-3 h-3 rounded-full bg-mm-magenta"></span>
            Character Prompt
          </h2>
        </div>
        
        <div className="bg-white/80 p-4 rounded-lg border border-mm-purple/30 focus-within:border-mm-pink transition-colors mb-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-transparent text-mm-deep placeholder-mm-deep/40 resize-none outline-none text-lg font-mono h-24"
            placeholder="Describe your character..."
          />
          <div className="text-right mt-2 text-xs text-mm-deep/50 font-mono">
             POWERED BY GEMINI 2.5
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={handleGenerate}
            disabled={status === GenerationStatus.LOADING || !prompt.trim()}
            className={`
              flex-1 px-8 py-4 rounded-xl font-bold text-white uppercase tracking-wider transition-all transform active:scale-95
              flex items-center justify-center gap-2
              ${status === GenerationStatus.LOADING 
                ? 'bg-mm-purple/40 cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-mm-purple to-mm-deep hover:from-mm-magenta hover:to-mm-purple shadow-lg hover:shadow-purple-500/25'}
            `}
          >
            {status === GenerationStatus.LOADING ? (
              <>
                 <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                 Rendering Polygons...
              </>
            ) : 'Generate Sprite Sheet'}
          </button>

          {status === GenerationStatus.SUCCESS && generatedImage && (
             <button
                onClick={onPlayGame}
                className="flex-1 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-mm-pink to-mm-magenta hover:from-mm-magenta hover:to-mm-pink uppercase tracking-wider transition-all transform active:scale-95 shadow-lg hover:shadow-pink-500/25 animate-pulse-fast"
             >
                Play With This Character &rarr;
             </button>
          )}
        </div>
      </div>

    </div>
  );
};