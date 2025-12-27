import React, { useState, useEffect } from 'react';
import { Player, MatchType, BestOf, MatchSet } from '../types';
import { Button } from './Button';
import { generateMatchCommentary } from '../services/aiService';

interface MatchLoggerProps {
  currentUser: Player;
  players: Player[];
  onMatchComplete: (
    type: MatchType,
    teamA: string[],
    teamB: string[],
    sets: MatchSet[],
    winner: 'A' | 'B',
    format: BestOf,
    commentary: string
  ) => void;
  onCancel: () => void;
}

type Step = 'SETUP' | 'PLAYING' | 'SUMMARY';

export const MatchLogger: React.FC<MatchLoggerProps> = ({ currentUser, players, onMatchComplete, onCancel }) => {
  const [step, setStep] = useState<Step>('SETUP');
  const [matchType, setMatchType] = useState<MatchType>('SINGLES');
  const [bestOf, setBestOf] = useState<BestOf>(3);
  
  // Team Composition
  const [partnerId, setPartnerId] = useState<string>('');
  const [opponent1Id, setOpponent1Id] = useState<string>('');
  const [opponent2Id, setOpponent2Id] = useState<string>(''); // For doubles

  // Game State
  const [currentSetScores, setCurrentSetScores] = useState<MatchSet>({ teamAScore: 0, teamBScore: 0 });
  const [finishedSets, setFinishedSets] = useState<MatchSet[]>([]);
  const [server, setServer] = useState<'A' | 'B'>('A'); // Simple server tracking logic is complex, just visual here

  // AI Loading
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Constants
  const pointsToWin = 11;
  const setsToWin = Math.ceil(bestOf / 2);

  // Computed
  const setsWonA = finishedSets.filter(s => s.teamAScore > s.teamBScore).length;
  const setsWonB = finishedSets.filter(s => s.teamAScore < s.teamBScore).length;
  const matchWinner = setsWonA >= setsToWin ? 'A' : setsWonB >= setsToWin ? 'B' : null;

  // Effects
  useEffect(() => {
    if (matchWinner) {
      setStep('SUMMARY');
    }
  }, [matchWinner]);

  const handlePoint = (team: 'A' | 'B') => {
    setCurrentSetScores(prev => {
      const newState = { ...prev, [team === 'A' ? 'teamAScore' : 'teamBScore']: prev[team === 'A' ? 'teamAScore' : 'teamBScore'] + 1 };
      
      // Check for set win
      const { teamAScore, teamBScore } = newState;
      if ((teamAScore >= pointsToWin && teamAScore >= teamBScore + 2) || 
          (teamBScore >= pointsToWin && teamBScore >= teamAScore + 2)) {
        
        // Delay slightly to show final score before clearing
        setTimeout(() => {
          setFinishedSets([...finishedSets, newState]);
          setCurrentSetScores({ teamAScore: 0, teamBScore: 0 });
        }, 500);
      }
      return newState;
    });
  };

  const handleUndo = () => {
      // Basic undo for current set only
      if (currentSetScores.teamAScore > 0 || currentSetScores.teamBScore > 0) {
          // Can't easily undo cleanly without a history stack, simplified:
          // Just reset current set for MVP or warn
          alert("Undo not implemented for MVP in this version (prevents abuse).");
      }
  };

  const handleSubmit = async () => {
    setIsGeneratingAI(true);
    const teamAIds = matchType === 'SINGLES' ? [currentUser.id] : [currentUser.id, partnerId];
    const teamBIds = matchType === 'SINGLES' ? [opponent1Id] : [opponent1Id, opponent2Id];

    // Create a temporary match object for AI generation
    const tempMatch: any = {
      type: matchType,
      teamAIds,
      teamBIds,
      sets: finishedSets,
      winnerTeam: matchWinner,
    };

    const commentary = await generateMatchCommentary(tempMatch, players);
    setIsGeneratingAI(false);
    
    onMatchComplete(matchType, teamAIds, teamBIds, finishedSets, matchWinner!, bestOf, commentary);
  };

  const availableOpponents = players.filter(p => p.id !== currentUser.id && p.id !== partnerId);

  // SETUP VIEW
  if (step === 'SETUP') {
    return (
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-6 text-white">Start New Match</h2>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Format</label>
            <div className="flex gap-2">
              <Button variant={matchType === 'SINGLES' ? 'primary' : 'secondary'} onClick={() => setMatchType('SINGLES')} className="flex-1">Singles</Button>
              <Button variant={matchType === 'DOUBLES' ? 'primary' : 'secondary'} onClick={() => setMatchType('DOUBLES')} className="flex-1">Doubles</Button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Best of (Sets)</label>
            <div className="flex gap-2">
              {[1, 3, 5, 7].map((num) => (
                <button
                  key={num}
                  onClick={() => setBestOf(num as BestOf)}
                  className={`flex-1 py-2 rounded-lg border ${bestOf === num ? 'bg-pingpong-gold text-black border-pingpong-gold font-bold' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {matchType === 'DOUBLES' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Your Partner</label>
              <select 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
              >
                <option value="">Select Partner...</option>
                {players.filter(p => p.id !== currentUser.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">Opponent 1</label>
            <select 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white"
              value={opponent1Id}
              onChange={(e) => setOpponent1Id(e.target.value)}
            >
              <option value="">Select Opponent...</option>
              {availableOpponents.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {matchType === 'DOUBLES' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Opponent 2</label>
              <select 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white"
                value={opponent2Id}
                onChange={(e) => setOpponent2Id(e.target.value)}
              >
                <option value="">Select Opponent...</option>
                {availableOpponents.filter(p => p.id !== opponent1Id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button 
            fullWidth 
            disabled={!opponent1Id || (matchType === 'DOUBLES' && (!opponent2Id || !partnerId))}
            onClick={() => setStep('PLAYING')}
            className="flex-1"
          >
            Start Match
          </Button>
        </div>
      </div>
    );
  }

  // PLAYING VIEW
  if (step === 'PLAYING') {
    const teamAName = matchType === 'SINGLES' ? currentUser.name : 'Team You';
    const opponent = players.find(p => p.id === opponent1Id);
    const teamBName = matchType === 'SINGLES' ? (opponent?.name || 'Opponent') : 'Team Opponent';

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Scoreboard Header */}
        <div className="bg-gray-800 rounded-xl p-4 flex justify-between items-center border border-gray-700">
           <div className="text-center w-1/3">
             <div className="text-sm text-gray-400">{teamAName}</div>
             <div className="text-3xl font-bold text-pingpong-blue">{setsWonA}</div>
           </div>
           <div className="text-center w-1/3 text-gray-500 text-xs uppercase tracking-widest">
             Sets (Best of {bestOf})
           </div>
           <div className="text-center w-1/3">
             <div className="text-sm text-gray-400">{teamBName}</div>
             <div className="text-3xl font-bold text-pingpong-red">{setsWonB}</div>
           </div>
        </div>

        {/* Live Score Controls */}
        <div className="grid grid-cols-2 gap-4 h-64">
          <button 
            onClick={() => handlePoint('A')}
            className="bg-blue-900/20 border-2 border-blue-500/50 rounded-2xl flex flex-col items-center justify-center hover:bg-blue-900/40 active:scale-95 transition-all"
          >
            <span className="text-8xl font-bold text-white">{currentSetScores.teamAScore}</span>
            <span className="text-blue-400 font-medium">+ Point {teamAName}</span>
          </button>
          
          <button 
            onClick={() => handlePoint('B')}
            className="bg-red-900/20 border-2 border-red-500/50 rounded-2xl flex flex-col items-center justify-center hover:bg-red-900/40 active:scale-95 transition-all"
          >
             <span className="text-8xl font-bold text-white">{currentSetScores.teamBScore}</span>
             <span className="text-red-400 font-medium">+ Point {teamBName}</span>
          </button>
        </div>

        <div className="flex justify-center">
            <Button variant="ghost" onClick={onCancel} className="text-sm">Abort Match</Button>
        </div>
      </div>
    );
  }

  // SUMMARY VIEW
  return (
    <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 max-w-lg mx-auto text-center">
       <div className="text-6xl mb-4">
         {matchWinner === 'A' ? '🏆' : '💀'}
       </div>
       <h2 className="text-2xl font-bold text-white mb-2">
         {matchWinner === 'A' ? 'Victory!' : 'Defeat'}
       </h2>
       <p className="text-gray-400 mb-6">
         Final Score: <span className="text-white font-mono font-bold">{setsWonA} - {setsWonB}</span>
       </p>
       
       <div className="space-y-3 mb-8">
         {finishedSets.map((set, i) => (
           <div key={i} className="flex justify-between px-8 py-2 bg-gray-900/50 rounded">
              <span className="text-gray-400">Set {i+1}</span>
              <span className="font-mono text-white">{set.teamAScore} - {set.teamBScore}</span>
           </div>
         ))}
       </div>

       <Button fullWidth onClick={handleSubmit} disabled={isGeneratingAI}>
          {isGeneratingAI ? 'Finalizing with AI...' : 'Submit Result'}
       </Button>
    </div>
  );
};