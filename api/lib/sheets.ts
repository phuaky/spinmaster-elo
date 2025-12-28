import { google, sheets_v4 } from 'googleapis';

// Types
export interface Player {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  avatar: string;
}

export interface PlayerWithAuth extends Player {
  pinHash: string;
  salt: string;
}

export interface Match {
  id: string;
  date: string;
  type: 'SINGLES' | 'DOUBLES';
  teamAIds: string[];
  teamBIds: string[];
  sets: { teamAScore: number; teamBScore: number }[];
  winnerTeam: 'A' | 'B' | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  format: 1 | 3 | 5 | 7;
  submittedBy: string;
  aiCommentary?: string;
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const PLAYERS_RANGE = 'Players!A:I';
const MATCHES_RANGE = 'Matches!A:K';

let sheets: sheets_v4.Sheets | null = null;

export async function getSheets(): Promise<sheets_v4.Sheets> {
  if (sheets) return sheets;

  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// Helper functions
function rowToPlayer(row: string[]): Player {
  return {
    id: row[0] || '',
    name: row[1] || '',
    elo: Number(row[2]) || 1200,
    wins: Number(row[3]) || 0,
    losses: Number(row[4]) || 0,
    avatar: row[5] || '',
  };
}

function rowToPlayerWithAuth(row: string[]): PlayerWithAuth {
  return {
    ...rowToPlayer(row),
    pinHash: row[6] || '',
    salt: row[7] || '',
  };
}

function rowToMatch(row: string[]): Match {
  return {
    id: row[0] || '',
    date: row[1] || '',
    type: (row[2] as 'SINGLES' | 'DOUBLES') || 'SINGLES',
    teamAIds: JSON.parse(row[3] || '[]'),
    teamBIds: JSON.parse(row[4] || '[]'),
    sets: JSON.parse(row[5] || '[]'),
    winnerTeam: row[6] ? (row[6] as 'A' | 'B') : null,
    status: (row[7] as 'PENDING' | 'APPROVED' | 'REJECTED') || 'PENDING',
    format: (Number(row[8]) as 1 | 3 | 5 | 7) || 3,
    submittedBy: row[9] || '',
    aiCommentary: row[10] || undefined,
  };
}

// Player operations
export async function getPlayers(): Promise<Player[]> {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: PLAYERS_RANGE,
  });

  const rows = response.data.values || [];
  return rows.slice(1).map(rowToPlayer);
}

export async function getPlayerWithAuth(playerId: string): Promise<PlayerWithAuth | null> {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: PLAYERS_RANGE,
  });

  const rows = response.data.values || [];
  const row = rows.slice(1).find((r) => r[0] === playerId);
  if (!row) return null;

  return rowToPlayerWithAuth(row);
}

export async function createPlayer(name: string, pinHash: string, salt: string): Promise<Player> {
  const sheets = await getSheets();
  const id = Date.now().toString();
  const avatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
  const now = new Date().toISOString();

  const row = [id, name, 1200, 0, 0, avatar, pinHash, salt, now];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Players!A:I',
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { id, name, elo: 1200, wins: 0, losses: 0, avatar };
}

export async function batchUpdatePlayers(
  updates: Array<{ id: string; elo: number; wins: number; losses: number }>
): Promise<void> {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: PLAYERS_RANGE,
  });

  const rows = response.data.values || [];
  const data: sheets_v4.Schema$ValueRange[] = [];

  for (const update of updates) {
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === update.id);
    if (rowIndex === -1) continue;

    const row = rows[rowIndex];
    row[2] = update.elo;
    row[3] = update.wins;
    row[4] = update.losses;
    row[8] = new Date().toISOString();

    data.push({
      range: `Players!A${rowIndex + 1}:I${rowIndex + 1}`,
      values: [row],
    });
  }

  if (data.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: 'RAW', data },
    });
  }
}

// Match operations
export async function getMatches(): Promise<Match[]> {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: MATCHES_RANGE,
  });

  const rows = response.data.values || [];
  return rows.slice(1).map(rowToMatch);
}

export async function createMatch(match: Omit<Match, 'id'>): Promise<Match> {
  const sheets = await getSheets();
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
    spreadsheetId: SPREADSHEET_ID,
    range: 'Matches!A:K',
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { ...match, id };
}

export async function updateMatchStatus(
  matchId: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<Match | null> {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: MATCHES_RANGE,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === matchId);
  if (rowIndex === -1) return null;

  const row = rows[rowIndex];
  row[7] = status;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Matches!A${rowIndex + 1}:K${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return rowToMatch(row);
}
