import { Player, Match, EloUpdate } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth
export async function login(
  playerId: string,
  pin: string
): Promise<Player | null> {
  try {
    const { player } = await fetchApi<{ player: Player }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ playerId, pin }),
    });
    return player;
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
}

export async function register(
  name: string,
  pin: string
): Promise<Player> {
  const { player } = await fetchApi<{ player: Player }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, pin }),
  });
  return player;
}

// Players
export async function getPlayers(): Promise<Player[]> {
  const { players } = await fetchApi<{ players: Player[] }>('/players');
  return players;
}

// Matches
export async function getMatches(): Promise<Match[]> {
  const { matches } = await fetchApi<{ matches: Match[] }>('/matches');
  return matches;
}

export async function createMatch(
  match: Omit<Match, 'id'>
): Promise<Match> {
  const { match: created } = await fetchApi<{ match: Match }>('/matches', {
    method: 'POST',
    body: JSON.stringify(match),
  });
  return created;
}

export async function approveMatch(
  matchId: string
): Promise<{ match: Match; players: Player[]; eloUpdates: EloUpdate[] }> {
  return fetchApi<{ match: Match; players: Player[]; eloUpdates: EloUpdate[] }>(
    `/matches/${matchId}/approve`,
    { method: 'PATCH' }
  );
}

export async function rejectMatch(matchId: string): Promise<Match> {
  const { match } = await fetchApi<{ match: Match }>(`/matches/${matchId}/reject`, {
    method: 'PATCH',
  });
  return match;
}

// Health check
export async function checkHealth(): Promise<boolean> {
  try {
    await fetchApi<{ status: string }>('/health');
    return true;
  } catch {
    return false;
  }
}
