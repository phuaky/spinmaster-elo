import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
        range: 'Matches!A:K',
      });
      const rows = response.data.values || [];
      const matches = rows.slice(1).map((row: string[]) => ({
        id: row[0] || '',
        date: row[1] || '',
        type: row[2] || 'SINGLES',
        teamAIds: JSON.parse(row[3] || '[]'),
        teamBIds: JSON.parse(row[4] || '[]'),
        sets: JSON.parse(row[5] || '[]'),
        winnerTeam: row[6] || null,
        status: row[7] || 'PENDING',
        format: Number(row[8]) || 3,
        submittedBy: row[9] || '',
        aiCommentary: row[10] || undefined,
      }));
      return res.json({ matches });
    }

    if (req.method === 'POST') {
      const match = req.body;
      const id = Date.now().toString();
      const row = [
        id,
        match.date,
        match.type,
        JSON.stringify(match.teamAIds),
        JSON.stringify(match.teamBIds),
        JSON.stringify(match.sets),
        match.winnerTeam || '',
        match.status,
        match.format,
        match.submittedBy,
        match.aiCommentary || '',
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
        range: 'Matches!A:K',
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
      return res.json({ match: { ...match, id } });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Matches error:', error?.message || error);
    res.status(500).json({ error: 'Failed to process request', details: error?.message });
  }
}
