
import React from 'react';
import { useApp } from '../state/AppContext';
import { MatchResult } from '../types';

export const MatchDetailModal: React.FC = () => {
  const { activeMatch, activeMatchDetail, closeMatchDetail, isMatchDetailLoading } = useApp();

  if (!activeMatch) return null;

  const detail = activeMatchDetail || activeMatch; 

  const isWin = detail.result === MatchResult.WIN;
  const isLose = detail.result === MatchResult.LOSE;

  const headerColor = isWin 
    ? 'bg-blue-600/90 shadow-[0_0_30px_rgba(37,99,235,0.3)]' 
    : isLose 
    ? 'bg-red-500/90 shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
    : 'bg-slate-600/90';
    
  const headerText = isWin ? '승리 (VICTORY)' : isLose ? '패배 (DEFEAT)' : detail.result;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={closeMatchDetail}>
      <div 
        className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${headerColor} p-8 text-white text-center relative flex-shrink-0 backdrop-blur-md transition-colors duration-500`}>
          {/* Glassy Close Button */}
          <button 
            type="button"
            onClick={closeMatchDetail}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all z-10 border border-white/10 active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          <h2 className="text-3xl font-black italic tracking-tighter uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] relative z-0">
            {headerText}
          </h2>
          <div className="mt-3 text-sm font-bold opacity-90 flex items-center justify-center gap-3 relative z-0">
            <span className="px-3 py-1 bg-black/20 rounded-full backdrop-blur-sm">{detail.matchMode}</span>
            <span className="opacity-50">•</span>
            <span className="px-3 py-1 bg-black/20 rounded-full backdrop-blur-sm">{detail.matchType}</span>
          </div>
          <div className="mt-2 text-xs opacity-75 font-medium tracking-wide relative z-0">{detail.date}</div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto overscroll-contain">
          {isMatchDetailLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">상세 기록 불러오는 중...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* KDA Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/50 p-4 rounded-2xl text-center border border-white/60 shadow-sm">
                  <span className="block text-3xl font-black text-slate-800">{detail.kill}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kill</span>
                </div>
                <div className="bg-white/50 p-4 rounded-2xl text-center border border-white/60 shadow-sm">
                  <span className="block text-3xl font-black text-slate-800">{detail.death}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Death</span>
                </div>
                <div className="bg-white/50 p-4 rounded-2xl text-center border border-white/60 shadow-sm">
                  <span className="block text-3xl font-black text-slate-800">{detail.assist}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assist</span>
                </div>
              </div>

              {/* K/D Banner */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between shadow-xl shadow-slate-900/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 z-0"></div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl z-0"></div>
                
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest z-10">기여도 (K/D)</span>
                <div className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)] z-10">{detail.kd}</div>
              </div>

              {/* Extra Details */}
              <div className="border-t border-slate-200/50 pt-5">
                 <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wide">매치 ID</h4>
                 <div className="p-4 bg-slate-50/80 rounded-xl text-xs font-mono text-slate-500 break-all select-all border border-slate-100">
                   {detail.id}
                 </div>
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
