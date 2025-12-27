import React, { useState, useEffect } from 'react';
import { Player, Match, MatchType, MatchSet, BestOf } from './types';
import { Leaderboard } from './components/Leaderboard';
import { MatchLogger } from './components/MatchLogger';
import { Button } from './components/Button';
import { Auth } from './components/Auth';
import * as api from './services/apiService';

// Persist current user ID in localStorage (lightweight session)
const useStickyState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
};

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentUserId, setCurrentUserId] = useStickyState<string>('sm_user', '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from API on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [playersData, matchesData] = await Promise.all([
          api.getPlayers(),
          api.getMatches(),
        ]);
        setPlayers(playersData);
        setMatches(matchesData);
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to connect to server. Please ensure the server is running.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);
  
  const [view, setView] = useState<'LEADERBOARD' | 'NEW_MATCH' | 'PENDING'>('LEADERBOARD');

  const currentUser = players.find(p => p.id === currentUserId);
  const pendingMatches = matches.filter(m => m.status === 'PENDING' && (m.teamAIds.includes(currentUserId) || m.teamBIds.includes(currentUserId)));
  
  // Specifically, matches waiting for current user's approval
  const approvalsRequired = pendingMatches.filter(m => m.submittedBy !== currentUserId);

  const handleRegister = async (name: string, pin: string) => {
    try {
      const newPlayer = await api.register(name, pin);
      setPlayers([...players, newPlayer]);
      setCurrentUserId(newPlayer.id);
    } catch (err) {
      console.error('Registration failed:', err);
      throw err; // Let Auth component handle the error
    }
  };

  const handleLogin = async (playerId: string, pin: string): Promise<boolean> => {
    try {
      const player = await api.login(playerId, pin);
      if (player) {
        setCurrentUserId(player.id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  const handleMatchComplete = async (
    type: MatchType,
    teamAIds: string[],
    teamBIds: string[],
    sets: MatchSet[],
    winnerTeam: 'A' | 'B',
    format: BestOf,
    aiCommentary: string
  ) => {
    try {
      const newMatch = await api.createMatch({
        date: new Date().toISOString(),
        type,
        teamAIds,
        teamBIds,
        sets,
        winnerTeam,
        status: 'PENDING',
        format,
        submittedBy: currentUser!.id,
        aiCommentary,
      });
      setMatches([newMatch, ...matches]);
      setView('LEADERBOARD');
    } catch (err) {
      console.error('Failed to create match:', err);
    }
  };

  const handleApproveMatch = async (matchId: string) => {
    try {
      const result = await api.approveMatch(matchId);
      // Update local state with server response
      setPlayers(result.players);
      setMatches(matches.map(m => m.id === matchId ? result.match : m));
    } catch (err) {
      console.error('Failed to approve match:', err);
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    try {
      const updatedMatch = await api.rejectMatch(matchId);
      setMatches(matches.map(m => m.id === matchId ? updatedMatch : m));
    } catch (err) {
      console.error('Failed to reject match:', err);
    }
  };

  const getPlayerNames = (ids: string[]) => ids.map(id => players.find(p => p.id === id)?.name).join(' & ');

  return (
    <div className="min-h-screen font-sans text-gray-100 bg-gray-900 pb-20">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2" onClick={() => setView('LEADERBOARD')}>
            <div className="w-8 h-8 bg-pingpong-red rounded-lg flex items-center justify-center transform rotate-12 cursor-pointer hover:rotate-0 transition-transform">
              🏓
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pingpong-red to-pingpong-gold cursor-pointer">
              SpinMaster
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                  <img src={currentUser.avatar} alt="Me" className="w-6 h-6 rounded-full" />
                  <span className="text-sm font-medium hidden sm:inline">{currentUser.name}</span>
                </div>
                <button 
                  onClick={() => setCurrentUserId('')}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  Logout
                </button>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Sign in to play</span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center min-h-[60vh] text-center">
            <div className="text-red-400 mb-4">{error}</div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : !currentUser ? (
          <Auth
            players={players}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        ) : (
          <>
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex gap-2">
                <Button 
                  variant={view === 'LEADERBOARD' ? 'primary' : 'secondary'} 
                  onClick={() => setView('LEADERBOARD')}
                >
                  Leaderboard
                </Button>
                <Button 
                  variant={view === 'PENDING' ? 'primary' : 'secondary'} 
                  onClick={() => setView('PENDING')}
                  className="relative"
                >
                  Approvals
                  {approvalsRequired.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                      {approvalsRequired.length}
                    </span>
                  )}
                </Button>
              </div>
              {view !== 'NEW_MATCH' && (
                <Button variant="success" onClick={() => setView('NEW_MATCH')}>
                  + Log Match
                </Button>
              )}
            </div>

            {/* Views */}
            {view === 'LEADERBOARD' && (
              <div className="space-y-8">
                <Leaderboard players={players} />
                
                {/* Recent Matches Feed */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="font-bold text-gray-400 uppercase text-xs mb-4 tracking-wider">Recent Activity</h3>
                  <div className="space-y-4">
                    {matches.filter(m => m.status === 'APPROVED').slice(0, 5).map(match => (
                      <div key={match.id} className="border-b border-gray-700 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-pingpong-blue">
                            {getPlayerNames(match.teamAIds)} <span className="text-gray-500 font-normal">vs</span> {getPlayerNames(match.teamBIds)}
                          </span>
                          <span className="text-xs text-gray-500">{new Date(match.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                           {match.sets.map((s, i) => (
                             <span key={i} className="px-2 py-0.5 bg-gray-900 rounded text-xs font-mono text-gray-300">
                               {s.teamAScore}-{s.teamBScore}
                             </span>
                           ))}
                        </div>
                        {match.aiCommentary && (
                          <div className="bg-gray-900/50 p-3 rounded-lg border-l-2 border-pingpong-gold">
                            <p className="text-sm text-gray-400 italic">"{match.aiCommentary}"</p>
                            <div className="text-right mt-1 text-[10px] text-pingpong-gold uppercase tracking-wider font-bold">AI Analyst</div>
                          </div>
                        )}
                      </div>
                    ))}
                    {matches.length === 0 && <p className="text-gray-500 text-sm">No matches recorded yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {view === 'NEW_MATCH' && (
              <MatchLogger 
                currentUser={currentUser}
                players={players}
                onMatchComplete={handleMatchComplete}
                onCancel={() => setView('LEADERBOARD')}
              />
            )}

            {view === 'PENDING' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Pending Approvals</h2>
                {approvalsRequired.length === 0 ? (
                  <div className="text-center py-10 bg-gray-800 rounded-xl border border-gray-700">
                    <p className="text-gray-500">No pending match approvals.</p>
                  </div>
                ) : (
                  approvalsRequired.map(match => (
                    <div key={match.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                           <div className="text-sm text-gray-400 mb-1">{match.type} • Best of {match.format}</div>
                           <div className="text-xl font-bold">
                             {getPlayerNames(match.teamAIds)} <span className="text-gray-500 text-sm">vs</span> {getPlayerNames(match.teamBIds)}
                           </div>
                        </div>
                        <div className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded text-xs font-bold uppercase">
                          Waiting
                        </div>
                      </div>
                      
                      <div className="bg-gray-900 p-4 rounded-lg mb-6 flex gap-4 overflow-x-auto">
                        {match.sets.map((set, i) => (
                          <div key={i} className="flex flex-col items-center min-w-[60px]">
                            <span className="text-xs text-gray-500 mb-1">Set {i+1}</span>
                            <span className="font-mono font-bold text-white text-lg">{set.teamAScore}-{set.teamBScore}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3">
                         <Button variant="success" fullWidth onClick={() => handleApproveMatch(match.id)}>
                           Confirm Result
                         </Button>
                         <Button variant="danger" fullWidth onClick={() => handleRejectMatch(match.id)}>
                           Reject
                         </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}