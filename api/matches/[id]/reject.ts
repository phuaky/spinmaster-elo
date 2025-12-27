import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateMatchStatus } from '../../lib/sheets';

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

    const match = await updateMatchStatus(matchId!, 'REJECTED');

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ match });
  } catch (error: any) {
    console.error('Reject match error:', error?.message || error);
    res.status(500).json({ error: 'Failed to reject match' });
  }
}
