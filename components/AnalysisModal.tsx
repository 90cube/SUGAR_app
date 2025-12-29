
import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
// Import useUI for modal control state
import { useUI } from '../state/UIContext';

export const AnalysisModal: React.FC = () => {
  // Fix: Destructure UI state from useUI and analysis data from useApp
  const { isAnalysisModalOpen, closeAnalysisModal } = useUI();
  const { anomalyReport, isAnomalyLoading } = useApp();
  const [logLines, setLogLines] = useState<{id: number, text: string}[]>([]);

  // Simulate laboratory data stream
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
        {/* SF Laboratory FX Overlays */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Cyber Grid */}
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            {/* Pulsing Light */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
        </div>

        <div className="relative flex flex-col items-center">
           {/* Multi-Layer Radar Scanner FX */}
           <div className="relative w-40 h-40 mb-12 flex items-center justify-center">
               <div className="absolute inset-0 border border-cyan-500/40 rounded-full radar-pulse"></div>
               <div className="absolute inset-0 border border-cyan-500/20 rounded-full radar-pulse" style={{ animationDelay: '0.6s' }}></div>
               <div className="absolute inset-0 border border-cyan-500/10 rounded-full radar-pulse" style={{ animationDelay: '1.2s' }}></div>
               
               {/* Center Eye/Core */}
               <div className="relative w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.4)] border-2 border-cyan-500/30">
                   <div className="absolute inset-1 border border-cyan-500/20 rounded-full animate-spin" style={{ animationDuration: '4s' }}></div>
                   <svg className="w-10 h-10 text-cyan-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                   </svg>
               </div>
           </div>

           <div className="space-y-1 text-center font-mono">
              <h3 className="text-xl font-black text-white tracking-[0.3em] uppercase animate-pulse">
                Analyzing_Subject
              </h3>
              <p className="text-[10px] text-cyan-500/60 font-bold uppercase tracking-widest">Quantum Computing in Progress</p>
           </div>
           
           {/* SF Terminal Log Flow */}
           <div className="mt-12 w-72 bg-black/60 border border-cyan-500/20 p-5 rounded-2xl font-mono text-[9px] text-cyan-400/80 shadow-2xl backdrop-blur-md relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/30 animate-pulse"></div>
               {logLines.map((log) => (
                   <div key={log.id} className="code-line flex gap-2 mb-1 last:mb-0">
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
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500 border border-white/20 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Digital Grid Layer */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        {/* SF Header with Glitch Effect on Hover */}
        <div className={`${headerColor} p-10 text-white text-center relative flex-shrink-0 transition-all duration-500 group overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
          {/* Moving scanline for header */}
          <div className="absolute top-0 left-0 w-full h-1 bg-white/20 animate-bounce opacity-30" style={{ animationDuration: '4s' }}></div>
          
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 relative z-10 font-mono italic group-hover:glitch-fx">
            Anomaly_Report
          </h2>
          
          <div className={`inline-block px-4 py-1 rounded border text-[9px] font-black tracking-[0.2em] uppercase relative z-10 ${isSuspicious ? 'bg-red-950/40 border-red-400/50 text-red-100' : 'bg-cyan-950/40 border-cyan-400/50 text-cyan-100'}`}>
            {isSuspicious ? '!! DETECTION_CONFIRMED !!' : '>> PATTERN_NORMAL <<'}
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

        <div className="p-6 overflow-y-auto space-y-8 overscroll-contain relative z-10 scrollbar-hide">
          {/* Diagnostic Status */}
          <div className={`p-5 rounded-3xl border-2 flex items-center gap-4 transition-all ${isSuspicious ? 'bg-red-50 border-red-100 text-red-900' : 'bg-cyan-50 border-cyan-100 text-cyan-900'}`}>
             <div className="relative">
                 <div className={`w-3 h-3 rounded-full animate-ping absolute inset-0 ${isSuspicious ? 'bg-red-500' : 'bg-cyan-500'}`}></div>
                 <div className={`w-3 h-3 rounded-full relative z-10 ${isSuspicious ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'bg-cyan-600 shadow-[0_0_10px_rgba(8,145,178,0.8)]'}`}></div>
             </div>
             <p className="text-xs font-black uppercase tracking-tight font-mono leading-relaxed">
               {message}
             </p>
          </div>

          {/* Probability Indicator */}
          <section className="bg-slate-950 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl group/indicator">
            {/* Visual Scanner Sweep FX */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent -translate-y-full animate-[scanline_4s_linear_infinite]"></div>
            
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] block mb-8 text-center font-mono">Probability_Score</span>
            
            <div className="relative mb-8">
                <div className="h-3 bg-slate-900 rounded-full w-full overflow-hidden border border-white/5 shadow-inner">
                    <div 
                        className={`h-full transition-all duration-[1.5s] ease-out shadow-[0_0_20px_rgba(255,255,255,0.4)] ${isSuspicious ? 'bg-red-500' : 'bg-cyan-500'}`}
                        style={{ width: `${Math.max(5, suspicion_score)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-3 text-[9px] font-black text-slate-700 uppercase font-mono tracking-widest">
                    <span>Baseline</span>
                    <span className={isSuspicious ? 'text-red-500 animate-pulse' : ''}>Critical</span>
                </div>
            </div>

            <div className="text-center">
                <div className="text-6xl font-black text-white tracking-tighter italic inline-flex items-baseline group-hover/indicator:scale-105 transition-transform">
                    {suspicion_score.toFixed(1)}
                    <span className="text-xs text-slate-600 font-bold ml-1 uppercase not-italic">pts</span>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                   <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></div>
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Global_Dev_Calculation</p>
                </div>
            </div>
          </section>

          {/* Metric Grids */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm relative group hover:border-cyan-200 transition-all font-mono">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject_KD</span>
                <span className={`block text-2xl font-black ${evidence.today_kd > 2 ? 'text-red-500' : 'text-slate-900'}`}>
                    {evidence.today_kd.toFixed(2)}
                </span>
             </div>
             <div className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm relative group hover:border-cyan-200 transition-all font-mono">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Lab_Baseline</span>
                <span className="block text-2xl font-black text-slate-900">
                    {evidence.baseline_kd_mean.toFixed(1)} <span className="text-[10px] text-slate-400">σ{evidence.baseline_kd_std.toFixed(1)}</span>
                </span>
             </div>
          </div>

          {/* Detection Logs */}
          {reasons.length > 0 && (
              <div className="space-y-4 pt-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 font-mono">Diagnostic_Logs</h4>
                 <div className="space-y-3">
                    {reasons.map((r, i) => (
                        <div key={i} className={`flex items-start gap-5 p-5 rounded-[2rem] border font-mono transition-colors ${isSuspicious ? 'bg-red-50/30 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            <span className="text-[10px] opacity-40 font-bold">0x0{i+1}</span>
                            <span className="text-xs font-bold leading-relaxed">{r}</span>
                        </div>
                    ))}
                 </div>
              </div>
          )}
        </div>

        {/* Action Button */}
        <div className="p-8 border-t border-slate-100 bg-white flex-shrink-0">
             <button onClick={closeAnalysisModal} className="w-full py-4 bg-slate-950 text-cyan-400 font-black text-[11px] rounded-2xl active:scale-[0.98] transition-all hover:bg-black shadow-2xl border border-cyan-500/20 font-mono uppercase tracking-[0.2em]">
                Term_Process_Sync
             </button>
        </div>
      </div>
    </div>
  );
};
