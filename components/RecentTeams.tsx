
import React from 'react';
import { RecentTeamData } from '../state/AppContext';

interface RecentTeamsProps {
  data: RecentTeamData;
}

export const RecentTeams: React.FC<RecentTeamsProps> = ({ data }) => {
  const { allies, enemies, mapName, matchMode, selfNickname } = data;

  const PlayerCell: React.FC<{ player: typeof allies[0] }> = ({ player }) => {
    const kd = player.death === 0
      ? (player.kill > 0 ? player.kill.toFixed(1) : '0.0')
      : (player.kill / player.death).toFixed(2);
    const isSelf = player.user_name === selfNickname;

    return (
      <div className={`px-1.5 py-1 ${isSelf ? 'bg-acid-green/15' : ''}`}>
        <div className={`font-code text-[11px] truncate leading-tight ${isSelf ? 'text-acid-green font-bold' : 'text-white'}`}>
          {isSelf ? '▶ ' : ''}{player.user_name}
        </div>
        <div className="font-code text-[10px] leading-tight mt-0.5">
          <span className="text-acid-green">{player.kill}</span>
          <span className="text-white/30">/</span>
          <span className="text-acid-pink">{player.death}</span>
          <span className="text-white/30 ml-0.5">·{kd}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Terminal Header Strip */}
      <div className="bg-acid-green text-black px-3 py-1 font-pixel font-bold text-[9px] flex justify-between items-center">
        <span>C:\SUDDENLAB\LAST_MATCH.LOG</span>
        {matchMode && <span className="font-code text-[8px]">{matchMode}</span>}
      </div>

      {/* Map info */}
      <div className="px-2 py-1 border-b border-white/10">
        <span className="font-code text-[9px] text-white/30">MAP: {mapName}</span>
      </div>

      {/* Two-column player grid */}
      <div className="grid grid-cols-2">
        {/* Column headers */}
        <div className="border-b border-r border-white/15 px-1.5 py-0.5 bg-acid-cyan/10">
          <span className="font-pixel text-[9px] text-acid-cyan">◀ ALLIES [{allies.length}]</span>
        </div>
        <div className="border-b border-white/15 px-1.5 py-0.5 bg-acid-pink/10 text-right">
          <span className="font-pixel text-[9px] text-acid-pink">ENEMIES [{enemies.length}] ▶</span>
        </div>

        {/* Paired player rows */}
        {Array.from({ length: Math.max(allies.length, enemies.length) }).map((_, i) => (
          <React.Fragment key={i}>
            <div className="border-b border-r border-white/10 overflow-hidden">
              {allies[i] ? <PlayerCell player={allies[i]} /> : <div className="py-2" />}
            </div>
            <div className="border-b border-white/10 overflow-hidden">
              {enemies[i] ? <PlayerCell player={enemies[i]} /> : <div className="py-2" />}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
