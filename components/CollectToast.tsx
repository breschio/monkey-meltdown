import React, { useEffect, useState } from 'react';

export interface ToastItem {
  id: string;
  type: 'banana' | 'mango' | 'spaghetti' | 'pizza';
  points: number;
}

interface CollectToastProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const TOAST_CONFIG = {
  banana: {
    emoji: '🍌',
    label: 'BANANA',
    bgClass: 'from-yellow-400 to-yellow-500',
    textClass: 'text-yellow-900',
  },
  mango: {
    emoji: '🥭',
    label: 'MANGO',
    bgClass: 'from-orange-400 to-amber-500',
    textClass: 'text-orange-900',
    extraLabel: '✨ INVINCIBLE!',
  },
  spaghetti: {
    emoji: '🍝',
    label: 'SPAGHETTI',
    bgClass: 'from-red-400 to-orange-400',
    textClass: 'text-red-900',
    extraLabel: '🔥 MEGA BONUS!',
  },
  pizza: {
    emoji: '🍕',
    label: 'PIZZA',
    bgClass: 'from-red-500 to-red-600',
    textClass: 'text-white',
    extraLabel: '💀 OUCH!',
  },
};

const SingleToast: React.FC<{ 
  toast: ToastItem; 
  onRemove: (id: string) => void;
  index: number;
}> = ({ toast, onRemove, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  const config = TOAST_CONFIG[toast.type];
  const isNegative = toast.points < 0;

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
    
    // Start exit animation
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1200);
    
    // Remove from DOM
    const removeTimer = setTimeout(() => {
      onRemove(toast.id);
    }, 1500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg
        bg-gradient-to-r ${config.bgClass}
        transform transition-all duration-200 ease-out
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : isExiting 
            ? 'translate-x-8 opacity-0 scale-90' 
            : 'translate-x-full opacity-0 scale-75'}
      `}
      style={{
        marginBottom: '8px',
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Emoji with bounce */}
      <span 
        className="text-2xl animate-bounce"
        style={{ animationDuration: '0.4s', animationIterationCount: '2' }}
      >
        {config.emoji}
      </span>
      
      {/* Text content */}
      <div className="flex flex-col items-start">
        <span className={`text-xs font-bold uppercase tracking-wide ${config.textClass} opacity-80`}>
          {config.label}
        </span>
        <span className={`text-lg font-black ${config.textClass} tabular-nums leading-tight`}>
          {isNegative ? '' : '+'}{toast.points.toLocaleString()}
        </span>
      </div>
      
      {/* Extra label for special items */}
      {config.extraLabel && (
        <span className={`text-xs font-bold ${config.textClass} ml-1 animate-pulse`}>
          {config.extraLabel}
        </span>
      )}
    </div>
  );
};

export const CollectToast: React.FC<CollectToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col-reverse items-end pointer-events-none">
      {toasts.map((toast, index) => (
        <SingleToast 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemove}
          index={index}
        />
      ))}
    </div>
  );
};

