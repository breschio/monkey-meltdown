// Monkey Storage Service - handles saving/loading monkeys to localStorage

export interface SavedMonkey {
  id: string;
  name: string;
  spriteSheet: string;  // base64 data URL for the full 4-frame sheet
  createdAt: number;
  isPreset?: boolean;
}

const STORAGE_KEY = 'monkey-meltdown-saved-monkeys';

// Preset monkeys that ship with the game
// These will be populated with actual sprite sheets later
const PRESET_MONKEYS: SavedMonkey[] = [
  // Placeholder - will be replaced with actual pre-made sprites
  // { id: 'preset-1', name: 'Classic Chimp', spriteSheet: '/monkeys/classic-chimp.png', createdAt: 0, isPreset: true },
];

/**
 * Get all preset monkeys (static, ship with game)
 */
export const getPresetMonkeys = (): SavedMonkey[] => {
  return PRESET_MONKEYS;
};

/**
 * Get all user-saved monkeys from localStorage
 */
export const getSavedMonkeys = (): SavedMonkey[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedMonkey[];
  } catch (error) {
    console.error('Error loading saved monkeys:', error);
    return [];
  }
};

/**
 * Get all monkeys (presets + user-saved)
 */
export const getAllMonkeys = (): SavedMonkey[] => {
  const presets = getPresetMonkeys();
  const saved = getSavedMonkeys();
  return [...presets, ...saved];
};

/**
 * Save a new monkey to localStorage
 */
export const saveMonkey = (name: string, spriteSheet: string): SavedMonkey => {
  const newMonkey: SavedMonkey = {
    id: `monkey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    spriteSheet,
    createdAt: Date.now(),
    isPreset: false,
  };

  const existing = getSavedMonkeys();
  const updated = [...existing, newMonkey];
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving monkey:', error);
    // localStorage might be full - try to handle gracefully
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Remove oldest non-preset monkey to make room
      const sorted = existing.sort((a, b) => a.createdAt - b.createdAt);
      if (sorted.length > 0) {
        const trimmed = sorted.slice(1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...trimmed, newMonkey]));
      }
    }
  }

  return newMonkey;
};

/**
 * Delete a monkey from localStorage (can't delete presets)
 */
export const deleteMonkey = (id: string): boolean => {
  const existing = getSavedMonkeys();
  const monkey = existing.find(m => m.id === id);
  
  if (!monkey || monkey.isPreset) {
    return false;
  }

  const updated = existing.filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return true;
};

/**
 * Get a specific monkey by ID
 */
export const getMonkeyById = (id: string): SavedMonkey | undefined => {
  return getAllMonkeys().find(m => m.id === id);
};

/**
 * Extract the front view from a sprite sheet (first 1/4 of width)
 * Returns a promise that resolves to a base64 data URL of just the front frame
 */
export const extractFrontView = (spriteSheet: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const frameWidth = img.width / 4; // 4 frames: Front, Back, Back-Left, Back-Right
      const frameHeight = img.height;
      
      // Crop to focus on head - skip empty space at top, cut off at chest
      // Start at 8% from top (skip empty space above head)
      // Take 45% of height (head + upper chest area)
      const cropStartY = Math.floor(frameHeight * 0.08);
      const cropHeight = Math.floor(frameHeight * 0.45);
      
      canvas.width = frameWidth;
      canvas.height = cropHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(spriteSheet); // Fallback to full sheet
        return;
      }
      
      // Draw only the first frame (front view), cropped to head area
      ctx.drawImage(
        img, 
        0, cropStartY, frameWidth, cropHeight,  // Source: head portion of first frame
        0, 0, frameWidth, cropHeight            // Destination: full canvas
      );
      
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => {
      resolve(spriteSheet); // Fallback to full sheet
    };
    
    img.src = spriteSheet;
  });
};

/**
 * Clear all user-saved monkeys (keeps presets)
 */
export const clearSavedMonkeys = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

