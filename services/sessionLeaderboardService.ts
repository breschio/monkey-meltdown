// Session Leaderboard Service - tracks scores within current browser session only
// No localStorage - resets when page refreshes

export interface SessionScore {
  id: string;
  monkeyName: string;
  monkeySprite: string | null;
  score: number;
  level: number;
  timestamp: number;
}

// In-memory storage for session scores
let sessionScores: SessionScore[] = [];

/**
 * Add a score to the session leaderboard
 */
export const addSessionScore = (
  monkeyName: string,
  monkeySprite: string | null,
  score: number,
  level: number
): SessionScore => {
  const newScore: SessionScore = {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    monkeyName,
    monkeySprite,
    score,
    level,
    timestamp: Date.now(),
  };

  sessionScores.push(newScore);
  return newScore;
};

/**
 * Get all session scores, sorted by score (highest first)
 */
export const getSessionLeaderboard = (): SessionScore[] => {
  return [...sessionScores].sort((a, b) => b.score - a.score);
};

/**
 * Get the top N scores from the session
 */
export const getTopSessionScores = (limit: number = 5): SessionScore[] => {
  return getSessionLeaderboard().slice(0, limit);
};

/**
 * Get the current monkey's scores from this session
 */
export const getMonkeyScores = (monkeyName: string): SessionScore[] => {
  return sessionScores
    .filter(s => s.monkeyName === monkeyName)
    .sort((a, b) => b.score - a.score);
};

/**
 * Get the rank of a specific score in the session leaderboard
 */
export const getScoreRank = (scoreId: string): number => {
  const sorted = getSessionLeaderboard();
  const index = sorted.findIndex(s => s.id === scoreId);
  return index === -1 ? sorted.length + 1 : index + 1;
};

/**
 * Clear all session scores (useful for testing)
 */
export const clearSessionScores = (): void => {
  sessionScores = [];
};

/**
 * Get total number of scores in the session
 */
export const getSessionScoreCount = (): number => {
  return sessionScores.length;
};

/**
 * Format score for display (e.g., 1234567 -> "1,234,567")
 */
export const formatScore = (score: number): string => {
  return score.toLocaleString();
};

