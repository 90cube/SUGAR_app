
import React from 'react';
import { Match, MatchResult } from '../types';
import { UI_STRINGS } from '../constants';
import { useApp } from '../state/AppContext';

interface RecentMatchesProps {
  matches: Match[];
}

const getResultStyles = (result: MatchResult) => {
  switch (result) {
    case MatchResult.WIN: return 'border-l-blue-500 bg-blue-50/40 hover:bg-blue-50/60';
    case MatchResult.LOSE: return 'border-l-red-500 bg-red-50/40 hover:bg-red-50/60';
    case MatchResult.DRAW: return 'border-l-gray-400 bg-gray-50/40 hover:bg-gray-100/60';
    default: return 'border-l-slate-300 bg-white/40';
  }
};

const getResultBadge = (result: MatchResult) => {
   switch (result) {
    case MatchResult.WIN: return 'text-blue-700 bg-blue-100/80 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
    case MatchResult.LOSE: return 'text-red-700 bg-red-100/80 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
    case MatchResult.DRAW: return 'text-gray-700 bg-gray-200/80';
    default: return 'text-slate-700 bg-slate-200/80';
  }
};

export const RecentMatches: React.FC<RecentMatchesProps> = ({ matches }) => {
  const { isLoggedIn, openAuthModal, openMatchDetail, visibleMatchCount, loadMoreMatches, isLoadingMore, openRecapModal } = useApp();

  const displayedMatches = matches.slice(0, visibleMatchCount);
  const hasMore = visibleMatchCount < matches.length;

  const handleRecapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      openAuthModal();
    } else {
      openRecapModal();
    }
  };

  const handleMatchClick = (match: Match) => {
    openMatchDetail(match);
  };

  const formatKd = (kdStr: string) => {
      // "123%" -> 123.0%
      const val = parseFloat(kdStr.replace('%', ''));
      if (isNaN(val)) return kdStr;
      return `${val.toFixed(1)}%`;
  };

  if (!matches || matches.length === 0) {
    return (
       <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-slate-900 drop-shadow-sm">최근 전적</h3>
        </div>
        <div className="p-8 text-center bg-white/40 backdrop-blur-md rounded-xl border border-white/50 border-dashed text-slate-400 shadow-sm">
          최근 플레이 기록이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-slate-900 drop-shadow-sm">최근 전적 ({matches.length})</h3>
        <button 
          onClick={handleRecapClick}
          className="text-xs font-bold bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full active:scale-95 transition-all shadow-lg hover:shadow-slate-500/30 hover:bg-slate-800 flex items-center gap-1 border border-white/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          {UI_STRINGS.todayRecap}
        </button>
      </div>

      <div className="space-y-3">
        {displayedMatches.map((match, index) => (
          <div 
            key={match.id} 
            onClick={() => handleMatchClick(match)}
            style={{ animationDelay: `${index * 50}ms` }}
            className={`animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards relative flex items-center justify-between p-4 rounded-r-xl shadow-sm border border-white/60 border-l-4 backdrop-blur-md cursor-pointer transition-all active:scale-[0.99] hover:shadow-md ${getResultStyles(match.result)}`}
          >
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-sm">{match.matchMode}</span>
              <span className="text-xs text-slate-500 mt-0.5">{match.date}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">K/D</div>
                <span className="text-sm font-black text-slate-700 font-mono">{formatKd(match.kd)}</span>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full min-w-[3.5rem] text-center backdrop-blur-sm ${getResultBadge(match.result)}`}>
                {match.result}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button 
            onClick={loadMoreMatches}
            disabled={isLoadingMore}
            className="w-full py-3 bg-white/70 backdrop-blur-md text-slate-700 font-bold rounded-xl border border-white/60 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center hover:bg-white/90 hover:shadow-lg disabled:opacity-70"
        >
            {isLoadingMore ? (
                 <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    기록 불러오는 중...
                 </div>
            ) : (
                `더 보기 (${matches.length - displayedMatches.length}개 남음)`
            )}
        </button>
      )}
    </div>
  );
};
