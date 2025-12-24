import React from 'react';
import { SessionScore, formatScore } from '../services/sessionLeaderboardService';

interface LeaderboardProps {
  scores: SessionScore[];
  currentScoreId: string | null;
  currentMonkeyName: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  scores,
  currentScoreId,
  currentMonkeyName,
}) => {
  if (scores.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-md">
      <h3 className="text-white/80 text-sm font-mono uppercase tracking-wider mb-3 text-center">
        Session Leaderboard
      </h3>
      
      <div className="bg-white/10 rounded-xl border border-white/20 overflow-hidden backdrop-blur-sm">
        {scores.map((score, index) => {
          const isCurrentScore = score.id === currentScoreId;
          const rank = index + 1;
          
          // Rank styling
          let rankIcon = '';
          let rankClass = 'text-white/50';
          
          if (rank === 1) {
            rankIcon = '🥇';
            rankClass = 'text-yellow-400';
          } else if (rank === 2) {
            rankIcon = '🥈';
            rankClass = 'text-gray-300';
          } else if (rank === 3) {
            rankIcon = '🥉';
            rankClass = 'text-amber-600';
          }

          return (
            <div
              key={score.id}
              className={`
                flex items-center gap-3 px-4 py-3 border-b border-white/10 last:border-b-0
                transition-all duration-300
                ${isCurrentScore 
                  ? 'bg-mm-yellow/20 border-l-4 border-l-mm-yellow' 
                  : 'hover:bg-white/5'}
              `}
            >
              {/* Rank */}
              <div className={`w-8 text-center font-bold ${rankClass}`}>
                {rankIcon || `#${rank}`}
              </div>
              
              {/* Monkey Avatar (if sprite exists) */}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                {score.monkeySprite ? (
                  <img 
                    src={score.monkeySprite} 
                    alt={score.monkeyName}
                    className="w-full h-full object-contain scale-125"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span className="text-2xl">🐒</span>
                )}
              </div>
              
              {/* Name & Level */}
              <div className="flex-1 min-w-0">
                <div className={`font-bold truncate ${isCurrentScore ? 'text-mm-yellow' : 'text-white'}`}>
                  {score.monkeyName}
                  {isCurrentScore && (
                    <span className="ml-2 text-xs bg-mm-yellow/30 text-mm-yellow px-2 py-0.5 rounded-full">
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/50 font-mono">
                  Level {score.level}
                </div>
              </div>
              
              {/* Score */}
              <div className={`text-right font-mono font-bold ${isCurrentScore ? 'text-mm-yellow' : 'text-white'}`}>
                {formatScore(score.score)}
              </div>
            </div>
          );
        })}
      </div>
      
      {scores.length > 5 && (
        <p className="text-white/40 text-xs text-center mt-2 font-mono">
          Showing top 5 of {scores.length} runs
        </p>
      )}
    </div>
  );
};

