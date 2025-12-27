import { Player, Match, EloUpdate } from '../types';

const K_FACTOR = 32;

export const calculateEloChange = (
  teamAIds: string[],
  teamBIds: string[],
  winner: 'A' | 'B',
  allPlayers: Player[]
): EloUpdate[] => {
  // Helper to get average ELO of a team
  const getTeamElo = (ids: string[]) => {
    const players = ids.map(id => allPlayers.find(p => p.id === id)).filter(Boolean) as Player[];
    if (players.length === 0) return 1200; // Default fallback
    const total = players.reduce((sum, p) => sum + p.elo, 0);
    return total / players.length;
  };

  const ratingA = getTeamElo(teamAIds);
  const ratingB = getTeamElo(teamBIds);

  // Expected score for Team A
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  const actualA = winner === 'A' ? 1 : 0;
  const actualB = winner === 'B' ? 1 : 0;

  const ratingChangeA = Math.round(K_FACTOR * (actualA - expectedA));
  const ratingChangeB = Math.round(K_FACTOR * (actualB - expectedB));

  const updates: EloUpdate[] = [];

  // Apply changes to Team A players
  teamAIds.forEach(id => {
    const player = allPlayers.find(p => p.id === id);
    if (player) {
      updates.push({
        playerId: id,
        previousElo: player.elo,
        newElo: player.elo + ratingChangeA
      });
    }
  });

  // Apply changes to Team B players
  teamBIds.forEach(id => {
    const player = allPlayers.find(p => p.id === id);
    if (player) {
      updates.push({
        playerId: id,
        previousElo: player.elo,
        newElo: player.elo + ratingChangeB
      });
    }
  });

  return updates;
};