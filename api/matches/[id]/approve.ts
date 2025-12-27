import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMatches, getPlayers, updateMatchStatus, batchUpdatePlayers } from '../../_lib/sheets';
import { calculateEloChange } from '../../_lib/elo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const matchId = Array.isArray(id) ? id[0] : id;

    const [matches, players] = await Promise.all([getMatches(), getPlayers()]);
    const match = matches.find((m) => m.id === matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'PENDING') {
      return res.status(400).json({ error: 'Match already processed' });
    }

    if (!match.winnerTeam) {
      return res.status(400).json({ error: 'Match has no winner' });
    }

    const eloUpdates = calculateEloChange(
      match.teamAIds,
      match.teamBIds,
      match.winnerTeam,
      players
    );

    const playerUpdates = eloUpdates.map((update) => {
      const player = players.find((p) => p.id === update.playerId)!;
      const isWinner =
        (match.winnerTeam === 'A' && match.teamAIds.includes(update.playerId)) ||
        (match.winnerTeam === 'B' && match.teamBIds.includes(update.playerId));

      return {
        id: update.playerId,
        elo: update.newElo,
        wins: player.wins + (isWinner ? 1 : 0),
        losses: player.losses + (isWinner ? 0 : 1),
      };
    });

    await Promise.all([
      updateMatchStatus(matchId!, 'APPROVED'),
      batchUpdatePlayers(playerUpdates),
    ]);

    const [updatedMatch, updatedPlayers] = await Promise.all([
      getMatches().then((m) => m.find((x) => x.id === matchId)),
      getPlayers(),
    ]);

    res.json({ match: updatedMatch, players: updatedPlayers, eloUpdates });
  } catch (error: any) {
    console.error('Approve match error:', error?.message || error);
    res.status(500).json({ error: 'Failed to approve match' });
  }
}
