import React, { useState } from 'react';
import { Player } from '../types';
import { Button } from './Button';

interface AuthProps {
  players: Player[];
  onLogin: (playerId: string, pin: string) => Promise<boolean>;
  onRegister: (name: string, pin: string) => Promise<void>;
}

export const Auth: React.FC<AuthProps> = ({ players, onLogin, onRegister }) => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedId) {
      setError('Please select a player');
      return;
    }

    setIsLoading(true);
    try {
      const success = await onLogin(selectedId, pin);
      if (!success) {
        setError('Incorrect PIN');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newName.trim()) {
      setError('Name is required');
      return;
    }

    if (newPin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (players.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
      setError('Player name already exists');
      return;
    }

    setIsLoading(true);
    try {
      await onRegister(newName, newPin);
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        
        {/* Header Tabs */}
        <div className="flex border-b border-gray-700">
          <button 
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${view === 'LOGIN' ? 'bg-gray-800 text-pingpong-blue border-b-2 border-pingpong-blue' : 'bg-gray-900/50 text-gray-500 hover:text-gray-300'}`}
            onClick={() => { setView('LOGIN'); setError(''); }}
          >
            Login
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${view === 'REGISTER' ? 'bg-gray-800 text-pingpong-blue border-b-2 border-pingpong-blue' : 'bg-gray-900/50 text-gray-500 hover:text-gray-300'}`}
            onClick={() => { setView('REGISTER'); setError(''); }}
          >
            Register
          </button>
        </div>

        <div className="p-8">
          {view === 'LOGIN' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Select Player</label>
                <select 
                  value={selectedId} 
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-pingpong-blue focus:ring-1 focus:ring-pingpong-blue outline-none transition-colors"
                >
                  <option value="">Choose your profile...</option>
                  {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Enter PIN</label>
                <input 
                  type="password" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-pingpong-blue focus:ring-1 focus:ring-pingpong-blue outline-none transition-colors"
                />
              </div>

              {error && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded text-center">{error}</p>}

              <Button type="submit" fullWidth disabled={!selectedId || !pin || isLoading}>
                {isLoading ? 'Signing in...' : 'Access Dashboard'}
              </Button>
              
              <p className="text-center text-xs text-gray-500 mt-4">
                Default PIN for demo users is <span className="font-mono text-gray-400">0000</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Display Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Forrest Gump"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-pingpong-blue focus:ring-1 focus:ring-pingpong-blue outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Create PIN</label>
                <input 
                  type="password" 
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="4-digit code"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-pingpong-blue focus:ring-1 focus:ring-pingpong-blue outline-none transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Used to access your account securely.</p>
              </div>

              {error && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded text-center">{error}</p>}

              <Button type="submit" fullWidth variant="success" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Profile'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};