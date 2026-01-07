
import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { useUI } from '../state/UIContext';

export const AnalysisModal: React.FC = () => {
  const { isAnalysisModalOpen, closeAnalysisModal } = useUI();
  const { anomalyReport, isAnomalyLoading } = useApp();
  const [logLines, setLogLines] = useState<{id: number, text: string}[]>([]);

  useEffect(() => {
    if (isAnomalyLoading) {
      const logs = [
        "INITIALIZING_QUANTUM_SCAN...",
        "ACCESSING_NEXON_MAINFRAME...",
        "PARSING_MATCH_PKT_0x884...",
        "DECRYPTING_SUBJECT_OUID...",
        "ANALYZING_BEHAVIORAL_PATTERN...",
        "RUNNING_ABNORMAL_DETECT...",
        "COMPUTING_DEVIATION_SCORES...",
        "CALIBRATING_BASELINE_STATS...",
        "GENERATING_LAB_REPORT_V2.0..."
      ];
      let i = 0;
      const timer = setInterval(() => {
        setLogLines(prev => [...prev.slice(-3), { id: Date.now(), text: logs[i % logs.length] }]);
        i++;
      }, 700);
      return () => clearInterval(timer);
    }
  }, [isAnomalyLoading]);

  if (!isAnalysisModalOpen) return null;

  if (isAnomalyLoading || !anomalyReport) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 animate-in fade-in duration-700" onClick={(e) => e.stopPropagation()}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[150px] animate-pulse"></div>
        </div>

        <div className="relative flex flex-col items-center">
           <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
               <div className="absolute inset-0 border border-cyan-500/40 rounded-full radar-pulse"></div>
               <div className="absolute inset-0 border border-cyan-500/20 rounded-full radar-pulse" style={{ animationDelay: '0.6s' }}></div>
               <div className="absolute inset-0 border border-cyan-500/10 rounded-full radar-pulse" style={{ animationDelay: '1.2s' }}></div>
               
               <div className="relative w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(34,211,238,0.5)] border-2 border-cyan-500/30">
                   <div className="absolute inset-1 border border-cyan-500/20 rounded-full animate-spin" style={{ animationDuration: '4s' }}></div>
                   <svg className="w-12 h-12 text-cyan-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                   </svg>
               </div>
           </div>

           <div className="space-y-2 text-center font-mono">
              <h3 className="text-2xl font-black text-white tracking-[0.4em] uppercase animate-pulse">
                Analyzing_Subject
              </h3>
              <p className="text-[11px] text-cyan-500/60 font-bold uppercase tracking-[0.3em]">Quantum Computing in Progress</p>
           </div>
           
           <div className="mt-12 w-80 bg-black/60 border border-cyan-500/20 p-6 rounded-[2rem] font-mono text-[10px] text-cyan-400/80 shadow-2xl backdrop-blur-md relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/30 animate-pulse"></div>
               {logLines.map((log) => (
                   <div key={log.id} className="code-line flex gap-3 mb-2 last:mb-0">
                       <span className="opacity-30">HEX_0x{log.id.toString(16).slice(-3).toUpperCase()}</span>
                       <span className="font-bold">{log.text}</span>
                   </div>
               ))}
               {logLines.length === 0 && <div className="animate-pulse">BOOTING_CORE...</div>}
           </div>
        </div>
      </div>
    );
  }

  const { label, suspicion_score, message, reasons, evidence } = anomalyReport;
  const isSuspicious = label === "Suspicious";

  const headerColor = isSuspicious 
    ? 'bg-red-600/90 shadow-[0_10px_50px_rgba(220,38,38,0.4)]' 
    : 'bg-cyan-600/90 shadow-[0_10px_50px_rgba(8,145,178,0.4)]';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={closeAnalysisModal}>
      <div 
        className="w-full max-w-md md:max-w-2xl lg:max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500 border border-white/20 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        <div className={`${headerColor} p-12 text-white text-center relative flex-shrink-0 transition-all duration-500 group overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-white/20 animate-bounce opacity-30" style={{ animationDuration: '4s' }}></div>
          
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-3 relative z-10 font-mono italic group-hover:glitch-fx">
            Anomaly_Report
          </h2>
          
          <div className={`inline-block px-6 py-2 rounded-xl border text-[10px] font-black tracking-[0.3em] uppercase relative z-10 ${isSuspicious ? 'bg-red-950/40 border-red-400/50 text-red-100' : 'bg-cyan-950/40 border-cyan-400/50 text-cyan-100'}`}>
            {isSuspicious ? '!! DETECTION_CONFIRMED !!' : '>> PATTERN_NORMAL <<'}
          </div>

          <button 
            type="button"
            onClick={closeAnalysisModal}
            className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all z-20 active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-8 md:p-12 overflow-y-auto space-y-10 overscroll-contain relative z-10 scrollbar-hide">
          {/* Diagnostic Status - Font Scalling (approx 1.5x) */}
          <div className={`p-8 rounded-[2rem] border-2 flex items-center gap-6 transition-all ${isSuspicious ? 'bg-red-50 border-red-100 text-red-900' : 'bg-cyan-50 border-cyan-100 text-cyan-900'}`}>
             <div className="relative flex-shrink-0">
                 <div className={`w-4 h-4 rounded-full animate-ping absolute inset-0 ${isSuspicious ? 'bg-red-500' : 'bg-cyan-500'}`}></div>
                 <div className={`w-4 h-4 rounded-full relative z-10 ${isSuspicious ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : 'bg-cyan-600 shadow-[0_0_15px_rgba(8,145,178,0.8)]'}`}></div>
             </div>
             <p className="text-xl font-black uppercase tracking-tight font-mono leading-relaxed">
               {message}
             </p>
          </div>

          <section className="bg-slate-950 rounded-[3rem] p-12 relative overflow-hidden shadow-2xl group/indicator">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent -translate-y-full animate-[scanline_4s_linear_infinite]"></div>
            
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] block mb-10 text-center font-mono">Probability_Score</span>
            
            <div className="relative mb-10">
                <div className="h-4 bg-slate-900 rounded-full w-full overflow-hidden border border-white/5 shadow-inner">
                    <div 
                        className={`h-full transition-all duration-[1.5s] ease-out shadow-[0_0_30px_rgba(255,255,255,0.4)] ${isSuspicious ? 'bg-red-500' : 'bg-cyan-500'}`}
                        style={{ width: `${Math.max(5, suspicion_score)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-4 text-[10px] font-black text-slate-700 uppercase font-mono tracking-[0.2em]">
                    <span>Baseline</span>
                    <span className={isSuspicious ? 'text-red-500 animate-pulse' : ''}>Critical_Threshold</span>
                </div>
            </div>

            <div className="text-center">
                <div className="text-8xl font-black text-white tracking-tighter italic inline-flex items-baseline group-hover/indicator:scale-105 transition-transform">
                    {suspicion_score.toFixed(1)}
                    <span className="text-sm text-slate-600 font-bold ml-2 uppercase not-italic tracking-widest">pts</span>
                </div>
                <div className="mt-4 flex items-center justify-center gap-3">
                   <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] font-mono">Global_Dev_Matrix_Calibrated</p>
                </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-6">
             <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm relative group hover:border-cyan-200 transition-all font-mono">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Subject_KD_Index</span>
                <span className={`block text-4xl font-black ${evidence.today_kd > 2 ? 'text-red-500' : 'text-slate-900'}`}>
                    {evidence.today_kd.toFixed(2)}
                </span>
             </div>
             <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm relative group hover:border-cyan-200 transition-all font-mono">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Lab_Sigma_Baseline</span>
                <span className="block text-4xl font-black text-slate-900">
                    {evidence.baseline_kd_mean.toFixed(1)} <span className="text-base text-slate-400 ml-1">σ{evidence.baseline_kd_std.toFixed(1)}</span>
                </span>
             </div>
          </div>

          {reasons.length > 0 && (
              <div className="space-y-6 pt-6">
                 <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] ml-3 font-mono">Diagnostic_Anomalies_Logged</h4>
                 <div className="space-y-4">
                    {reasons.map((r, i) => (
                        <div key={i} className={`flex items-start gap-8 p-8 rounded-[2.5rem] border font-mono transition-colors ${isSuspicious ? 'bg-red-50/30 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            <span className="text-xs opacity-40 font-black">TRACE_0{i+1}</span>
                            <span className="text-base font-bold leading-relaxed">{r}</span>
                        </div>
                    ))}
                 </div>
              </div>
          )}
        </div>

        <div className="p-10 border-t border-slate-100 bg-white flex-shrink-0 flex justify-center">
             <button onClick={closeAnalysisModal} className="px-16 py-5 bg-slate-950 text-cyan-400 font-black text-[12px] rounded-2xl active:scale-[0.95] transition-all hover:bg-black shadow-2xl border border-cyan-500/20 font-mono uppercase tracking-[0.3em]">
                Terminate_Process_Sync
             </button>
        </div>
      </div>
    </div>
  );
};
