
import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
// Import useUI for modal control state
import { useUI } from '../state/UIContext';

export const RecapModal: React.FC = () => {
  // Fix: Destructure UI state from useUI and recap data from useApp
  const { isRecapModalOpen, closeRecapModal } = useUI();
  const { calculateRecap, recapStats, isRecapLoading } = useApp();
  
  const getTodayKST = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kst = new Date(utc + (9 * 60 * 60 * 1000)); 
    return kst.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayKST());

  if (!isRecapModalOpen) return null;

  const handleAnalyze = () => {
    calculateRecap(selectedDate);
  };

  const StatBox = ({ label, value, compareValue, suffix = '' }: { label: string, value: number, compareValue?: number, suffix?: string }) => {
    const diff = compareValue !== undefined ? value - compareValue : 0;
    const isPositive = diff >= 0;
    
    return (
        <div className="bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-white/60 text-center flex flex-col items-center justify-center h-full shadow-sm hover:shadow-md transition-shadow">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
            <span className="text-xl font-black text-slate-900 mt-1">{value.toFixed(1)}{suffix}</span>
            {compareValue !== undefined && (
                 <span className={`text-[10px] font-bold mt-1 ${isPositive ? 'text-blue-500' : 'text-red-500'}`}>
                    {isPositive ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}{suffix}
                 </span>
            )}
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={closeRecapModal}>
      <div 
        className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5 duration-500 border border-white/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900/95 p-6 text-white text-center flex-shrink-0 backdrop-blur-xl relative overflow-hidden">
             <div className="absolute top-[-50%] left-[-20%] w-[200px] h-[200px] bg-blue-500/20 rounded-full blur-3xl"></div>
             <div className="absolute bottom-[-50%] right-[-20%] w-[200px] h-[200px] bg-purple-500/20 rounded-full blur-3xl"></div>
            
            <h2 className="text-xl font-black uppercase tracking-tight relative z-10">오늘의 요약 (Recap)</h2>
            <p className="text-sm text-slate-400 mt-1 relative z-10">일일 전적 및 플레이 성향 분석</p>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 overscroll-contain">
            {/* 날짜 선택 섹션 복구 및 스타일 강화 */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Analysis Date</label>
                <div className="flex gap-2">
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 shadow-sm transition-all"
                    />
                    <button 
                        onClick={handleAnalyze}
                        disabled={isRecapLoading}
                        className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.4)] disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                    >
                        {isRecapLoading ? '...' : '분석하기'}
                    </button>
                </div>
            </div>

            {recapStats ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="text-center bg-slate-50/50 p-4 rounded-2xl border border-white/50">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">총 플레이 횟수</span>
                        <div className="text-5xl font-black text-slate-900 mt-1 drop-shadow-sm">{recapStats.totalMatches}</div>
                        <div className="text-xs text-slate-500 mt-1 font-medium">{recapStats.date}</div>
                    </div>

                    {recapStats.totalMatches > 0 ? (
                        <>
                            {recapStats.aiAnalysis && (
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100 shadow-sm relative overflow-hidden">
                                     <div className="flex items-center gap-2 mb-3">
                                         <span className="text-xl">🧑‍🏫</span>
                                         <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">AI 코치 피드백</h3>
                                     </div>
                                     <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                                         {recapStats.aiAnalysis}
                                     </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)]"></span>
                                    vs. 평소 평균
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <StatBox 
                                        label="승률 (Win Rate)" 
                                        value={recapStats.winRate} 
                                        compareValue={recapStats.comparison.restWinRate} 
                                        suffix="%" 
                                    />
                                    <StatBox 
                                        label="킬뎃 (K/D)" 
                                        value={recapStats.kd} 
                                        compareValue={recapStats.comparison.restKd} 
                                        suffix="%" 
                                    />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_5px_rgba(168,85,247,0.5)]"></span>
                                    vs. 랭크전 평균
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <StatBox 
                                        label="승률 (Win Rate)" 
                                        value={recapStats.winRate} 
                                        compareValue={recapStats.comparison.rankedWinRate} 
                                        suffix="%" 
                                    />
                                    <StatBox 
                                        label="킬뎃 (K/D)" 
                                        value={recapStats.kd} 
                                        compareValue={recapStats.comparison.rankedKd} 
                                        suffix="%" 
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-6 bg-slate-50/50 rounded-2xl text-center text-slate-500 text-sm border border-slate-100/50">
                            해당 날짜의 기록이 없습니다.
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-400 text-sm bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                    날짜를 선택하고 '분석하기' 버튼을 눌러주세요.
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-100/50 bg-white/50 backdrop-blur-md flex-shrink-0">
             <button onClick={closeRecapModal} className="w-full py-4 bg-white/80 border border-white text-slate-700 font-bold rounded-xl hover:bg-white transition-colors shadow-sm active:scale-98">
                닫기
             </button>
        </div>
      </div>
    </div>
  );
};
