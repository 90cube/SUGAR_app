
import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';

export const AnalysisModal: React.FC = () => {
  const { isAnalysisModalOpen, closeAnalysisModal, anomalyReport, isAnomalyLoading } = useApp();
  const [logLines, setLogLines] = useState<string[]>([]);

  // Simulate laboratory data stream
  useEffect(() => {
    if (isAnomalyLoading) {
      const logs = [
        "INITIALIZING_QUANTUM_SCAN...",
        "ACCESSING_NEXON_MAINFRAME...",
        "PARSING_MATCH_PKT_0x884...",
        "DECRYPTING_SUBJECT_OUID...",
        "RUNNING_ABNORMAL_PATTERN_RECOGNITION...",
        "COMPUTING_DEVIATION_SCORES...",
        "CALIBRATING_BASELINE_STATISTICS...",
        "FINALIZING_LAB_REPORT..."
      ];
      let i = 0;
      const timer = setInterval(() => {
        setLogLines(prev => [...prev.slice(-4), logs[i % logs.length]]);
        i++;
      }, 600);
      return () => clearInterval(timer);
    }
  }, [isAnomalyLoading]);

  if (!isAnalysisModalOpen) return null;

  if (isAnomalyLoading || !anomalyReport) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-500" onClick={(e) => e.stopPropagation()}>
        {/* SF Tech Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent"></div>
        </div>

        <div className="relative flex flex-col items-center">
           {/* Radar Scanner FX */}
           <div className="relative w-32 h-32 mb-12">
               <div className="absolute inset-0 border-2 border-cyan-500/50 rounded-full radar-pulse"></div>
               <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full radar-pulse" style={{ animationDelay: '0.6s' }}></div>
               <div className="absolute inset-0 border-2 border-cyan-500/10 rounded-full radar-pulse" style={{ animationDelay: '1.2s' }}></div>
               <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.6)] border-2 border-white/20">
                       <svg className="w-8 h-8 text-slate-950 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                       </svg>
                   </div>
               </div>
           </div>

           <h3 className="text-xl font-black text-white tracking-widest uppercase animate-pulse font-mono">
              Analyzing_Subject_Patterns
           </h3>
           
           {/* Terminal Log Stream */}
           <div className="mt-8 bg-black/40 border border-white/10 p-4 rounded-xl w-64 font-mono text-[9px] text-cyan-500/80 shadow-inner">
               {logLines.map((line, idx) => (
                   <div key={idx} className="flex gap-2">
                       <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                       <span className="font-bold">{line}</span>
                   </div>
               ))}
               <div className="w-1 h-3 bg-cyan-500 inline-block animate-pulse ml-1"></div>
           </div>
        </div>
      </div>
    );
  }

  const { status, label, suspicion_score, deviation_level, message, reasons, evidence } = anomalyReport;
  
  const isSuspicious = label === "Suspicious";
  const isError = status === "ERROR";
  const isSkipped = status === "SKIPPED_LOW_IMPACT";

  const headerColor = isError 
    ? 'bg-slate-800' 
    : isSuspicious 
    ? 'bg-red-600/90 shadow-[0_10px_40px_rgba(220,38,38,0.5)]' 
    : isSkipped 
    ? 'bg-slate-700' 
    : 'bg-cyan-600/90 shadow-[0_10px_40px_rgba(8,145,178,0.4)]';
    
  const labelText = isError ? 'SYSTEM_FAILURE' : isSkipped ? 'LOW_IMPACT_SKIP' : label === "Suspicious" ? "SUSPICION_DETECTED" : "NORMAL_PATTERN";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={closeAnalysisModal}>
      <div 
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500 border border-white/20 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Digital Grid FX */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>

        {/* SF Header with Glitch Effect */}
        <div className={`${headerColor} p-8 text-white text-center relative flex-shrink-0 transition-all duration-500`}>
          <div className="absolute top-0 left-0 w-full h-full bg-black/10 mix-blend-overlay"></div>
          
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 relative z-10 font-mono italic">
            Anomaly_Report
          </h2>
          
          <div className="inline-block px-4 py-1 bg-black/30 rounded border border-white/20 text-[9px] font-black tracking-[0.2em] uppercase relative z-10 animate-pulse">
            {labelText}
          </div>

          <button 
            type="button"
            onClick={closeAnalysisModal}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all z-20 active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 overscroll-contain relative z-10 scrollbar-hide">
          {/* Status Message Box */}
          <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isSuspicious ? 'bg-red-50 border-red-100 text-red-700' : 'bg-cyan-50 border-cyan-100 text-cyan-800'}`}>
             <div className={`w-3 h-3 rounded-full animate-ping ${isSuspicious ? 'bg-red-500' : 'bg-cyan-500'}`}></div>
             <p className="text-xs font-black uppercase tracking-tight font-mono">
               {message}
             </p>
          </div>

          {!isError && !isSkipped && (
              <section className="bg-slate-900 rounded-[2rem] p-8 relative overflow-hidden shadow-2xl">
                {/* Visual Scanner Light FX */}
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50 blur-[2px] animate-bounce" style={{ animationDuration: '3s' }}></div>
                
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-6 text-center">Deviation_Indicator</span>
                
                <div className="relative mb-6">
                    <div className="h-2 bg-slate-800 rounded-full w-full overflow-hidden border border-white/5">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)] ${isSuspicious ? 'bg-red-500' : 'bg-cyan-500'}`}
                            style={{ width: `${Math.max(5, suspicion_score)}%` }}
                        />
                    </div>
                    {/* Scale markers */}
                    <div className="flex justify-between mt-2 text-[8px] font-black text-slate-600 uppercase font-mono">
                        <span>Baseline</span>
                        <span>Outlier</span>
                    </div>
                </div>

                <div className="text-center">
                    <div className="text-5xl font-black text-white tracking-tighter italic inline-flex items-baseline">
                        {suspicion_score.toFixed(1)}
                        <span className="text-xs text-slate-500 font-bold ml-1 uppercase not-italic">pts</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Probability_Score</p>
                </div>
              </section>
          )}

          {!isError && (
              <div className="grid grid-cols-2 gap-3">
                 <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm relative group hover:border-cyan-200 transition-all">
                    <div className="absolute top-2 right-2 w-1 h-1 bg-slate-200 rounded-full group-hover:bg-cyan-500 transition-colors"></div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">L10_KD_Index</span>
                    <span className={`block text-xl font-black mt-1 font-mono ${evidence.last10_kd > 1 ? 'text-slate-900' : 'text-slate-500'}`}>
                        {evidence.last10_kd.toFixed(2)}
                    </span>
                 </div>
                 <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm relative group hover:border-cyan-200 transition-all">
                    <div className="absolute top-2 right-2 w-1 h-1 bg-slate-200 rounded-full"></div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Base_Mean_val</span>
                    <span className="block text-xl font-black text-slate-900 mt-1 font-mono">
                        {evidence.baseline_kd_mean.toFixed(1)} <span className="text-[10px] text-slate-400 font-bold">±{evidence.baseline_kd_std.toFixed(1)}</span>
                    </span>
                 </div>
              </div>
          )}

          {reasons.length > 0 && (
              <div className="space-y-3 pt-2">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Detection_Logs</h4>
                 <div className="space-y-2">
                    {reasons.map((r, i) => (
                        <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border font-mono ${isSuspicious ? 'bg-red-50/50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            <span className="text-xs mt-0.5">0x{Math.floor(Math.random()*256).toString(16).toUpperCase()}</span>
                            <span className="text-xs font-bold leading-relaxed">{r}</span>
                        </div>
                    ))}
                 </div>
              </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0">
             <button onClick={closeAnalysisModal} className="w-full py-4 bg-slate-950 text-cyan-400 font-black text-xs rounded-2xl active:scale-[0.98] transition-all hover:bg-black shadow-xl border border-cyan-500/20 font-mono uppercase tracking-widest">
                Term_Process_Close
             </button>
        </div>
      </div>
    </div>
  );
};
