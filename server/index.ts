import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  initSheets,
  getPlayers,
  createPlayer,
  verifyPlayerPin,
  getMatches,
  createMatch,
  updateMatchStatus,
  batchUpdatePlayers,
  Player,
  Match,
} from './sheetsService.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ELO calculation (same logic as client)
const K_FACTOR = 32;

function calculateEloChange(
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

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { playerId, pin } = req.body;
    if (!playerId || !pin) {
      return res.status(400).json({ error: 'Player ID and PIN required' });
    }

    const player = await verifyPlayerPin(playerId, pin);
    if (!player) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    res.json({ player });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ error: 'Name and PIN required' });
    }

    if (pin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits' });
    }

    // Check if name already exists
    const existingPlayers = await getPlayers();
    if (existingPlayers.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Name already taken' });
    }

    const player = await createPlayer(name, pin);
    res.json({ player });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Player routes
app.get('/api/players', async (req, res) => {
  try {
    const players = await getPlayers();
    res.json({ players });
  } catch (error: any) {
    console.error('Get players error:', error?.message || error);
    console.error('Stack:', error?.stack);
    res.status(500).json({ error: 'Failed to fetch players', details: error?.message });
  }
});

// Match routes
app.get('/api/matches', async (req, res) => {
  try {
    const matches = await getMatches();
    res.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

app.post('/api/matches', async (req, res) => {
  try {
    const matchData = req.body;
    const match = await createMatch(matchData);
    res.json({ match });
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

app.patch('/api/matches/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    // Get current data
    const [matches, players] = await Promise.all([getMatches(), getPlayers()]);
    const match = matches.find((m) => m.id === id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'PENDING') {
      return res.status(400).json({ error: 'Match already processed' });
    }

    if (!match.winnerTeam) {
      return res.status(400).json({ error: 'Match has no winner' });
    }

    // Calculate ELO changes
    const eloUpdates = calculateEloChange(
      match.teamAIds,
      match.teamBIds,
      match.winnerTeam,
      players
    );

    // Prepare player updates
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

    // Update match status and players in parallel
    await Promise.all([
      updateMatchStatus(id, 'APPROVED'),
      batchUpdatePlayers(playerUpdates),
    ]);

    // Get updated data
    const [updatedMatch, updatedPlayers] = await Promise.all([
      getMatches().then((m) => m.find((x) => x.id === id)),
      getPlayers(),
    ]);

    res.json({ match: updatedMatch, players: updatedPlayers, eloUpdates });
  } catch (error) {
    console.error('Approve match error:', error);
    res.status(500).json({ error: 'Failed to approve match' });
  }
});

app.patch('/api/matches/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const match = await updateMatchStatus(id, 'REJECTED');

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ match });
  } catch (error) {
    console.error('Reject match error:', error);
    res.status(500).json({ error: 'Failed to reject match' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize and start
async function start() {
  try {
    await initSheets();
    console.log('Google Sheets connected');

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Keep process alive
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down...');
      server.close(() => process.exit(0));
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
