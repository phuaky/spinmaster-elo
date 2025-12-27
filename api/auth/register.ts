import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayers, createPlayer } from '../_lib/sheets';
import { hashPin } from '../_lib/auth';

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
    const { name, pin } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ error: 'Name and PIN required' });
    }

    if (pin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits' });
    }

    const existingPlayers = await getPlayers();
    if (existingPlayers.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Name already taken' });
    }

    const { hash, salt } = hashPin(pin);
    const player = await createPlayer(name, hash, salt);
    res.json({ player });
  } catch (error: any) {
    console.error('Register error:', error?.message || error);
    res.status(500).json({ error: 'Registration failed' });
  }
}
