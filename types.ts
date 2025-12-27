export interface Player {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  avatar: string;
  pin?: string; // Only used for legacy localStorage, never returned from API
}

export type MatchType = 'SINGLES' | 'DOUBLES';
export type MatchStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type BestOf = 1 | 3 | 5 | 7;

export interface MatchSet {
  teamAScore: number;
  teamBScore: number;
}

export interface Match {
  id: string;
  date: string; // ISO string
  type: MatchType;
  teamAIds: string[];
  teamBIds: string[];
  sets: MatchSet[];
  winnerTeam: 'A' | 'B' | null;
  status: MatchStatus;
  format: BestOf;
  submittedBy: string;
  aiCommentary?: string;
}

export interface EloUpdate {
  playerId: string;
  previousElo: number;
  newElo: number;
}