
import React from 'react';
import { useApp } from '../state/AppContext';

export const AnalysisModal: React.FC = () => {
  const { isAnalysisModalOpen, closeAnalysisModal, anomalyReport, isAnomalyLoading } = useApp();

  if (!isAnalysisModalOpen) return null;

  // Render Loading State
  if (isAnomalyLoading || !anomalyReport) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-10 flex flex-col items-center shadow-2xl border border-white/50">
           <div className="w-14 h-14 border-[6px] border-slate-200 border-t-red-500 rounded-full animate-spin mb-6"></div>
           <h3 className="text-xl font-bold text-slate-800 animate-pulse tracking-tight">어뷰징 패턴 정밀 분석 중...</h3>
           <p className="text-sm text-slate-400 mt-2 font-medium">최근 매치 데이터의 통계적 이상치를 검사하고 있습니다.</p>
        </div>
      </div>
    );
  }

  const { status, label, suspicion_score, deviation_level, message, reasons, evidence } = anomalyReport;
  
  const isSuspicious = label === "Suspicious";
  const isError = status === "ERROR";
  const isSkipped = status === "SKIPPED_LOW_IMPACT";

  // Color logic
  const headerColor = isError 
    ? 'bg-slate-700/90' 
    : isSuspicious 
    ? 'bg-red-600/90 shadow-[0_0_30px_rgba(220,38,38,0.4)]' 
    : isSkipped 
    ? 'bg-slate-500/90' 
    : 'bg-green-600/90 shadow-[0_0_30px_rgba(22,163,74,0.3)]';
    
  const labelText = isError ? '오류' : isSkipped ? '분석 생략' : label === "Suspicious" ? "의심됨" : "정상";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={closeAnalysisModal}>
      <div 
        className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${headerColor} p-8 text-white text-center relative transition-colors duration-500 flex-shrink-0 backdrop-blur-md`}>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2 relative z-0 drop-shadow-md">이상 탐지 리포트</h2>
          <div className="inline-block px-4 py-1.5 bg-black/20 rounded-full text-xs font-bold tracking-widest backdrop-blur-sm relative z-0 border border-white/10">
            {labelText}
          </div>
          <button 
            type="button"
            onClick={closeAnalysisModal}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all z-10 active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 overscroll-contain">
          
          {/* 1. Status Message */}
          <div className="text-center p-4 bg-white/50 rounded-2xl border border-white/60">
             <p className={`text-sm font-bold ${isSuspicious ? 'text-red-600' : 'text-slate-600'}`}>
               {message}
             </p>
          </div>

          {/* 2. Deviation Meter (Only if OK and not skipped) */}
          {!isError && !isSkipped && (
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/60 text-center shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">통계적 이탈 지수 (Deviation)</span>
                
                <div className="relative h-5 bg-slate-200/60 rounded-full overflow-hidden w-full shadow-inner">
                    <div 
                        className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_15px_rgba(0,0,0,0.2)] ${isSuspicious ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.max(5, suspicion_score)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase">
                    <span>정상</span>
                    <span>의심</span>
                </div>
                <div className="mt-3 text-3xl font-black text-slate-800">
                    {suspicion_score}<span className="text-base text-slate-400 font-medium">/100</span>
                </div>
              </div>
          )}

          {/* 3. Evidence Grid */}
          {!isError && (
              <div className="grid grid-cols-2 gap-3">
                 <div className="p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">최근 10경기 K/D</span>
                    <span className={`block text-xl font-black mt-1 ${evidence.last10_kd > 1 ? 'text-slate-900' : 'text-slate-500'}`}>
                        {evidence.last10_kd.toFixed(2)}
                    </span>
                 </div>
                 <div className="p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">평소 K/D 평균</span>
                    <span className="block text-xl font-black text-slate-900 mt-1">
                        {evidence.baseline_kd_mean.toFixed(2)} <span className="text-xs text-slate-400 font-normal">± {evidence.baseline_kd_std.toFixed(2)}</span>
                    </span>
                 </div>
                 {status !== "SKIPPED_LOW_IMPACT" && (
                    <>
                        <div className="p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">오늘 K/D</span>
                            <span className="block text-xl font-black text-slate-900 mt-1">{evidence.today_kd.toFixed(2)}</span>
                        </div>
                         <div className="p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">최근 승률</span>
                            <span className="block text-xl font-black text-slate-900 mt-1">{evidence.recent_win_rate}%</span>
                        </div>
                    </>
                 )}
              </div>
          )}

          {/* 4. Reasons List */}
          {reasons.length > 0 && (
              <div className="space-y-3">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">탐지된 특이점</h4>
                 <ul className="space-y-2">
                    {reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-700 bg-red-50/60 backdrop-blur-sm p-3 rounded-xl border border-red-100">
                            <span className="text-red-500 mt-0.5">•</span>
                            {r}
                        </li>
                    ))}
                 </ul>
              </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100/50 bg-white/60 backdrop-blur-md flex-shrink-0">
             <button onClick={closeAnalysisModal} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl active:scale-[0.98] transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10">
                닫기
             </button>
        </div>
      </div>
    </div>
  );
};
