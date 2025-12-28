import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'Players!A:I',
    });

    const rows = response.data.values || [];
    const players = rows.slice(1).map((row: string[]) => ({
      id: row[0] || '',
      name: row[1] || '',
      elo: Number(row[2]) || 1200,
      wins: Number(row[3]) || 0,
      losses: Number(row[4]) || 0,
      avatar: row[5] || '',
    }));

    res.json({ players, sheetsId: process.env.GOOGLE_SHEETS_ID });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed',
      details: error?.message,
      sheetsId: process.env.GOOGLE_SHEETS_ID,
    });
  }
}
