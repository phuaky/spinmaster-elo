import React from 'react';
import { Player } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LeaderboardProps {
  players: Player[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ players }) => {
  const sortedPlayers = [...players].sort((a, b) => b.elo - a.elo);
  const topPlayers = sortedPlayers.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-pingpong-gold flex items-center gap-2">
          <span>🏆</span> Top Performers
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPlayers} layout="vertical" margin={{ left: 40, right: 40 }}>
              <XAxis type="number" domain={['dataMin - 100', 'dataMax + 50']} hide />
              <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: '#fbbf24' }}
                cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
              />
              <Bar dataKey="elo" radius={[0, 4, 4, 0]} barSize={20}>
                {topPlayers.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700">
        <table className="w-full text-left">
          <thead className="bg-gray-900/50 text-gray-400 text-sm uppercase">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Player</th>
              <th className="p-4 text-right">W/L</th>
              <th className="p-4 text-right">ELO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedPlayers.map((player, index) => (
              <tr key={player.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="p-4 font-mono text-gray-500">#{index + 1}</td>
                <td className="p-4 flex items-center gap-3">
                  <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full bg-gray-600" />
                  <span className="font-semibold text-gray-200">{player.name}</span>
                </td>
                <td className="p-4 text-right text-gray-400 text-sm">
                  <span className="text-green-400">{player.wins}</span> / <span className="text-red-400">{player.losses}</span>
                </td>
                <td className="p-4 text-right font-bold text-pingpong-blue">
                  {player.elo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};