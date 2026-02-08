
import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { MatchResult, PlayerMatchDetail } from '../types';
import { nexonService } from '../services/nexonService';

export const MatchDetailModal: React.FC = () => {
  const { activeMatch, activeMatchDetail, closeMatchDetail, isMatchDetailLoading, userProfile } = useApp();
  const [showDetail, setShowDetail] = useState(false);

  if (!activeMatch) return null;

  const detail = activeMatchDetail || activeMatch;
  const rawData = activeMatchDetail?.RawData;

  const isWin = detail.result === MatchResult.WIN;
  const isLose = detail.result === MatchResult.LOSE;

  const headerBg = isWin ? 'bg-blue-800' : isLose ? 'bg-red-800' : 'bg-gray-800';
  const headerText = isWin ? 'VICTORY' : isLose ? 'DEFEAT' : detail.result;

  const fmt = (num: number) => new Intl.NumberFormat().format(num);

  const team0 = rawData?.match_detail.filter(p => p.team_id === "0") || [];
  const team1 = rawData?.match_detail.filter(p => p.team_id === "1") || [];

  const getTeamStats = (players: PlayerMatchDetail[]) => {
    return players.reduce((acc, p) => ({
      kills: acc.kills + p.kill,
      deaths: acc.deaths + p.death,
      assists: acc.assists + p.assist,
      headshots: acc.headshots + p.headshot,
      damage: acc.damage + p.damage
    }), { kills: 0, deaths: 0, assists: 0, headshots: 0, damage: 0 });
  };

  const stats0 = getTeamStats(team0);
  const stats1 = getTeamStats(team1);

  const myStats = rawData?.match_detail.find(p => p.user_name === userProfile?.nickname);
  const isAce = false;

  const PlayerRow: React.FC<{ player: PlayerMatchDetail, isMe: boolean }> = ({ player, isMe }) => (
    <tr className={`border-b border-gray-700 text-xs font-code ${isMe ? 'bg-acid-green/10' : 'hover:bg-gray-800'}`}>
      <td className="p-2">
        <div className="flex flex-col">
          <span className={`text-[10px] ${player.team_id === "0" ? 'text-blue-400' : 'text-red-400'}`}>
            TEAM_{player.team_id}
          </span>
          <span className="truncate max-w-[80px] text-white" title={player.user_name}>{player.user_name}</span>
        </div>
      </td>
      <td className="p-2 text-gray-500">{player.guild_name || 'N/A'}</td>
      <td className="p-2 text-center text-white">{player.kill}/{player.death}/{player.assist}</td>
      <td className="p-2 text-center text-acid-pink font-bold">{player.headshot}</td>
      <td className="p-2 text-right text-acid-green">{fmt(player.damage)}</td>
    </tr>
  );

  const TeamSummary = ({ teamName, color, players, stats }: { teamName: string, color: string, players: PlayerMatchDetail[], stats: any }) => (
    <div className={`border-2 ${color}`}>
      <div className={`${color.replace('border', 'bg').replace('-500', '-900')} p-2 flex justify-between items-center`}>
        <span className="text-xs font-pixel text-white uppercase">{teamName} [{players.length}]</span>
        <span className="text-[10px] font-code text-gray-300">{stats.kills}K {stats.deaths}D</span>
      </div>
      <div className="p-3 bg-black grid grid-cols-2 gap-3">
        <div>
          <span className="text-[9px] font-pixel text-acid-pink uppercase block mb-1">HEADSHOTS</span>
          <div className="text-lg font-pixel text-white">{stats.headshots}</div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-pixel text-acid-green uppercase block mb-1">DAMAGE</span>
          <div className="text-lg font-pixel text-white">{fmt(stats.damage)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4" onClick={closeMatchDetail}>
      <div
        className="w-full max-w-lg bg-metal-silver border-2 border-white border-b-black border-r-black shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div className={`${headerBg} px-3 py-2 flex items-center justify-between`}>
          <span className="text-white font-pixel text-sm uppercase">{headerText}.LOG</span>
          <button
            onClick={closeMatchDetail}
            className="bg-metal-silver border-t border-l border-white border-b-2 border-r-2 border-b-black border-r-black w-6 h-6 flex items-center justify-center font-bold text-black text-xs hover:bg-gray-300"
          >
            X
          </button>
        </div>

        {/* Header Banner */}
        <div className={`${headerBg} p-6 text-white text-center border-b-2 border-white`}>
          {isAce && <div className="mb-2 px-3 py-0.5 bg-acid-green text-black text-xs font-pixel inline-block">ACE</div>}
          <h2 className="text-3xl font-pixel uppercase italic">
            {headerText}
          </h2>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="px-2 py-1 bg-black border border-white text-[10px] font-code uppercase">{rawData?.match_map || 'UNKNOWN_MAP'}</span>
            <span className="px-2 py-1 bg-black border border-white text-[10px] font-code uppercase">{detail.matchMode}</span>
            <span className="px-2 py-1 bg-black border border-white text-[10px] font-code uppercase">{detail.matchType}</span>
          </div>
          <div className="mt-3 text-[10px] font-code text-gray-400">
            {nexonService.formatToKST(rawData?.date_match || detail.rawDate)}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-black p-4">
          {isMatchDetailLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-12 h-12 border-4 border-acid-green border-t-transparent animate-spin"></div>
              <p className="text-xs text-acid-green font-code uppercase animate-pulse">SYNCHRONIZING_DATA...</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Summary Card (Personal Stats) */}
              <section className="border-2 border-acid-green p-4">
                <h3 className="text-[10px] font-pixel text-acid-green uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-acid-green animate-pulse"></span>
                  SUBJECT_STATS
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="block text-2xl font-pixel text-white">{detail.kill}/{detail.death}/{detail.assist}</span>
                    <span className="text-[9px] font-code text-gray-500 uppercase mt-1 block">K/D/A</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-pixel text-acid-pink">{myStats?.headshot || 0}</span>
                    <span className="text-[9px] font-code text-gray-500 uppercase mt-1 block">HEADSHOT</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-pixel text-acid-green">{fmt(myStats?.damage || 0)}</span>
                    <span className="text-[9px] font-code text-gray-500 uppercase mt-1 block">DAMAGE</span>
                  </div>
                </div>
              </section>

              {/* Detail Toggle */}
              <div className="flex items-center justify-between border-t border-gray-700 pt-4">
                <h3 className="text-[10px] font-pixel text-gray-500 uppercase">FULL_MATCH_REPORT</h3>
                <button
                  onClick={() => setShowDetail(!showDetail)}
                  className="text-[10px] font-pixel text-acid-pink hover:underline uppercase"
                >
                  [{showDetail ? 'COLLAPSE' : 'EXPAND'}]
                </button>
              </div>

              {showDetail && (
                <div className="space-y-4">
                  {/* Team Summary Group */}
                  <div className="grid grid-cols-2 gap-3">
                    <TeamSummary teamName="BLUE_TEAM" color="border-blue-500" players={team0} stats={stats0} />
                    <TeamSummary teamName="RED_TEAM" color="border-red-500" players={team1} stats={stats1} />
                  </div>

                  {/* Full Player List */}
                  <div className="border-2 border-white overflow-x-auto">
                    <table className="w-full text-left border-collapse bg-black">
                      <thead>
                        <tr className="bg-metal-dark border-b border-gray-700">
                          <th className="p-2 text-[10px] font-pixel text-acid-green uppercase">PLAYER</th>
                          <th className="p-2 text-[10px] font-pixel text-acid-green uppercase">CLAN</th>
                          <th className="p-2 text-[10px] font-pixel text-acid-green uppercase text-center">K/D/A</th>
                          <th className="p-2 text-[10px] font-pixel text-acid-green uppercase text-center">H</th>
                          <th className="p-2 text-[10px] font-pixel text-acid-green uppercase text-right">DMG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawData?.match_detail.map((p, i) => (
                          <PlayerRow key={i} player={p} isMe={p.user_name === userProfile?.nickname} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-2 bg-gray-900 border border-gray-700 text-center">
                    <span className="text-[10px] font-code text-gray-500">
                      DATA_VERIFIED: {nexonService.formatToKST(rawData?.date_match || detail.rawDate)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-metal-silver border-t-2 border-white flex justify-center">
          <button onClick={closeMatchDetail} className="px-8 py-2 bg-black text-acid-green font-pixel text-xs border-2 border-acid-green hover:bg-acid-green hover:text-black transition-colors uppercase">
            TERMINATE_VIEW
          </button>
        </div>
      </div>
    </div>
  );
};
