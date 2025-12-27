import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMatches, createMatch } from '../lib/sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const matches = await getMatches();
      return res.json({ matches });
    }

    if (req.method === 'POST') {
      const match = await createMatch(req.body);
      return res.json({ match });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Matches error:', error?.message || error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}
