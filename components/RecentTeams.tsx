
import React from 'react';
import { RecentTeamData } from '../state/AppContext';

interface RecentTeamsProps {
  data: RecentTeamData;
}

export const RecentTeams: React.FC<RecentTeamsProps> = ({ data }) => {
  const { allies, enemies, mapName, matchMode, selfNickname } = data;

  const PlayerRow: React.FC<{ player: typeof allies[0]; idx: number }> = ({ player, idx }) => {
    const kd = player.death === 0
      ? (player.kill > 0 ? player.kill.toFixed(1) : '0.0')
      : (player.kill / player.death).toFixed(2);
    const isSelf = player.user_name === selfNickname;

    return (
      <tr className={`border-b border-white/10 transition-colors ${isSelf ? 'bg-acid-green/10' : 'hover:bg-white/5'}`}>
        <td className={`py-1 px-2 text-left font-code text-xs truncate max-w-[120px] ${isSelf ? 'text-acid-green font-bold' : ''}`}>
          {isSelf ? '▶ ' : ''}{player.user_name}
        </td>
        <td className="py-1 px-1 text-center text-xs font-code opacity-70">
          {player.season_grade || '-'}
        </td>
        <td className="py-1 px-1 text-center font-code text-xs">
          <span className="text-acid-green">{player.kill}</span>
          <span className="text-white/40">/</span>
          <span className="text-acid-pink">{player.death}</span>
        </td>
        <td className="py-1 px-1 text-center font-code text-xs">
          {kd}
        </td>
      </tr>
    );
  };

  const TeamTable: React.FC<{ players: typeof allies; label: string; color: string }> = ({ players, label, color }) => (
    <div className="flex-1 min-w-0">
      <div className={`text-center font-pixel text-[10px] ${color} mb-1 tracking-wider`}>
        {label} ({players.length})
      </div>
      <table className="w-full text-white">
        <thead>
          <tr className="border-b border-white/20 text-[9px] font-code text-white/50 uppercase">
            <th className="py-1 px-2 text-left">NAME</th>
            <th className="py-1 px-1 text-center">RANK</th>
            <th className="py-1 px-1 text-center">K/D</th>
            <th className="py-1 px-1 text-center">RATIO</th>
          </tr>
        </thead>
        <tbody>
          {players.length > 0 ? (
            players.map((p, i) => <PlayerRow key={p.user_name + i} player={p} idx={i} />)
          ) : (
            <tr><td colSpan={4} className="py-2 text-center text-white/30 text-xs font-code">NO DATA</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-code text-[10px] text-white/40">
          MAP: {mapName} / {matchMode}
        </span>
      </div>

      {/* Two-column team table */}
      <div className="flex gap-3">
        <TeamTable players={allies} label="ALLIES" color="text-acid-cyan" />
        <div className="w-px bg-white/20 flex-shrink-0" />
        <TeamTable players={enemies} label="ENEMIES" color="text-acid-pink" />
      </div>
    </div>
  );
};
