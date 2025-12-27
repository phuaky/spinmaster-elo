import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayerWithAuth } from '../lib/sheets';
import { verifyPin } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId, pin } = req.body;
    if (!playerId || !pin) {
      return res.status(400).json({ error: 'Player ID and PIN required' });
    }

    const player = await getPlayerWithAuth(playerId);
    if (!player) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!verifyPin(pin, player.pinHash, player.salt)) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    res.json({
      player: {
        id: player.id,
        name: player.name,
        elo: player.elo,
        wins: player.wins,
        losses: player.losses,
        avatar: player.avatar,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
    res.status(500).json({ error: 'Login failed' });
  }
}
