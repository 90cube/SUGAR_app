
import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { MatchResult, PlayerMatchDetail } from '../types';
import { nexonService } from '../services/nexonService';

export const MatchDetailModal: React.FC = () => {
  const { activeMatch, activeMatchDetail, closeMatchDetail, isMatchDetailLoading, userProfile } = useApp();
  const [showDetail, setShowDetail] = useState(false);

  if (!activeMatch) return null;

  // detail might be raw Match or populated MatchDetail with RawData
  const detail = activeMatchDetail || activeMatch; 
  const rawData = activeMatchDetail?.RawData;

  const isWin = detail.result === MatchResult.WIN;
  const isLose = detail.result === MatchResult.LOSE;

  const headerColor = isWin 
    ? 'bg-blue-600/90 shadow-[0_10px_30px_rgba(37,99,235,0.3)]' 
    : isLose 
    ? 'bg-red-500/90 shadow-[0_10px_30px_rgba(239,68,68,0.3)]' 
    : 'bg-slate-700/90';
    
  const headerText = isWin ? '승리 (VICTORY)' : isLose ? '패배 (DEFEAT)' : detail.result;

  // Format numbers with commas
  const fmt = (num: number) => new Intl.NumberFormat().format(num);

  // Group by team
  const team0 = rawData?.match_detail.filter(p => p.team_id === "0") || [];
  const team1 = rawData?.match_detail.filter(p => p.team_id === "1") || [];

  // Team Totals helper
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

  // My Personal stats in this match
  const myStats = rawData?.match_detail.find(p => p.user_name === userProfile?.nickname);

  // ACE detection mockup slot
  const isAce = false; // logic placeholder

  // Explicitly type PlayerRow as React.FC to correctly handle React-specific props like 'key' in JSX usage
  const PlayerRow: React.FC<{ player: PlayerMatchDetail, isMe: boolean }> = ({ player, isMe }) => (
    <tr className={`border-b border-slate-100 text-[11px] font-medium ${isMe ? 'bg-yellow-50 font-bold' : 'hover:bg-slate-50'}`}>
      <td className="p-3">
        <div className="flex flex-col">
          <span className={`text-[10px] ${player.team_id === "0" ? 'text-blue-600' : 'text-red-600'}`}>
            팀 {player.team_id === "0" ? '0' : '1'}
          </span>
          <span className="truncate max-w-[80px]" title={player.user_name}>{player.user_name}</span>
        </div>
      </td>
      <td className="p-3 text-slate-500">{player.guild_name || '없음'}</td>
      <td className="p-3 text-center">{player.kill}/{player.death}/{player.assist}</td>
      <td className="p-3 text-center text-blue-600 font-bold">{player.headshot}</td>
      <td className="p-3 text-right font-mono">{fmt(player.damage)}</td>
    </tr>
  );

  const TeamSummary = ({ teamName, color, players, stats }: { teamName: string, color: string, players: PlayerMatchDetail[], stats: any }) => (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div className={`${color} p-3 text-white flex justify-between items-center`}>
        <span className="text-xs font-black uppercase tracking-widest">{teamName} ({players.length}인)</span>
        <span className="text-[10px] font-bold opacity-80">합계 {stats.kills}K {stats.deaths}D</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">총 헤드샷</span>
          <div className="text-lg font-black text-slate-800">{stats.headshots}</div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">총 데미지</span>
          <div className="text-lg font-black text-slate-800">{fmt(stats.damage)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={closeMatchDetail}>
      <div 
        className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-6 duration-500 border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className={`${headerColor} p-8 text-white text-center relative flex-shrink-0 backdrop-blur-md transition-all duration-700`}>
          <button 
            type="button"
            onClick={closeMatchDetail}
            className="absolute top-6 right-6 p-2 bg-black/10 hover:bg-black/20 backdrop-blur-sm rounded-full transition-all z-20 border border-white/10 active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          <div className="relative z-10 flex flex-col items-center">
             {isAce && <div className="mb-2 px-3 py-0.5 bg-yellow-400 text-slate-950 text-[10px] font-black rounded uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.5)]">ACE</div>}
             <h2 className="text-3xl font-black italic tracking-tighter uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                {headerText}
             </h2>
             <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="px-3 py-1 bg-black/20 rounded-lg backdrop-blur-md text-[10px] font-black uppercase tracking-wider">{rawData?.match_map || '알 수 없는 맵'}</span>
                <span className="px-3 py-1 bg-black/20 rounded-lg backdrop-blur-md text-[10px] font-black uppercase tracking-wider">{detail.matchMode}</span>
                <span className="px-3 py-1 bg-black/20 rounded-lg backdrop-blur-md text-[10px] font-black uppercase tracking-wider">{detail.matchType}</span>
             </div>
             <div className="mt-4 text-[11px] font-mono opacity-80 font-bold tracking-tight">
                {nexonService.formatToKST(rawData?.date_match || detail.rawDate)}
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-6 scrollbar-hide">
          {isMatchDetailLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-6">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] animate-pulse">Synchronizing Lab Data...</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* Summary Card (Personal Stats) */}
              <section>
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                    내 전적 요약 (Subject Stats)
                 </h3>
                 <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="text-center">
                            <span className="block text-2xl font-black text-slate-900 leading-none">{detail.kill}/{detail.death}/{detail.assist}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">K / D / A</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-black text-blue-600 leading-none">{myStats?.headshot || 0}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">Headshot</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-black text-slate-900 leading-none">{fmt(myStats?.damage || 0)}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">Damage</span>
                        </div>
                    </div>
                 </div>
              </section>

              {/* Detail Accordion Header */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-8">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">전체 매치 리포트 (Full Report)</h3>
                  <button 
                    onClick={() => setShowDetail(!showDetail)}
                    className="text-[10px] font-black text-cyan-600 underline uppercase tracking-widest"
                  >
                    {showDetail ? '접기' : '자세히 보기'}
                  </button>
              </div>

              {showDetail && (
                <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                    {/* Team Summary Group */}
                    <div className="grid grid-cols-2 gap-4">
                        <TeamSummary teamName="블루팀" color="bg-blue-600" players={team0} stats={stats0} />
                        <TeamSummary teamName="레드팀" color="bg-red-600" players={team1} stats={stats1} />
                    </div>

                    {/* Full Player List */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Player</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clan</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">K/D/A</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">H</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">DMG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rawData?.match_detail.map((p, i) => (
                                    <PlayerRow key={i} player={p} isMe={p.user_name === userProfile?.nickname} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 bg-slate-950/5 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-400 italic">
                            데이터 검증 완료: {nexonService.formatToKST(rawData?.date_match || detail.rawDate)}
                        </span>
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0">
             <button onClick={closeMatchDetail} className="w-full py-4 bg-slate-900 text-white font-black text-xs rounded-2xl shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all">
                닫기 (Terminate View)
             </button>
        </div>
      </div>
    </div>
  );
};
