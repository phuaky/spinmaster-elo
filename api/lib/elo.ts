import type { Player } from './sheets';

const K_FACTOR = 32;

export function calculateEloChange(
  teamAIds: string[],
  teamBIds: string[],
  winner: 'A' | 'B',
  allPlayers: Player[]
): Array<{ playerId: string; previousElo: number; newElo: number }> {
  const getTeamElo = (ids: string[]) => {
    const players = ids.map((id) => allPlayers.find((p) => p.id === id)).filter(Boolean) as Player[];
    if (players.length === 0) return 1200;
    return players.reduce((sum, p) => sum + p.elo, 0) / players.length;
  };

  const ratingA = getTeamElo(teamAIds);
  const ratingB = getTeamElo(teamBIds);

  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  const actualA = winner === 'A' ? 1 : 0;
  const actualB = winner === 'B' ? 1 : 0;

  const ratingChangeA = Math.round(K_FACTOR * (actualA - expectedA));
  const ratingChangeB = Math.round(K_FACTOR * (actualB - expectedB));

  const updates: Array<{ playerId: string; previousElo: number; newElo: number }> = [];

  teamAIds.forEach((id) => {
    const player = allPlayers.find((p) => p.id === id);
    if (player) {
      updates.push({
        playerId: id,
        previousElo: player.elo,
        newElo: player.elo + ratingChangeA,
      });
    }
  });

  teamBIds.forEach((id) => {
    const player = allPlayers.find((p) => p.id === id);
    if (player) {
      updates.push({
        playerId: id,
        previousElo: player.elo,
        newElo: player.elo + ratingChangeB,
      });
    }
  });

  return updates;
}
